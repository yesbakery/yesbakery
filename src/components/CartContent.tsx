"use client";

import { FormEvent, useEffect, useState } from "react";
import styles from "../app/page.module.css";
import {
  CartItem,
  CheckoutForm,
  clearStoredCheckout,
  currency,
  getEarliestPickupDate,
  initialCheckoutForm,
  isPickupDateValid,
  normalizeCartItem,
  readStoredCart,
  readStoredForm,
  saveStoredCart,
  saveStoredForm,
} from "../lib/storefront";
import { INCLUSION_PRICE } from "../lib/catalog";

export function CartContent() {
  const [cart, setCart] = useState<CartItem[]>(readStoredCart);
  const [checkoutForm, setCheckoutForm] = useState<CheckoutForm>(readStoredForm);
  const [checkoutError, setCheckoutError] = useState("");
  const [isRedirectingToCheckout, setIsRedirectingToCheckout] = useState(false);
  const [isSendingShippingRequest, setIsSendingShippingRequest] = useState(false);
  const [isCheckoutReviewOpen, setIsCheckoutReviewOpen] = useState(false);

  useEffect(() => {
    saveStoredCart(cart);
  }, [cart]);

  useEffect(() => {
    saveStoredForm(checkoutForm);
  }, [checkoutForm]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkoutParam = params.get("checkout");
    const shippingCode = params.get("shippingCode");

    if (!checkoutParam) {
      if (shippingCode) {
        setCheckoutForm((current) => ({
          ...current,
          fulfillmentMethod: "shipping-code",
          shippingApprovalCode: shippingCode,
        }));
      }
      return;
    }

    try {
      const normalizedBase64 = checkoutParam.replace(/-/g, "+").replace(/_/g, "/");
      const paddedBase64 = normalizedBase64.padEnd(Math.ceil(normalizedBase64.length / 4) * 4, "=");
      const decoded = JSON.parse(atob(paddedBase64)) as {
        cart?: CartItem[];
        checkoutForm?: Partial<CheckoutForm>;
      };

      if (Array.isArray(decoded.cart)) {
        setCart(decoded.cart.map(normalizeCartItem));
      }

      if (decoded.checkoutForm) {
        const restoredCheckoutForm = decoded.checkoutForm;
        setCheckoutForm((current) => ({
          ...current,
          ...restoredCheckoutForm,
          fulfillmentMethod: "shipping-code",
          shippingApprovalCode: shippingCode || restoredCheckoutForm.shippingApprovalCode || "",
        }));
      }
    } catch {
      setCheckoutError("We couldn't restore your approved shipping cart from the email link.");
    }
  }, []);

  const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
  const subtotal = cart.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
  const needsShippingDetails =
    checkoutForm.fulfillmentMethod === "shipping-request" || checkoutForm.fulfillmentMethod === "shipping-code";

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

  function handleCheckoutSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (cart.length === 0) {
      return;
    }

    setCheckoutError("");

    if (!isPickupDateValid(checkoutForm.pickupDate)) {
      setCheckoutError("Orders must be placed at least 48 hours in advance.");
      return;
    }

    if (checkoutForm.fulfillmentMethod === "shipping-request") {
      void submitShippingRequest();
      return;
    }

    setIsCheckoutReviewOpen(true);
  }

  async function submitShippingRequest() {
    if (cart.length === 0) {
      return;
    }

    if (!checkoutForm.shippingRequest.trim()) {
      setCheckoutError("Please tell us where the order would be shipped and any arrangement details.");
      return;
    }

    if (!checkoutForm.shippingAddress.trim()) {
      setCheckoutError("Please enter the delivery address for the shipping request.");
      return;
    }

    setCheckoutError("");
    setIsSendingShippingRequest(true);

    try {
      const response = await fetch("/api/shipping-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cart,
          checkoutForm,
        }),
      });

      const payload = (await response.json()) as { ok?: boolean; error?: string; requestId?: string };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "We couldn't send your shipping request right now.");
      }

      clearStoredCheckout();
      setCart([]);
      setCheckoutForm(initialCheckoutForm);
      window.location.href = `/shipping-request/sent${payload.requestId ? `?requestId=${encodeURIComponent(payload.requestId)}` : ""}`;
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "We couldn't send your shipping request right now.");
    } finally {
      setIsSendingShippingRequest(false);
    }
  }

  async function continueToStripeCheckout() {
    setIsCheckoutReviewOpen(false);
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
    <>
      <section className={styles.checkoutSection}>
        <div className={styles.checkoutPanel}>
          <div className={styles.checkoutSummary}>
            <p className={styles.kicker}>Your Cart</p>
            <h2>Review the order, update quantities, and pay securely</h2>
            <p>Review the cart, confirm pickup details, and continue to payment when you are ready.</p>

            <div className={styles.cartList}>
              {cart.length === 0 ? (
                <div className={styles.emptyCart}>
                  <strong>Your cart is empty.</strong>
                  <p>Add breads or pastries from the shop page to begin your order.</p>
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
            <h2>Complete the order details and pay securely</h2>
            <p className={styles.checkoutIntro}>
              Choose pickup, request a shipping arrangement, or enter an approved shipping code to continue.
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
                {needsShippingDetails ? "Desired Delivered-By Date" : "Pickup Date"}
                <input
                  type="date"
                  value={checkoutForm.pickupDate}
                  min={getEarliestPickupDate()}
                  onChange={(event) =>
                    setCheckoutForm((current) => ({ ...current, pickupDate: event.target.value }))
                  }
                  required
                />
              </label>

              <label>
                Select Your Pick up Option
                <select
                  value={checkoutForm.fulfillmentMethod}
                  onChange={(event) =>
                    setCheckoutForm((current) => ({
                      ...current,
                      fulfillmentMethod: event.target.value as CheckoutForm["fulfillmentMethod"],
                    }))
                  }
                >
                  <option value="pickup">Pick up from Union City, California.</option>
                  <option value="shipping-request">Request Shipping Arrangement (Requires Approval Prior to Payment)</option>
                  <option value="shipping-code">I have a Shipping Approval Code</option>
                </select>
              </label>

              {checkoutForm.fulfillmentMethod === "shipping-request" ? (
                <>
                  <label>
                    Delivery Address
                    <textarea
                      rows={3}
                      value={checkoutForm.shippingAddress}
                      onChange={(event) =>
                        setCheckoutForm((current) => ({ ...current, shippingAddress: event.target.value }))
                      }
                      placeholder="Street address, city, state, ZIP code, and any delivery instructions."
                    />
                  </label>

                  <label>
                    Shipping Arrangement Request
                    <textarea
                      rows={3}
                      value={checkoutForm.shippingRequest}
                      onChange={(event) =>
                        setCheckoutForm((current) => ({ ...current, shippingRequest: event.target.value }))
                      }
                      placeholder="Tell us what you need shipped and any arrangement details. If approved, you will receive a code to continue to checkout."
                    />
                  </label>
                </>
              ) : null}

              {checkoutForm.fulfillmentMethod === "shipping-code" ? (
                <label>
                  Shipping Approval Code
                  <input
                    type="text"
                    value={checkoutForm.shippingApprovalCode}
                    onChange={(event) =>
                      setCheckoutForm((current) => ({ ...current, shippingApprovalCode: event.target.value }))
                    }
                    placeholder="Enter your approval code to continue to checkout"
                  />
                </label>
              ) : null}

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
                disabled={cart.length === 0 || isRedirectingToCheckout || isSendingShippingRequest}
              >
                {isSendingShippingRequest
                  ? "Sending Shipping Request..."
                  : isRedirectingToCheckout
                    ? "Redirecting to Stripe..."
                    : checkoutForm.fulfillmentMethod === "shipping-request"
                      ? "Request Shipping Approval"
                      : "Proceed to Checkout"}
              </button>
            </form>

            <p className={styles.paymentNote}>
              Orders must be placed at least 48 hours in advance. Standard orders are prepared for pickup in
              Union City, California.
            </p>

            {checkoutError ? (
              <div className={styles.successMessage}>
                <strong>
                  {checkoutForm.fulfillmentMethod === "shipping-request"
                    ? "Shipping request update."
                    : "Checkout could not continue."}
                </strong>
                <p>{checkoutError}</p>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {isCheckoutReviewOpen ? (
        <div className={styles.modalOverlay} role="presentation" onClick={() => setIsCheckoutReviewOpen(false)}>
          <div
            className={styles.modalCard}
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-review-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.kicker}>Before Checkout</p>
                <h2 id="checkout-review-title">Please review pickup and delivery details</h2>
                <p className={styles.modalIntro}>
                  Yes Bakery & More is located in Union City, California. All standard orders are prepared for
                  pickup in Union City, and the pickup address will be provided by email after checkout.
                </p>
              </div>

              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setIsCheckoutReviewOpen(false)}
                aria-label="Close checkout review"
              >
                x
              </button>
            </div>

            <div className={styles.reviewGrid}>
              <div className={styles.reviewNotice}>
                <strong>Important Pickup Notice</strong>
                <p>YOU ARE PICKING UP IN UNION CITY, CALIFORNIA.</p>
                <p>Orders must be placed at least 48 hours in advance.</p>
                <p>The exact pickup address will be included in your email after checkout.</p>
              </div>

              <div className={styles.reviewNotice}>
                <strong>Order Status</strong>
                <p>
                  {checkoutForm.fulfillmentMethod === "shipping-code"
                    ? "Shipping approval code entered."
                    : "Pickup selected for Union City, California."}
                </p>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <div className={styles.modalSummary}>
                <strong>Order readiness</strong>
                <span>{checkoutForm.pickupDate}</span>
                <p>
                  {checkoutForm.fulfillmentMethod === "shipping-code"
                    ? checkoutForm.shippingApprovalCode.trim()
                      ? "Shipping approval code entered. If the code is valid, you can continue to payment."
                      : "A shipping approval code is required before payment."
                    : "Pickup instructions will be sent by email after payment."}
                </p>
              </div>

              <button type="button" className={styles.submitButton} onClick={continueToStripeCheckout}>
                Proceed to Checkout
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
