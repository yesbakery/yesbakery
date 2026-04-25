"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import styles from "../app/page.module.css";
import { INCLUSION_PRICE, products, SOURDOUGH_ID, sourdoughInclusions } from "../lib/catalog";
import { buildSourdoughCartItem, CartItem, currency, readStoredCart, saveStoredCart } from "../lib/storefront";

export function ShopContent() {
  const [cart, setCart] = useState<CartItem[]>(readStoredCart);
  const [sourdoughCustomizerOpen, setSourdoughCustomizerOpen] = useState(false);
  const [selectedInclusionIds, setSelectedInclusionIds] = useState<string[]>([]);

  useEffect(() => {
    saveStoredCart(cart);
  }, [cart]);

  const sourdoughCount = cart
    .filter((item) => item.id === SOURDOUGH_ID)
    .reduce((total, item) => total + item.quantity, 0);

  const sourdoughInclusionPreview = useMemo(
    () => sourdoughInclusions.filter((inclusion) => selectedInclusionIds.includes(inclusion.id)),
    [selectedInclusionIds],
  );

  function openSourdoughCustomizer() {
    setSelectedInclusionIds([]);
    setSourdoughCustomizerOpen(true);
  }

  function closeSourdoughCustomizer() {
    setSourdoughCustomizerOpen(false);
    setSelectedInclusionIds([]);
  }

  function addToCart(productId: string) {
    const product = products.find((entry) => entry.id === productId);
    if (!product) {
      return;
    }

    if (product.id === SOURDOUGH_ID) {
      openSourdoughCustomizer();
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

  function confirmSourdoughSelection() {
    const sourdough = products.find((product) => product.id === SOURDOUGH_ID);
    if (!sourdough) {
      return;
    }

    const selectedInclusions = sourdoughInclusions.filter((inclusion) =>
      selectedInclusionIds.includes(inclusion.id),
    );
    const nextCartItem = buildSourdoughCartItem(sourdough, selectedInclusions);

    setCart((currentCart) => {
      const existingItem = currentCart.find((item) => item.cartKey === nextCartItem.cartKey);

      if (existingItem) {
        return currentCart.map((item) =>
          item.cartKey === nextCartItem.cartKey ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }

      return [...currentCart, nextCartItem];
    });

    closeSourdoughCustomizer();
  }

  function toggleInclusion(inclusionId: string) {
    setSelectedInclusionIds((currentSelection) =>
      currentSelection.includes(inclusionId)
        ? currentSelection.filter((id) => id !== inclusionId)
        : [...currentSelection, inclusionId],
    );
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
            Build the order at your own pace. Sourdough loaves can be customized with inclusions, and everything
            you add will stay ready for checkout in the cart page.
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
            Sourdough includes a customization step so customers can choose inclusions before each loaf is added
            to the cart. Each selected inclusion adds {currency.format(INCLUSION_PRICE)}.
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
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardHeading}>
                    <h3>{product.name}</h3>
                    <span className={styles.price}>{currency.format(product.price)}</span>
                  </div>
                  <p>{product.description}</p>

                  {product.id === SOURDOUGH_ID ? (
                    <div className={styles.sourdoughCallout}>
                      <strong>Customize your loaf</strong>
                      <span>Choose from 5 inclusions at {currency.format(INCLUSION_PRICE)} each.</span>
                    </div>
                  ) : null}

                  <div className={styles.cardActions}>
                    <button type="button" className={styles.addButton} onClick={() => addToCart(product.id)}>
                      {product.id === SOURDOUGH_ID ? "Customize & Add" : "Add to Cart"}
                    </button>

                    {product.id === SOURDOUGH_ID ? (
                      productCount > 0 ? <div className={styles.menuCount}>{sourdoughCount} in cart</div> : null
                    ) : productCount > 0 ? (
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

      {sourdoughCustomizerOpen ? (
        <div className={styles.modalOverlay} role="presentation" onClick={closeSourdoughCustomizer}>
          <div
            className={styles.modalCard}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sourdough-customizer-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.kicker}>Sourdough Inclusions</p>
                <h2 id="sourdough-customizer-title">Customize your sourdough loaf</h2>
                <p className={styles.modalIntro}>
                  Pick any inclusions you want. Each selected option adds {currency.format(INCLUSION_PRICE)}.
                </p>
              </div>

              <button
                type="button"
                className={styles.modalClose}
                onClick={closeSourdoughCustomizer}
                aria-label="Close sourdough customizer"
              >
                x
              </button>
            </div>

            <div className={styles.inclusionGrid}>
              {sourdoughInclusions.map((inclusion) => {
                const isSelected = selectedInclusionIds.includes(inclusion.id);

                return (
                  <button
                    key={inclusion.id}
                    type="button"
                    className={`${styles.inclusionCard} ${isSelected ? styles.inclusionCardSelected : ""}`}
                    onClick={() => toggleInclusion(inclusion.id)}
                  >
                    <div className={styles.inclusionImageWrap}>
                      <Image src={inclusion.image} alt={inclusion.name} fill sizes="(max-width: 900px) 100vw, 25vw" />
                    </div>
                    <div className={styles.inclusionContent}>
                      <strong>{inclusion.name}</strong>
                      <span>+{currency.format(INCLUSION_PRICE)}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className={styles.modalFooter}>
              <div className={styles.modalSummary}>
                <strong>Sourdough total</strong>
                <span>{currency.format(10 + sourdoughInclusionPreview.length * INCLUSION_PRICE)}</span>
                {sourdoughInclusionPreview.length > 0 ? (
                  <p>{sourdoughInclusionPreview.map((inclusion) => inclusion.name).join(", ")}</p>
                ) : (
                  <p>Plain sourdough selected.</p>
                )}
              </div>

              <button type="button" className={styles.submitButton} onClick={confirmSourdoughSelection}>
                Add Sourdough to Cart
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
