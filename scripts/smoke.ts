import assert from "node:assert/strict";
import { and, eq, like, sql } from "drizzle-orm";
import { appRouter } from "../server/routers";
import { closeDb, getDb } from "../server/db";
import { adminNotifications, orderItems, orders, paymentRecords, productStockMovements, products, type User } from "../drizzle/schema";

const emptyContext = { req: {} as never, res: {} as never, user: null };
const guest = appRouter.createCaller(emptyContext);
const temporaryAdmin = appRouter.createCaller({
  ...emptyContext,
  user: {
    id: 0,
    openId: "in-process-smoke-only",
    name: "Temporary Smoke Admin",
    email: null,
    loginMethod: "smoke-test",
    role: "admin",
    phone: null,
    defaultAddress: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  } as User,
});

async function main() {
  let orderCode: string | undefined;
  let productId: number | undefined;
  let stockBefore: number | undefined;
  let cancellationCompleted = false;
  let cleaned = false;
  try {
    const home = await guest.catalog.home();
    assert.equal(
      home.categories.length,
      6,
      "sample category data should be present"
    );
    assert.ok(
      home.featured.length > 0,
      "featured sample cakes should be present"
    );
    assert.ok(
      home.favourites.length > 0,
      "favourite sample cakes should be present"
    );
    const settings = await temporaryAdmin.admin.ops.businessSettings();
    assert.equal(settings.timezone, "Asia/Kolkata", "the bakery business timezone should stay fixed to Mumbai time");
    assert.match(settings.businessAddress, /Jogeshwari West, Mumbai/i, "the bakery address should stay in the required Mumbai location");
    const settingsInput = {
      businessName: settings.businessName,
      businessAddress: settings.businessAddress,
      contactPhone: settings.contactPhone,
      contactEmail: settings.contactEmail,
      openingHours: settings.openingHours,
      deliveryEnabled: settings.deliveryEnabled,
      pickupEnabled: settings.pickupEnabled,
      deliveryFeeRupees: Math.round(settings.deliveryFeePaise / 100),
      freeDeliveryThresholdRupees: Math.round(settings.freeDeliveryThresholdPaise / 100),
      acceptingOrders: settings.acceptingOrders,
      allowedPaymentMethods: settings.allowedPaymentMethods.split(",").filter((method): method is "cod" | "pay_at_store" => method === "cod" || method === "pay_at_store"),
      notifyNewOrders: settings.notifyNewOrders,
      notifyNewEnquiries: settings.notifyNewEnquiries,
      notifyLowStock: settings.notifyLowStock,
      timezone: "Asia/Kolkata" as const,
    };
    let timezoneChangeRejected = false;
    try {
      await temporaryAdmin.admin.ops.saveBusinessSettings({ ...settingsInput, timezone: "UTC" } as never);
    } catch (error) {
      timezoneChangeRejected = (error as { code?: string }).code === "BAD_REQUEST";
    }
    assert.ok(timezoneChangeRejected, "the server should reject attempts to change the fixed business timezone");
    let addressChangeRejected = false;
    try {
      await temporaryAdmin.admin.ops.saveBusinessSettings({ ...settingsInput, businessAddress: "123 Demo Lane, Bengaluru, Karnataka 560001" });
    } catch (error) {
      addressChangeRejected = (error as { code?: string }).code === "BAD_REQUEST";
    }
    assert.ok(addressChangeRejected, "the server should reject business addresses outside Jogeshwari West, Mumbai");

    const cake = home.featured.find(item => item.stock > 0 && item.isAvailable);
    assert.ok(cake, "an in-stock sample cake should be available");
    productId = cake.id;
    const initialDb = await getDb();
    assert.ok(initialDb, "managed database should be available");
    const [productBefore] = await initialDb
      .select({ stock: products.stock })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);
    assert.ok(productBefore, "selected sample cake should be persisted");
    stockBefore = productBefore.stock;

    const deliveryDate = new Date(Date.now() + 86_400_000)
      .toISOString()
      .slice(0, 10);
    const receipt = await guest.orders.create({
      items: [{ productId, quantity: 1 }],
      customerName: "Temporary Checkout Smoke",
      customerPhone: "+918000000001",
      customerEmail: "",
      deliveryAddress: "123 Demo Lane, Bengaluru, Karnataka 560001",
      deliveryDate,
      deliveryTime: "2:00 pm – 4:00 pm",
      instructions: "Temporary smoke test; remove after run.",
      paymentMethod: "cod",
    });
    orderCode = receipt.orderCode;

    const placed = await guest.orders.track({
      orderCode,
      phone: "+918000000001",
    });
    assert.equal(placed.status, "Order Placed");
    assert.ok(
      !("deliveryAddress" in placed),
      "public tracking must not expose a delivery address"
    );

    let mismatchRejected = false;
    try {
      await guest.orders.track({ orderCode, phone: "+918000000002" });
    } catch (error) {
      mismatchRejected = (error as { code?: string }).code === "NOT_FOUND";
    }
    assert.ok(
      mismatchRejected,
      "tracking must reject a phone number that does not match"
    );

    const db = await getDb();
    assert.ok(db, "managed database should be available");
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.orderCode, orderCode))
      .limit(1);
    assert.ok(order, "checkout order should be persisted");
    const [snapshot] = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id))
      .limit(1);
    assert.ok(snapshot, "order item should be persisted");
    assert.equal(
      snapshot.productNameSnapshot,
      cake.name,
      "order item name snapshot should persist"
    );
    assert.equal(
      snapshot.unitPricePaise,
      placed.items[0]?.unitPricePaise,
      "server-priced snapshot should match the customer receipt"
    );

    await temporaryAdmin.admin.updateOrderStatus({
      id: order.id,
      status: "Confirmed",
    });
    const updated = await guest.orders.track({
      orderCode,
      phone: "+918000000001",
    });
    assert.equal(
      updated.status,
      "Confirmed",
      "the status update should reach customer tracking"
    );
    const reportDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const baselineReport = await temporaryAdmin.admin.ops.analytics({ startDate: reportDate, endDate: reportDate, granularity: "daily" });
    const baselineCash = baselineReport.paymentBreakdown.find(row => row.method === "cash");
    await temporaryAdmin.admin.ops.recordPayment({ orderId: order.id, kind: "received", method: "cash", amountRupees: 1, reference: `SMOKE-${orderCode}`, notes: "Temporary smoke receipt." });
    const [partiallyPaidOrder] = await db.select().from(orders).where(eq(orders.id, order.id)).limit(1);
    assert.equal(partiallyPaidOrder?.paymentStatus, "partially_paid", "an offline receipt should update the outstanding payment status");

    let invalidTransitionRejected = false;
    try {
      await temporaryAdmin.admin.updateOrderStatus({ id: order.id, status: "Delivered" });
    } catch (error) {
      invalidTransitionRejected = (error as { code?: string }).code === "CONFLICT";
    }
    assert.ok(invalidTransitionRejected, "the server should reject skipped order states");

    await temporaryAdmin.admin.ops.updateOrderStatus({
      id: order.id,
      status: "Cancelled",
      note: "Smoke test cancellation.",
    });
    cancellationCompleted = true;
    const cancelled = await guest.orders.track({ orderCode, phone: "+918000000001" });
    assert.equal(cancelled.status, "Cancelled", "the cancellation should reach customer tracking");
    let cancelledReceiptRejected = false;
    try {
      await temporaryAdmin.admin.ops.recordPayment({ orderId: order.id, kind: "received", method: "cash", amountRupees: 0.5, reference: `SMOKE-${orderCode}`, notes: "Must not be received after cancellation." });
    } catch (error) {
      cancelledReceiptRejected = (error as { code?: string }).code === "CONFLICT";
    }
    assert.ok(cancelledReceiptRejected, "cancelled orders should not accept new payment receipts");
    await temporaryAdmin.admin.ops.recordPayment({ orderId: order.id, kind: "refunded", method: "cash", amountRupees: 1, reference: `SMOKE-${orderCode}`, notes: "Temporary smoke refund after cancellation." });
    const [refundedOrder] = await db.select().from(orders).where(eq(orders.id, order.id)).limit(1);
    assert.equal(refundedOrder?.paymentStatus, "refunded", "a legitimate refund should remain recordable after cancellation");
    const finalReport = await temporaryAdmin.admin.ops.analytics({ startDate: reportDate, endDate: reportDate, granularity: "daily" });
    const finalCash = finalReport.paymentBreakdown.find(row => row.method === "cash");
    assert.equal(finalReport.summary.collectedPaise, baselineReport.summary.collectedPaise, "cancelled receipts must not count as collected revenue");
    assert.equal((finalCash?.cancelledReceivedPaise ?? 0) - (baselineCash?.cancelledReceivedPaise ?? 0), 100, "the report should retain the cancelled-order receipt for reconciliation");
    assert.equal((finalCash?.cancelledRefundedPaise ?? 0) - (baselineCash?.cancelledRefundedPaise ?? 0), 100, "the report should retain the cancelled-order refund for reconciliation");
    const [productAfterCancellation] = await db
      .select({ stock: products.stock })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);
    assert.equal(productAfterCancellation?.stock, stockBefore, "cancellation should restore reserved cake stock");

    let adminDenied = false;
    try {
      await guest.admin.dashboard();
    } catch (error) {
      adminDenied = (error as { code?: string }).code === "FORBIDDEN";
    }
    assert.ok(
      adminDenied,
      "the server should deny admin procedures without an authorised role"
    );

    console.log(
      `PASS: ${home.categories.length} categories, database-backed checkout, immutable order snapshot, phone-verified private tracking, audited status/cancellation stock restoration, offline refund after cancellation and accurate revenue/ledger reporting, fixed Asia/Kolkata settings, and admin-role enforcement.`
    );
  } finally {
    if (orderCode && productId) {
      const db = await getDb();
      if (db) {
        await db.transaction(async tx => {
          const [order] = await tx
            .select({ id: orders.id })
            .from(orders)
            .where(eq(orders.orderCode, orderCode!))
            .limit(1);
          if (order) {
            await tx.delete(adminNotifications).where(
              and(eq(adminNotifications.kind, "order"), eq(adminNotifications.entityId, order.id))
            );
            await tx.delete(productStockMovements).where(
              and(
                eq(productStockMovements.productId, productId!),
                like(productStockMovements.note, `%${orderCode}%`)
              )
            );
            await tx.delete(paymentRecords).where(eq(paymentRecords.orderId, order.id));
            await tx.delete(orderItems).where(eq(orderItems.orderId, order.id));
            await tx.delete(orders).where(eq(orders.id, order.id));
            if (!cancellationCompleted)
              await tx.update(products).set({ stock: sql`${products.stock} + 1` }).where(eq(products.id, productId!));
            await tx.update(products)
              .set({ popularity: sql`greatest(0, ${products.popularity} - 1)` })
              .where(eq(products.id, productId!));
            cleaned = true;
          }
        });
      }
    }
    await closeDb();
    if (orderCode && !cleaned)
      throw new Error(
        "Smoke-test cleanup could not be verified; inspect the demo database."
      );
    if (cleaned)
      console.log(
        "Temporary test order removed and sample inventory restored."
      );
  }
}

main().catch(error => {
  console.error(
    "Smoke test failed:",
    error instanceof Error ? error.message : error
  );
  process.exitCode = 1;
});
