import "dotenv/config";
import { eq } from "drizzle-orm";
import { categories, offers, products, reviews } from "../drizzle/schema";
import { getDb } from "../server/db";

const image = {
  hero: "/manus-storage/async-images/lccqEzU1vj85eiz87C9MSW/image-1.webp",
  berry: "/manus-storage/async-images/lccqEzU1vj85eiz87C9MSW/image-2.webp",
  chocolate: "/manus-storage/async-images/lccqEzU1vj85eiz87C9MSW/image-3.webp",
  wedding: "/manus-storage/async-images/lccqEzU1vj85eiz87C9MSW/image-4.webp",
  cupcakes: "/manus-storage/async-images/lccqEzU1vj85eiz87C9MSW/image-5.webp",
};

const categorySeed = [
  [
    "Birthday Cakes",
    "birthday-cakes",
    "The sweetest centrepiece for another trip around the sun.",
    image.berry,
  ],
  [
    "Wedding Cakes",
    "wedding-cakes",
    "Thoughtfully finished for your once-in-a-lifetime day.",
    image.wedding,
  ],
  [
    "Chocolate Cakes",
    "chocolate-cakes",
    "Deep cocoa, glossy ganache and pure chocolate joy.",
    image.chocolate,
  ],
  [
    "Designer Cakes",
    "designer-cakes",
    "A little imagination, baked just for your celebration.",
    image.hero,
  ],
  [
    "Cupcakes",
    "cupcakes",
    "Little handmade treats, ready to make someone smile.",
    image.cupcakes,
  ],
  [
    "Pastries",
    "pastries",
    "Light, flaky, and lovely with a cup of chai.",
    image.cupcakes,
  ],
] as const;

const productSeed = [
  {
    slug: "strawberry-cloud",
    name: "Strawberry Cloud Cake",
    category: "birthday-cakes",
    description:
      "Soft vanilla sponge layered with strawberry cream, fresh berries and a cloud of blush buttercream.",
    imageUrl: image.berry,
    price: 1499,
    stock: 12,
    rating: 49,
    popularity: 98,
    featured: true,
    isNew: true,
  },
  {
    slug: "midnight-ganache",
    name: "Midnight Ganache",
    category: "chocolate-cakes",
    description:
      "A decadent chocolate sponge under silky dark ganache and hand-finished chocolate curls.",
    imageUrl: image.chocolate,
    price: 1699,
    stock: 9,
    rating: 50,
    popularity: 94,
    featured: true,
    isNew: false,
  },
  {
    slug: "ivory-garden",
    name: "Ivory Garden Wedding Cake",
    category: "wedding-cakes",
    description:
      "Two tiers of delicate vanilla bean cake, dressed with edible blooms and a touch of gold.",
    imageUrl: image.wedding,
    price: 6499,
    stock: 4,
    rating: 50,
    popularity: 82,
    featured: true,
    isNew: true,
  },
  {
    slug: "little-celebrations",
    name: "Little Celebrations Cupcakes",
    category: "cupcakes",
    description:
      "Four joyful vanilla, chocolate and pistachio cupcakes, swirled and finished by hand.",
    imageUrl: image.cupcakes,
    price: 699,
    stock: 18,
    rating: 48,
    popularity: 91,
    featured: true,
    isNew: true,
  },
  {
    slug: "rose-pistachio",
    name: "Rose & Pistachio",
    category: "designer-cakes",
    description:
      "Pistachio sponge, rose-scented cream and a delicate sprinkle of roasted nuts.",
    imageUrl: image.berry,
    price: 1899,
    stock: 8,
    rating: 48,
    popularity: 73,
    featured: true,
    isNew: false,
  },
  {
    slug: "caramel-cloud",
    name: "Salted Caramel Cloud",
    category: "designer-cakes",
    description:
      "Cloud-light sponge with ribbons of salted caramel and whipped vanilla frosting.",
    imageUrl: image.hero,
    price: 1599,
    stock: 11,
    rating: 47,
    popularity: 69,
    featured: false,
    isNew: true,
  },
  {
    slug: "dark-forest",
    name: "Black Forest Classic",
    category: "birthday-cakes",
    description:
      "Chocolate sponge, gently whipped cream, tart cherries and a generous chocolate finish.",
    imageUrl: image.chocolate,
    price: 1399,
    stock: 10,
    rating: 48,
    popularity: 86,
    featured: false,
    isNew: false,
  },
  {
    slug: "lemon-cloud",
    name: "Lemon & Vanilla Tart",
    category: "pastries",
    description:
      "Bright lemon curd meets buttery pastry and soft vanilla cream in a petite teatime favourite.",
    imageUrl: image.cupcakes,
    price: 349,
    stock: 20,
    rating: 47,
    popularity: 64,
    featured: false,
    isNew: false,
  },
  {
    slug: "rose-bento",
    name: "Blush Bento Cake",
    category: "designer-cakes",
    description:
      "A petite vanilla cake dressed in rosy buttercream and ready for a little handwritten message.",
    imageUrl: image.berry,
    price: 899,
    stock: 8,
    rating: 49,
    popularity: 80,
    featured: true,
    isNew: true,
  },
  {
    slug: "chocolate-truffle",
    name: "Chocolate Truffle Slice",
    category: "pastries",
    description:
      "A rich, tidy little slice of truffle cake with a smooth cocoa finish.",
    imageUrl: image.chocolate,
    price: 299,
    stock: 16,
    rating: 48,
    popularity: 70,
    featured: false,
    isNew: false,
  },
  {
    slug: "wedding-mini",
    name: "Petite Wedding Cake",
    category: "wedding-cakes",
    description:
      "A charming single-tier celebration cake with vanilla buttercream and seasonal flowers.",
    imageUrl: image.wedding,
    price: 3299,
    stock: 5,
    rating: 49,
    popularity: 75,
    featured: false,
    isNew: false,
  },
  {
    slug: "berry-cupcakes",
    name: "Berry Buttercream Cupcakes",
    category: "cupcakes",
    description:
      "Four tender cupcakes with silky berry buttercream and a bright little strawberry finish.",
    imageUrl: image.cupcakes,
    price: 649,
    stock: 14,
    rating: 48,
    popularity: 77,
    featured: false,
    isNew: true,
  },
] as const;

