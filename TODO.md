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
