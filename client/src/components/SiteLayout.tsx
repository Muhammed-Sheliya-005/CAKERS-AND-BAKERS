import { useState } from "react";
import { Link } from "wouter";
import { ChevronDown, Heart, Menu, ShoppingBag, UserRound, X } from "lucide-react";
import BrandMark from "./BrandMark";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../_core/hooks/useAuth";
import { trpc } from "../lib/trpc";

const links = [
  ["Home", "/"],
  ["Shop", "/shop"],
  ["Categories", "/categories"],
  ["Today’s Special", "/today-special"],
] as const;

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { count } = useCart();
  const { user, logout } = useAuth();
  const business = trpc.storefront.businessProfile.useQuery(undefined, {
    staleTime: 60_000,
  });
  const profile = business.data;
  const freeDeliveryText = profile
    ? profile.deliveryEnabled
      ? profile.freeDeliveryThresholdPaise > 0
        ? `Complimentary delivery over ₹${Math.round(profile.freeDeliveryThresholdPaise / 100)}`
        : "Delivery is on us"
      : profile.pickupEnabled
        ? "Fresh cakes, ready for pickup"
        : "Contact the bakery for fulfilment"
    : "Freshly baked, made for your moments";
  return (
    <div className="site-shell">
      <div className="announcement">
        <span>Freshly baked, made for your moments</span>
        <span className="announcement-dot">✦</span>
        <span>{freeDeliveryText}</span>
      </div>
      <header className="site-header">
        <Link href="/" className="brand" aria-label="Cakers & Cakers home">
          <span className="brand-mark"><BrandMark /></span>
          <span className="brand-copy"><strong>Cakers <i>&</i> Cakers</strong><small>HANDMADE WITH A LITTLE JOY</small></span>
        </Link>
        <nav className={`desktop-nav ${menuOpen ? "mobile-open" : ""}`} aria-label="Main navigation">
          {links.map(([label, href]) => <Link key={href} href={href} onClick={() => setMenuOpen(false)}>{label}{href === "/categories" && <ChevronDown size={13} />}</Link>)}
          <Link href="/#about" onClick={() => setMenuOpen(false)}>About Us</Link>
          <Link href="/contact" onClick={() => setMenuOpen(false)}>Contact</Link>
        </nav>
        <div className="header-actions">
          <Link href="/account" className="icon-action" aria-label="Account"><UserRound size={19} /><span className="account-label">{user?.name?.split(" ")[0] || "Account"}</span></Link>
          <Link href="/shop" className="icon-action wishlist-shortcut" aria-label="Shop favourites"><Heart size={19} /></Link>
          <Link href="/cart" className="icon-action cart-action" aria-label={`Cart, ${count} items`}><ShoppingBag size={19} /><span>Cart</span>{count > 0 && <b className="cart-count">{count}</b>}</Link>
          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Close menu" : "Open menu"}>{menuOpen ? <X /> : <Menu />}</button>
        </div>
      </header>
      <main>{children}</main>
      <footer className="site-footer" id="contact">
        <div className="footer-main wrap">
          <div className="footer-brand">
            <Link href="/" className="brand brand-light"><span className="brand-mark"><BrandMark /></span><span className="brand-copy"><strong>Cakers <i>&</i> Cakers</strong><small>HANDMADE WITH A LITTLE JOY</small></span></Link>
            <p>Small-batch cakes, thoughtful details, and something lovely for every reason to celebrate.</p>
            <Link className="footer-track" href="/contact">Write to the bakery →</Link>
          </div>
          <div className="footer-col">
            <h4>Explore</h4><Link href="/shop">All cakes</Link><Link href="/categories">Categories</Link><Link href="/today-special">Today’s special</Link><Link href="/custom-cake">Custom cakes</Link><Link href="/contact">Contact the bakery</Link>
          </div>
          <div className="footer-col">
            <h4>We’re here</h4><span>{profile?.businessName ?? "Cakers & Cakers"}</span><span>{profile?.businessAddress ?? "Ayesha Tower, S.V. Road, Opp. MTNL, Jogeshwari West, Mumbai 400060."}</span>{profile?.contactPhone && <a href={`tel:${profile.contactPhone}`}>{profile.contactPhone}</a>}{profile?.contactEmail && <a href={`mailto:${profile.contactEmail}`}>{profile.contactEmail}</a>}
          </div>
          <div className="footer-col">
            <h4>Fresh from our kitchen</h4><span>{profile?.openingHours ?? "Opening hours are being updated."}</span><span className="footer-note">Baked fresh in small batches.</span><Link href="/track-order" className="footer-track">Track an order →</Link>
          </div>
        </div>
        <div className="footer-bottom wrap">
          <span>© 2026 Cakers & Cakers. Made with care.</span><span>Offline payment · No online gateway is connected</span>
          <div>{(user?.role === "admin" || user?.role === "staff") && <Link href="/admin">Bakery workspace</Link>}{user && <button onClick={() => void logout()}>Sign out</button>}</div>
        </div>
      </footer>
    </div>
  );
}
