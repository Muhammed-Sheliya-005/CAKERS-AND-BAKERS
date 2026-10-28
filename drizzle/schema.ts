import {
  boolean,
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
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  phone: varchar("phone", { length: 32 }),
  defaultAddress: text("defaultAddress"),
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
    deliveryDate: varchar("deliveryDate", { length: 10 }).notNull(),
    deliveryTime: varchar("deliveryTime", { length: 40 }).notNull(),
    instructions: text("instructions"),
    paymentMethod: mysqlEnum("paymentMethod", ["cod", "pay_at_store"])
      .notNull()
      .default("cod"),
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
    productNameSnapshot: varchar("productNameSnapshot", {
      length: 140,
    }).notNull(),
    productImageSnapshot: varchar("productImageSnapshot", {
      length: 500,
    }).notNull(),
    unitPricePaise: int("unitPricePaise").notNull(),
    quantity: int("quantity").notNull(),
    lineTotalPaise: int("lineTotalPaise").notNull(),
  },
  table => [index("order_items_order_idx").on(table.orderId)]
);
export type OrderItem = typeof orderItems.$inferSelect;

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
