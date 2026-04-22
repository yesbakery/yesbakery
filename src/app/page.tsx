"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { INCLUSION_PRICE, Inclusion, Product, products, SOURDOUGH_ID, sourdoughInclusions } from "../lib/catalog";
import styles from "./page.module.css";

type CartItem = Product & {
  cartKey: string;
  quantity: number;
  unitPrice: number;
  selectedInclusions: Inclusion[];
};

type CheckoutForm = {
  fullName: string;
  email: string;
  phone: string;
  pickupDate: string;
  notes: string;
};

const initialForm: CheckoutForm = {
  fullName: "",
  email: "",
  phone: "",
  pickupDate: "",
  notes: "",
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function normalizeCartItem(item: Partial<CartItem> & Product): CartItem {
  const selectedInclusions = Array.isArray(item.selectedInclusions) ? item.selectedInclusions : [];
  const unitPrice =
    typeof item.unitPrice === "number"
      ? item.unitPrice
      : item.price + selectedInclusions.length * INCLUSION_PRICE;

  return {
    ...item,
    cartKey:
      typeof item.cartKey === "string" && item.cartKey.length > 0
        ? item.cartKey
        : item.id === SOURDOUGH_ID && selectedInclusions.length > 0
          ? `${item.id}:${selectedInclusions
              .map((inclusion) => inclusion.id)
              .sort()
              .join("-")}`
          : item.id,
    quantity: typeof item.quantity === "number" && item.quantity > 0 ? item.quantity : 1,
    unitPrice,
    selectedInclusions,
  };
}

function readStoredCart(): CartItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  const storedCart = window.localStorage.getItem("yesbakery-cart");
  if (!storedCart) {
    return [];
  }

  try {
    const parsedCart = JSON.parse(storedCart) as Array<Partial<CartItem> & Product>;
    return parsedCart.map(normalizeCartItem);
  } catch {
    return [];
  }
}

function readStoredForm(): CheckoutForm {
  if (typeof window === "undefined") {
    return initialForm;
  }

  const storedForm = window.localStorage.getItem("yesbakery-checkout-form");
  if (!storedForm) {
    return initialForm;
  }

  try {
    return JSON.parse(storedForm) as CheckoutForm;
  } catch {
    return initialForm;
  }
}

function buildSourdoughCartItem(product: Product, selectedInclusions: Inclusion[]): CartItem {
  const sortedInclusions = [...selectedInclusions].sort((left, right) => left.name.localeCompare(right.name));
  const inclusionKey = sortedInclusions.map((inclusion) => inclusion.id).join("-");

  return {
    ...product,
    cartKey: inclusionKey ? `${product.id}:${inclusionKey}` : product.id,
    quantity: 1,
    unitPrice: product.price + sortedInclusions.length * INCLUSION_PRICE,
    selectedInclusions: sortedInclusions,
  };
}

