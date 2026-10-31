import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { ORDER_STATUS_VALUES } from "../shared/shop";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "staff", "admin"]).default("user").notNull(),
  phone: varchar("phone", { length: 32 }),
  defaultAddress: text("defaultAddress"),
  adminNotes: text("adminNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const categories = mysqlTable(
  "categories",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 80 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    description: varchar("description", { length: 255 })
      .notNull()
      .default("Freshly made for your celebration."),
    imageUrl: varchar("imageUrl", { length: 500 }).notNull(),
    isActive: boolean("isActive").notNull().default(true),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [uniqueIndex("categories_slug_unique").on(table.slug)]
);
export type Category = typeof categories.$inferSelect;

export const products = mysqlTable(
  "products",
  {
    id: int("id").autoincrement().primaryKey(),
    categoryId: int("categoryId")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 140 }).notNull(),
    slug: varchar("slug", { length: 160 }).notNull(),
    description: text("description").notNull(),
    imageUrl: varchar("imageUrl", { length: 500 }).notNull(),
    pricePaise: int("pricePaise").notNull(),
    stock: int("stock").notNull().default(12),
    popularity: int("popularity").notNull().default(0),
    ratingTenths: int("ratingTenths").notNull().default(48),
    eggOption: mysqlEnum("eggOption", ["eggless", "contains_egg", "choice"])
      .notNull()
      .default("choice"),
    customizationOptions: text("customizationOptions"),
    preparationMinutes: int("preparationMinutes").notNull().default(240),
    advanceOrderHours: int("advanceOrderHours").notNull().default(24),
    isAvailable: boolean("isAvailable").notNull().default(true),
    isNew: boolean("isNew").notNull().default(false),
    isFeatured: boolean("isFeatured").notNull().default(false),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("products_slug_unique").on(table.slug),
    index("products_category_idx").on(table.categoryId),
    index("products_available_idx").on(table.isAvailable),
  ]
);
export type Product = typeof products.$inferSelect;

export const productVariants = mysqlTable(
  "productVariants",
  {
    id: int("id").autoincrement().primaryKey(),
    productId: int("productId")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 80 }).notNull(),
    pricePaise: int("pricePaise").notNull(),
    stock: int("stock").notNull().default(0),
    isAvailable: boolean("isAvailable").notNull().default(true),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("product_variant_name_unique").on(table.productId, table.name),
    index("product_variants_product_idx").on(table.productId),
    check("product_variant_price_positive", sql`${table.pricePaise} > 0`),
    check("product_variant_stock_nonnegative", sql`${table.stock} >= 0`),
  ]
);
export type ProductVariant = typeof productVariants.$inferSelect;

export const offers = mysqlTable(
  "offers",
  {
    id: int("id").autoincrement().primaryKey(),
    productId: int("productId")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 120 }).notNull(),
    discountPercent: int("discountPercent").notNull(),
    startsAt: timestamp("startsAt").notNull(),
    endsAt: timestamp("endsAt").notNull(),
    isActive: boolean("isActive").notNull().default(true),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("offers_product_unique").on(table.productId),
    index("offers_active_window_idx").on(table.isActive, table.endsAt),
  ]
);
export type Offer = typeof offers.$inferSelect;

export const orderStatusValues = ORDER_STATUS_VALUES;
export type OrderStatus = (typeof orderStatusValues)[number];
export const customEnquiryStatusValues = [
  "pending",
  "contacted",
  "accepted",
  "rejected",
] as const;
export type CustomEnquiryStatus = (typeof customEnquiryStatusValues)[number];
export const contactEnquiryStatusValues = [
  "new",
  "in_progress",
  "resolved",
] as const;
export const paymentStatusValues = [
  "unpaid",
  "partially_paid",
  "paid",
  "refunded",
] as const;
export type PaymentStatus = (typeof paymentStatusValues)[number];

