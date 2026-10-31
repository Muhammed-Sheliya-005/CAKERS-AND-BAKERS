# Build outcomes — Cakers & Cakers

## 1. [x] Storefront, catalogue and product details

- Create a polished, responsive commercial-style cake shop with pastel pink, cream, white, chocolate brown and subtle gold, cake photography, modern typography, subtle hover/motion, rounded cards and clean spacing. Provide connected navigation for Home, Shop, Categories, Today’s Special, About Us, Contact, Cart and Account; hero with featured cake, welcoming headline, description and Shop Cakes/Order Now CTAs; footer with contact, business hours, social links and useful links. Include loading, empty, error and success states.
- Build homepage sections for hero, Birthday/Wedding/Chocolate/Designer Cakes/Cupcakes/Pastries categories, bestsellers with image/name/price/rating/Add to Cart, Today’s Special, new arrivals/favourites, custom-cake CTA, testimonials/reviews, About Us/quality commitment, contact/footer.
- Store realistic sample product data and INR (₹) prices in the database. Catalogue displays product image, name, description, price, category and availability; searches by name; filters by category and price range; sorts by price, popularity and newest; opens individual product details; selects quantity and adds items to cart; reports no matches and reflects inventory changes.
- Support responsive phone, tablet, laptop and desktop layouts; connect all essential page navigation; avoid dead actions, broken images, placeholder links and unnecessary console errors.

## 2. [x] Special offers and customer reviews

- Display selected Today’s Special cakes, offers, availability and original/discounted prices. Admins can add, edit, remove, activate and deactivate offers and configure validity; calculate discounts correctly and never show expired promotions.
- Store/retrieve customer reviews and provide appropriate admin review moderation.

## 3. [x] Cart, checkout and custom cake requests

- Cart supports add/remove/update quantity, image/name/price/quantity/subtotal, automatic total, clear cart, continue shopping and persistence where appropriate.
- Checkout validates customer name, phone, email, delivery address, delivery date/time and optional instructions; shows item summary, any delivery charges and final payable amount; uses server-computed prices/totals/stock and gives a successful confirmation page with a unique order ID.
- Clearly label the demonstration payment method Cash on Delivery or pay-at-store. Do not claim an online gateway is integrated.
- Custom cake form accepts customer name/contact, flavour, size/weight, shape/design, occasion (birthday/anniversary/wedding/other), inscription, delivery or pickup date, budget, secure reference image upload if supported, and extra instructions. Save enquiries persistently and confirm submission. Admin can inspect design/budget and mark pending/contacted/accepted/rejected.

## 4. [x] Persistent orders, tracking and accounts

- Persist orders and order items in the database. Store product name and price snapshots at purchase so later product price edits never change order history. Provide order history and individual details for authenticated customers where implemented.
- Assign unique order IDs and allow tracking using order ID plus the customer’s matching registered contact/appropriate verification. Do not expose another customer’s personal details or order data. Clearly show current status to the matching customer.
- Support exactly these statuses: Order Placed; Confirmed; Preparing; Ready for Pickup / Out for Delivery; Delivered; Cancelled. Admin can search/filter orders, inspect authorized customer/delivery details, change statuses, and cancel with a status update.
- If accounts are implemented, provide customer registration/login, secure password storage, profile/saved contact information, order history and order details. Use genuine authenticated sessions, never fake development/demo users.

## 5. [x] Protected administration

- Provide a responsive, protected admin panel with professional navigation/sidebar, summary cards, searchable tables and status badges. Enforce admin permissions on backend operations/routes—not only by hiding UI.
- Dashboard derives total orders, pending orders, completed orders, total products, custom enquiries and sales summary from stored order data.
- Product management adds/edits/deletes cakes and updates images, prices, categories, descriptions, stock and availability. Protected product-photo upload accepts JPEG, PNG or WebP up to 4 MB; the server validates content type, actual file signature and size, uploads with a random key to durable managed storage, and saves/renders only the stable managed path.
- Order management lists orders, shows individual details, searches/filters, updates status and cancels appropriately while exposing customer/contact/delivery details only to authorized administrators.
- Offer management creates/edits/removes specials, sets discount and validity, and activates/deactivates promotions.
- Custom enquiry management reviews requests, designs/budgets and records pending/contacted/accepted/rejected. Customer/review management exposes necessary registered-customer records with contact/order summaries and permits review moderation; guest delivery details remain available only on protected order details.

## 6. [x] Database, server validation and security

- Use the initialized managed MySQL database with Drizzle (the environment-supported alternative to the requested MongoDB/Mongoose stack). Persist Users, Products, Categories, Orders, Order Items, Custom Cake Enquiries, Reviews and Offers with validation, relations/references, timestamps and useful indexes.
- Use server-side input validation; secure password hashing if a separate password system is used; real authentication and role-based authorization; protected admin procedures; safe image upload handling; database-error handling; environment-based configuration and sensible protection against common vulnerabilities.
- Revalidate prices, quantities, discounts, inventory and totals on the server; never trust browser-supplied total or store plaintext passwords. Keep credentials/secrets out of source/frontend and provide an example environment file without real secrets.
- Preserve the actual managed database as the source of business data; do not substitute local frontend mock arrays for required database-backed behavior.