export default function Home() {
  const [cart, setCart] = useState<CartItem[]>(readStoredCart);
  const [checkoutForm, setCheckoutForm] = useState<CheckoutForm>(readStoredForm);
  const [checkoutError, setCheckoutError] = useState("");
  const [isRedirectingToCheckout, setIsRedirectingToCheckout] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [sourdoughCustomizerOpen, setSourdoughCustomizerOpen] = useState(false);
  const [selectedInclusionIds, setSelectedInclusionIds] = useState<string[]>([]);

  useEffect(() => {
    window.localStorage.setItem("yesbakery-cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    window.localStorage.setItem("yesbakery-checkout-form", JSON.stringify(checkoutForm));
  }, [checkoutForm]);

  const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
  const subtotal = cart.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
  const sourdoughCount = cart
    .filter((item) => item.id === SOURDOUGH_ID)
    .reduce((total, item) => total + item.quantity, 0);

  const sourdoughInclusionPreview = useMemo(
    () => sourdoughInclusions.filter((inclusion) => selectedInclusionIds.includes(inclusion.id)),
    [selectedInclusionIds],
  );

  function openSourdoughCustomizer() {
    setCheckoutError("");
    setSelectedInclusionIds([]);
    setSourdoughCustomizerOpen(true);
  }

  function closeSourdoughCustomizer() {
    setSourdoughCustomizerOpen(false);
    setSelectedInclusionIds([]);
  }

  function toggleMobileMenu() {
    setIsMobileMenuOpen((current) => !current);
  }

  function closeMobileMenu() {
    setIsMobileMenuOpen(false);
  }

  function addToCart(product: Product) {
    if (product.id === SOURDOUGH_ID) {
      openSourdoughCustomizer();
      return;
    }

    setCheckoutError("");
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

    setCheckoutError("");
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
    setCheckoutError("");
    setCart((currentCart) =>
      currentCart
        .map((item) => (item.cartKey === cartKey ? { ...item, quantity: nextQuantity } : item))
        .filter((item) => item.quantity > 0),
    );
  }

  function removeFromCart(cartKey: string) {
    setCheckoutError("");
    setCart((currentCart) => currentCart.filter((item) => item.cartKey !== cartKey));
  }

  async function handleCheckoutSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (cart.length === 0) {
      return;
    }

    setCheckoutError("");
    setIsRedirectingToCheckout(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cart,
          checkoutForm,
        }),
      });

      const payload = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "We couldn't start Stripe checkout. Please try again.");
      }

      window.location.href = payload.url;
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "We couldn't start Stripe checkout.");
      setIsRedirectingToCheckout(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.navbar}>
          <a className={styles.brand} href="#top" aria-label="Yes Bakery & More home">
            <Image
              src="/assets/yesbakery_logo.PNG"
              alt="Yes Bakery & More logo"
              width={220}
              height={110}
              className={styles.brandLogo}
            />
          </a>

          <div className={styles.navActions}>
            <button
              type="button"
              className={styles.menuToggle}
              onClick={toggleMobileMenu}
              aria-expanded={isMobileMenuOpen}
              aria-controls="primary-navigation"
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            >
              <span />
              <span />
              <span />
            </button>

            <nav
              id="primary-navigation"
              className={`${styles.navLinks} ${isMobileMenuOpen ? styles.navLinksOpen : ""}`}
              aria-label="Primary"
            >
              <a href="#menu" onClick={closeMobileMenu}>
                Menu
              </a>
              <a href="#checkout" onClick={closeMobileMenu}>
                Checkout
              </a>
              <a href="#story" onClick={closeMobileMenu}>
                Our Story
              </a>
              <a className={styles.mobileCartBadge} href="#checkout" onClick={closeMobileMenu}>
                Cart
                <span>{itemCount}</span>
              </a>
            </nav>

            <a className={styles.cartBadge} href="#checkout">
              Cart
              <span>{itemCount}</span>
            </a>
          </div>
        </header>

        <section id="top" className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>Warm, Classic Charm</p>
            <h1>Handcrafted breads, pastries, and sweet comforts made for sharing.</h1>
            <p className={styles.lede}>
              From slow-fermented sourdough to cinnamon rolls and Salvadoran favorites, each bake is prepared
              with care, tradition, and the kind of warmth that belongs at every family table.
            </p>

            <div className={styles.heroActions}>
              <a className={styles.primaryCta} href="#menu">
                Shop the Menu
              </a>
              <a className={styles.secondaryCta} href="#checkout">
                View Cart
              </a>
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
              <em>{currency.format(6)} each</em>
            </div>
          </div>
        </section>

        <section id="menu" className={styles.section}>
          <div className={styles.sectionHeader}>
            <p className={styles.kicker}>Menu</p>
            <h2>Freshly baked favorites with clear pricing</h2>
            <p>
              Sourdough now opens a customization step so customers can choose inclusions before each loaf is
              added to the cart. Each selected inclusion adds {currency.format(INCLUSION_PRICE)}.
            </p>
          </div>

          <div className={styles.grid}>
            {products.map((product, index) => {
              const matchingItems = cart.filter((item) => item.id === product.id);
              const productCount = matchingItems.reduce((total, item) => total + item.quantity, 0);

              return (
                <article
                  key={product.id}
                  className={styles.card}
                  style={{ animationDelay: `${index * 120}ms` }}
                >
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
                      <button type="button" className={styles.addButton} onClick={() => addToCart(product)}>
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

        <section id="checkout" className={styles.checkoutSection}>
          <div className={styles.checkoutPanel}>
            <div className={styles.checkoutSummary}>
              <p className={styles.kicker}>Your Cart</p>
              <h2>Review the order, update quantities, and pay securely</h2>
              <p>
                Review the cart, confirm pickup details, and continue to Stripe for a secure bakery checkout.
              </p>

              <div className={styles.cartList}>
                {cart.length === 0 ? (
                  <div className={styles.emptyCart}>
                    <strong>Your cart is empty.</strong>
                    <p>Add breads or pastries from the menu to begin your order.</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.cartKey} className={styles.cartItem}>
                      <div className={styles.cartItemInfo}>
                        <strong>{item.name}</strong>
                        <p>{currency.format(item.unitPrice)} each</p>
                        {item.selectedInclusions.length > 0 ? (
                          <ul className={styles.inclusionList}>
                            {item.selectedInclusions.map((inclusion) => (
                              <li key={inclusion.id}>
                                {inclusion.name} +{currency.format(INCLUSION_PRICE)}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>

                      <div className={styles.cartControls}>
                        <div className={styles.inlineQty}>
                          <button
                            type="button"
                            className={styles.qtyButton}
                            onClick={() => updateQuantity(item.cartKey, item.quantity - 1)}
                            aria-label={`Decrease ${item.name} quantity`}
                          >
                            -
                          </button>
                          <span>{item.quantity}</span>
                          <button
                            type="button"
                            className={styles.qtyButton}
                            onClick={() => updateQuantity(item.cartKey, item.quantity + 1)}
                            aria-label={`Increase ${item.name} quantity`}
                          >
                            +
                          </button>
                        </div>

                        <span className={styles.lineTotal}>{currency.format(item.unitPrice * item.quantity)}</span>
                        <button
                          type="button"
                          className={styles.removeButton}
                          onClick={() => removeFromCart(item.cartKey)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className={styles.totals}>
                <div>
                  <span>Items</span>
                  <strong>{itemCount}</strong>
                </div>
                <div>
                  <span>Subtotal</span>
                  <strong>{currency.format(subtotal)}</strong>
                </div>
              </div>
            </div>

            <div className={styles.checkoutCard}>
              <p className={styles.kicker}>Checkout</p>
              <h2>Complete the order details and pay with Stripe</h2>
              <p className={styles.checkoutIntro}>
                Customers can review the cart, add pickup details, and continue to Stripe for secure payment.
              </p>

              <form className={styles.checkoutForm} onSubmit={handleCheckoutSubmit}>
                <label>
                  Full Name
                  <input
                    type="text"
                    value={checkoutForm.fullName}
                    onChange={(event) =>
                      setCheckoutForm((current) => ({ ...current, fullName: event.target.value }))
                    }
                    required
                  />
                </label>

                <label>
                  Email
                  <input
                    type="email"
                    value={checkoutForm.email}
                    onChange={(event) =>
                      setCheckoutForm((current) => ({ ...current, email: event.target.value }))
                    }
                    required
                  />
                </label>

                <label>
                  Phone
                  <input
                    type="tel"
                    value={checkoutForm.phone}
                    onChange={(event) =>
                      setCheckoutForm((current) => ({ ...current, phone: event.target.value }))
                    }
                    required
                  />
                </label>

                <label>
                  Pickup Date
                  <input
                    type="date"
                    value={checkoutForm.pickupDate}
                    onChange={(event) =>
                      setCheckoutForm((current) => ({ ...current, pickupDate: event.target.value }))
                    }
                    required
                  />
                </label>

                <label>
                  Order Notes
                  <textarea
                    rows={4}
                    value={checkoutForm.notes}
                    onChange={(event) =>
                      setCheckoutForm((current) => ({ ...current, notes: event.target.value }))
                    }
                    placeholder="Special requests, pickup timing, or packaging notes"
                  />
                </label>

                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={cart.length === 0 || isRedirectingToCheckout}
                >
                  {isRedirectingToCheckout ? "Redirecting to Stripe..." : "Pay with Stripe"}
                </button>
              </form>

              <p className={styles.paymentNote}>
                Payments are collected securely through Stripe after the customer confirms the order details.
              </p>

              {checkoutError ? (
                <div className={styles.successMessage}>
                  <strong>Stripe checkout could not start.</strong>
                  <p>{checkoutError}</p>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section id="story" className={styles.storySection}>
          <div className={styles.storyCard}>
            <div className={styles.storyText}>
              <p className={styles.kicker}>Our Story</p>
              <h2>Baked with care, memory, and a love for sharing good food</h2>
              <p>
                This story section still gives the brand a human center, but now the site also supports the
                practical path from discovery to paid checkout in one inviting experience.
              </p>
              <p>
                The design keeps navigation easy, imagery prominent, and the ordering flow clear enough for
                customers to use comfortably on desktop or mobile.
              </p>
            </div>

            <div className={styles.storyLogoPanel}>
              <Image
                src="/assets/yesbakery_logo.PNG"
                alt="Yes Bakery & More logo"
                width={520}
                height={260}
                className={styles.storyLogo}
              />
            </div>
          </div>
        </section>
      </div>

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
                      <Image
                        src={inclusion.image}
                        alt={inclusion.name}
                        fill
                        sizes="(max-width: 900px) 100vw, 25vw"
                      />
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
    </main>
  );
}
