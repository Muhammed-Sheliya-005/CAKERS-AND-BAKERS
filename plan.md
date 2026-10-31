# Cakers & Cakers — Implementation Plan

## Agreed technical approach

Build on the initialized managed project: React 19/Vite, Express, tRPC and Drizzle, with the provisioned MySQL database. The submitted brief prefers MongoDB/Mongoose only if the environment supports it; this environment provides managed MySQL and a working Drizzle starter, so the database-backed alternative is MySQL/Drizzle rather than mock frontend arrays. Keep durable order/catalogue data in that database. Do not configure online payments; checkout is explicitly Cash on Delivery / pay at store.

Use the starter's actual Manus OAuth identity/session flow for authenticated accounts and administrator access. The starter assigns the configured project owner an admin role; retain backend role guards for every admin operation. Customers can checkout as guests and track orders using the unique order ID plus matching phone number, without exposing personal fields. Preserve the stable preview-compatible cookie/auth handling.

## Implementation and data flow

1. Extend the Drizzle schema and migrations for categories, products, offers, orders, immutable order-line snapshots, custom-cake enquiries and reviews; retain users. Add typed query/service functions and Zod-validated tRPC procedures. Seed realistic INR catalogue/categories/offers idempotently without overwriting later admin changes.
2. Derive storefront pages from database procedures: home, searchable/filterable/sortable shop, product detail, today's specials, cart, checkout, confirmation, order tracking and custom-cake enquiry. Persist cart state client-side, but obtain prices, discounts, availability and totals from the server. Order creation must transact/recheck stock and snapshot purchased names/prices.
3. Add an OAuth-backed account/admin experience, admin-only server procedures, database-derived dashboard summaries and manageable searchable tables for products, orders/status, registered customers, promotions, enquiries and reviews. Protect photo upload behind the administrator role and validate image bytes before persisting them to managed storage. Order status transitions use the requested labels; customer-facing tracking returns only the matching order's safe status summary.
4. Supply project-specific responsive CSS/components, generated cake imagery, a custom SVG brand mark and platform logo metadata, the Vite-served route manifest, `.env.example`, migration/seed scripts and a practical README. Use authenticated server-validated media uploads to managed storage. Preserve the starter's managed build/runtime and deployment structure.

## Project structure

- `client/src/App.tsx` — route declarations and application shell.
- `client/src/pages/` — homepage, shop/product, cart/checkout, tracking, custom-cake, account and admin pages.
- `client/src/components/` — shared navigation, footer, product/category cards, forms, status and admin UI.
- `client/src/lib/` and `client/src/_core/` — typed tRPC client and starter auth integration.
- `client/src/index.css` — responsive brand styles and motion/accessibility preferences.
- `server/routers.ts` — public, customer and admin-only tRPC procedures.
- `server/db.ts` plus focused server modules — validated database queries and order/custom enquiry workflows.
- `drizzle/schema.ts`, `drizzle/relations.ts`, `drizzle/NNNN_*.sql` — MySQL schema, relations and additive migrations.
- `scripts/seed.ts` — repeatable demo catalogue/category/offer setup.
- `client/public/` — served brand mark and complete page route manifest.
- Root `README.md`, `.env.example`, `plan.md`, `TODO.md` — setup and project documentation/tracking.

## Design system

