import { TRPCError } from "@trpc/server";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  like,
  lte,
  notInArray,
  or,
  sql,
} from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import {
  adminNotifications,
  businessSettings,
  categories,
  customCakeEnquiries,
  offers,
  orderItems,
  orders,
  orderStatusHistory,
  paymentRecords,
  orderStatusValues,
  products,
  productStockMovements,
  reviews,
  users,
} from "../drizzle/schema";
import { getDb } from "./db";
import { productVariants } from "../drizzle/schema";
import {
  adminOperationsRouter,
  storefrontOperationsRouter,
  transitionOrderStatus,
} from "./admin-operations";
import { localDateInTimezone, localTimeRangeStartToUtc } from "./time";
import { COOKIE_NAME } from "@shared/const";
import { ENV } from "./_core/env";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import {
  adminProcedure,
  protectedProcedure,
  publicProcedure,
  router,
} from "./_core/trpc";

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date.")
  .refine(value => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    );
  }, "Use a valid date.");
const email = z.union([z.string().email().max(320), z.literal("")]);
const phone = z
  .string()
  .trim()
  .min(7)
  .max(32)
  .regex(/^[+()\d .-]+$/, "Enter a valid phone number.");
const safeImage = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .refine(
    value =>
      value.startsWith("/manus-storage/") || value.startsWith("https://"),
    "Use a secure HTTPS image URL."
  );

async function database() {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "SERVICE_UNAVAILABLE",
      message:
        "The shop database is not configured or is currently unavailable.",
    });
  return db;
}
function priceAfterDiscount(pricePaise: number, discountPercent: number) {
  return Math.max(0, Math.round((pricePaise * (100 - discountPercent)) / 100));
}
function digits(value: string) {
  return value.replace(/\D/g, "");
}

async function currentOffers(db: Awaited<ReturnType<typeof getDb>>) {
  if (!db)
    return new Map<
      number,
      { id: number; title: string; discountPercent: number; endsAt: Date }
    >();
  const now = new Date();
  const rows = await db
    .select({
      id: offers.id,
      productId: offers.productId,
      title: offers.title,
      discountPercent: offers.discountPercent,
      endsAt: offers.endsAt,
    })
    .from(offers)
    .where(
      and(
        eq(offers.isActive, true),
        lte(offers.startsAt, now),
        gte(offers.endsAt, now)
      )
    );
  return new Map(rows.map(offer => [offer.productId, offer]));
}
async function publicProducts(
  db: Awaited<ReturnType<typeof getDb>>,
  rows: Array<{
    product: typeof products.$inferSelect;
      categoryName: string | null;
    }>
) {
  if (!db)
    throw new TRPCError({
      code: "SERVICE_UNAVAILABLE",
      message: "The shop database is not configured or is currently unavailable.",
    });
  const active = await currentOffers(db);
  const ids = rows.map(({ product }) => product.id);
  const variants = ids.length
    ? await db
        .select()
        .from(productVariants)
        .where(inArray(productVariants.productId, ids))
    : [];
  const variantsByProduct = new Map<number, typeof variants>();
  for (const variant of variants) {
    const current = variantsByProduct.get(variant.productId) ?? [];
    current.push(variant);
    variantsByProduct.set(variant.productId, current);
  }
  return rows.map(({ product, categoryName }) => {
    const offer = active.get(product.id);
    const productOptions = (variantsByProduct.get(product.id) ?? []).map(
      variant => ({
        ...variant,
        effectivePricePaise: offer
          ? priceAfterDiscount(variant.pricePaise, offer.discountPercent)
          : variant.pricePaise,
      })
    );
    const availableVariants = productOptions.filter(
      variant => variant.isAvailable && variant.stock > 0
    );
    return {
      ...product,
      variants: productOptions,
      stock: productOptions.length
        ? availableVariants.reduce((sum, variant) => sum + variant.stock, 0)
        : product.stock,
      categoryName: categoryName ?? "Cakes",
      offer: offer
        ? {
            id: offer.id,
            title: offer.title,
            discountPercent: offer.discountPercent,
            endsAt: offer.endsAt,
            discountedPricePaise: priceAfterDiscount(
              product.pricePaise,
              offer.discountPercent
            ),
          }
        : null,
    };
  });
}

const productSort = z
  .enum(["popular", "price-low", "price-high", "newest"])
  .default("popular");
const listInput = z
  .object({
    search: z.string().trim().max(100).optional(),
    categorySlug: z.string().max(100).optional(),
    minPrice: z.number().int().min(0).optional(),
    maxPrice: z.number().int().min(0).optional(),
    sort: productSort,
    limit: z.number().int().min(1).max(48).default(24),
    offset: z.number().int().min(0).max(500).default(0),
    onlyOffers: z.boolean().default(false),
  })
  .optional();
