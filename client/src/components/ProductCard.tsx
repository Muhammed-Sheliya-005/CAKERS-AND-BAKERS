import { ShoppingBag, Star } from "lucide-react";
import { Link } from "wouter";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";
import { useCart } from "../contexts/CartContext";
import { formatRupees } from "../lib/shop";
import { toast } from "sonner";

type Product =
  inferRouterOutputs<AppRouter>["catalog"]["home"]["featured"][number];
export default function ProductCard({
  product,
  compact = false,
}: {
  product: Product;
  compact?: boolean;
}) {
  const { add } = useCart();
  return (
    <article
      className={`product-card ${compact ? "product-card-compact" : ""}`}
    >
      <div className="product-photo-wrap">
        <Link
          href={`/product/${product.slug}`}
          className="product-photo-link"
          aria-label={`View ${product.name}`}
        >
          <img
            className="product-photo"
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
          />
        </Link>
        {product.offer && (
          <span className="sale-ribbon">
            {product.offer.discountPercent}% off
          </span>
        )}
        {product.isNew && <span className="new-ribbon">Just baked</span>}
        <button
          className="quick-add"
          onClick={() => {
            add(product.id);
            toast.success(`${product.name} added to your bag`);
          }}
          aria-label={`Add ${product.name} to cart`}
          disabled={!product.isAvailable || product.stock < 1}
        >
          <ShoppingBag size={17} />
        </button>
      </div>
      <div className="product-info">
        <div className="product-kicker">{product.categoryName}</div>
        <Link href={`/product/${product.slug}`} className="product-name">
          {product.name}
        </Link>
        <p className="product-description">{product.description}</p>
        <div className="product-bottom">
          <span className="product-rating">
            <Star size={14} fill="currentColor" />{" "}
            {(product.ratingTenths / 10).toFixed(1)}
          </span>
          <div className="product-price">
            {product.offer ? (
              <>
                <strong>
                  {formatRupees(product.offer.discountedPricePaise)}
                </strong>
                <del>{formatRupees(product.pricePaise)}</del>
              </>
            ) : (
              <strong>{formatRupees(product.pricePaise)}</strong>
            )}
          </div>
        </div>
        {product.stock <= 3 && product.stock > 0 && (
          <span className="stock-note">Only {product.stock} left today</span>
        )}
        {product.stock < 1 && (
          <span className="stock-note sold-out">Sold out today</span>
        )}
      </div>
    </article>
  );
}
