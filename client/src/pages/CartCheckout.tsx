import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  LoaderCircle,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "../lib/trpc";
import { useCart } from "../contexts/CartContext";
import { formatRupees, tomorrowString } from "../lib/shop";
import { useAuth } from "../_core/hooks/useAuth";

function price(product: {
  pricePaise: number;
  offer: { discountedPricePaise: number } | null;
}) {
  return product.offer?.discountedPricePaise ?? product.pricePaise;
}
export function CartPage() {
  const cart = useCart();
  const products = trpc.catalog.byIds.useQuery(
    { ids: cart.items.map(line => line.productId) },
    { enabled: cart.items.length > 0 }
  );
  const lines = cart.items
    .map(line => ({
      ...line,
      product: products.data?.find(product => product.id === line.productId),
    }))
    .filter(line => line.product);
  const subtotal = lines.reduce(
    (sum, line) => sum + price(line.product!) * line.quantity,
    0
  );
  if (!cart.items.length)
    return (
      <section className="empty-cart wrap">
        <span className="empty-mark">
          <ShoppingBag size={31} />
        </span>
        <span className="eyebrow">YOUR LITTLE BAG</span>
        <h1>
          Nothing in here <em>just yet.</em>
        </h1>
        <p>There’s something lovely waiting at the cake counter.</p>
        <Link href="/shop" className="button button-primary">
          Find a cake <ArrowRight size={16} />
        </Link>
      </section>
    );
  return (
    <section className="page-wrap wrap">
      <div className="page-intro compact-intro">
        <span className="eyebrow">YOUR LITTLE BAG</span>
        <h1>
          Good choices, <em>made.</em>
        </h1>
        <p>
          Take a moment to check your cakes before they head to the kitchen.
        </p>
      </div>
      {products.isLoading ? (
        <div className="loading-state">
          <LoaderCircle className="spin" />
          Gathering your cakes…
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-lines">
            {lines.map(({ product, quantity }) => (
              <article className="cart-line" key={product!.id}>
                <Link
                  href={`/product/${product!.slug}`}
                  className="cart-line-image"
                >
                  <img src={product!.imageUrl} alt={product!.name} />
                </Link>
                <div className="cart-line-copy">
                  <span className="product-kicker">
                    {product!.categoryName}
                  </span>
                  <Link
                    href={`/product/${product!.slug}`}
                    className="cart-line-title"
                  >
                    {product!.name}
                  </Link>
                  <span className="cart-unit-price">
                    {formatRupees(price(product!))} each
                  </span>
                  {product!.stock < quantity && (
                    <small className="field-error">
                      Only {product!.stock} currently available
                    </small>
                  )}
                  <div className="quantity-control cart-quantity">
                    <button
                      onClick={() => cart.update(product!.id, quantity - 1)}
                      aria-label="Decrease quantity"
                    >
                      <Minus size={14} />
                    </button>
                    <span>{quantity}</span>
                    <button
                      onClick={() =>
                        cart.update(
                          product!.id,
                          Math.min(product!.stock || 1, quantity + 1)
                        )
                      }
                      aria-label="Increase quantity"
                      disabled={quantity >= product!.stock}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
                <div className="cart-line-total">
                  <b>{formatRupees(price(product!) * quantity)}</b>
                  <button
                    onClick={() => cart.remove(product!.id)}
                    className="remove-line"
                    aria-label={`Remove ${product!.name}`}
                  >
                    <Trash2 size={16} /> Remove
                  </button>
                </div>
              </article>
            ))}
          </div>
          <aside className="summary-card">
            <span className="eyebrow">A QUICK CHECK</span>
            <h2>Your order</h2>
            <div className="summary-items">
              {lines.map(({ product, quantity }) => (
                <div key={product!.id}>
                  <span>
                    {product!.name} <small>× {quantity}</small>
                  </span>
                  <b>{formatRupees(price(product!) * quantity)}</b>
                </div>
              ))}
            </div>
            <div className="summary-row">
              <span>Items subtotal</span>
              <b>{formatRupees(subtotal)}</b>
            </div>
            <div className="summary-row">
              <span>Delivery</span>
              <b>{subtotal >= 79900 ? "On us" : formatRupees(4900)}</b>
            </div>
            <small className="summary-hint">
              Complimentary delivery on orders over ₹799.
            </small>
            <div className="summary-total">
              <span>Estimated total</span>
              <b>{formatRupees(subtotal + (subtotal >= 79900 ? 0 : 4900))}</b>
            </div>
            <Link
              href="/checkout"
              className="button button-primary summary-cta"
            >
              Continue to checkout <ArrowRight size={17} />
            </Link>
            <Link href="/shop" className="continue-link">
              <ArrowLeft size={14} /> Keep browsing
            </Link>
            <button
              onClick={() => {
                cart.clear();
                toast.success("Your bag is all clear.");
              }}
              className="clear-cart"
            >
              Clear your bag
            </button>
          </aside>
        </div>
      )}
    </section>
  );
}

