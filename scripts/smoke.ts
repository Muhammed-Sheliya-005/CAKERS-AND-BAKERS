import assert from "node:assert/strict";
import { eq, sql } from "drizzle-orm";
import { appRouter } from "../server/routers";
import { closeDb, getDb } from "../server/db";
import { orderItems, orders, products, type User } from "../drizzle/schema";

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

    const cake = home.featured.find(item => item.stock > 0 && item.isAvailable);
    assert.ok(cake, "an in-stock sample cake should be available");
    productId = cake.id;

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
      `PASS: ${home.categories.length} categories, database-backed checkout, immutable order snapshot, phone-verified private tracking, status update to ${updated.status}, and admin-role enforcement.`
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
            await tx.delete(orderItems).where(eq(orderItems.orderId, order.id));
            await tx.delete(orders).where(eq(orders.id, order.id));
            await tx
              .update(products)
              .set({
                stock: sql`${products.stock} + 1`,
                popularity: sql`greatest(0, ${products.popularity} - 1)`,
              })
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
