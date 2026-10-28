# Cakers & Cakers — Cake Shop

Repository: CAKERS-AND-BAKERS

A responsive, database-backed cake-shop mini-project built on the initialized Manus starter: **React 19 + Vite**, **Express + tRPC**, **Drizzle ORM** and the provided **MySQL** database. This managed MySQL/Drizzle implementation is used instead of MongoDB/Mongoose because it is the database provisioned in the current project.

## What is included

- Storefront home, categories, searchable/filterable/sortable catalogue, product details, special offers, persistent client-side cart, checkout and order confirmation.
- Server-priced orders with a unique order ID and immutable name/price snapshots for order history.
- Guest order tracking verified against both order ID and the checkout phone number. The public tracking response omits delivery address, email and other personal fields.
- Custom cake enquiry submission and protected admin review/status workflow.
- Real Manus OAuth-backed customer accounts, saved contact details and order history. The configured project owner receives the admin role; server middleware protects admin procedures independently of the page UI.
- Admin dashboard, cake/product management, order status updates and customer/delivery details, time-limited promotions, custom cake enquiry handling and review moderation.
- Protected product-image upload for JPEG, PNG and WebP (up to 4 MB), with server-side file-signature validation and stable managed storage paths.
- Demonstration checkout methods are **Cash on Delivery** and **Pay at Store** only. No online payment processor is integrated and no online charge occurs.

## Requirements

- Node.js 22 and pnpm 10 (the repository pins the pnpm version).
- A MySQL-compatible database URL in `DATABASE_URL`. The managed Manus environment supplies this for the project when its database is available.
- Manus OAuth/runtime environment for account login. Admin access uses the configured project-owner identity; do not commit or publish its identifier.

## Local development

```bash
pnpm install
# Set DATABASE_URL and the required Manus runtime/OAuth variables in an untracked local .env.
pnpm db:push
pnpm seed
pnpm dev
```

The server binds to the configured `PORT` (3000 by default) and hosts both the Vite client and API. For a front-end-only Vite preview, use `pnpm dev:static`, but commerce and protected admin functions require the Express server and database.

- `pnpm check` — TypeScript check.
- `pnpm db:push` — generate any migration required by `drizzle/schema.ts`, then apply checked-in migrations.
- `pnpm db:migrate` — apply already generated migrations.
- `pnpm seed` — idempotently create example categories, products, promotions and explicitly sample/demonstration reviews. Existing category/product/admin-managed data is not overwritten.
- `pnpm setup:demo` — run the database setup/seed sequence.
- `pnpm smoke` — optional end-to-end database-backed smoke check. It creates a temporary one-item demo order, verifies phone-based tracking and order-status propagation, tests server role enforcement, then removes that test order and restores the sample stock. Run only against a demonstration database. Its in-process admin context tests protected procedures; it does not simulate Manus OAuth login.
- `pnpm build` / `pnpm start` — production bundle and Node server.

## Data and demo notes

The database stores user records, category and cake inventory, timed offers, orders/order lines, custom cake enquiries and customer reviews. Monetary values are stored as integer paise; totals, valid offers and stock are recalculated/rechecked on the server. Never trust browser-calculated totals for a placed order. The cart persists only product IDs and quantities; current prices are loaded from the server. Admin image bytes are passed to the authenticated server, checked for type and size, uploaded to managed storage with a random key, then referenced by a stable `/manus-storage/` URL; no storage credential reaches the browser.

Demo catalogue imagery is served through the stable managed `/manus-storage/` asset paths. Custom cake reference-image upload is not enabled in this mini-project: the form tells customers to describe their idea instead. The demonstration bakery contact/address, customer reviews and sample catalogue are examples, not verified real business records. Replace them before operating a real shop.

## Routes

`/`, `/shop`, `/categories`, `/today-special`, `/product/:slug`, `/cart`, `/checkout`, `/order-confirmation/:orderCode`, `/track-order`, `/custom-cake`, `/account`, and `/admin`.

The page manifest lives at `client/public/manus-routes.json` (Vite's configured public directory) and is intentionally separate from the `/api/*` service endpoints.