## 7. [x] Demo data, setup and maintainability

- Supply realistic product/category/offer demo data and an idempotent database seed script. If a demo administrator is needed, use a documented secure setup and never hardcode production credentials or expose secrets in frontend code.
- Organize frontend/backend code into logical folders and reusable components. README covers installation, environment variables, database/migrations, seed commands and frontend/backend local run commands; configure deployment when hosting/database services allow it.
- Demonstrate the end-to-end workflow: customer visits home, browses/searches, adds cake(s), checks out, database stores the order, customer gets unique ID, admin logs in/sees order/updates status, customer checks updated tracking, admin manages products/offers/custom enquiries.
- Run the application; verify database, catalogue, cart, checkout, tracking, admin and core customer/admin flow; fix errors and report completed features and any remaining external configuration.


# Vendor/Admin dashboard extension outcomes — source: duplicate attachments, consolidated

## 8. [x] Secure authorized staff access and responsive admin shell

- Build a secure administrator/vendor workspace for the shop owner and authorized staff, not ordinary customers; it must be a functional business-management application, not a static UI prototype.
- Use authorized real credentials through the existing authentication/session integration; protect every admin page and privileged API; provide logout and appropriate session handling; use secure password hashing only if a separately requested password system is introduced; never store plaintext passwords or expose secret keys in frontend code; do not create fake authentication, public admin registration or public role elevation.
- Provide a safe initial administrator setup. Document the actual owner/OAuth-based setup; include demo credentials only if there is a safely documented development-only mode and never deploy defaults to production.
- Preserve the existing backend/database, shop routes, working customer-facing features and existing data; reuse the existing stack and coding conventions; do not create a duplicate project or unnecessarily rewrite/delete files.
- Create a premium, responsive bakery SaaS-style shell with warm cream/white/cocoa/blush colors, readable typography, good spacing, elegant cards, restrained shadows, polished icons, persistent desktop sidebar, responsive mobile navigation, page title/search/notifications/admin profile top bar, meaningful charts/status badges/tables, and realistic cake imagery only where useful. Avoid excessive gradients, oversized headings, clutter and unnecessary animation.
- Provide loading/skeleton, empty, success, failure/error, validation and destructive-confirmation states; keyboard navigation, visible focus, accessible labels and mobile/tablet/laptop/desktop layouts; consistent Indian date/currency/number formatting and Asia/Kolkata business timezone.

## 9. [x] Data-backed overview, analytics, reports and export

- Show actual database-derived total orders; awaiting-confirmation, preparing, ready/out-for-delivery, completed and cancelled order counts; total sales and revenue for a selected date range; best-selling cakes; recent orders; and low-stock ingredients/products where enabled. When data is empty, show a useful getting-started state. Never hardcode demonstration statistics.
- Reports show selected-period sales, order counts, completed versus cancelled orders, best-selling products, payment-method breakdown, order-status breakdown, and daily/weekly/monthly trends. Date filters update tables/charts; provide CSV export for relevant reports.
- Calculate revenue consistently from stored order/payment data, distinguish gross order totals from actual collected payments, and do not count cancelled or unpaid orders as collected revenue. Charts must use real database data and respond to selected filters.

## 10. [x] Audited order, fulfilment, receipt and offline-payment workflow

- Provide a searchable, sortable, filterable, paginated order table with order ID; customer name/contact; ordered items and quantities; total; payment method/status; order date; requested pickup/delivery date; fulfilment method; and current status.
- Support Pending/Order Placed → Confirmed → Preparing → Ready for Pickup / Out for Delivery → Completed/Delivered; support cancellation with validation and confirmation; allow full detail inspection, accept/reject pending orders, status update, search by order ID/customer, filters for status/payment/date, customer notes, customization instructions and delivery address or pickup information as relevant.
- Print a clean order receipt or kitchen preparation sheet. Persist order history and status-change timestamps/audit records.
- Prevent invalid status transitions and accidental duplicate submissions. Never mark an order paid until payment is confirmed or an authorized administrator records a legitimate offline payment; do not simulate a successful online gateway. Record the offline amount/method/reference/admin and resulting payment balance/status in persistent payment records; distinguish unpaid, partial, paid and refunded amounts as implemented.

## 11. [x] Products, categories, options and customer catalogue integration

- Allow authorized administrators to create, view, edit, activate/deactivate and confirmation-delete cake/bakery products; securely upload/select images; set name, description, category, price, availability, stock and featured/bestseller state; manage sizes and size-specific prices where applicable, eggless/egg and customization options where applicable, preparation time and advance-order requirements.
- Provide realistic categories including Birthday Cakes, Chocolate Cakes, Photo Cakes, Wedding Cakes, Eggless Cakes, Pastries and Custom Cakes. Validate prices, quantities, image types and required fields server-side and client-side. Preserve historical order details when a product is edited/deactivated; product changes persist and reflect on the shop catalogue where supported; unavailable/out-of-stock products cannot be newly ordered.