export const orders = mysqlTable(
  "orders",
  {
    id: int("id").autoincrement().primaryKey(),
    orderCode: varchar("orderCode", { length: 32 }).notNull(),
    userId: int("userId").references(() => users.id, { onDelete: "set null" }),
    customerName: varchar("customerName", { length: 120 }).notNull(),
    customerPhone: varchar("customerPhone", { length: 32 }).notNull(),
    customerEmail: varchar("customerEmail", { length: 320 }),
    deliveryAddress: text("deliveryAddress").notNull(),
    fulfillmentMethod: mysqlEnum("fulfillmentMethod", ["delivery", "pickup"])
      .notNull()
      .default("delivery"),
    deliveryDate: varchar("deliveryDate", { length: 10 }).notNull(),
    deliveryTime: varchar("deliveryTime", { length: 40 }).notNull(),
    instructions: text("instructions"),
    paymentMethod: mysqlEnum("paymentMethod", ["cod", "pay_at_store"])
      .notNull()
      .default("cod"),
    paymentStatus: mysqlEnum("paymentStatus", paymentStatusValues)
      .notNull()
      .default("unpaid"),
    subtotalPaise: int("subtotalPaise").notNull(),
    deliveryFeePaise: int("deliveryFeePaise").notNull(),
    totalPaise: int("totalPaise").notNull(),
    status: mysqlEnum("status", orderStatusValues)
      .notNull()
      .default("Order Placed"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("orders_code_unique").on(table.orderCode),
    index("orders_user_idx").on(table.userId),
    index("orders_status_created_idx").on(table.status, table.createdAt),
    index("orders_payment_status_idx").on(table.paymentStatus, table.createdAt),
  ]
);
export type Order = typeof orders.$inferSelect;

export const orderItems = mysqlTable(
  "orderItems",
  {
    id: int("id").autoincrement().primaryKey(),
    orderId: int("orderId")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: int("productId").references(() => products.id, {
      onDelete: "set null",
    }),
    variantId: int("variantId").references(() => productVariants.id, {
      onDelete: "set null",
    }),
    productNameSnapshot: varchar("productNameSnapshot", {
      length: 140,
    }).notNull(),
    variantNameSnapshot: varchar("variantNameSnapshot", { length: 80 }),
    productImageSnapshot: varchar("productImageSnapshot", { length: 500 }).notNull(),
    unitPricePaise: int("unitPricePaise").notNull(),
    quantity: int("quantity").notNull(),
    lineTotalPaise: int("lineTotalPaise").notNull(),
  },
  table => [index("order_items_order_idx").on(table.orderId)]
);
export type OrderItem = typeof orderItems.$inferSelect;

export const orderStatusHistory = mysqlTable(
  "orderStatusHistory",
  {
    id: int("id").autoincrement().primaryKey(),
    orderId: int("orderId")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    fromStatus: mysqlEnum("fromStatus", orderStatusValues),
    toStatus: mysqlEnum("toStatus", orderStatusValues).notNull(),
    note: varchar("note", { length: 500 }),
    changedBy: int("changedBy").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("order_history_order_created_idx").on(table.orderId, table.createdAt)]
);

export const paymentRecords = mysqlTable(
  "paymentRecords",
  {
    id: int("id").autoincrement().primaryKey(),
    orderId: int("orderId")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    kind: mysqlEnum("kind", ["received", "refunded"]).notNull(),
    method: mysqlEnum("method", [
      "cash",
      "upi",
      "card",
      "bank_transfer",
      "cod",
      "pay_at_store",
    ]).notNull(),
    amountPaise: int("amountPaise").notNull(),
    reference: varchar("reference", { length: 120 }),
    notes: varchar("notes", { length: 500 }),
    recordedBy: int("recordedBy").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("payment_records_order_created_idx").on(table.orderId, table.createdAt),
    index("payment_records_kind_created_idx").on(table.kind, table.createdAt),
    check("payment_amount_positive", sql`${table.amountPaise} > 0`),
  ]
);

export const customCakeEnquiries = mysqlTable(
  "customCakeEnquiries",
  {
    id: int("id").autoincrement().primaryKey(),
    customerName: varchar("customerName", { length: 120 }).notNull(),
    phone: varchar("phone", { length: 32 }).notNull(),
    email: varchar("email", { length: 320 }),
    flavour: varchar("flavour", { length: 100 }).notNull(),
    size: varchar("size", { length: 80 }).notNull(),
    shape: varchar("shape", { length: 100 }).notNull(),
    occasion: varchar("occasion", { length: 100 }).notNull(),
    cakeMessage: varchar("cakeMessage", { length: 140 }),
    preferredDate: varchar("preferredDate", { length: 10 }).notNull(),
    budgetRange: varchar("budgetRange", { length: 100 }).notNull(),
    additionalInstructions: text("additionalInstructions"),
    adminNotes: text("adminNotes"),
    status: mysqlEnum("status", customEnquiryStatusValues)
      .notNull()
      .default("pending"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("custom_enquiries_status_created_idx").on(
      table.status,
      table.createdAt
    ),
  ]
);
export type CustomCakeEnquiry = typeof customCakeEnquiries.$inferSelect;

export const customerEnquiries = mysqlTable(
  "customerEnquiries",
  {
    id: int("id").autoincrement().primaryKey(),
    customerName: varchar("customerName", { length: 120 }).notNull(),
    phone: varchar("phone", { length: 32 }),
    email: varchar("email", { length: 320 }),
    subject: varchar("subject", { length: 160 }).notNull(),
    message: text("message").notNull(),
    status: mysqlEnum("status", contactEnquiryStatusValues).notNull().default("new"),
    internalNotes: text("internalNotes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("customer_enquiries_status_created_idx").on(
      table.status,
      table.createdAt
    ),
  ]
);

export const reviews = mysqlTable(
  "reviews",
  {
    id: int("id").autoincrement().primaryKey(),
    productId: int("productId").references(() => products.id, {
      onDelete: "set null",
    }),
    userId: int("userId").references(() => users.id, { onDelete: "set null" }),
    customerName: varchar("customerName", { length: 120 }).notNull(),
    rating: int("rating").notNull(),
    body: text("body").notNull(),
    status: mysqlEnum("status", ["pending", "approved", "rejected"])
      .notNull()
      .default("pending"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("reviews_status_created_idx").on(table.status, table.createdAt),
    index("reviews_product_idx").on(table.productId),
  ]
);
export type Review = typeof reviews.$inferSelect;

export const inventoryItems = mysqlTable(
  "inventoryItems",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    unit: varchar("unit", { length: 24 }).notNull(),
    quantityMilli: int("quantityMilli").notNull().default(0),
    minimumQuantityMilli: int("minimumQuantityMilli").notNull().default(0),
    supplier: varchar("supplier", { length: 200 }),
    isActive: boolean("isActive").notNull().default(true),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("inventory_items_name_unique").on(table.name),
    index("inventory_items_active_updated_idx").on(table.isActive, table.updatedAt),
    check("inventory_quantity_nonnegative", sql`${table.quantityMilli} >= 0`),
    check("inventory_minimum_nonnegative", sql`${table.minimumQuantityMilli} >= 0`),
  ]
);

export const inventoryMovements = mysqlTable(
  "inventoryMovements",
  {
    id: int("id").autoincrement().primaryKey(),
    itemId: int("itemId")
      .notNull()
      .references(() => inventoryItems.id, { onDelete: "restrict" }),
    kind: mysqlEnum("kind", ["received", "used", "adjustment"]).notNull(),
    quantityMilli: int("quantityMilli").notNull(),
    deltaMilli: int("deltaMilli").notNull(),
    note: varchar("note", { length: 500 }).notNull(),
    recordedBy: int("recordedBy").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("inventory_movement_item_created_idx").on(table.itemId, table.createdAt),
  ]
);

export const productStockMovements = mysqlTable(
  "productStockMovements",
  {
    id: int("id").autoincrement().primaryKey(),
    productId: int("productId")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    variantId: int("variantId").references(() => productVariants.id, {
      onDelete: "set null",
    }),
    kind: mysqlEnum("kind", ["received", "used", "adjustment", "order", "initial", "cancellation"])
      .notNull(),
    quantity: int("quantity").notNull(),
    delta: int("delta").notNull(),
    note: varchar("note", { length: 500 }).notNull(),
    recordedBy: int("recordedBy").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("product_stock_movement_product_created_idx").on(
      table.productId,
      table.createdAt
    ),
    index("product_stock_movement_variant_idx").on(table.variantId),
    check("product_stock_movement_quantity_nonnegative", sql`${table.quantity} >= 0`),
  ]
);

export const businessSettings = mysqlTable("businessSettings", {
  id: int("id").primaryKey().default(1),
  businessName: varchar("businessName", { length: 120 })
    .notNull()
    .default("Cakers & Cakers"),
  businessAddress: text("businessAddress")
    .notNull(),
  contactPhone: varchar("contactPhone", { length: 32 }).notNull().default(""),
  contactEmail: varchar("contactEmail", { length: 320 }).notNull().default(""),
  openingHours: varchar("openingHours", { length: 500 })
    .notNull()
    .default("Tuesday–Sunday · 10:00 am–8:00 pm"),
  deliveryEnabled: boolean("deliveryEnabled").notNull().default(true),
  pickupEnabled: boolean("pickupEnabled").notNull().default(true),
  deliveryFeePaise: int("deliveryFeePaise").notNull().default(4900),
  freeDeliveryThresholdPaise: int("freeDeliveryThresholdPaise")
    .notNull()
    .default(79900),
  acceptingOrders: boolean("acceptingOrders").notNull().default(true),
  allowedPaymentMethods: varchar("allowedPaymentMethods", { length: 80 })
    .notNull()
    .default("cod,pay_at_store"),
  notifyNewOrders: boolean("notifyNewOrders").notNull().default(true),
  notifyNewEnquiries: boolean("notifyNewEnquiries").notNull().default(true),
  notifyLowStock: boolean("notifyLowStock").notNull().default(true),
  timezone: varchar("timezone", { length: 64 }).notNull().default("Asia/Kolkata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const adminNotifications = mysqlTable(
  "adminNotifications",
  {
    id: int("id").autoincrement().primaryKey(),
    kind: mysqlEnum("kind", ["order", "enquiry", "custom_enquiry"]).notNull(),
    entityId: int("entityId").notNull(),
    title: varchar("title", { length: 160 }).notNull(),
    body: varchar("body", { length: 500 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    readAt: timestamp("readAt"),
  },
  table => [
    index("admin_notifications_read_created_idx").on(table.readAt, table.createdAt),
    index("admin_notifications_entity_idx").on(table.kind, table.entityId),
  ]
);
