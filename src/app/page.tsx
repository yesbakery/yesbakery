import Image from "next/image";
import Link from "next/link";
import { SiteShell } from "../components/SiteShell";
import styles from "./page.module.css";

export default function Home() {
  return (
    <SiteShell>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Yes Bakery & More</p>
          <h1>Handcrafted breads, pastries, and sweet comforts made for sharing.</h1>
          <p className={styles.lede}>
            From slow-fermented sourdough to cinnamon rolls and Salvadoran favorites, each bake is prepared with
            care, tradition, and the kind of warmth that belongs at every family table.
          </p>

          <div className={styles.heroActions}>
            <Link className={styles.primaryCta} href="/shop">
              Shop the Menu
            </Link>
            <Link className={styles.secondaryCta} href="/cart">
              View Cart
            </Link>
          </div>
        </div>

        <div className={styles.heroFeature}>
          <div className={styles.heroImageWrap}>
            <Image
              src="/assets/products/cinnamon_rolls.PNG"
              alt="Fresh cinnamon rolls from Yes Bakery & More"
              fill
              priority
              sizes="(max-width: 900px) 100vw, 42vw"
            />
          </div>
          <div className={styles.heroNote}>
            <span>Signature Favorite</span>
            <strong>Cinnamon Rolls</strong>
            <em>$6 each</em>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.grid}>
          <article className={styles.card}>
            <div className={styles.cardBody}>
              <p className={styles.kicker}>Shop</p>
              <h3>Browse the bakery menu on its own page</h3>
              <p>Choose sourdough, pastries, jams, and more without the rest of checkout crowding the page.</p>
              <div className={styles.cardActions}>
                <Link className={styles.addButton} href="/shop">
                  Go to Shop
                </Link>
              </div>
            </div>
          </article>

          <article className={styles.card}>
            <div className={styles.cardBody}>
              <p className={styles.kicker}>Cart</p>
              <h3>Review your order and choose pickup or shipping approval</h3>
              <p>
                The cart now has its own page for quantities, pickup details, shipping requests, and checkout.
              </p>
              <div className={styles.cardActions}>
                <Link className={styles.addButton} href="/cart">
                  Go to Cart
                </Link>
              </div>
            </div>
          </article>

          <article className={styles.card}>
            <div className={styles.cardBody}>
              <p className={styles.kicker}>About Us</p>
              <h3>Read the bakery story and send a message</h3>
              <p>
                The About page now holds the story and contact form, so the site feels more like a real multi-page
                bakery website.
              </p>
              <div className={styles.cardActions}>
                <Link className={styles.addButton} href="/about">
                  Visit About Us
                </Link>
              </div>
            </div>
          </article>
        </div>
      </section>
    </SiteShell>
  );
}