export function CheckoutPage() {
  const cart = useCart();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const profile = trpc.auth.me.useQuery(undefined, { enabled: !!user });
  const products = trpc.catalog.byIds.useQuery(
    { ids: cart.items.map(line => line.productId) },
    { enabled: cart.items.length > 0 }
  );
  const create = trpc.orders.create.useMutation();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [deliveryAddress, setAddress] = useState("");
  const [deliveryDate, setDate] = useState(tomorrowString());
  const [deliveryTime, setTime] = useState("12:00 pm – 2:00 pm");
  const [instructions, setInstructions] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "pay_at_store">(
    "cod"
  );
  const [clientError, setClientError] = useState("");
  useEffect(() => {
    const account = profile.data;
    if (!account) return;
    setCustomerName(value => value || account.name || "");
    setCustomerEmail(value => value || account.email || "");
    setCustomerPhone(value => value || account.phone || "");
    setAddress(value => value || account.defaultAddress || "");
  }, [profile.data]);
  const lines = cart.items
    .map(line => ({
      ...line,
      product: products.data?.find(product => product.id === line.productId),
    }))
    .filter(line => line.product);
  const subtotal = lines.reduce(
    (sum, line) => sum + price(line.product!) * line.quantity,
    0
  );
  const deliveryFee = subtotal >= 79900 ? 0 : 4900;
  if (!cart.items.length)
    return (
      <section className="empty-cart wrap">
        <span className="empty-mark">
          <ShoppingBag size={31} />
        </span>
        <h1>
          Your bag is <em>empty.</em>
        </h1>
        <Link href="/shop" className="button button-primary">
          Browse cakes
        </Link>
      </section>
    );
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setClientError("");
    if (lines.length !== cart.items.length) {
      setClientError(
        "Some cakes in your bag are no longer available. Please return to the cart."
      );
      return;
    }
    if (
      lines.some(
        line =>
          line.quantity > line.product!.stock || !line.product!.isAvailable
      )
    ) {
      setClientError(
        "Availability changed. Please update your bag before checkout."
      );
      return;
    }
    try {
      const receipt = await create.mutateAsync({
        items: cart.items,
        customerName,
        customerPhone,
        customerEmail,
        deliveryAddress,
        deliveryDate,
        deliveryTime,
        instructions,
        paymentMethod,
      });
      sessionStorage.setItem("cakers-last-receipt", JSON.stringify(receipt));
      cart.clear();
      navigate(`/order-confirmation/${receipt.orderCode}`);
    } catch (error) {
      setClientError(
        error instanceof Error
          ? error.message
          : "Your order could not be placed. Please try again."
      );
    }
  };
  return (
    <section className="page-wrap wrap">
      <div className="page-intro compact-intro">
        <span className="eyebrow">THE LAST LITTLE STEP</span>
        <h1>
          Make it <em>official.</em>
        </h1>
        <p>Tell us where to bring your cake, and the day it should arrive.</p>
      </div>
      <form className="checkout-layout" onSubmit={submit}>
        <div className="checkout-fields">
          <section className="form-card">
            <div className="form-card-heading">
              <span>01</span>
              <div>
                <h2>Your details</h2>
                <p>
                  {user
                    ? "Your account details are ready to fill in."
                    : "We’ll only use these to get your cake to you."}
                </p>
              </div>
            </div>
            <div className="form-grid">
              <label>
                Name
                <input
                  required
                  minLength={2}
                  maxLength={120}
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  autoComplete="name"
                  placeholder="Your name"
                />
              </label>
              <label>
                Phone number
                <input
                  required
                  minLength={7}
                  maxLength={32}
                  pattern="[+()0-9 .-]{7,32}"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  autoComplete="tel"
                  placeholder="+91 98765 43210"
                />
              </label>
              <label className="full-span">
                Email address <small>(optional)</small>
                <input
                  type="email"
                  maxLength={320}
                  value={customerEmail}
                  onChange={e => setCustomerEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </label>
            </div>
          </section>
          <section className="form-card">
            <div className="form-card-heading">
              <span>02</span>
              <div>
                <h2>Where & when</h2>
                <p>A few details help us plan a fresh delivery.</p>
              </div>
            </div>
            <div className="form-grid">
              <label className="full-span">
                Delivery address
                <textarea
                  required
                  minLength={8}
                  maxLength={800}
                  value={deliveryAddress}
                  onChange={e => setAddress(e.target.value)}
                  autoComplete="street-address"
                  placeholder="Flat / house number, street, area, Bengaluru"
                  rows={3}
                />
              </label>
              <label>
                Delivery date
                <input
                  required
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  value={deliveryDate}
                  onChange={e => setDate(e.target.value)}
                />
              </label>
              <label>
                Preferred time
                <select
                  value={deliveryTime}
                  onChange={e => setTime(e.target.value)}
                >
                  <option>10:00 am – 12:00 pm</option>
                  <option>12:00 pm – 2:00 pm</option>
                  <option>2:00 pm – 4:00 pm</option>
                  <option>4:00 pm – 6:00 pm</option>
                  <option>6:00 pm – 8:00 pm</option>
                </select>
              </label>
              <label className="full-span">
                A note for the kitchen <small>(optional)</small>
                <textarea
                  maxLength={1000}
                  value={instructions}
                  onChange={e => setInstructions(e.target.value)}
                  placeholder="A gate code, birthday candle, or anything else we should know…"
                  rows={2}
                />
              </label>
            </div>
          </section>
          <section className="form-card">
            <div className="form-card-heading">
              <span>03</span>
              <div>
                <h2>Payment</h2>
                <p>Simple and clear for your college demonstration.</p>
              </div>
            </div>
            <div className="payment-options">
              <label
                className={`payment-option ${paymentMethod === "cod" ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  name="payment"
                  value="cod"
                  checked={paymentMethod === "cod"}
                  onChange={() => setPaymentMethod("cod")}
                />
                <span>
                  <b>Cash on Delivery</b>
                  <small>Pay when your cake arrives.</small>
                </span>
              </label>
              <label
                className={`payment-option ${paymentMethod === "pay_at_store" ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  name="payment"
                  value="pay_at_store"
                  checked={paymentMethod === "pay_at_store"}
                  onChange={() => setPaymentMethod("pay_at_store")}
                />
                <span>
                  <b>Pay at store</b>
                  <small>Settle up when you pick up your order.</small>
                </span>
              </label>
            </div>
            <p className="payment-disclaimer">
              No online payment gateway is connected. Nothing is charged online.
            </p>
          </section>
        </div>
        <aside className="summary-card checkout-summary">
          <span className="eyebrow">FROM OUR KITCHEN</span>
          <h2>Your cakes</h2>
          {products.isLoading ? (
            <LoaderCircle className="spin" />
          ) : (
            <div className="summary-items">
              {lines.map(({ product, quantity }) => (
                <div key={product!.id}>
                  <span>
                    {product!.name} <small>× {quantity}</small>
                  </span>
                  <b>{formatRupees(price(product!) * quantity)}</b>
                </div>
              ))}
            </div>
          )}
          <div className="summary-row">
            <span>Subtotal</span>
            <b>{formatRupees(subtotal)}</b>
          </div>
          <div className="summary-row">
            <span>Delivery</span>
            <b>{deliveryFee === 0 ? "On us" : formatRupees(deliveryFee)}</b>
          </div>
          <small className="summary-hint">Free delivery over ₹799.</small>
          <div className="summary-total">
            <span>To pay on delivery / pickup</span>
            <b>{formatRupees(subtotal + deliveryFee)}</b>
          </div>
          {clientError && <p className="form-error">{clientError}</p>}
          <button
            type="submit"
            className="button button-primary summary-cta"
            disabled={create.isPending || products.isLoading}
          >
            {create.isPending ? (
              <>
                <LoaderCircle className="spin" size={17} /> Placing your order…
              </>
            ) : (
              <>
                Place my order <ArrowRight size={17} />
              </>
            )}
          </button>
          <Link href="/cart" className="continue-link">
            <ArrowLeft size={14} /> Back to your bag
          </Link>
          <p className="checkout-privacy">
            Your order details are used only to prepare and deliver this order.
          </p>
        </aside>
      </form>
    </section>
  );
}
