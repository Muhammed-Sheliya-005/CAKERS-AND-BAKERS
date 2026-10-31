import { useState } from "react";
import { ArrowRight, Check, Heart, LoaderCircle, Minus, Plus, Star } from "lucide-react";
import { Link, useLocation, useRoute } from "wouter";
import { toast } from "sonner";
import { trpc } from "../lib/trpc";
import { formatRupees } from "../lib/shop";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../_core/hooks/useAuth";

export default function ProductDetail() {
  const [, params] = useRoute("/product/:slug");
  const slug = params?.slug || "";
  const product = trpc.catalog.bySlug.useQuery({ slug }, { enabled: !!slug });
  const reviews = trpc.catalog.reviews.useQuery({ productId: product.data?.id }, { enabled: !!product.data?.id });
  const reviewMutation = trpc.reviews.submit.useMutation();
  const { add } = useCart();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [reviewText, setReviewText] = useState("");
  const [rating, setRating] = useState(5);
  if (product.isLoading) return <div className="loading-state"><LoaderCircle className="spin" />Finding that lovely cake…</div>;
  if (!product.data) return <section className="state-panel"><h2>That cake has left the counter.</h2><p>Try another favourite from the shop.</p><Link href="/shop" className="button button-primary">Back to cakes</Link></section>;
  const item = product.data;
  const availableVariants = (item.variants ?? []).filter(variant => variant.isAvailable && variant.stock > 0);
  const hasVariants = (item.variants ?? []).length > 0;
  const selectedVariant = availableVariants.find(variant => variant.id === selectedVariantId) ?? availableVariants[0];
  const currentStock = hasVariants ? selectedVariant?.stock ?? 0 : item.stock;
  const currentPrice = selectedVariant?.effectivePricePaise ?? item.offer?.discountedPricePaise ?? item.pricePaise;
  const originalPrice = selectedVariant?.pricePaise ?? item.pricePaise;
  const addItem = () => {
    if (hasVariants && !selectedVariant) { toast.error("No cake size is currently available."); return; }
    add(item.id, quantity, selectedVariant?.id);
    toast.success(`${quantity} × ${item.name}${selectedVariant ? ` · ${selectedVariant.name}` : ""} added to your bag`);
  };
  return (
    <div className="wrap product-detail-page">
      <div className="breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/shop">Shop</Link><span>/</span><span>{item.name}</span></div>
      <div className="detail-layout">
        <div className="detail-photo"><img src={item.imageUrl} alt={item.name} />{item.offer && <span className="detail-sale">{item.offer.discountPercent}% off today</span>}</div>
        <div className="detail-copy">
          <span className="eyebrow">{item.categoryName?.toUpperCase()}</span><h1>{item.name}</h1>
          <div className="detail-rating"><span>★★★★★</span> {(item.ratingTenths / 10).toFixed(1)} <span className="detail-dot">·</span> made fresh to order</div>
          <p className="detail-description">{item.description}</p>
          {hasVariants && <label className="variant-choice">Choose a cake size<select value={selectedVariant?.id ?? ""} onChange={event => { setSelectedVariantId(Number(event.target.value) || null); setQuantity(1); }}><option value="" disabled>Select an available size</option>{item.variants!.map(variant => <option key={variant.id} value={variant.id} disabled={!variant.isAvailable || variant.stock < 1}>{variant.name} · {formatRupees(variant.effectivePricePaise)}{variant.stock < 1 ? " · sold out" : ""}</option>)}</select></label>}
          <div className="detail-price">{item.offer ? <><strong>{formatRupees(currentPrice)}</strong><del>{formatRupees(originalPrice)}</del><small>Today’s special · ends {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(item.offer.endsAt))}</small></> : <strong>{formatRupees(currentPrice)}</strong>}</div>
          <div className={`availability ${currentStock > 0 ? "available" : "unavailable"}`}><span />{currentStock > 0 ? `${currentStock} available to bake` : "Out of stock today"}</div>
          <div className="product-option-notes"><span><b>Dietary:</b> {item.eggOption === "eggless" ? "Eggless" : item.eggOption === "contains_egg" ? "Contains egg" : "Egg or eggless — ask us"}</span><span><b>Preparation:</b> {item.preparationMinutes ? `${Math.ceil(item.preparationMinutes / 60)} hours` : "Made to order"}; order {item.advanceOrderHours ? `${item.advanceOrderHours} hours` : "anytime"} ahead</span>{item.customizationOptions && <span><b>Customisation:</b> {item.customizationOptions}</span>}</div>
          <div className="detail-actions"><div className="quantity-control"><button onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Decrease quantity"><Minus size={15} /></button><span>{quantity}</span><button onClick={() => setQuantity(Math.min(currentStock || 1, quantity + 1))} aria-label="Increase quantity" disabled={quantity >= currentStock}><Plus size={15} /></button></div><button className="button button-primary detail-add" onClick={addItem} disabled={currentStock < 1 || (hasVariants && !selectedVariant)}>Add to bag <ArrowRight size={17} /></button><button className="icon-circle" aria-label="Save favourite" onClick={() => toast("Your favourites are ready to browse from the shop.")}><Heart size={18} /></button></div>
          <div className="detail-benefits"><span><Check size={15} /> Baked fresh in small batches</span><span><Check size={15} /> Cash on Delivery or pay at store</span><span><Check size={15} /> Shop fulfilment settings apply at checkout</span></div>
          <div className="custom-note">Need a different design or a little message? <Link href="/custom-cake">Request a custom cake →</Link></div>
        </div>
      </div>
      <section className="review-section"><div className="section-heading"><div><span className="eyebrow">THE GOOD WORD</span><h2>Sweet things <em>said.</em></h2></div><div className="review-average"><Star fill="currentColor" size={17} /> {(item.ratingTenths / 10).toFixed(1)} / 5</div></div><div className="reviews-list">{reviews.data?.length ? reviews.data.map(review => <article key={review.id} className="review-line"><span className="review-stars">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span><p>{review.body}</p><strong>{review.customerName}</strong></article>) : <p className="muted-copy">No reviews just yet. Be the first to share how it tasted.</p>}</div>
        {user ? <form className="review-form" onSubmit={async event => { event.preventDefault(); try { await reviewMutation.mutateAsync({ productId: item.id, rating, body: reviewText }); setReviewText(""); toast.success("Your review is waiting for a quick check."); void reviews.refetch(); } catch { toast.error("Your review could not be sent just now."); } }}><h3>Leave a little note</h3><label>Your rating<select value={rating} onChange={event => setRating(Number(event.target.value))}><option value={5}>5 — Lovely!</option><option value={4}>4 — Very good</option><option value={3}>3 — Good</option><option value={2}>2 — Could be better</option><option value={1}>1 — Not for me</option></select></label><textarea value={reviewText} onChange={event => setReviewText(event.target.value)} minLength={10} maxLength={1200} required placeholder="Tell us what you thought (at least 10 characters)…" /><button className="button button-outline" disabled={reviewMutation.isPending}>Send for moderation</button></form> : <button className="text-link" onClick={() => navigate("/account")}>Sign in to leave a review <ArrowRight size={14} /></button>}
      </section>
    </div>
  );
}
