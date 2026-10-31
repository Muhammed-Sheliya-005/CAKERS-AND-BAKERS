import { TRPCError } from "@trpc/server";
import {
  and,
  asc,
  between,
  count,
  desc,
  eq,
  gte,
  inArray,
  like,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { z } from "zod";
import {
  adminNotifications,
  businessSettings,
  categories,
  contactEnquiryStatusValues,
  customerEnquiries,
  inventoryItems,
  inventoryMovements,
  orderItems,
  orders,
  orderStatusHistory,
  orderStatusValues,
  paymentRecords,
  paymentStatusValues,
  productVariants,
  products,
  productStockMovements,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { dateWindowInTimezone, localDateInTimezone } from "./time";
const DEFAULT_BUSINESS = {
  id: 1,
  businessName: "Cakers & Cakers",
  businessAddress:
    "Ayesha Tower, S.V. Road, Opp. MTNL, Jogeshwari West, Mumbai 400060.",
  contactPhone: "",
  contactEmail: "",
  openingHours: "Tuesday–Sunday · 10:00 am–8:00 pm",
  deliveryEnabled: true,
  pickupEnabled: true,
  deliveryFeePaise: 4900,
  freeDeliveryThresholdPaise: 79900,
  acceptingOrders: true,
  allowedPaymentMethods: "cod,pay_at_store",
  notifyNewOrders: true,
  notifyNewEnquiries: true,
  notifyLowStock: true,
  timezone: "Asia/Kolkata",
};
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const dateWindow = z.object({
  startDate: dateOnly,
  endDate: dateOnly,
  granularity: z.enum(["daily", "weekly", "monthly"]).default("daily"),
});
const safePhone = z.string().trim().max(32).optional().default("");
const contactEmail = z.union([z.string().email().max(320), z.literal("")]);
const paymentMethod = z.enum([
  "cash",
  "upi",
  "card",
  "bank_transfer",
  "cod",
  "pay_at_store",
]);
const businessSettingsInput = z.object({
  businessName: z.string().trim().min(2).max(120),
  businessAddress: z.string().trim().min(8).max(1200).refine(
    value => /\bjogeshwari\s+west\b/i.test(value) && /\bmumbai\b/i.test(value),
    "Keep the bakery address within Jogeshwari West, Mumbai."
  ),
  contactPhone: z.string().trim().max(32),
  contactEmail,
  openingHours: z.string().trim().min(2).max(500),
  deliveryEnabled: z.boolean(),
  pickupEnabled: z.boolean(),
  deliveryFeeRupees: z.number().int().min(0).max(100000),
  freeDeliveryThresholdRupees: z.number().int().min(0).max(1000000),
  acceptingOrders: z.boolean(),
  allowedPaymentMethods: z.array(z.enum(["cod", "pay_at_store"])).min(1).max(2),
  notifyNewOrders: z.boolean(),
  notifyNewEnquiries: z.boolean(),
  notifyLowStock: z.boolean(),
  timezone: z.literal("Asia/Kolkata"),
});

async function dbOrFail() {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "SERVICE_UNAVAILABLE",
      message: "The shop database is not configured or is currently unavailable.",
    });
  return db;
}
function assertDateWindow(startDate: string, endDate: string, timeZone: string) {
  try {
    return dateWindowInTimezone(startDate, endDate, timeZone);
  } catch (error) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: error instanceof Error ? error.message : "Choose a valid report date range.",
    });
  }
}
function indiaDate(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}
function bucketDate(value: Date, granularity: "daily" | "weekly" | "monthly") {
  const local = indiaDate(value);
  if (granularity === "monthly") return local.slice(0, 7);
  if (granularity === "daily") return local;
  const date = new Date(`${local}T00:00:00Z`);
  const weekday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - weekday);
  return date.toISOString().slice(0, 10);
}
async function readSettings() {
  const db = await dbOrFail();
  const [row] = await db.select().from(businessSettings).where(eq(businessSettings.id, 1)).limit(1);
  return row ? { ...row, timezone: "Asia/Kolkata" } : DEFAULT_BUSINESS;
}
async function insertNotification(input: {
  kind: "order" | "enquiry" | "custom_enquiry";
  entityId: number;
  title: string;
  body: string;
}) {
  const db = await dbOrFail();
  await db.insert(adminNotifications).values(input);
}

