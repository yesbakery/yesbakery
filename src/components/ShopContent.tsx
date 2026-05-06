"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import styles from "../app/page.module.css";
import { products } from "../lib/catalog";
import { CartItem, currency, readStoredCart, saveStoredCart } from "../lib/storefront";

type ShopFilter = "all" | "sourdough" | "treats" | "jams";

export function ShopContent() {
  const [cart, setCart] = useState<CartItem[]>(readStoredCart);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<ShopFilter>("all");
  const [cartNotice, setCartNotice] = useState<{ message: string } | null>(null);

  useEffect(() => {
    saveStoredCart(cart);
  }, [cart]);

  useEffect(() => {
    if (!cartNotice) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setCartNotice(null);
    }, 2600);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [cartNotice]);

  function addToCart(productId: string) {
    const product = products.find((entry) => entry.id === productId);
    if (!product) {
      return;
    }

    setCart((currentCart) => {
      const existingItem = currentCart.find((item) => item.cartKey === product.id);

      if (existingItem) {
        setCartNotice({ message: `${existingItem.quantity + 1} ${product.name} added to your cart.` });
        return currentCart.map((item) =>
          item.cartKey === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }

      setCartNotice({ message: `1 ${product.name} added to your cart.` });
      return [
        ...currentCart,
        {
          ...product,
          cartKey: product.id,
          quantity: 1,
          unitPrice: product.price,
          selectedInclusions: [],
        },
      ];
    });
  }

  function updateQuantity(cartKey: string, nextQuantity: number) {
    setCart((currentCart) =>
      currentCart
        .map((item) => (item.cartKey === cartKey ? { ...item, quantity: nextQuantity } : item))
        .filter((item) => item.quantity > 0),
    );
  }

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const matchesFilter =
        activeFilter === "all"
          ? true
          : activeFilter === "sourdough"
            ? product.id.startsWith("sourdough")
            : activeFilter === "jams"
              ? product.id.includes("jam")
              : !product.id.startsWith("sourdough") && !product.id.includes("jam");

      if (!matchesFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return (
        product.name.toLowerCase().includes(normalizedSearch) ||
        product.description.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [activeFilter, searchTerm]);

  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Shop</p>
          <h1>Choose the breads and pastries you want, then head to cart when you are ready.</h1>
          <p className={styles.lede}>
            Each sourdough flavor is now its own loaf, so customers can shop the exact version they want without
            opening a customization step.
          </p>
        </div>

        <div className={styles.heroFeature}>
          <div className={styles.heroImageWrap}>
            <Image
              src="/assets/products/sourdough/sour_dough-plain.PNG"
              alt="Fresh sourdough bread from Yes Bakery & More"
              fill
              priority
              sizes="(max-width: 900px) 100vw, 42vw"
            />
          </div>
          <div className={styles.heroNote}>
            <span>Bakery Favorite</span>
            <strong>Sourdough</strong>
            <em>{currency.format(10)} each</em>
          </div>
        </div>
      </section>

      <section className={styles.shopToolbarSection}>
        <div className={styles.shopToolbar}>
          <label className={styles.shopSearch}>
            <span className={styles.shopSearchLabel}>Search the shop</span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search sourdough, treats, and jams"
            />
          </label>

          <div className={styles.shopFilters} aria-label="Shop filters">
            {[
              { id: "all", label: "All" },
              { id: "sourdough", label: "Sourdough" },
              { id: "treats", label: "Treats" },
              { id: "jams", label: "Jams" },
            ].map((filter) => (
              <button
                key={filter.id}
                type="button"
                className={`${styles.filterPill} ${activeFilter === filter.id ? styles.filterPillActive : ""}`}
                onClick={() => setActiveFilter(filter.id as ShopFilter)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <p className={styles.kicker}>Menu</p>
          <h2>Freshly baked favorites with clear pricing</h2>
          <p>
            Plain sourdough is {currency.format(10)}, and the specialty sourdough loaves are {currency.format(12)}
            with their own matching product photos.
          </p>
        </div>

        <div className={styles.homeFavoritesGrid}>
          {filteredProducts.map((product, index) => {
            const matchingItems = cart.filter((item) => item.id === product.id);
            const productCount = matchingItems.reduce((total, item) => total + item.quantity, 0);

            return (
              <article
                key={product.id}
                className={`${styles.card} ${styles.homeFavoriteCard}`}
                style={{ animationDelay: `${index * 120}ms` }}
              >
                <div className={`${styles.homeFavoriteImageWrap} ${styles.shopFavoriteImageWrap}`}>
                  <Image src={product.image} alt={product.name} fill sizes="(max-width: 900px) 100vw, 50vw" />
                </div>
                <div className={styles.homeFavoriteBody}>
                  <div className={styles.cardHeading}>
                    <h3>{product.name}</h3>
                    <span className={styles.price}>{currency.format(product.price)}</span>
                  </div>
                  {product.id === "cinnamon-rolls" || product.id === "empanada" ? (
                    <div className={styles.eachPricePill}>Per Each</div>
                  ) : null}
                  <p>{product.description}</p>

                  <div className={styles.cardActions}>
                    <button type="button" className={styles.addButton} onClick={() => addToCart(product.id)}>
                      Add to Cart
                    </button>

                    {productCount > 0 ? (
                      <div className={styles.inlineQty}>
                        <button
                          type="button"
                          className={styles.qtyButton}
                          onClick={() => updateQuantity(product.id, productCount - 1)}
                          aria-label={`Decrease ${product.name} quantity`}
                        >
                          -
                        </button>
                        <span>{productCount}</span>
                        <button
                          type="button"
                          className={styles.qtyButton}
                          onClick={() => updateQuantity(product.id, productCount + 1)}
                          aria-label={`Increase ${product.name} quantity`}
                        >
                          +
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {filteredProducts.length === 0 ? (
          <div className={styles.emptyShopState}>
            <strong>No matches found.</strong>
            <p>Try a different search or switch to another filter.</p>
          </div>
        ) : null}
      </section>

      {cartNotice ? (
        <div className={styles.cartToast} role="status" aria-live="polite">
          <strong>{cartNotice.message}</strong>
          <Link href="/cart">View Cart</Link>
        </div>
      ) : null}
    </>
  );
}