const profileInput = z.object({
  phone: z.string().trim().max(32).optional(),
  defaultAddress: z.string().trim().max(600).optional(),
});
const checkoutInput = z.object({
  items: z
  .array(
      z.object({
        productId: z.number().int().positive(),
        variantId: z.number().int().positive().optional(),
        quantity: z.number().int().min(1).max(20),
      })
    )
    .min(1)
    .max(30),
  customerName: z.string().trim().min(2).max(120),
  customerPhone: phone,
  customerEmail: email.optional().default(""),
  deliveryAddress: z.string().trim().max(800).optional().default(""),
  fulfillmentMethod: z.enum(["delivery", "pickup"]).default("delivery"),
  deliveryDate: dateString,
  deliveryTime: z.string().trim().min(2).max(40),
  instructions: z.string().trim().max(1000).optional(),
  paymentMethod: z.enum(["cod", "pay_at_store"]).default("cod"),
});

export const appRouter = router({
  system: systemRouter,
  storefront: storefrontOperationsRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user),
    updateProfile: protectedProcedure
      .input(profileInput)
      .mutation(async ({ ctx, input }) => {
        const db = await database();
        await db
          .update(users)
          .set({
            phone: input.phone ?? null,
            defaultAddress: input.defaultAddress ?? null,
          })
          .where(eq(users.id, ctx.user.id));
        return { success: true };
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  catalog: router({
    home: publicProcedure.query(async () => {
      const db = await database();
      const categoryRows = await db
        .select()
        .from(categories)
        .orderBy(asc(categories.name));
      const base = db
        .select({ product: products, categoryName: categories.name })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(eq(products.isAvailable, true));
      const featuredRows = await base
        .orderBy(desc(products.isFeatured), desc(products.popularity))
        .limit(8);
      const newRows = await db
        .select({ product: products, categoryName: categories.name })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(and(eq(products.isAvailable, true), eq(products.isNew, true)))
        .orderBy(desc(products.createdAt))
        .limit(4);
      const featuredIds = featuredRows.map(({ product }) => product.id);
      const favouriteRows = await db
        .select({ product: products, categoryName: categories.name })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(
          featuredIds.length
            ? and(
                eq(products.isAvailable, true),
                notInArray(products.id, featuredIds)
              )
            : eq(products.isAvailable, true)
        )
        .orderBy(desc(products.ratingTenths), desc(products.popularity))
        .limit(4);
      const productRows = await db
        .select({ product: products, categoryName: categories.name })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(eq(products.isAvailable, true))
        .orderBy(desc(products.popularity))
        .limit(12);
      const active = await currentOffers(db);
      const specials = productRows
        .filter(({ product }) => active.has(product.id))
        .slice(0, 4);
      const [featured, arrivals, offersList, favourites] = await Promise.all([
        publicProducts(db, featuredRows),
        publicProducts(db, newRows),
        publicProducts(db, specials),
        publicProducts(db, favouriteRows),
      ]);
      const approvedReviews = await db
        .select()
        .from(reviews)
        .where(eq(reviews.status, "approved"))
        .orderBy(desc(reviews.createdAt))
        .limit(3);
      return {
        categories: categoryRows,
        featured,
        favourites,
        newArrivals: arrivals,
        specials: offersList,
        reviews: approvedReviews,
      };
    }),
    categories: publicProcedure.query(async () =>
      (await database()).select().from(categories).orderBy(asc(categories.name))
    ),
    list: publicProcedure.input(listInput).query(async ({ input }) => {
      const db = await database();
      const options = input ?? {
        sort: "popular" as const,
        limit: 24,
        offset: 0,
        onlyOffers: false,
      };
      const filters = [eq(products.isAvailable, true)];
      if (options.search)
        filters.push(
          or(
            like(products.name, `%${options.search}%`),
            like(products.description, `%${options.search}%`)
          )!
        );
      if (options.categorySlug) {
        const category = await db
          .select({ id: categories.id })
          .from(categories)
          .where(eq(categories.slug, options.categorySlug))
          .limit(1);
        if (!category[0]) return { items: [], total: 0 };
        filters.push(eq(products.categoryId, category[0].id));
      }
      if (options.minPrice !== undefined)
        filters.push(gte(products.pricePaise, options.minPrice * 100));
      if (options.maxPrice !== undefined)
        filters.push(lte(products.pricePaise, options.maxPrice * 100));
      const orderBy =
        options.sort === "price-low"
          ? asc(products.pricePaise)
          : options.sort === "price-high"
            ? desc(products.pricePaise)
            : options.sort === "newest"
              ? desc(products.createdAt)
              : desc(products.popularity);
      const rows = await db
        .select({ product: products, categoryName: categories.name })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(and(...filters))
        .orderBy(orderBy)
        .limit(options.limit)
        .offset(options.offset);
      const items = await publicProducts(db, rows);
      const filtered = options.onlyOffers
        ? items.filter(item => item.offer)
        : items;
      const [totalRow] = await db
        .select({ value: count() })
        .from(products)
        .where(and(...filters));
      return { items: filtered, total: Number(totalRow?.value ?? 0) };
    }),
    byIds: publicProcedure
      .input(z.object({ ids: z.array(z.number().int().positive()).max(30) }))
      .query(async ({ input }) => {
        if (!input.ids.length) return [];
        const db = await database();
        const rows = await db
          .select({ product: products, categoryName: categories.name })
          .from(products)
          .leftJoin(categories, eq(products.categoryId, categories.id))
          .where(inArray(products.id, input.ids));
        return publicProducts(db, rows);
      }),
    bySlug: publicProcedure
      .input(z.object({ slug: z.string().max(160) }))
      .query(async ({ input }) => {
        const db = await database();
        const rows = await db
          .select({ product: products, categoryName: categories.name })
          .from(products)
          .leftJoin(categories, eq(products.categoryId, categories.id))
          .where(
            and(eq(products.slug, input.slug), eq(products.isAvailable, true))
          )
          .limit(1);
        return rows[0] ? (await publicProducts(db, rows))[0] : null;
      }),
    reviews: publicProcedure
      .input(
        z
          .object({ productId: z.number().int().positive().optional() })
          .optional()
      )
      .query(async ({ input }) => {
        const db = await database();
        return db
          .select()
          .from(reviews)
          .where(
            input?.productId
              ? and(
                  eq(reviews.status, "approved"),
                  eq(reviews.productId, input.productId)
                )
              : eq(reviews.status, "approved")
          )
          .orderBy(desc(reviews.createdAt))
          .limit(20);
      }),
  }),

  reviews: router({
    submit: protectedProcedure
      .input(
        z.object({
          productId: z.number().int().positive(),
          rating: z.number().int().min(1).max(5),
          body: z.string().trim().min(10).max(1200),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const db = await database();
        const [product] = await db
          .select({ id: products.id })
          .from(products)
          .where(eq(products.id, input.productId))
          .limit(1);
        if (!product)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Cake not found.",
          });
        await db
          .insert(reviews)
          .values({
            productId: product.id,
            userId: ctx.user.id,
            customerName: ctx.user.name || "Customer",
            rating: input.rating,
            body: input.body,
            status: "pending",
          });
        return {
          success: true,
          message: "Thank you! Your review will appear after moderation.",
        };
      }),
  }),

  orders: router({
    create: publicProcedure
      .input(checkoutInput)
      .mutation(async ({ ctx, input }) => {
        const db = await database();
        const [storedSettings] = await db
          .select()
          .from(businessSettings)
          .where(eq(businessSettings.id, 1))
          .limit(1);
        const settings = storedSettings ?? {
          businessAddress:
            "Ayesha Tower, S.V. Road, Opp. MTNL, Jogeshwari West, Mumbai 400060.",
          deliveryEnabled: true,
          pickupEnabled: true,
          deliveryFeePaise: 4900,
          freeDeliveryThresholdPaise: 79900,
          acceptingOrders: true,
          allowedPaymentMethods: "cod,pay_at_store",
          notifyNewOrders: true,
          timezone: "Asia/Kolkata",
        };
        if (!settings.acceptingOrders)
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Online orders are paused. Please contact the bakery.",
          });
        if (
          (input.fulfillmentMethod === "delivery" && !settings.deliveryEnabled) ||
          (input.fulfillmentMethod === "pickup" && !settings.pickupEnabled)
        )
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "That fulfilment option is currently unavailable.",
          });
        if (
          input.fulfillmentMethod === "delivery" &&
          input.deliveryAddress.trim().length < 8
        )
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Enter a delivery address of at least 8 characters.",
          });
        if (!settings.allowedPaymentMethods.split(",").includes(input.paymentMethod))
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "That payment method is currently unavailable.",
          });
        const code = `CKR-${nanoid(10).toUpperCase()}`;
        const timeZone = settings.timezone ?? "Asia/Kolkata";
        if (input.deliveryDate <= localDateInTimezone(new Date(), timeZone))
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Choose a future pickup or delivery date.",
          });
        let requestedAt: Date;
        try {
          requestedAt = localTimeRangeStartToUtc(input.deliveryDate, input.deliveryTime, timeZone);
        } catch (error) {
          throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Choose a valid pickup or delivery time." });
        }
        const result = await db.transaction(async tx => {
          const ids = input.items.map(item => item.productId);
          const rows = await tx
            .select({ product: products, categoryName: categories.name, categoryIsActive: categories.isActive })
            .from(products)
            .leftJoin(categories, eq(products.categoryId, categories.id))
            .where(inArray(products.id, ids));
          if (rows.length !== new Set(ids).size)
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "One or more cakes are no longer available.",
            });
          const variantIds = input.items
            .map(item => item.variantId)
            .filter((id): id is number => id !== undefined);
          const variantRows = variantIds.length
            ? await tx
                .select()
                .from(productVariants)
                .where(inArray(productVariants.id, variantIds))
            : [];
          const active = await currentOffers(
            tx as unknown as Awaited<ReturnType<typeof getDb>>
          );
          const lineItems = input.items.map(item => {
            const row = rows.find(
              candidate => candidate.product.id === item.productId
            )!;
            const product = row.product;
            const variant = item.variantId
              ? variantRows.find(candidate => candidate.id === item.variantId)
              : undefined;
            if (item.variantId && (!variant || variant.productId !== product.id))
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "One of the selected cake sizes is no longer available.",
              });
            const stock = variant ? variant.stock : product.stock;
            if (
              !product.isAvailable ||
              row.categoryIsActive !== true ||
              (variant && (!variant.isAvailable || variant.stock <= 0)) ||
              stock < item.quantity
            )
              throw new TRPCError({
                code: "CONFLICT",
                message: `${product.name}${variant ? ` (${variant.name})` : ""} has only ${stock} available.`,
              });
            const requiredLeadHours = Math.max(product.advanceOrderHours, Math.ceil(product.preparationMinutes / 60));
            if (requestedAt.getTime() < Date.now() + requiredLeadHours * 60 * 60 * 1000)
              throw new TRPCError({ code: "BAD_REQUEST", message: `${product.name} needs at least ${requiredLeadHours} hours of advance notice.` });
            const discount = active.get(product.id)?.discountPercent ?? 0;
            const basePrice = variant?.pricePaise ?? product.pricePaise;
            const unitPricePaise = discount
              ? priceAfterDiscount(basePrice, discount)
              : basePrice;
            return {
              productId: product.id,
              variantId: variant?.id ?? null,
              productNameSnapshot: product.name,
              variantNameSnapshot: variant?.name ?? null,
              productImageSnapshot: product.imageUrl,
              unitPricePaise,
              quantity: item.quantity,
              lineTotalPaise: unitPricePaise * item.quantity,
            };
          });
          const subtotalPaise = lineItems.reduce(
            (sum, item) => sum + item.lineTotalPaise,
            0
          );
          const deliveryFeePaise =
            input.fulfillmentMethod === "pickup" ||
            subtotalPaise >= settings.freeDeliveryThresholdPaise
              ? 0
              : settings.deliveryFeePaise;
          const totalPaise = subtotalPaise + deliveryFeePaise;
          await tx
            .insert(orders)
            .values({
              orderCode: code,
              userId: ctx.user?.id ?? null,
              customerName: input.customerName,
              customerPhone: input.customerPhone,
              customerEmail: input.customerEmail || null,
              deliveryAddress:
                input.fulfillmentMethod === "delivery"
                  ? input.deliveryAddress
                  : `Pickup at ${settings.businessAddress}`,
              fulfillmentMethod: input.fulfillmentMethod,
              deliveryDate: input.deliveryDate,
              deliveryTime: input.deliveryTime,
              instructions: input.instructions || null,
              paymentMethod: input.paymentMethod,
              subtotalPaise,
              deliveryFeePaise,
              totalPaise,
              status: "Order Placed",
            });
          const [created] = await tx
            .select({ id: orders.id })
            .from(orders)
            .where(eq(orders.orderCode, code))
            .limit(1);
          if (!created)
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Could not create the order.",
            });
          await tx
            .insert(orderItems)
            .values(lineItems.map(item => ({ ...item, orderId: created.id })));
          await tx.insert(orderStatusHistory).values({
            orderId: created.id,
            fromStatus: null,
            toStatus: "Order Placed",
            changedBy: ctx.user?.id ?? null,
          });
          if (settings.notifyNewOrders)
            await tx.insert(adminNotifications).values({
              kind: "order",
              entityId: created.id,
              title: "New cake order",
              body: `${input.customerName} placed ${code}.`,
            });
          for (const item of input.items) {
            const changed = item.variantId
              ? await tx
                  .update(productVariants)
                  .set({ stock: sql`${productVariants.stock} - ${item.quantity}` })
                  .where(
                    and(
                      eq(productVariants.id, item.variantId),
                      gte(productVariants.stock, item.quantity),
                      eq(productVariants.isAvailable, true)
                    )
                  )
              : await tx
                  .update(products)
                  .set({
                    stock: sql`${products.stock} - ${item.quantity}`,
                    popularity: sql`${products.popularity} + ${item.quantity}`,
                  })
                  .where(
                    and(
                      eq(products.id, item.productId),
                      gte(products.stock, item.quantity),
                      eq(products.isAvailable, true)
                    )
                  );
            if (item.variantId)
              await tx
                .update(products)
                .set({ popularity: sql`${products.popularity} + ${item.quantity}` })
                .where(eq(products.id, item.productId));
            const affectedRows = Number(
              (changed as unknown as [{ affectedRows?: number }])[0]
                ?.affectedRows ?? 0
            );
            if (affectedRows === 0)
              throw new TRPCError({
                code: "CONFLICT",
                message:
                  "Stock changed during checkout. Please review your cart.",
              });
            await tx.insert(productStockMovements).values({
              productId: item.productId,
              variantId: item.variantId ?? null,
              kind: "order",
              quantity: item.quantity,
              delta: -item.quantity,
              note: `Stock reserved for customer order ${code}.`,
              recordedBy: ctx.user?.id ?? null,
            });
          }
          return {
            orderCode: code,
            subtotalPaise,
            deliveryFeePaise,
            totalPaise,
          };
        });
        return result;
      }),
    track: publicProcedure
      .input(z.object({ orderCode: z.string().trim().min(8).max(32), phone }))
      .mutation(async ({ input }) => {
        const db = await database();
        const [order] = await db
          .select({
            id: orders.id,
            orderCode: orders.orderCode,
            customerPhone: orders.customerPhone,
            status: orders.status,
            deliveryDate: orders.deliveryDate,
            deliveryTime: orders.deliveryTime,
            createdAt: orders.createdAt,
          })
          .from(orders)
          .where(eq(orders.orderCode, input.orderCode.toUpperCase()))
          .limit(1);
        if (!order || digits(order.customerPhone) !== digits(input.phone))
          throw new TRPCError({
            code: "NOT_FOUND",
            message:
              "We couldn’t find that order. Check the order ID and phone number.",
          });
        const items = await db
          .select({
            productName: orderItems.productNameSnapshot,
            quantity: orderItems.quantity,
            unitPricePaise: orderItems.unitPricePaise,
          })
          .from(orderItems)
          .where(eq(orderItems.orderId, order.id));
        return {
          orderCode: order.orderCode,
          status: order.status,
          deliveryDate: order.deliveryDate,
          deliveryTime: order.deliveryTime,
          createdAt: order.createdAt,
          items,
        };
      }),
    mine: protectedProcedure.query(async ({ ctx }) => {
      const db = await database();
      const myOrders = await db
        .select({
          id: orders.id,
          orderCode: orders.orderCode,
          status: orders.status,
          totalPaise: orders.totalPaise,
          deliveryDate: orders.deliveryDate,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .where(eq(orders.userId, ctx.user.id))
        .orderBy(desc(orders.createdAt))
        .limit(50);
      if (!myOrders.length) return [];
      const items = await db
        .select()
        .from(orderItems)
        .where(
          inArray(
            orderItems.orderId,
            myOrders.map(order => order.id)
          )
        );
      return myOrders.map(order => ({
        ...order,
        items: items
          .filter(item => item.orderId === order.id)
          .map(
            ({ id: _id, orderId: _orderId, productId: _productId, ...item }) =>
              item
          ),
      }));
    }),
  }),

  customCake: router({
    submit: publicProcedure
      .input(
        z.object({
          customerName: z.string().trim().min(2).max(120),
          phone,
          email: email.optional().default(""),
          flavour: z.string().trim().min(2).max(100),
          size: z.string().trim().min(1).max(80),
          shape: z.string().trim().min(2).max(100),
          occasion: z.string().trim().min(2).max(100),
          cakeMessage: z.string().trim().max(140).optional(),
          preferredDate: dateString,
          budgetRange: z.string().trim().min(2).max(100),
          additionalInstructions: z.string().trim().max(1500).optional(),
        })
      )
      .mutation(async ({ input }) => {
        if (input.preferredDate < new Date().toISOString().slice(0, 10))
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Choose a future date.",
          });
        const db = await database();
        const created = await db
          .insert(customCakeEnquiries)
          .values({
            customerName: input.customerName,
            phone: input.phone,
            email: input.email || null,
            flavour: input.flavour,
            size: input.size,
            shape: input.shape,
            occasion: input.occasion,
            cakeMessage: input.cakeMessage || null,
            preferredDate: input.preferredDate,
            budgetRange: input.budgetRange,
            additionalInstructions: input.additionalInstructions || null,
            status: "pending",
          });
        const enquiryId = Number(
          (created as unknown as [{ insertId?: number }])[0]?.insertId ?? 0
        );
        const [settings] = await db
          .select({ notifyNewEnquiries: businessSettings.notifyNewEnquiries })
          .from(businessSettings)
          .where(eq(businessSettings.id, 1))
          .limit(1);
        if (enquiryId && settings?.notifyNewEnquiries !== false)
          await db.insert(adminNotifications).values({
            kind: "custom_enquiry",
            entityId: enquiryId,
            title: "New custom cake request",
            body: `${input.customerName} requested a ${input.flavour} cake.`,
          });
        return {
          success: true,
          message:
            "Your custom cake request is with our bakery team. We’ll be in touch soon.",
        };
      }),
  }),

  admin: router({
    ops: adminOperationsRouter,
    dashboard: adminProcedure.query(async () => {
      const db = await database();
      const [
        orderCount,
        pendingCount,
        completedCount,
        productCount,
        enquiryCount,
        salesRows,
      ] = await Promise.all([
        db.select({ value: count() }).from(orders),
        db
          .select({ value: count() })
          .from(orders)
          .where(
            inArray(orders.status, [
              "Order Placed",
              "Confirmed",
              "Preparing",
              "Ready for Pickup / Out for Delivery",
            ])
          ),
        db
          .select({ value: count() })
          .from(orders)
          .where(eq(orders.status, "Delivered")),
        db.select({ value: count() }).from(products),
        db
          .select({ value: count() })
          .from(customCakeEnquiries)
          .where(eq(customCakeEnquiries.status, "pending")),
        db
          .select({
            total: sql<number>`coalesce(sum(${orders.totalPaise}), 0)`,
          })
          .from(orders)
          .where(sql`${orders.status} <> 'Cancelled'`),
      ]);
      return {
        totalOrders: Number(orderCount[0]?.value ?? 0),
        pendingOrders: Number(pendingCount[0]?.value ?? 0),
        completedOrders: Number(completedCount[0]?.value ?? 0),
        totalProducts: Number(productCount[0]?.value ?? 0),
        customEnquiries: Number(enquiryCount[0]?.value ?? 0),
        salesPaise: Number(salesRows[0]?.total ?? 0),
      };
    }),
    products: adminProcedure
      .input(
        z.object({ search: z.string().trim().max(100).optional() }).optional()
      )
      .query(async ({ input }) => {
        const db = await database();
        return db
          .select({ product: products, categoryName: categories.name })
          .from(products)
          .leftJoin(categories, eq(products.categoryId, categories.id))
          .where(
            input?.search ? like(products.name, `%${input.search}%`) : undefined
          )
          .orderBy(desc(products.createdAt))
          .limit(200);
      }),
    customers: adminProcedure
      .input(
        z.object({ search: z.string().trim().max(100).optional() }).optional()
      )
      .query(async ({ input }) => {
        const db = await database();
        const criteria = input?.search
          ? and(
              eq(users.role, "user"),
              or(
                like(users.name, `%${input.search}%`),
                like(users.email, `%${input.search}%`),
                like(users.phone, `%${input.search}%`)
              )
            )
          : eq(users.role, "user");
        const records = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            phone: users.phone,
            adminNotes: users.adminNotes,
            createdAt: users.createdAt,
            lastSignedIn: users.lastSignedIn,
          })
          .from(users)
          .where(criteria)
          .orderBy(desc(users.createdAt))
          .limit(200);
        if (!records.length) return [];
        const totals = await db
          .select({
            userId: orders.userId,
            orderCount: count(),
            orderValuePaise: sql<number>`coalesce(sum(case when ${orders.status} = 'Delivered' then ${orders.totalPaise} else 0 end), 0)`,
            recentOrderAt: sql<Date | null>`max(${orders.createdAt})`,
          })
          .from(orders)
          .where(
            inArray(
              orders.userId,
              records.map(record => record.id)
            )
          )
          .groupBy(orders.userId);
        const byUser = new Map(totals.map(row => [row.userId, row]));
        return records.map(record => ({
          ...record,
          orderCount: Number(byUser.get(record.id)?.orderCount ?? 0),
          orderValuePaise: Number(byUser.get(record.id)?.orderValuePaise ?? 0),
          recentOrderAt: byUser.get(record.id)?.recentOrderAt ?? null,
        }));
      }),
    uploadProductImage: adminProcedure
      .input(
        z.object({
        contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
        base64: z
          .string()
          .min(4)
          .max(process.env.VERCEL ? 3_500_000 : 5_600_000)
          .regex(/^[A-Za-z0-9+/]+={0,2}$/),
      })
    )
      .mutation(async ({ input }) => {
        if (!ENV.forgeApiUrl || !ENV.forgeApiKey)
          throw new TRPCError({
            code: "SERVICE_UNAVAILABLE",
            message:
              "Managed media storage is unavailable. Use an existing HTTPS image URL instead.",
          });
        const bytes = Buffer.from(input.base64, "base64");
        const maxImageBytes = process.env.VERCEL ? 2_621_440 : 4 * 1024 * 1024;
        const maxImageLabel = process.env.VERCEL ? "2.5 MB" : "4 MB";
        if (
          !bytes.length ||
          bytes.length > maxImageBytes ||
          bytes.toString("base64") !== input.base64
        )
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Choose a valid image under ${maxImageLabel}.`,
          });
        const isValid =
          input.contentType === "image/png"
            ? bytes
                .subarray(0, 8)
                .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
            : input.contentType === "image/jpeg"
              ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
              : bytes.subarray(0, 4).toString() === "RIFF" &&
                bytes.subarray(8, 12).toString() === "WEBP";
        if (!isValid)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "The uploaded bytes do not match the selected image type.",
          });
        const extension =
          input.contentType === "image/jpeg"
            ? "jpg"
            : input.contentType === "image/png"
              ? "png"
              : "webp";
        const key = `cakers/products/${nanoid()}.${extension}`;
        const apiBase = ENV.forgeApiUrl.replace(/\/$/, "");
        const signedResponse = await fetch(
          `${apiBase}/v1/storage/presign/put?path=${encodeURIComponent(key)}`,
          { headers: { Authorization: `Bearer ${ENV.forgeApiKey}` } }
        );
        const signed = (await signedResponse.json().catch(() => ({}))) as {
          url?: string;
          error?: string;
        };
        if (!signedResponse.ok || !signed.url)
          throw new TRPCError({
            code: "SERVICE_UNAVAILABLE",
            message: "Could not prepare secure cake-image storage.",
          });
        const uploaded = await fetch(signed.url, {
          method: "PUT",
          headers: { "Content-Type": input.contentType },
          body: new Uint8Array(bytes),
        });
        if (!uploaded.ok)
          throw new TRPCError({
            code: "SERVICE_UNAVAILABLE",
            message: "The cake image could not be saved to secure storage.",
          });
        return { imageUrl: `/manus-storage/${key}` };
      }),
    categories: adminProcedure.query(async () =>
      (await database()).select().from(categories).orderBy(asc(categories.name))
    ),
    createProduct: adminProcedure
      .input(
        z.object({
          categoryId: z.number().int().positive(),
          name: z.string().trim().min(2).max(140),
          slug: z
            .string()
            .trim()
            .min(2)
            .max(160)
            .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
          description: z.string().trim().min(10).max(2000),
          imageUrl: safeImage,
          priceRupees: z.number().int().min(1).max(200000),
          stock: z.number().int().min(0).max(10000),
          eggOption: z.enum(["eggless", "contains_egg", "choice"]).default("choice"),
          customizationOptions: z.string().trim().max(2000).optional(),
          preparationMinutes: z.number().int().min(0).max(10080).default(240),
          advanceOrderHours: z.number().int().min(0).max(720).default(24),
          isAvailable: z.boolean(),
          isNew: z.boolean(),
          isFeatured: z.boolean(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const db = await database();
        return db.transaction(async tx => {
          const [category] = await tx.select({ id: categories.id }).from(categories).where(and(eq(categories.id, input.categoryId), eq(categories.isActive, true))).limit(1);
          if (!category) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose an active product category." });
          const result = await tx.insert(products).values({
            categoryId: input.categoryId,
            name: input.name,
            slug: input.slug,
            description: input.description,
            imageUrl: input.imageUrl,
            pricePaise: input.priceRupees * 100,
            stock: input.stock,
            eggOption: input.eggOption,
            customizationOptions: input.customizationOptions || null,
            preparationMinutes: input.preparationMinutes,
            advanceOrderHours: input.advanceOrderHours,
            isAvailable: input.isAvailable,
            isNew: input.isNew,
            isFeatured: input.isFeatured,
            popularity: 0,
          });
          const productId = Number((result as unknown as [{ insertId?: number }])[0]?.insertId ?? 0);
          if (input.stock > 0 && productId) await tx.insert(productStockMovements).values({ productId, kind: "initial", quantity: input.stock, delta: input.stock, note: "Initial cake stock recorded.", recordedBy: ctx.user.id });
          return { success: true };
        });
      }),
    updateProduct: adminProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          categoryId: z.number().int().positive(),
          name: z.string().trim().min(2).max(140),
          slug: z
            .string()
            .trim()
            .min(2)
            .max(160)
            .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
          description: z.string().trim().min(10).max(2000),
          imageUrl: safeImage,
          priceRupees: z.number().int().min(1).max(200000),
          stock: z.number().int().min(0).max(10000),
          eggOption: z.enum(["eggless", "contains_egg", "choice"]).default("choice"),
          customizationOptions: z.string().trim().max(2000).optional(),
          preparationMinutes: z.number().int().min(0).max(10080).default(240),
          advanceOrderHours: z.number().int().min(0).max(720).default(24),
          isAvailable: z.boolean(),
          isNew: z.boolean(),
          isFeatured: z.boolean(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const db = await database();
        const { id, priceRupees, ...values } = input;
        return db.transaction(async tx => {
          const [current] = await tx.select().from(products).where(eq(products.id, id)).for("update").limit(1);
          if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Cake product not found." });
          const [category] = await tx.select({ id: categories.id }).from(categories).where(and(eq(categories.id, input.categoryId), eq(categories.isActive, true))).limit(1);
          if (!category) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose an active product category." });
          const delta = input.stock - current.stock;
          await tx.update(products).set({ ...values, pricePaise: priceRupees * 100, customizationOptions: input.customizationOptions || null }).where(eq(products.id, id));
          if (delta !== 0) await tx.insert(productStockMovements).values({ productId: id, kind: "adjustment", quantity: Math.abs(delta), delta, note: "Cake stock count changed in product details.", recordedBy: ctx.user.id });
          return { success: true };
        });
      }),
    deleteProduct: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const db = await database();
        return db.transaction(async tx => {
          const [product] = await tx.select({ id: products.id }).from(products).where(eq(products.id, input.id)).for("update").limit(1);
          if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Cake product not found." });
          await tx.update(products).set({ isAvailable: false }).where(eq(products.id, input.id));
          await tx.update(productVariants).set({ isAvailable: false }).where(eq(productVariants.productId, input.id));
          return { success: true, archived: true };
        });
      }),
    orders: adminProcedure
      .input(
        z
          .object({
            search: z.string().trim().max(100).optional(),
            status: z.enum(orderStatusValues).optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        const db = await database();
        const filters = [];
        if (input?.search)
          filters.push(
            or(
              like(orders.orderCode, `%${input.search}%`),
              like(orders.customerName, `%${input.search}%`),
              like(orders.customerPhone, `%${input.search}%`)
            )!
          );
        if (input?.status) filters.push(eq(orders.status, input.status));
        return db
          .select()
          .from(orders)
          .where(filters.length ? and(...filters) : undefined)
          .orderBy(desc(orders.createdAt))
          .limit(200);
      }),
    orderDetails: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input }) => {
        const db = await database();
        const [order] = await db
          .select()
          .from(orders)
          .where(eq(orders.id, input.id))
          .limit(1);
        if (!order)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Order not found.",
          });
        const items = await db
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, order.id));
        const [payments, history] = await Promise.all([
          db
            .select()
            .from(paymentRecords)
            .where(eq(paymentRecords.orderId, order.id))
            .orderBy(desc(paymentRecords.createdAt)),
          db
            .select()
            .from(orderStatusHistory)
            .where(eq(orderStatusHistory.orderId, order.id))
            .orderBy(asc(orderStatusHistory.createdAt)),
        ]);
        return { ...order, items, payments, history };
      }),
    updateOrderStatus: adminProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          status: z.enum(orderStatusValues),
          note: z.string().trim().max(500).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => transitionOrderStatus(input, ctx.user.id)),
    offers: adminProcedure.query(async () => {
      const db = await database();
      return db
        .select({
          offer: offers,
          productName: products.name,
          pricePaise: products.pricePaise,
        })
        .from(offers)
        .leftJoin(products, eq(offers.productId, products.id))
        .orderBy(desc(offers.createdAt));
    }),
    saveOffer: adminProcedure
      .input(
        z.object({
          id: z.number().int().positive().optional(),
          productId: z.number().int().positive(),
          title: z.string().trim().min(2).max(120),
          discountPercent: z.number().int().min(1).max(80),
          startsAt: dateString,
          endsAt: dateString,
          isActive: z.boolean(),
        })
      )
      .mutation(async ({ input }) => {
        if (input.endsAt < input.startsAt)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Offer end date must be after the start date.",
          });
        const db = await database();
        const [product] = await db
          .select({ id: products.id })
          .from(products)
          .where(eq(products.id, input.productId))
          .limit(1);
        if (!product)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Cake not found.",
          });
        const values = {
          productId: input.productId,
          title: input.title,
          discountPercent: input.discountPercent,
          startsAt: new Date(`${input.startsAt}T00:00:00.000Z`),
          endsAt: new Date(`${input.endsAt}T23:59:59.000Z`),
          isActive: input.isActive,
        };
        if (input.id) {
          const [conflict] = await db
            .select({ id: offers.id })
            .from(offers)
            .where(
              and(
                eq(offers.productId, input.productId),
                sql`${offers.id} <> ${input.id}`
              )
            )
            .limit(1);
          if (conflict)
            throw new TRPCError({
              code: "CONFLICT",
              message:
                "That cake already has a different promotion. Edit that offer instead.",
            });
          await db.update(offers).set(values).where(eq(offers.id, input.id));
        } else {
          const [existing] = await db
            .select({ id: offers.id })
            .from(offers)
            .where(eq(offers.productId, input.productId))
            .limit(1);
          if (existing)
            await db
              .update(offers)
              .set(values)
              .where(eq(offers.id, existing.id));
          else await db.insert(offers).values(values);
        }
        return { success: true };
      }),
    deleteOffer: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        await (await database()).delete(offers).where(eq(offers.id, input.id));
        return { success: true };
      }),
    enquiries: adminProcedure
      .input(
        z
          .object({
            status: z
              .enum(["pending", "contacted", "accepted", "rejected"])
              .optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        const db = await database();
        return db
          .select()
          .from(customCakeEnquiries)
          .where(
            input?.status
              ? eq(customCakeEnquiries.status, input.status)
              : undefined
          )
          .orderBy(desc(customCakeEnquiries.createdAt))
          .limit(200);
      }),
    updateEnquiryStatus: adminProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          status: z.enum(["pending", "contacted", "accepted", "rejected"]),
        })
      )
      .mutation(async ({ input }) => {
        await (await database())
          .update(customCakeEnquiries)
          .set({ status: input.status })
          .where(eq(customCakeEnquiries.id, input.id));
        return { success: true };
      }),
    reviews: adminProcedure
      .input(
        z
          .object({
            status: z.enum(["pending", "approved", "rejected"]).optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        const db = await database();
        return db
          .select()
          .from(reviews)
          .where(input?.status ? eq(reviews.status, input.status) : undefined)
          .orderBy(desc(reviews.createdAt))
          .limit(200);
      }),
    updateReviewStatus: adminProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          status: z.enum(["pending", "approved", "rejected"]),
        })
      )
      .mutation(async ({ input }) => {
        await (await database())
          .update(reviews)
          .set({ status: input.status })
          .where(eq(reviews.id, input.id));
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