export async function transitionOrderStatus(
  input: { id: number; status: (typeof orderStatusValues)[number]; note?: string },
  actorId: number
) {
  const db = await dbOrFail();
  const nextByStatus: Record<(typeof orderStatusValues)[number], string[]> = {
    "Order Placed": ["Confirmed", "Cancelled"],
    Confirmed: ["Preparing", "Cancelled"],
    Preparing: ["Ready for Pickup / Out for Delivery", "Cancelled"],
    "Ready for Pickup / Out for Delivery": ["Delivered", "Cancelled"],
    Delivered: [],
    Cancelled: [],
  };
  const reason = input.note?.trim() ?? "";
  if (input.status === "Cancelled" && reason.length < 5)
    throw new TRPCError({ code: "BAD_REQUEST", message: "Add a short cancellation reason (at least 5 characters)." });
  const recordedBy = actorId > 0 ? actorId : null;

  return db.transaction(async tx => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, input.id)).for("update").limit(1);
    if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found." });
    if (order.status === input.status) return { success: true, unchanged: true };
    if (!nextByStatus[order.status].includes(input.status))
      throw new TRPCError({ code: "CONFLICT", message: `Order cannot move from ${order.status} to ${input.status}.` });

    if (input.status === "Cancelled") {
      const lines = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      for (const line of lines) {
        if (!line.productId) continue;
        const note = `Cancelled order ${order.orderCode}: ${reason}`.slice(0, 500);
        if (line.variantId) {
          await tx.update(productVariants)
            .set({ stock: sql`${productVariants.stock} + ${line.quantity}` })
            .where(and(eq(productVariants.id, line.variantId), eq(productVariants.productId, line.productId)));
          await tx.insert(productStockMovements).values({
            productId: line.productId,
            variantId: line.variantId,
            kind: "cancellation",
            quantity: line.quantity,
            delta: line.quantity,
            note,
            recordedBy,
          });
        } else if (!line.variantNameSnapshot) {
          await tx.update(products)
            .set({ stock: sql`${products.stock} + ${line.quantity}` })
            .where(eq(products.id, line.productId));
          await tx.insert(productStockMovements).values({
            productId: line.productId,
            kind: "cancellation",
            quantity: line.quantity,
            delta: line.quantity,
            note,
            recordedBy,
          });
        }
      }
    }

    await tx.update(orders).set({ status: input.status }).where(eq(orders.id, order.id));
    await tx.insert(orderStatusHistory).values({
      orderId: order.id,
      fromStatus: order.status,
      toStatus: input.status,
      note: reason || null,
      changedBy: recordedBy,
    });
    return { success: true, unchanged: false };
  });
}

export const storefrontOperationsRouter = router({
  businessProfile: publicProcedure.query(async () => {
    const settings = await readSettings();
    return {
      businessName: settings.businessName,
      businessAddress: settings.businessAddress,
      contactPhone: settings.contactPhone,
      contactEmail: settings.contactEmail,
      openingHours: settings.openingHours,
      deliveryEnabled: settings.deliveryEnabled,
      pickupEnabled: settings.pickupEnabled,
      deliveryFeePaise: settings.deliveryFeePaise,
      freeDeliveryThresholdPaise: settings.freeDeliveryThresholdPaise,
      acceptingOrders: settings.acceptingOrders,
      allowedPaymentMethods: settings.allowedPaymentMethods
        .split(",")
        .filter((method): method is "cod" | "pay_at_store" => method === "cod" || method === "pay_at_store"),
      timezone: settings.timezone,
    };
  }),
  submitEnquiry: publicProcedure
    .input(
      z.object({
        customerName: z.string().trim().min(2).max(120),
        phone: safePhone,
        email: contactEmail.optional().default(""),
        subject: z.string().trim().min(3).max(160),
        message: z.string().trim().min(10).max(4000),
      }).refine(value => value.phone.length >= 7 || value.email.length > 0, {
        message: "Provide a valid phone number or email address.",
        path: ["phone"],
      })
    )
    .mutation(async ({ input }) => {
      const db = await dbOrFail();
      const created = await db.insert(customerEnquiries).values({
        customerName: input.customerName,
        phone: input.phone || null,
        email: input.email || null,
        subject: input.subject,
        message: input.message,
      });
      const id = Number((created as unknown as [{ insertId?: number }])[0]?.insertId ?? 0);
      const settings = await readSettings();
      if (id && settings.notifyNewEnquiries)
        await insertNotification({
          kind: "enquiry",
          entityId: id,
          title: "New website enquiry",
          body: `${input.customerName}: ${input.subject}`,
        });
      return { success: true, message: "Your message is saved. The bakery team will be in touch." };
    }),
});

