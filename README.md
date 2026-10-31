# Cakers & Cakers — Cake Shop

Repository: CAKERS-AND-BAKERS

A responsive, database-backed cake-shop mini-project built on the initialized Manus starter: **React 19 + Vite**, **Express + tRPC**, **Drizzle ORM** and the provided **MySQL** database. This managed MySQL/Drizzle implementation is used instead of MongoDB/Mongoose because it is the database provisioned in the current project.

## What is included

- Storefront home, categories, searchable/filterable/sortable catalogue, product details, special offers, persistent client-side cart, checkout and order confirmation.
- Server-priced orders with a unique order ID and immutable name/price snapshots for order history.
- Guest order tracking verified against both order ID and the checkout phone number. The public tracking response omits delivery address, email and other personal fields.
- Custom cake enquiry submission and protected admin review/status workflow.
- Real Manus OAuth-backed customer accounts, saved contact details and order history. The configured project owner receives the admin role; server middleware protects admin procedures independently of the page UI.
- Protected vendor dashboard with live database-derived overview, date-filtered sales/status reports, real charts and CSV export; cake/product and offer management; customer history and private notes; general/custom enquiry queues; review moderation; and searchable paginated orders.
- Audited order transitions with cancellation reasons and cake-stock restoration, printed kitchen copies, a manual offline receipts/refunds ledger (including balance and payment status), ingredient/packaging inventory, product/variant stock movement history, low-stock notifications, and persistent bakery/checkout settings.
- Owner-authorized OAuth staff access: the configured project owner is the initial administrator and only the owner can grant or revoke staff access. There are no built-in demo passwords or public admin registration.
- Protected product-image upload for JPEG, PNG and WebP (up to 4 MB), with server-side file-signature validation and stable managed storage paths.
- Demonstration checkout methods are **Cash on Delivery** and **Pay at Store** only. No online payment processor is integrated and no online charge occurs.

## Requirements

- Node.js 22 and pnpm 10 (the repository pins the pnpm version).
- A MySQL-compatible database URL in `DATABASE_URL`. The managed Manus environment supplies this for the project when its database is available.
- Manus OAuth/runtime environment for account login. Admin access uses the configured project-owner identity; do not commit or publish its identifier. The bakery timezone is fixed to Asia/Kolkata and its registered address must remain in Jogeshwari West, Mumbai; all displayed prices are in INR (₹).

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
- `pnpm smoke` — optional end-to-end database-backed smoke check. It creates a temporary one-item order, verifies server-priced snapshots, phone-based tracking/privacy, allowed and rejected status transitions, cancellation stock restoration, offline receipt/refund after cancellation, cancelled-payment report reconciliation, the fixed business timezone/location, and admin role enforcement; it removes all temporary order, payment, notification and stock-audit rows. Run only against a demonstration database. Its in-process admin context tests protected procedures; it does not simulate Manus OAuth login.
- `pnpm build` / `pnpm start` — production bundle and Node server.

## Data and demo notes

The database stores users/roles, category and cake/variant stock, ingredient supplies and their movement history, timed offers, customer orders/order lines/status history, offline payment/refund records, custom-cake and website enquiries, reviews, private customer notes, business settings, and admin notifications. Monetary values are stored as integer paise; totals, valid offers and stock are recalculated/rechecked on the server. Order value, delivered sales and recorded receipts less refunds are reported separately; cancelled orders are excluded from collected-revenue analytics, while their receipts/refunds remain visible for reconciliation. Never trust browser-calculated totals for a placed order. The cart persists only product IDs and quantities; current prices are loaded from the server. Admin image bytes are passed to the authenticated server, checked for type and size, uploaded to managed storage with a random key, then referenced by a stable `/manus-storage/` URL; no storage credential reaches the browser.

The dashboard notification area polls for new activity rather than claiming push-based real-time delivery. Ingredients are tracked as manual receipts, usage and adjustments; automatic recipe-based consumption is intentionally not enabled. The shop address defaults to Ayesha Tower, S.V. Road, Opp. MTNL, Jogeshwari West, Mumbai 400060; administrators may refine street details but the server rejects addresses outside Jogeshwari West, Mumbai. Business contact details are editable by an authorized owner/staff account. Demo reviews and sample catalogue records are examples, not verified customer/business records; replace them before operating a real shop.

## Routes

`/`, `/shop`, `/categories`, `/today-special`, `/product/:slug`, `/cart`, `/checkout`, `/order-confirmation/:orderCode`, `/track-order`, `/custom-cake`, `/account`, and `/admin`.

The page manifest lives at `client/public/manus-routes.json` (Vite's configured public directory) and is intentionally separate from the `/api/*` service endpoints.

## Deployment notes

For a managed release, build with `pnpm build` and start with `pnpm start`; the server honors `PORT` and exposes `/api/health` for readiness. Supply the managed MySQL `DATABASE_URL` and Manus OAuth/runtime values at runtime, never in the browser bundle or image. Apply checked-in migrations with `pnpm db:migrate` before serving the new version; reserve `pnpm seed` for a demonstration database. Keep business/order records in MySQL and uploaded product media in managed storage, not the temporary container filesystem. This project has no online payment gateway or outbound customer-email provider; receipts/refunds are manually recorded and notifications are shown in the dashboard.
