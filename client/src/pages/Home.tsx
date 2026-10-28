import {
  ArrowRight,
  ArrowUpRight,
  Heart,
  Leaf,
  LoaderCircle,
  Quote,
  Sparkles,
} from "lucide-react";
import { Link } from "wouter";
import { trpc } from "../lib/trpc";
import ProductCard from "../components/ProductCard";
import { formatRupees } from "../lib/shop";

export default function Home() {
  const home = trpc.catalog.home.useQuery();
  if (home.isLoading)
    return (
      <div className="loading-state">
        <LoaderCircle className="spin" size={25} />
        Preparing something lovely…
      </div>
    );
  if (home.error || !home.data)
    return (
      <div className="state-panel">
        <h2>Our cake counter is taking a little breather.</h2>
        <p>Please try again in a moment.</p>
        <button
          className="button button-primary"
          onClick={() => void home.refetch()}
        >
          Try again
        </button>
      </div>
    );
  const { categories, featured, favourites, specials, newArrivals, reviews } =
    home.data;
  return (
    <div className="home-page">
      <section className="hero-band">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="eyebrow-star">✳</span> SMALL BATCHES · BIG MOMENTS
          </span>
          <h1>
            A little cake,
            <br />
            <em>a lot of joy.</em>
          </h1>
          <p>
            Thoughtful little bakes, made fresh for the moments you’ll remember.
            Pick a favourite, or dream one up with us.
          </p>
          <div className="hero-actions">
            <Link href="/shop" className="button button-primary">
              Shop Cakes <ArrowRight size={17} />
            </Link>
            <Link href="/shop" className="button button-text">
              Order Now <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="hero-proof">
            <span className="proof-stars">★★★★★</span>
            <span>Loved by cake people all over Bengaluru</span>
          </div>
        </div>
        <div className="hero-art">
          <img
            src="/manus-storage/async-images/lccqEzU1vj85eiz87C9MSW/image-1.webp"
            alt="Blush celebration cake topped with fresh berries and delicate flowers"
            fetchPriority="high"
          />
          <div className="hero-sticker">
            <span>
              BAKED
              <br />
              WITH
            </span>
            <strong>♥</strong>
            <small>love</small>
          </div>
          <div className="hero-note">
            A little something
            <br />
            for the occasion <span>↗</span>
          </div>
        </div>
        <div className="hero-curve" />
      </section>

      <section className="section wrap category-section" id="categories">
        <div className="section-heading">
          <div>
            <span className="eyebrow">PICK YOUR KIND OF JOY</span>
            <h2>
              A cake for every <em>occasion</em>
            </h2>
          </div>
          <Link href="/categories" className="text-link">
            All categories <ArrowRight size={16} />
          </Link>
        </div>
        <div className="category-rail">
          {categories.map((category, index) => (
            <Link
              key={category.id}
              href={`/shop?category=${category.slug}`}
              className={`category-tile category-tile-${index % 4}`}
            >
              <img src={category.imageUrl} alt="" loading="lazy" />
              <span className="category-num">0{index + 1}</span>
              <div>
                <strong>{category.name}</strong>
                <small>{category.description}</small>
              </div>
              <ArrowUpRight size={18} className="category-arrow" />
            </Link>
          ))}
        </div>
      </section>

      <section className="section section-soft">
        <div className="wrap">
          <div className="section-heading">
            <div>
              <span className="eyebrow">FRESH FROM OUR LITTLE KITCHEN</span>
              <h2>
                The week’s <em>best-loved.</em>
              </h2>
            </div>
            <Link href="/shop?sort=popular" className="text-link">
              Shop the whole counter <ArrowRight size={16} />
            </Link>
          </div>
          <div className="product-grid">
            {featured.slice(0, 4).map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {specials.length > 0 && (
        <section className="special-strip">
          <div className="wrap special-layout">
            <div className="special-copy">
              <span className="eyebrow eyebrow-light">
                <Sparkles size={14} /> TODAY’S LITTLE TREAT
              </span>
              <h2>
                A little extra
                <br />
                <em>something.</em>
              </h2>
              <p>
                A few favourites with a little thank-you from our kitchen. While
                they last.
              </p>
              <Link href="/today-special" className="button button-light">
                See today’s special <ArrowRight size={16} />
              </Link>
              <span className="special-flower">✳</span>
            </div>
            <div className="special-cards">
              {specials.slice(0, 2).map(product => (
                <Link
                  className="special-card"
                  key={product.id}
                  href={`/product/${product.slug}`}
                >
                  <div className="special-card-image">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      loading="lazy"
                    />
                    <span>{product.offer?.discountPercent}% off</span>
                  </div>
                  <div>
                    <span className="product-kicker">
                      {product.categoryName}
                    </span>
                    <strong>{product.name}</strong>
                    <div className="special-price">
                      <b>
                        {formatRupees(
                          product.offer?.discountedPricePaise ??
                            product.pricePaise
                        )}
                      </b>
                      <del>{formatRupees(product.pricePaise)}</del>
                    </div>
                  </div>
                  <ArrowUpRight size={18} />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section wrap">
        <div className="section-heading">
          <div>
            <span className="eyebrow">JUST BAKED, JUST ADDED</span>
            <h2>
              New to the <em>table.</em>
            </h2>
          </div>
          <Link href="/shop?sort=newest" className="text-link">
            See all new bakes <ArrowRight size={16} />
          </Link>
        </div>
        <div className="product-grid">
          {newArrivals.length ? (
            newArrivals
              .slice(0, 4)
              .map(product => (
                <ProductCard key={product.id} product={product} compact />
              ))
          ) : (
            <p className="muted-copy">
              No new bakes in the counter today—take a peek at the week’s
              favourites.
            </p>
          )}
        </div>
      </section>

      {favourites.length > 0 && (
        <section className="section section-soft">
          <div className="wrap">
            <div className="section-heading">
              <div>
                <span className="eyebrow">
                  <Heart size={13} /> A LITTLE SOFT SPOT
                </span>
                <h2>
                  Lovely little <em>favourites.</em>
                </h2>
              </div>
              <Link href="/shop?sort=popular" className="text-link">
                Find your own favourite <ArrowRight size={16} />
              </Link>
            </div>
            <div className="product-grid">
              {favourites.slice(0, 4).map(product => (
                <ProductCard key={product.id} product={product} compact />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="custom-banner">
        <div className="custom-banner-image">
          <img
            src="/manus-storage/async-images/lccqEzU1vj85eiz87C9MSW/image-4.webp"
            alt="Hand-finished celebration cake for a special moment"
            loading="lazy"
          />
        </div>
        <div className="custom-banner-copy">
          <span className="eyebrow">MADE JUST FOR YOU</span>
          <h2>
            Got a cake
            <br />
            in <em>mind?</em>
          </h2>
          <p>
            Tell us about the celebration, the flavour you love and the little
            details. We’ll make something that feels like yours.
          </p>
          <Link href="/custom-cake" className="button button-primary">
            Dream up a cake <ArrowRight size={16} />
          </Link>
          <span className="custom-banner-mark">
            C<span>&</span>C
          </span>
        </div>
      </section>

      <section className="section wrap testimonials" id="about">
        <div className="testimonial-heading">
          <span className="eyebrow">KIND WORDS, SWEET PEOPLE</span>
          <h2>
            Made with care.
            <br />
            <em>Remembered fondly.</em>
          </h2>
          <p>Our favourite part of baking is hearing where the cake went.</p>
          <div className="testimonial-avatars">
            <span>A</span>
            <span>M</span>
            <span>K</span>
            <b>4.9 ★★★★★</b>
          </div>
        </div>
        <div className="quote-grid">
          {reviews.length ? (
            reviews.map(review => (
              <article className="quote-card" key={review.id}>
                <Quote size={21} />
                <div className="quote-stars">
                  {"★".repeat(review.rating)}
                  {"☆".repeat(5 - review.rating)}
                </div>
                <p>“{review.body}”</p>
                <strong>{review.customerName}</strong>
                <small>Sample review · demo data</small>
              </article>
            ))
          ) : (
            <article className="quote-card">
              <Quote size={21} />
              <div className="quote-stars">★★★★★</div>
              <p>
                “A little cake, a lovely afternoon, and a memory we’ll keep.”
              </p>
              <strong>From our kitchen</strong>
              <small>A note from the bakery</small>
            </article>
          )}
        </div>
      </section>

      <section className="about-band">
        <div className="wrap about-content">
          <div className="about-icon">
            <Leaf size={27} />
          </div>
          <div>
            <span className="eyebrow">A NOTE FROM OUR KITCHEN</span>
            <h2>
              Good ingredients.
              <br />
              <em>Good things follow.</em>
            </h2>
          </div>
          <p>
            We’re a small neighbourhood bakery in Bengaluru, making celebration
            cakes the slow, thoughtful way. Real butter, fresh fruit and
            hands-on finishing — because the little details are what make a cake
            feel like yours.
          </p>
          <Link href="/#contact" className="about-link">
            Come say hello <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      <section className="newsletter-band">
        <div className="wrap newsletter-content">
          <Heart size={20} />
          <div>
            <span className="eyebrow">A LITTLE NOTE FROM US</span>
            <h2>
              Something sweet is always <em>on its way.</em>
            </h2>
            <p>
              Follow along for seasonal bakes and behind-the-scenes flour on the
              counter.
            </p>
          </div>
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noreferrer"
            className="button button-outline"
          >
            Find us on Instagram <ArrowUpRight size={16} />
          </a>
        </div>
      </section>
    </div>
  );
}