export const adminOperationsRouter = router({
  analytics: adminProcedure.input(dateWindow).query(async ({ input }) => {
    const db = await dbOrFail();
    const settings = await readSettings();
    const { from, to } = assertDateWindow(input.startDate, input.endDate, settings.timezone);
    const dateFilter = between(orders.createdAt, from, to);
    const [
      countsByStatus,
      grossRows,
      completedRows,
      paymentsByMethod,
      bestSellers,
      orderRows,
      recentOrders,
      unpaidRows,
    ] = await Promise.all([
      db.select({ status: orders.status, value: count() }).from(orders).where(dateFilter).groupBy(orders.status),
      db.select({ value: sql<number>`coalesce(sum(case when ${orders.status} <> 'Cancelled' then ${orders.totalPaise} else 0 end), 0)` }).from(orders).where(dateFilter),
      db.select({ value: sql<number>`coalesce(sum(case when ${orders.status} = 'Delivered' then ${orders.totalPaise} else 0 end), 0)` }).from(orders).where(dateFilter),
      db.select({
        method: paymentRecords.method,
        orderStatus: orders.status,
        received: sql<number>`coalesce(sum(case when ${paymentRecords.kind} = 'received' then ${paymentRecords.amountPaise} else 0 end), 0)`,
        refunded: sql<number>`coalesce(sum(case when ${paymentRecords.kind} = 'refunded' then ${paymentRecords.amountPaise} else 0 end), 0)`,
        entries: count(),
      }).from(paymentRecords).innerJoin(orders, eq(paymentRecords.orderId, orders.id)).where(between(paymentRecords.createdAt, from, to)).groupBy(paymentRecords.method, orders.status),
      db.select({
        productName: orderItems.productNameSnapshot,
        variantName: orderItems.variantNameSnapshot,
        units: sql<number>`coalesce(sum(${orderItems.quantity}), 0)`,
        grossPaise: sql<number>`coalesce(sum(${orderItems.lineTotalPaise}), 0)`,
      }).from(orderItems).innerJoin(orders, eq(orderItems.orderId, orders.id)).where(and(dateFilter, sql`${orders.status} <> 'Cancelled'`)).groupBy(orderItems.productNameSnapshot, orderItems.variantNameSnapshot).orderBy(desc(sql`sum(${orderItems.quantity})`)).limit(8),
      db.select({ createdAt: orders.createdAt, totalPaise: orders.totalPaise, status: orders.status }).from(orders).where(dateFilter),
      db.select({ id: orders.id, orderCode: orders.orderCode, customerName: orders.customerName, totalPaise: orders.totalPaise, status: orders.status, createdAt: orders.createdAt }).from(orders).orderBy(desc(orders.createdAt)).limit(8),
      db.select({ value: count() }).from(orders).where(and(dateFilter, inArray(orders.paymentStatus, ["unpaid", "partially_paid"]))),
    ]);
    const countsByValue = new Map(countsByStatus.map(row => [row.status, Number(row.value)]));
    const paymentTotals = new Map<string, { method: string; receivedPaise: number; refundedPaise: number; netPaise: number; cancelledReceivedPaise: number; cancelledRefundedPaise: number; records: number }>();
    for (const row of paymentsByMethod) {
      const totals = paymentTotals.get(row.method) ?? { method: row.method, receivedPaise: 0, refundedPaise: 0, netPaise: 0, cancelledReceivedPaise: 0, cancelledRefundedPaise: 0, records: 0 };
      if (row.orderStatus === "Cancelled") {
        totals.cancelledReceivedPaise += Number(row.received);
        totals.cancelledRefundedPaise += Number(row.refunded);
      } else {
        totals.receivedPaise += Number(row.received);
        totals.refundedPaise += Number(row.refunded);
        totals.netPaise += Number(row.received) - Number(row.refunded);
      }
      totals.records += Number(row.entries);
      paymentTotals.set(row.method, totals);
    }
    const paymentBreakdown = [...paymentTotals.values()];
    const collected = paymentBreakdown.reduce((sum, row) => sum + row.netPaise, 0);
    const buckets = new Map<string, { orders: number; grossPaise: number }>();
    for (const order of orderRows) {
      const key = bucketDate(order.createdAt, input.granularity);
      const current = buckets.get(key) ?? { orders: 0, grossPaise: 0 };
      current.orders += 1;
      if (order.status !== "Cancelled") current.grossPaise += order.totalPaise;
      buckets.set(key, current);
    }
    const trend = [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, ...value }));
    const pendingStatuses = ["Order Placed", "Confirmed"] as const;
    const openStatuses = ["Order Placed", "Confirmed", "Preparing", "Ready for Pickup / Out for Delivery"] as const;
    return {
      range: { startDate: input.startDate, endDate: input.endDate, granularity: input.granularity },
      summary: {
        totalOrders: countsByStatus.reduce((sum, row) => sum + Number(row.value), 0),
        awaitingConfirmation: countsByValue.get("Order Placed") ?? 0,
        pendingOrders: pendingStatuses.reduce((sum, key) => sum + (countsByValue.get(key) ?? 0), 0),
        preparingOrders: countsByValue.get("Preparing") ?? 0,
        readyOrders: countsByValue.get("Ready for Pickup / Out for Delivery") ?? 0,
        completedOrders: countsByValue.get("Delivered") ?? 0,
        cancelledOrders: countsByValue.get("Cancelled") ?? 0,
        openOrders: openStatuses.reduce((sum, key) => sum + (countsByValue.get(key) ?? 0), 0),
        grossSalesPaise: Number(grossRows[0]?.value ?? 0),
        completedSalesPaise: Number(completedRows[0]?.value ?? 0),
        collectedPaise: collected,
        unpaidOrders: Number(unpaidRows[0]?.value ?? 0),
      },
      statusBreakdown: countsByStatus.map(row => ({ status: row.status, orders: Number(row.value) })),
      paymentBreakdown,
      bestSellers: bestSellers.map(row => ({ ...row, units: Number(row.units), grossPaise: Number(row.grossPaise) })),
      trend,
      recentOrders,
    };
  }),
  orderList: adminProcedure
    .input(z.object({
      search: z.string().trim().max(100).optional(),
      status: z.enum(["Order Placed", "Confirmed", "Preparing", "Ready for Pickup / Out for Delivery", "Delivered", "Cancelled"]).optional(),
      paymentStatus: z.enum(paymentStatusValues).optional(),
      fulfillmentMethod: z.enum(["delivery", "pickup"]).optional(),
      startDate: dateOnly.optional(),
      endDate: dateOnly.optional(),
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(5).max(100).default(20),
    }).optional())
    .query(async ({ input }) => {
      const db = await dbOrFail();
      const options = input ?? { page: 1, pageSize: 20 };
      const filters = [];
      if (options.search) filters.push(or(like(orders.orderCode, `%${options.search}%`), like(orders.customerName, `%${options.search}%`), like(orders.customerPhone, `%${options.search}%`))!);
      if (options.status) filters.push(eq(orders.status, options.status));
      if (options.paymentStatus) filters.push(eq(orders.paymentStatus, options.paymentStatus));
      if (options.fulfillmentMethod) filters.push(eq(orders.fulfillmentMethod, options.fulfillmentMethod));
      if (options.startDate || options.endDate) {
        const settings = await readSettings();
        const { from, to } = assertDateWindow(options.startDate ?? "2000-01-01", options.endDate ?? localDateInTimezone(new Date(), settings.timezone), settings.timezone);
        filters.push(between(orders.createdAt, from, to));
      }
      const where = filters.length ? and(...filters) : undefined;
      const [rows, total] = await Promise.all([
        db.select().from(orders).where(where).orderBy(desc(orders.createdAt)).limit(options.pageSize).offset((options.page - 1) * options.pageSize),
        db.select({ value: count() }).from(orders).where(where),
      ]);
      const items = rows.length
        ? await db.select().from(orderItems).where(inArray(orderItems.orderId, rows.map(row => row.id)))
        : [];
      return {
        items: rows.map(order => ({ ...order, items: items.filter(item => item.orderId === order.id) })),
        total: Number(total[0]?.value ?? 0),
        page: options.page,
        pageSize: options.pageSize,
      };
    }),
  updateOrderStatus: adminProcedure
    .input(z.object({ id: z.number().int().positive(), status: z.enum(["Order Placed", "Confirmed", "Preparing", "Ready for Pickup / Out for Delivery", "Delivered", "Cancelled"]), note: z.string().trim().max(500).optional() }))
    .mutation(async ({ ctx, input }) => transitionOrderStatus(input, ctx.user.id)),
  recordPayment: adminProcedure
    .input(z.object({ orderId: z.number().int().positive(), kind: z.enum(["received", "refunded"]), method: paymentMethod, amountRupees: z.number().positive().max(200000).multipleOf(0.01), reference: z.string().trim().max(120).optional(), notes: z.string().trim().max(500).optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await dbOrFail();
      const amountPaise = Math.round(input.amountRupees * 100);
      return db.transaction(async tx => {
        const [order] = await tx.select().from(orders).where(eq(orders.id, input.orderId)).for("update").limit(1);
        if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found." });
        if (order.status === "Cancelled" && input.kind === "received") throw new TRPCError({ code: "CONFLICT", message: "Cancelled orders cannot receive payments; record a refund only when money was actually returned." });
        const history = await tx.select().from(paymentRecords).where(eq(paymentRecords.orderId, order.id));
        const received = history.filter(row => row.kind === "received").reduce((sum, row) => sum + row.amountPaise, 0);
        const refunded = history.filter(row => row.kind === "refunded").reduce((sum, row) => sum + row.amountPaise, 0);
        const netPaid = received - refunded;
        if (input.kind === "received" && amountPaise > order.totalPaise - netPaid)
          throw new TRPCError({ code: "BAD_REQUEST", message: "The receipt cannot exceed the order's remaining balance." });
        if (input.kind === "refunded" && amountPaise > netPaid)
          throw new TRPCError({ code: "BAD_REQUEST", message: "The refund cannot exceed the amount actually recorded as paid." });
        await tx.insert(paymentRecords).values({ orderId: order.id, kind: input.kind, method: input.method, amountPaise, reference: input.reference?.trim() || null, notes: input.notes?.trim() || null, recordedBy: ctx.user.id > 0 ? ctx.user.id : null });
        const updatedNet = netPaid + (input.kind === "received" ? amountPaise : -amountPaise);
        const updatedRefunded = refunded + (input.kind === "refunded" ? amountPaise : 0);
        const status = updatedNet <= 0 && updatedRefunded > 0 ? "refunded" : updatedNet <= 0 ? "unpaid" : updatedNet < order.totalPaise ? "partially_paid" : "paid";
        await tx.update(orders).set({ paymentStatus: status }).where(eq(orders.id, order.id));
        return { success: true, paymentStatus: status, outstandingPaise: order.totalPaise - updatedNet };
      });
    }),
  payments: adminProcedure
    .input(z.object({ search: z.string().trim().max(100).optional(), kind: z.enum(["received", "refunded"]).optional(), page: z.number().int().min(1).default(1), pageSize: z.number().int().min(5).max(100).default(25) }).optional())
    .query(async ({ input }) => {
      const db = await dbOrFail();
      const options = input ?? { page: 1, pageSize: 25 };
      const filters = [];
      if (options.kind) filters.push(eq(paymentRecords.kind, options.kind));
      if (options.search) filters.push(or(
        like(orders.orderCode, `%${options.search}%`),
        like(orders.customerName, `%${options.search}%`),
        like(orders.customerPhone, `%${options.search}%`),
      )!);
      return db.select({ payment: paymentRecords, orderCode: orders.orderCode, customerName: orders.customerName, customerPhone: orders.customerPhone })
        .from(paymentRecords)
        .innerJoin(orders, eq(paymentRecords.orderId, orders.id))
        .where(filters.length ? and(...filters) : undefined)
        .orderBy(desc(paymentRecords.createdAt))
        .limit(options.pageSize)
        .offset((options.page - 1) * options.pageSize);
    }),
  customerHistory: adminProcedure.input(z.object({ userId: z.number().int().positive() })).query(async ({ input }) => {
    const db = await dbOrFail();
    const [customer] = await db.select({ id: users.id, name: users.name, email: users.email, phone: users.phone, defaultAddress: users.defaultAddress, adminNotes: users.adminNotes }).from(users).where(eq(users.id, input.userId)).limit(1);
    if (!customer) throw new TRPCError({ code: "NOT_FOUND", message: "Customer record not found." });
    const history = await db.select().from(orders).where(eq(orders.userId, customer.id)).orderBy(desc(orders.createdAt)).limit(100);
    return { customer, orders: history };
  }),
  updateCustomerNotes: adminProcedure.input(z.object({ userId: z.number().int().positive(), notes: z.string().trim().max(2000) })).mutation(async ({ input }) => {
    const db = await dbOrFail();
    await db.update(users).set({ adminNotes: input.notes || null }).where(and(eq(users.id, input.userId), eq(users.role, "user")));
    return { success: true };
  }),
  inventoryItems: adminProcedure.query(async () => (await dbOrFail()).select().from(inventoryItems).where(eq(inventoryItems.isActive, true)).orderBy(asc(inventoryItems.name))),
  saveInventoryItem: adminProcedure.input(z.object({ id: z.number().int().positive().optional(), name: z.string().trim().min(2).max(120), unit: z.enum(["g", "kg", "ml", "l", "piece", "box", "pack"]), quantity: z.number().min(0).max(1_000_000), minimumQuantity: z.number().min(0).max(1_000_000), supplier: z.string().trim().max(200).optional() })).mutation(async ({ ctx, input }) => {
    const db = await dbOrFail();
    const quantityMilli = Math.round(input.quantity * 1000);
    const values = { name: input.name, unit: input.unit, quantityMilli, minimumQuantityMilli: Math.round(input.minimumQuantity * 1000), supplier: input.supplier?.trim() || null, isActive: true };
    return db.transaction(async tx => {
      if (input.id) {
        const [current] = await tx.select().from(inventoryItems).where(eq(inventoryItems.id, input.id)).for("update").limit(1);
        if (!current || !current.isActive) throw new TRPCError({ code: "NOT_FOUND", message: "Active inventory item not found." });
        if (current.unit !== input.unit) {
          const [movement] = await tx.select({ id: inventoryMovements.id }).from(inventoryMovements).where(eq(inventoryMovements.itemId, current.id)).limit(1);
          if (movement) throw new TRPCError({ code: "CONFLICT", message: "This item already has stock history; its unit cannot be changed. Archive it and create a new item with the correct unit." });
        }
        const deltaMilli = quantityMilli - current.quantityMilli;
        await tx.update(inventoryItems).set(values).where(eq(inventoryItems.id, current.id));
        if (deltaMilli !== 0) await tx.insert(inventoryMovements).values({ itemId: current.id, kind: "adjustment", quantityMilli: Math.abs(deltaMilli), deltaMilli, note: "Stock count changed in inventory details.", recordedBy: ctx.user.id });
      } else {
        const result = await tx.insert(inventoryItems).values(values);
        const id = Number((result as unknown as [{ insertId?: number }])[0]?.insertId ?? 0);
        if (quantityMilli > 0 && id) await tx.insert(inventoryMovements).values({ itemId: id, kind: "received", quantityMilli, deltaMilli: quantityMilli, note: "Initial stock count recorded.", recordedBy: ctx.user.id });
      }
      return { success: true };
    });
  }),
  adjustInventory: adminProcedure.input(z.object({ itemId: z.number().int().positive(), kind: z.enum(["received", "used", "adjustment"]), quantity: z.number().min(0).max(1_000_000), note: z.string().trim().min(3).max(500) })).mutation(async ({ ctx, input }) => {
    const db = await dbOrFail();
    return db.transaction(async tx => {
      const [item] = await tx.select().from(inventoryItems).where(eq(inventoryItems.id, input.itemId)).for("update").limit(1);
      if (!item || !item.isActive) throw new TRPCError({ code: "NOT_FOUND", message: "Inventory item not found." });
      const requestedMilli = Math.round(input.quantity * 1000);
      if (input.kind !== "adjustment" && requestedMilli <= 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Enter a positive quantity for received stock or usage." });
      const updated = input.kind === "adjustment" ? requestedMilli : item.quantityMilli + (input.kind === "received" ? requestedMilli : -requestedMilli);
      const deltaMilli = updated - item.quantityMilli;
      if (updated < 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Stock usage cannot make inventory negative." });
      if (deltaMilli === 0) return { success: true, unchanged: true, quantity: updated / 1000 };
      await tx.update(inventoryItems).set({ quantityMilli: updated }).where(eq(inventoryItems.id, item.id));
      await tx.insert(inventoryMovements).values({ itemId: item.id, kind: input.kind, quantityMilli: Math.abs(deltaMilli), deltaMilli, note: input.note, recordedBy: ctx.user.id });
      return { success: true, unchanged: false, quantity: updated / 1000 };
    });
  }),
  inventoryMovements: adminProcedure.input(z.object({ itemId: z.number().int().positive().optional() }).optional()).query(async ({ input }) => {
    const db = await dbOrFail();
    return db.select({ movement: inventoryMovements, itemName: inventoryItems.name, unit: inventoryItems.unit, userName: users.name }).from(inventoryMovements).innerJoin(inventoryItems, eq(inventoryMovements.itemId, inventoryItems.id)).leftJoin(users, eq(inventoryMovements.recordedBy, users.id)).where(input?.itemId ? eq(inventoryMovements.itemId, input.itemId) : undefined).orderBy(desc(inventoryMovements.createdAt)).limit(100);
  }),
  productStockMovements: adminProcedure.query(async () => {
    const db = await dbOrFail();
    return db.select({ movement: productStockMovements, productName: products.name, variantName: productVariants.name, userName: users.name })
      .from(productStockMovements)
      .innerJoin(products, eq(productStockMovements.productId, products.id))
      .leftJoin(productVariants, eq(productStockMovements.variantId, productVariants.id))
      .leftJoin(users, eq(productStockMovements.recordedBy, users.id))
      .orderBy(desc(productStockMovements.createdAt))
      .limit(200);
  }),
  adjustProductStock: adminProcedure.input(z.object({ productId: z.number().int().positive(), variantId: z.number().int().positive().optional(), kind: z.enum(["received", "used", "adjustment"]), quantity: z.number().min(0).max(10000), note: z.string().trim().min(3).max(500) })).mutation(async ({ ctx, input }) => {
    const db = await dbOrFail();
    return db.transaction(async tx => {
      const [product] = await tx.select().from(products).where(eq(products.id, input.productId)).for("update").limit(1);
      if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Cake product not found." });
      let currentStock = product.stock;
      if (input.variantId) {
        const [variant] = await tx.select().from(productVariants).where(and(eq(productVariants.id, input.variantId), eq(productVariants.productId, product.id))).for("update").limit(1);
        if (!variant) throw new TRPCError({ code: "NOT_FOUND", message: "Cake size not found." });
        currentStock = variant.stock;
      }
      const requested = Math.round(input.quantity);
      if (input.kind !== "adjustment" && requested < 1) throw new TRPCError({ code: "BAD_REQUEST", message: "Enter a positive unit count for stock receipts or usage." });
      const updated = input.kind === "adjustment" ? requested : currentStock + (input.kind === "received" ? requested : -requested);
      const delta = updated - currentStock;
      if (updated < 0 || updated > 10000) throw new TRPCError({ code: "BAD_REQUEST", message: "Stock must remain between 0 and 10,000 units." });
      if (delta === 0) return { success: true, unchanged: true, stock: updated };
      if (input.variantId) await tx.update(productVariants).set({ stock: updated }).where(eq(productVariants.id, input.variantId));
      else await tx.update(products).set({ stock: updated }).where(eq(products.id, product.id));
      await tx.insert(productStockMovements).values({ productId: product.id, variantId: input.variantId ?? null, kind: input.kind, quantity: Math.abs(delta), delta, note: input.note, recordedBy: ctx.user.id });
      return { success: true, unchanged: false, stock: updated };
    });
  }),
  archiveInventoryItem: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    await (await dbOrFail()).update(inventoryItems).set({ isActive: false }).where(eq(inventoryItems.id, input.id));
    return { success: true };
  }),
  enquiries: adminProcedure.input(z.object({ status: z.enum(contactEnquiryStatusValues).optional(), search: z.string().trim().max(100).optional() }).optional()).query(async ({ input }) => {
    const filters = [];
    if (input?.status) filters.push(eq(customerEnquiries.status, input.status));
    if (input?.search) filters.push(or(like(customerEnquiries.customerName, `%${input.search}%`), like(customerEnquiries.subject, `%${input.search}%`), like(customerEnquiries.phone, `%${input.search}%`), like(customerEnquiries.email, `%${input.search}%`))!);
    return (await dbOrFail()).select().from(customerEnquiries).where(filters.length ? and(...filters) : undefined).orderBy(desc(customerEnquiries.createdAt)).limit(250);
  }),
  updateEnquiry: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(contactEnquiryStatusValues), internalNotes: z.string().trim().max(3000).optional() })).mutation(async ({ input }) => {
    const db = await dbOrFail();
    const values: { status: typeof input.status; internalNotes?: string | null } = { status: input.status };
    if (input.internalNotes !== undefined) values.internalNotes = input.internalNotes || null;
    await db.update(customerEnquiries).set(values).where(eq(customerEnquiries.id, input.id));
    return { success: true };
  }),
  updateCustomCakeNotes: adminProcedure.input(z.object({ id: z.number().int().positive(), adminNotes: z.string().trim().max(3000) })).mutation(async ({ input }) => {
    await (await dbOrFail()).update((await import("../drizzle/schema")).customCakeEnquiries).set({ adminNotes: input.adminNotes || null }).where(eq((await import("../drizzle/schema")).customCakeEnquiries.id, input.id));
    return { success: true };
  }),
  businessSettings: adminProcedure.query(async () => readSettings()),
  saveBusinessSettings: adminProcedure.input(businessSettingsInput).mutation(async ({ input }) => {
    if (!input.deliveryEnabled && !input.pickupEnabled) throw new TRPCError({ code: "BAD_REQUEST", message: "Enable at least one fulfilment method." });
    const db = await dbOrFail();
    const values = { businessName: input.businessName, businessAddress: input.businessAddress, contactPhone: input.contactPhone, contactEmail: input.contactEmail, openingHours: input.openingHours, deliveryEnabled: input.deliveryEnabled, pickupEnabled: input.pickupEnabled, deliveryFeePaise: input.deliveryFeeRupees * 100, freeDeliveryThresholdPaise: input.freeDeliveryThresholdRupees * 100, acceptingOrders: input.acceptingOrders, allowedPaymentMethods: input.allowedPaymentMethods.join(","), notifyNewOrders: input.notifyNewOrders, notifyNewEnquiries: input.notifyNewEnquiries, notifyLowStock: input.notifyLowStock, timezone: input.timezone };
    await db.insert(businessSettings).values({ id: 1, ...values }).onDuplicateKeyUpdate({ set: values });
    return { success: true };
  }),
  notifications: adminProcedure.query(async () => {
    const db = await dbOrFail();
    const [saved, settings, lowStockItems, lowStockProducts] = await Promise.all([
      db.select().from(adminNotifications).orderBy(desc(adminNotifications.createdAt)).limit(30),
      readSettings(),
      db.select().from(inventoryItems).where(and(eq(inventoryItems.isActive, true), sql`${inventoryItems.quantityMilli} <= ${inventoryItems.minimumQuantityMilli}`)).limit(20),
      db.select({ id: products.id, name: products.name, stock: products.stock }).from(products).where(and(eq(products.isAvailable, true), lte(products.stock, 3))).limit(20),
    ]);
    const persisted = saved.map(row => ({ ...row, href: row.kind === "order" ? "/admin?tab=orders" : row.kind === "custom_enquiry" ? "/admin?tab=custom-cakes" : "/admin?tab=enquiries", isLowStock: false }));
    const low = settings.notifyLowStock ? [
      ...lowStockItems.map(item => ({ id: -item.id, kind: "low_stock" as const, entityId: item.id, title: "Ingredient stock is low", body: `${item.name}: ${(item.quantityMilli / 1000).toFixed(3)} ${item.unit} remaining.`, createdAt: item.updatedAt, readAt: null, href: "/admin?tab=inventory", isLowStock: true })),
      ...lowStockProducts.map(item => ({ id: -1_000_000 - item.id, kind: "low_stock" as const, entityId: item.id, title: "Cake product stock is low", body: `${item.name}: ${item.stock} left.`, createdAt: new Date(), readAt: null, href: "/admin?tab=products", isLowStock: true })),
    ] : [];
    return [...persisted, ...low].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 40);
  }),
  markNotificationRead: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    await (await dbOrFail()).update(adminNotifications).set({ readAt: new Date() }).where(eq(adminNotifications.id, input.id));
    return { success: true };
  }),
  team: adminProcedure.query(async ({ ctx }) => {
    if (ctx.user.openId !== ENV.ownerOpenId) throw new TRPCError({ code: "FORBIDDEN", message: "Only the configured project owner can manage staff access." });
    const db = await dbOrFail();
    return db.select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt, lastSignedIn: users.lastSignedIn }).from(users).orderBy(desc(users.lastSignedIn)).limit(250);
  }),
  setStaffAccess: adminProcedure.input(z.object({ userId: z.number().int().positive(), enabled: z.boolean() })).mutation(async ({ ctx, input }) => {
    if (ctx.user.openId !== ENV.ownerOpenId) throw new TRPCError({ code: "FORBIDDEN", message: "Only the configured project owner can manage staff access." });
    const db = await dbOrFail();
    const [target] = await db.select({ id: users.id, openId: users.openId, role: users.role }).from(users).where(eq(users.id, input.userId)).limit(1);
    if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Account not found." });
    if (target.openId === ENV.ownerOpenId || target.role === "admin") throw new TRPCError({ code: "BAD_REQUEST", message: "The owner/admin role cannot be changed here." });
    await db.update(users).set({ role: input.enabled ? "staff" : "user" }).where(eq(users.id, input.userId));
    return { success: true };
  }),
  saveCategory: adminProcedure.input(z.object({ id: z.number().int().positive().optional(), name: z.string().trim().min(2).max(80), slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), description: z.string().trim().min(2).max(255), imageUrl: z.string().trim().min(1).max(500), isActive: z.boolean().default(true) })).mutation(async ({ input }) => {
    const db = await dbOrFail();
    const values = { name: input.name, slug: input.slug, description: input.description, imageUrl: input.imageUrl, isActive: input.isActive };
    if (input.id) await db.update(categories).set(values).where(eq(categories.id, input.id));
    else await db.insert(categories).values(values);
    return { success: true };
  }),
  saveProductVariant: adminProcedure.input(z.object({ id: z.number().int().positive().optional(), productId: z.number().int().positive(), name: z.string().trim().min(1).max(80), priceRupees: z.number().int().positive().max(200000), stock: z.number().int().min(0).max(10000), isAvailable: z.boolean().default(true) })).mutation(async ({ ctx, input }) => {
    const db = await dbOrFail();
    return db.transaction(async tx => {
      const [product] = await tx.select({ id: products.id }).from(products).where(eq(products.id, input.productId)).for("update").limit(1);
      if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Cake not found." });
      const values = { productId: input.productId, name: input.name, pricePaise: input.priceRupees * 100, stock: input.stock, isAvailable: input.isAvailable };
      if (input.id) {
        const [current] = await tx.select().from(productVariants).where(and(eq(productVariants.id, input.id), eq(productVariants.productId, input.productId))).for("update").limit(1);
        if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Cake size not found." });
        const delta = input.stock - current.stock;
        await tx.update(productVariants).set(values).where(eq(productVariants.id, current.id));
        if (delta !== 0) await tx.insert(productStockMovements).values({ productId: input.productId, variantId: current.id, kind: "adjustment", quantity: Math.abs(delta), delta, note: "Cake-size stock count changed in size manager.", recordedBy: ctx.user.id });
      } else {
        const result = await tx.insert(productVariants).values(values);
        const id = Number((result as unknown as [{ insertId?: number }])[0]?.insertId ?? 0);
        if (input.stock > 0 && id) await tx.insert(productStockMovements).values({ productId: input.productId, variantId: id, kind: "initial", quantity: input.stock, delta: input.stock, note: "Initial cake-size stock count recorded.", recordedBy: ctx.user.id });
      }
      return { success: true };
    });
  }),
  productVariants: adminProcedure.input(z.object({ productId: z.number().int().positive() })).query(async ({ input }) => (await dbOrFail()).select().from(productVariants).where(eq(productVariants.productId, input.productId)).orderBy(asc(productVariants.pricePaise))),
  deleteProductVariant: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    const db = await dbOrFail();
    const [used] = await db.select({ id: orderItems.id }).from(orderItems).where(eq(orderItems.variantId, input.id)).limit(1);
    if (used) throw new TRPCError({ code: "CONFLICT", message: "This size has order history; deactivate it instead so old receipts remain intact." });
    await db.delete(productVariants).where(eq(productVariants.id, input.id));
    return { success: true };
  }),
});
