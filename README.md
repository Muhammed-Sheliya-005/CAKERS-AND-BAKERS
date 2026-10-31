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
- Protected product-image upload for JPEG, PNG and WebP (up to 4 MiB on Manus/container and 2.5 MiB on Vercel), with server-side file-signature validation and stable managed storage paths.
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

`/`, `/shop`, `/categories`, `/today-special`, `/product/:slug`, `/cart`, `/checkout`, `/order-confirmation/:orderCode`, `/track-order`, `/custom-cake`, `/contact`, `/account`, and `/admin`.

The page manifest lives at `client/public/manus-routes.json` (Vite's configured public directory) and is intentionally separate from the `/api/*` service endpoints.

## Deployment notes

For a managed release, build with `pnpm build` and start with `pnpm start`; the server honors `PORT` and exposes `/api/health` for readiness. Supply the managed MySQL `DATABASE_URL` and Manus OAuth/runtime values at runtime, never in the browser bundle or image. Apply checked-in migrations with `pnpm db:migrate` before serving the new version; reserve `pnpm seed` for a demonstration database. Keep business/order records in MySQL and uploaded product media in managed storage, not the temporary container filesystem. This project has no online payment gateway or outbound customer-email provider; receipts/refunds are manually recorded and notifications are shown in the dashboard.

## Vercel deployment

This repository now deploys as a full-stack Express application. Import `Muhammed-Sheliya-005/CAKERS-AND-BAKERS` with the repository root as **Root Directory**. `vercel.json` selects the supported **Express** framework preset, runs `pnpm build`, and sets `outputDirectory` to `null` so the earlier `dist/public` static-only override is cleared in favor of automatic Express detection. The root `index.ts` exports the shared Express app; the build copies Vite output from `dist/public` into the root `public/` directory for Vercel's static layer. Known client page routes receive the SPA document; API paths and missing files keep real errors. The existing `server/_core/index.ts`, `pnpm start`, `PORT`, and Docker build remain available for Manus/container hosting.

In Vercel Project Settings → Environment Variables, set `DATABASE_URL`, `MANUS_PROJECT_ID`, `MANUS_JWT_SECRET`, `MANUS_OAUTH_API_URL`, `MANUS_OAUTH_PORTAL_URL`, `MANUS_API_URL`, and `MANUS_API_KEY` for the environments you deploy. The `.env.example` lists names only: Vercel does not inherit Manus-managed secrets automatically. `DATABASE_URL` must be reachable from Vercel; if it points to a newly provisioned database, apply migrations with `pnpm db:migrate` before deploying. `MANUS_API_KEY` is server-only and enables existing managed image uploads/reads. `MANUS_API_BROWSER_KEY`, if required by browser-facing Manus services, is passed only through the existing public runtime-config whitelist. If the Vercel database does not already contain the authorized owner account, also set `OWNER_OPEN_ID` to that owner's existing OAuth `openId`; never promote the first arbitrary visitor.

Allow this exact OAuth callback with the Manus OAuth provider: `https://cakers-and-bakers.vercel.app/api/oauth/callback`. After adding or changing environment values, redeploy the latest GitHub `main` commit from Vercel → Deployments → Redeploy. Verify `https://cakers-and-bakers.vercel.app/api/health` returns HTTP 200 and the storefront loads products. A 404 from `/api/health` means the Express framework preset or static Output Directory override is still wrong; a 200 health response with a cake-counter error means check the Vercel function logs and its `DATABASE_URL`/runtime environment. Vercel's 4.5 MB function body ceiling is why image uploads are capped at 2.5 MiB there; Manus/container keeps the 4 MiB cap.
