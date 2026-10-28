import { useMemo, useState } from "react";
import {
  ArrowRight,
  LoaderCircle,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Link } from "wouter";
import { trpc } from "../lib/trpc";
import ProductCard from "../components/ProductCard";

export function Shop() {
  const initialCategory = useMemo(
    () => new URLSearchParams(window.location.search).get("category") || "",
    []
  );
  const initialSort = useMemo(
    () => new URLSearchParams(window.location.search).get("sort") || "popular",
    []
  );
  const [search, setSearch] = useState("");
  const [categorySlug, setCategory] = useState(initialCategory);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState(initialSort);
  const categories = trpc.catalog.categories.useQuery();
  const products = trpc.catalog.list.useQuery({
    search: search || undefined,
    categorySlug: categorySlug || undefined,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    sort: sort as "popular" | "price-low" | "price-high" | "newest",
    limit: 36,
    offset: 0,
  });
  return (
    <section className="page-wrap wrap">
      <div className="page-intro">
        <span className="eyebrow">THE CAKE COUNTER</span>
        <h1>
          Something lovely, <em>waiting.</em>
        </h1>
        <p>
          Small-batch cakes and little treats, freshly made in our Bengaluru
          kitchen.
        </p>
        <div className="breadcrumb">
          <Link href="/">Home</Link>
          <span>/</span>
          <span>Shop</span>
        </div>
      </div>
      <div className="shop-controls">
        <label className="search-field">
          <Search size={18} />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Find a cake you’ll love…"
            aria-label="Search cakes"
          />
          {search && (
            <button onClick={() => setSearch("")} aria-label="Clear search">
              <X size={16} />
            </button>
          )}
        </label>
        <div className="filter-controls">
          <label>
            <SlidersHorizontal size={16} />
            <select
              value={categorySlug}
              onChange={event => setCategory(event.target.value)}
              aria-label="Filter by category"
            >
              <option value="">Every category</option>
              {categories.data?.map(category => (
                <option key={category.id} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="price-filter">
            <span>₹</span>
            <input
              type="number"
              min="0"
              value={minPrice}
              onChange={event => setMinPrice(event.target.value)}
              placeholder="Min"
              aria-label="Minimum price in rupees"
            />
            <span>–</span>
            <input
              type="number"
              min="0"
              value={maxPrice}
              onChange={event => setMaxPrice(event.target.value)}
              placeholder="Max"
              aria-label="Maximum price in rupees"
            />
          </label>
          <select
            value={sort}
            onChange={event => setSort(event.target.value)}
            aria-label="Sort cakes"
          >
            <option value="popular">Most loved</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
            <option value="newest">Just baked</option>
          </select>
        </div>
      </div>
      <div className="results-line">
        <span>
          {products.isLoading
            ? "Finding the good ones…"
            : `${products.data?.total ?? 0} little delights`}
        </span>
        {categorySlug && (
          <button className="clear-filter" onClick={() => setCategory("")}>
            Clear category <X size={13} />
          </button>
        )}
      </div>
      {products.isLoading ? (
        <div className="loading-state">
          <LoaderCircle className="spin" />
          Fresh bakes, one moment…
        </div>
      ) : products.error ? (
        <div className="state-panel">
          <h2>The cake counter didn’t load.</h2>
          <p>Please try again.</p>
          <button
            className="button button-primary"
            onClick={() => void products.refetch()}
          >
            Try again
          </button>
        </div>
      ) : products.data?.items.length ? (
        <div className="product-grid shop-grid">
          {products.data.items.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span className="empty-mark">✳</span>
          <h2>No cakes match that just yet.</h2>
          <p>
            Try a different search or clear your filters. There’s always
            something sweet around the corner.
          </p>
          <button
            className="button button-primary"
            onClick={() => {
              setSearch("");
              setCategory("");
              setMinPrice("");
              setMaxPrice("");
            }}
          >
            Clear filters <ArrowRight size={16} />
          </button>
        </div>
      )}
    </section>
  );
}

export function Categories() {
  const categories = trpc.catalog.categories.useQuery();
  return (
    <section className="page-wrap wrap">
      <div className="page-intro">
        <span className="eyebrow">A LITTLE SOMETHING FOR EVERY OCCASION</span>
        <h1>
          Find your kind of <em>cake.</em>
        </h1>
        <p>
          Birthday candles, just-because cupcakes, and all the moments in
          between.
        </p>
      </div>
      {categories.isLoading ? (
        <div className="loading-state">
          <LoaderCircle className="spin" />
          Loading the cake shelf…
        </div>
      ) : (
        <div className="category-page-grid">
          {categories.data?.map((category, index) => (
            <Link
              key={category.id}
              href={`/shop?category=${category.slug}`}
              className={`category-page-card category-tile-${index % 4}`}
            >
              <img src={category.imageUrl} alt="" loading="lazy" />
              <span className="category-page-copy">
                <small>0{index + 1} / CATEGORIES</small>
                <strong>{category.name}</strong>
                <span>{category.description}</span>
                <b>
                  Browse the bakes <ArrowRight size={15} />
                </b>
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export function TodaysSpecial() {
  const products = trpc.catalog.list.useQuery({
    onlyOffers: true,
    sort: "popular",
    limit: 48,
    offset: 0,
  });
  return (
    <section className="page-wrap wrap">
      <div className="special-page-intro">
        <span className="eyebrow">
          <span>✳</span> THE BAKERY’S LITTLE THANK-YOU
        </span>
        <h1>
          Today’s <em>special.</em>
        </h1>
        <p>
          A few lovely favourites, with a little something off. Available while
          the batch lasts.
        </p>
      </div>
      {products.isLoading ? (
        <div className="loading-state">
          <LoaderCircle className="spin" />
          Checking today’s tray…
        </div>
      ) : products.data?.items.length ? (
        <div className="product-grid shop-grid">
          {products.data.items.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span className="empty-mark">♡</span>
          <h2>No special bakes today.</h2>
          <p>
            Our offers change with the seasons. Visit the shop for something
            lovely.
          </p>
          <Link href="/shop" className="button button-primary">
            Browse cakes <ArrowRight size={16} />
          </Link>
        </div>
      )}
    </section>
  );
}