## 12. [x] Customer records and private order history

- Display customer name, phone/email when available, total orders, total spending based on recorded completed sales, most recent order, and relevant private customer notes.
- Authorized administrators can view a customer's order history and fulfilment contact details needed for service. Never expose customer data publicly, collect unnecessary personal data, or show private information outside authorized admin details.

## 13. [x] Ingredient/supply inventory and stock-movement audit

- Provide a functional optional bakery inventory for ingredients/supplies such as flour, sugar, cocoa powder, cream, butter, eggs, cake boxes and packaging; each record includes name, unit, available quantity, minimum threshold, supplier information if available and last-updated timestamp.
- Allow authorized staff to add stock, record usage or adjustments, view relevant low-stock alerts, validate every change and preserve a movement history. Do not invent automatic ingredient-consumption calculations unless recipe quantities and order relationships are properly implemented.

## 14. [x] Customer enquiries, notifications and follow-up

- Provide a general enquiry-management queue for questions actually submitted through the customer website. Show customer details, subject, message, submission date and status New / In Progress / Resolved; authorized admins can update status and record private internal notes.
- Keep the existing custom-cake request flow and its Pending / Contacted / Accepted / Rejected statuses functional and manageable.
- Provide an in-app notification area for new orders, new enquiries and relevant low-stock alerts. Use genuine real-time updates only if backend support exists; otherwise use reliable polling/refresh, clearly without claiming unsupported real-time delivery.

## 15. [x] Persistent business profile, order and notification settings

- Authorized administrators can manage business name/contact details, business address, opening hours, pickup and delivery settings, available payment methods, order-acceptance preferences and notification preferences. Prefill Cakers & Cakers at Ayesha Tower, S.V. Road, Opp. MTNL, Jogeshwari West, Mumbai 400060.
- Persist configurable values in the database rather than scattering them in source. Apply shared settings to customer contact/checkout behaviour where the existing architecture supports them. Never imply an online payment gateway exists unless it is actually configured.
- Enforce the fixed Cakers & Cakers location in Jogeshwari West, Mumbai and the Asia/Kolkata business timezone in both the administrator form and server validation.

## 16. [x] Persistent data models, authorization and operational setup

- Use the existing backend/database; implement persistent models and relationships for administrators/roles, products/categories, customers, orders/order items, payment records, enquiries, inventory items/stock movements, business settings, notifications and relevant audit history.
- Persist across refresh/restart. Validate client/server inputs; apply database constraints and transactions where necessary; protect all admin APIs with authentication/authorization; gracefully handle server/database errors; retain historical product names/prices/quantities/order totals; keep all credentials and keys in environment variables; provide placeholder-only `.env.example`, deterministic migrations/schema setup and realistic development seed data.
- Use local/browser storage only for clearly labelled non-sensitive convenience state, never as a purported secure production database. Confirm the database actually connects before claiming it is connected.

## 17. [ ] Quality, integration, tested handoff and deployment documentation

- Integrate the same products/orders/business settings across vendor dashboard and customer storefront: website orders appear in admin; admin status changes persist; catalog changes appear on the customer site; unavailable products cannot be ordered; website enquiries appear in admin; server validates prices/totals; customers cannot reach privileged pages/APIs. Configure a real gateway only if credentials/setup already exist; otherwise show honest offline payment handling and keep any future gateway credentials server-only.
- Implement reusable maintainable components, search/filter/sort/pagination, sensible responsive tables, accessible forms, validation/error messages, deletion confirmation, progress/loading states, empty/success/failure states and useful help; avoid dead buttons, fake charts, dummy forms or placeholder pages and never expose internal error detail.
- Install any required dependencies, run the application and fix build/runtime errors; actually exercise authentication/authorization, create/edit/deactivate products, ordering/status/cancellation/history, database persistence across reload/restart, filters/charts/CSV/form validation, mobile/desktop rendering, and ensure the customer storefront still works. Record only tests truly executed; fix broken navigation/buttons/API calls/console errors.
- Handoff describes implemented features and stack, database/migration and seed setup, initial admin creation, exact install/run commands and environment variables, remaining optional payment/email configuration, and a deployment guide appropriate to this managed MySQL/React/Express stack.
- Verified in this sandbox: `pnpm check`, `pnpm test` (6 tests), `pnpm build`, and `pnpm smoke`; the smoke run covered the fixed timezone/location, phone-verified order privacy, order-status rules, cancellation restock, post-cancellation refund, payment-report reconciliation and temporary-record cleanup. `/api/health` and `/manus-routes.json` returned HTTP 200. A real OAuth browser sign-in, visual/mobile walkthrough and manual CSV/export/form interaction were not exercised here; retain this outcome as open for that final presentation walkthrough.
