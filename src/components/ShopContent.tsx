"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import styles from "../app/page.module.css";
import { products } from "../lib/catalog";
import { CartItem, currency, readStoredCart, saveStoredCart } from "../lib/storefront";

export function ShopContent() {
  const [cart, setCart] = useState<CartItem[]>(readStoredCart);

  useEffect(() => {
    saveStoredCart(cart);
  }, [cart]);

  function addToCart(productId: string) {
    const product = products.find((entry) => entry.id === productId);
    if (!product) {
      return;
    }

    setCart((currentCart) => {
      const existingItem = currentCart.find((item) => item.cartKey === product.id);

      if (existingItem) {
        return currentCart.map((item) =>
          item.cartKey === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }

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
              src="/assets/products/sour_dough.PNG"
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

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <p className={styles.kicker}>Menu</p>
          <h2>Freshly baked favorites with clear pricing</h2>
          <p>
            Plain sourdough and each inclusion loaf now appear as their own product. Every sourdough version is
            the same loaf price.
          </p>
        </div>

        <div className={styles.grid}>
          {products.map((product, index) => {
            const matchingItems = cart.filter((item) => item.id === product.id);
            const productCount = matchingItems.reduce((total, item) => total + item.quantity, 0);

            return (
              <article key={product.id} className={styles.card} style={{ animationDelay: `${index * 120}ms` }}>
                <div className={styles.imageWrap}>
                  <Image src={product.image} alt={product.name} fill sizes="(max-width: 900px) 100vw, 50vw" />
                  {product.overlayImage ? (
                    <div className={styles.productOverlayImage}>
                      <Image
                        src={product.overlayImage}
                        alt={`${product.name} inclusion`}
                        fill
                        sizes="96px"
                      />
                    </div>
                  ) : null}
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardHeading}>
                    <h3>{product.name}</h3>
                    <span className={styles.price}>{currency.format(product.price)}</span>
                  </div>
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
      </section>
    </>
  );
}
