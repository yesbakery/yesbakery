import Image from "next/image";
import Link from "next/link";
import { HomeSlideshow } from "../components/HomeSlideshow";
import { SiteShell } from "../components/SiteShell";
import { products } from "../lib/catalog";
import styles from "./page.module.css";

export default function Home() {
  const favoriteProducts = products.filter((product) =>
    ["sourdough", "cinnamon-rolls", "empanada", "tropical-paradise-jam"].includes(product.id),
  );

  return (
    <SiteShell>
      <HomeSlideshow />

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <p className={styles.kicker}>Weekly Favorites</p>
          <h2>These are the people favorites baked every week. What is yours now?</h2>
        </div>

        <div className={styles.homeFavoritesGrid}>
          {favoriteProducts.map((product) => (
            <article key={product.id} className={`${styles.card} ${styles.homeFavoriteCard}`}>
              <div className={styles.homeFavoriteImageWrap}>
                <Image src={product.image} alt={product.name} fill sizes="(max-width: 900px) 50vw, 25vw" />
              </div>
              <div className={styles.homeFavoriteBody}>
                <div className={styles.cardHeading}>
                  <h3>{product.name}</h3>
                  <span className={styles.price}>${product.price}</span>
                </div>
                {product.id === "cinnamon-rolls" || product.id === "empanada" ? (
                  <div className={styles.eachPricePill}>Per Each</div>
                ) : null}
                <p>{product.description}</p>
              </div>
            </article>
          ))}
        </div>

        <div className={styles.homeFavoritesActions}>
          <Link className={styles.addButton} href="/shop">
            Shop All Favorites
          </Link>
          <Link className={styles.secondaryCta} href="/about">
            Read Our Story
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}
