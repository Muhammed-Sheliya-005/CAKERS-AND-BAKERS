import { useState } from "react";
import { Link } from "wouter";
import {
  ChevronDown,
  Heart,
  Menu,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react";
import BrandMark from "./BrandMark";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../_core/hooks/useAuth";

const links = [
  ["Home", "/"],
  ["Shop", "/shop"],
  ["Categories", "/categories"],
  ["Today’s Special", "/today-special"],
] as const;

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { count } = useCart();
  const { user, logout } = useAuth();
  return (
    <div className="site-shell">
      <div className="announcement">
        <span>Freshly baked, made for your moments</span>
        <span className="announcement-dot">✦</span>
        <span>Complimentary delivery over ₹799</span>
      </div>
      <header className="site-header">
        <Link href="/" className="brand" aria-label="Cakers & Cakers home">
          <span className="brand-mark">
            <BrandMark />
          </span>
          <span className="brand-copy">
            <strong>
              Cakers <i>&</i> Cakers
            </strong>
            <small>HANDMADE WITH A LITTLE JOY</small>
          </span>
        </Link>
        <nav
          className={`desktop-nav ${menuOpen ? "mobile-open" : ""}`}
          aria-label="Main navigation"
        >
          {links.map(([label, href]) => (
            <Link key={href} href={href} onClick={() => setMenuOpen(false)}>
              {label}
              {href === "/categories" && <ChevronDown size={13} />}
            </Link>
          ))}
          <Link href="/#about" onClick={() => setMenuOpen(false)}>
            About Us
          </Link>
          <Link href="/#contact" onClick={() => setMenuOpen(false)}>
            Contact
          </Link>
        </nav>
        <div className="header-actions">
          <Link href="/account" className="icon-action" aria-label="Account">
            <UserRound size={19} />
            <span className="account-label">
              {user?.name?.split(" ")[0] || "Account"}
            </span>
          </Link>
          <Link
            href="/shop"
            className="icon-action wishlist-shortcut"
            aria-label="Shop favourites"
          >
            <Heart size={19} />
          </Link>
          <Link
            href="/cart"
            className="icon-action cart-action"
            aria-label={`Cart, ${count} items`}
          >
            <ShoppingBag size={19} />
            <span>Cart</span>
            {count > 0 && <b className="cart-count">{count}</b>}
          </Link>
          <button
            className="menu-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      <main>{children}</main>
      <footer className="site-footer" id="contact">
        <div className="footer-main wrap">
          <div className="footer-brand">
            <Link href="/" className="brand brand-light">
              <span className="brand-mark">
                <BrandMark />
              </span>
              <span className="brand-copy">
                <strong>
                  Cakers <i>&</i> Cakers
                </strong>
                <small>HANDMADE WITH A LITTLE JOY</small>
              </span>
            </Link>
            <p>
              Small-batch cakes, thoughtful details, and something lovely for
              every reason to celebrate.
            </p>
            <div className="social-links">
              <a href="https://instagram.com" target="_blank" rel="noreferrer">
                Instagram
              </a>
              <a href="https://facebook.com" target="_blank" rel="noreferrer">
                Facebook
              </a>
            </div>
          </div>
          <div className="footer-col">
            <h4>Explore</h4>
            <Link href="/shop">All cakes</Link>
            <Link href="/categories">Categories</Link>
            <Link href="/today-special">Today’s special</Link>
            <Link href="/custom-cake">Custom cakes</Link>
          </div>
          <div className="footer-col">
            <h4>We’re here</h4>
            <span>12, Rosewood Lane</span>
            <span>Bengaluru, Karnataka 560001</span>
            <a href="tel:+918012345678">+91 80 1234 5678</a>
            <a href="mailto:hello@cakersandcakers.in">
              hello@cakersandcakers.in
            </a>
          </div>
          <div className="footer-col">
            <h4>Fresh from our kitchen</h4>
            <span>Tuesday — Sunday</span>
            <span>10:00 am — 8:00 pm</span>
            <span className="footer-note">Baked fresh in small batches.</span>
            <Link href="/track-order" className="footer-track">
              Track an order →
            </Link>
          </div>
        </div>
        <div className="footer-bottom wrap">
          <span>© 2026 Cakers & Cakers. Made with care.</span>
          <span>Cash on Delivery · Pay at Store</span>
          <div>
            {user?.role === "admin" && <Link href="/admin">Admin</Link>}
            {user && <button onClick={() => void logout()}>Sign out</button>}
          </div>
        </div>
      </footer>
    </div>
  );
}