async function seed() {
  const db = await getDb();
  if (!db)
    throw new Error(
      "DATABASE_URL is required. Configure the managed database before seeding."
    );

  const categoryIds = new Map<string, number>();
  for (const [name, slug, description, imageUrl] of categorySeed) {
    const [found] = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, slug))
      .limit(1);
    if (found) categoryIds.set(slug, found.id);
    else {
      await db.insert(categories).values({ name, slug, description, imageUrl });
      const [created] = await db
        .select()
        .from(categories)
        .where(eq(categories.slug, slug))
        .limit(1);
      if (created) categoryIds.set(slug, created.id);
    }
  }

  const productsBySlug = new Map<string, number>();
  for (const item of productSeed) {
    const [found] = await db
      .select()
      .from(products)
      .where(eq(products.slug, item.slug))
      .limit(1);
    if (found) productsBySlug.set(item.slug, found.id);
    else {
      const categoryId = categoryIds.get(item.category);
      if (!categoryId)
        throw new Error(`Missing seed category ${item.category}`);
      await db
        .insert(products)
        .values({
          categoryId,
          name: item.name,
          slug: item.slug,
          description: item.description,
          imageUrl: item.imageUrl,
          pricePaise: item.price * 100,
          stock: item.stock,
          popularity: item.popularity,
          ratingTenths: item.rating,
          isAvailable: true,
          isFeatured: item.featured,
          isNew: item.isNew,
        });
      const [created] = await db
        .select()
        .from(products)
        .where(eq(products.slug, item.slug))
        .limit(1);
      if (created) productsBySlug.set(item.slug, created.id);
    }
  }

  const offerSeed = [
    ["strawberry-cloud", "A little berry bonus", 15],
    ["midnight-ganache", "Chocolate hour", 10],
    ["little-celebrations", "Cupcake afternoon", 12],
  ] as const;
  for (const [slug, title, discountPercent] of offerSeed) {
    const productId = productsBySlug.get(slug);
    if (!productId) continue;
    const [existing] = await db
      .select()
      .from(offers)
      .where(eq(offers.productId, productId))
      .limit(1);
    if (!existing)
      await db
        .insert(offers)
        .values({
          productId,
          title,
          discountPercent,
          startsAt: new Date("2026-10-01T00:00:00.000Z"),
          endsAt: new Date("2026-12-31T23:59:59.000Z"),
          isActive: true,
        });
  }

  const [review] = await db.select({ id: reviews.id }).from(reviews).limit(1);
  if (!review) {
    const examples = [
      {
        customerName: "Ananya R.",
        rating: 5,
        body: "The Strawberry Cloud was as lovely as it looked. Soft, fresh and just sweet enough.",
        slug: "strawberry-cloud",
      },
      {
        customerName: "Meera S.",
        rating: 5,
        body: "Beautifully finished and delivered right on time for our little celebration.",
        slug: "ivory-garden",
      },
      {
        customerName: "Kabir P.",
        rating: 5,
        body: "The ganache was incredible. The whole family went back for a second slice.",
        slug: "midnight-ganache",
      },
    ];
    for (const example of examples) {
      const productId = productsBySlug.get(example.slug);
      await db
        .insert(reviews)
        .values({
          productId: productId ?? null,
          customerName: example.customerName,
          rating: example.rating,
          body: example.body,
          status: "approved",
        });
    }
  }

  console.log(
    `Seed complete: ${categoryIds.size} categories, ${productsBySlug.size} products and demo offers are ready.`
  );
}

seed()
  .catch(error => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { closeDb } = await import("../server/db");
    await closeDb();
  });