- **Design movement:** contemporary patisserie editorial—boutique bakery craft with clean, restrained e-commerce usability.
- **Core principles:** appetizing photography first; calm readable whitespace; tactile product cards with clear price/action hierarchy; responsive, accessible controls and visible feedback.
- **Color philosophy:** blush pink communicates celebration; cream and white keep the shop bright and food-forward; chocolate brown anchors text and trust; small antique-gold details add a crafted premium note. Signature brand color: rich rose `#BD5A70`.
- **Layout paradigm:** editorial, asymmetrical hero with copy beside the featured cake; generous horizontal section bands and compact category rails; purposeful product grids only where comparison supports shopping; separate compact admin workspace.
- **Signature elements:** original C-shaped piped-frosting mark with a small cake-slice and gold spark; crisp rose CTAs and petite gold accents; soft blush image frames with restrained cake-stamp/rating details.
- **Interaction and animation:** cart count and toast feedback; a quiet hero-image reveal plus restrained image zoom/card lift on hover; short transitions throughout; respect `prefers-reduced-motion` and maintain keyboard/focus affordances.
- **Typography:** expressive editorial serif for display headings paired with a highly legible sans-serif for navigation, controls and body; establish a clear H1/H2/body/price/caption scale.
- **Brand essence:** a joyful neighbourhood patisserie for everyday celebrations, distinguished by made-fresh cakes and easy personal ordering. Personality: warm, polished, celebratory.
- **Brand voice:** inviting and sensory, concise in transactional UI. Examples: “A little cake, a lot of joy.” “Made fresh for the moment you’re celebrating.”
- **Wordmark/logo:** a custom “C” formed from a piped frosting swirl beside a petite cake-slice/flower mark; use a refined typographic wordmark, not generated lettering.


## Vendor dashboard extension — approved implementation plan

Extend the existing Cake Shop rather than creating a second application. Preserve React/TypeScript/Vite, Express/tRPC, Drizzle and the managed MySQL source of truth. Continue using the real Manus OAuth session: the configured owner is the initial administrator; only that owner can grant or revoke staff access. Do not introduce passwords, demo credentials, a public admin-registration path, fake users, or simulated gateway payments. Every privileged API remains server-authorized.

Add an additive MySQL migration for staff role access, customer-only notes, order fulfilment/payment status and audit history, payment records, ingredient inventory and movement history, website enquiries, internal enquiry notes, durable business settings and admin notifications. Keep product/order snapshots immutable. Payment reports will distinguish order value from confirmed offline receipts and refunds; cancelled or unpaid orders will not count as collected revenue. Product availability and order totals continue to be validated by the server, and business settings will be shared with the public contact/checkout surfaces where appropriate.

Keep the bakery timezone fixed at `Asia/Kolkata` and validate that its registered address remains in Jogeshwari West, Mumbai. Permit legitimate refunds after cancellation, keep cancelled-order receipt/refund records visible for reconciliation, and continue excluding cancelled orders from collected-revenue totals.

The `/admin` workspace will gain owner/staff management, data-backed overview and reports, searchable/filtered order and offline-payment workflow, product/category options, customer history and private notes, ingredient stock adjustments, general/custom enquiry queues, notification polling, and persistent business-profile/order-preference settings. Order transitions will be constrained and audited. The customer site gains a real general-contact enquiry submission route, reads public business details from settings, and respects order/fulfilment preferences; its catalogue and existing checkout/authentication remain intact.

### Extension structure

- `drizzle/schema.ts`, additive `drizzle/NNNN_*.sql`, journal and snapshot — payment/audit, inventory, enquiry, notification, settings, product options and staff records.
- `server/routers.ts` plus `server/admin-operations.ts` — existing commerce APIs plus role-guarded analytics, payment, inventory, settings, staff and notification procedures; public contact/settings procedures.
- `client/src/pages/Admin.tsx` — retains the current admin gate and workspace shell while routing to section components.
- `client/src/components/admin/` — focused overview, analytics, orders/payments, inventory, contact enquiries, business settings and team panels; shared reusable filters, status and empty/error states.
- `client/src/pages/Contact.tsx`, `client/src/components/SiteLayout.tsx`, `client/src/pages/CartCheckout.tsx`, product/cart modules and `client/public/manus-routes.json` — customer-facing integration with the same records and configured business profile.
- `README.md`, `.env.example`, `TODO.md` and this plan — secure setup, migration/seed/run commands, deployment and explicit outcome tracking.

### Dashboard visual system

Reuse the approved contemporary-patisserie identity rather than restyling the shop: warm cream paper and white surfaces, cocoa-brown text, signature rose `#BD5A70` and restrained antique-gold accents. Keep a persistent quiet sidebar on desktop, compact sticky navigation on small screens, a concise title/search/notification/profile top bar, restrained card borders/shadows, readable data tables, clear status badges, keyboard-visible focus, and charts that use real database results. Use cake imagery only for product data; avoid decorative dashboard illustrations. Motion remains subtle and respects reduced-motion preferences.
