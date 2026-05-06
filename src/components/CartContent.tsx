"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import styles from "../app/page.module.css";
import {
  canPlacePickupOrder,
  CartItem,
  CheckoutForm,
  clearStoredCheckout,
  currency,
  getEarliestPickupDate,
  getEarliestShippingDate,
  getLatestPickupDate,
  initialCheckoutForm,
  isPickupDateValid,
  normalizeCartItem,
  readStoredCart,
  readStoredForm,
  saveStoredCart,
  saveStoredForm,
} from "../lib/storefront";

type CheckoutStep = 1 | 2;

export function CartContent() {
  const [cart, setCart] = useState<CartItem[]>(readStoredCart);
  const [checkoutForm, setCheckoutForm] = useState<CheckoutForm>(readStoredForm);
  const [checkoutError, setCheckoutError] = useState("");
  const [isRedirectingToCheckout, setIsRedirectingToCheckout] = useState(false);
  const [isSendingShippingRequest, setIsSendingShippingRequest] = useState(false);
  const [isSubmittingPickupOrder, setIsSubmittingPickupOrder] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>(1);

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
          paymentMethod: "stripe",
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
          paymentMethod: "stripe",
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
  const hasApprovedShippingCode = checkoutForm.shippingApprovalCode.trim().length > 0;
  const pickupOrderingOpen = canPlacePickupOrder();
  const pickupDateMin = needsShippingDetails ? getEarliestShippingDate() : getEarliestPickupDate();
  const pickupDateMax = needsShippingDetails ? undefined : getLatestPickupDate();

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

  function openCheckout() {
    if (cart.length === 0) {
      return;
    }

    setCheckoutError("");
    setCheckoutStep(1);
    setIsCheckoutOpen(true);
  }

  function closeCheckout() {
    setIsCheckoutOpen(false);
    setCheckoutStep(1);
  }

  function selectCheckoutType(type: "pickup-later" | "shipping-request" | "shipping-code") {
    setCheckoutError("");

    if (type === "pickup-later") {
      if (!pickupOrderingOpen) {
        setCheckoutError("Pickup orders are accepted Monday through Thursday for the upcoming Saturday and Sunday.");
        return;
      }

      setCheckoutForm((current) => ({
        ...current,
        fulfillmentMethod: "pickup",
        paymentMethod: "pickup",
      }));
    }

    if (type === "shipping-request") {
      setCheckoutForm((current) => ({
        ...current,
        fulfillmentMethod: "shipping-request",
        paymentMethod: "stripe",
      }));
    }

    if (type === "shipping-code") {
      setCheckoutForm((current) => ({
        ...current,
        fulfillmentMethod: "shipping-code",
        paymentMethod: "stripe",
      }));
    }

    setCheckoutStep(2);
  }

  function validateCheckoutDetails() {
    if (!checkoutForm.fullName.trim() || !checkoutForm.email.trim() || !checkoutForm.phone.trim() || !checkoutForm.pickupDate.trim()) {
      return "Please complete your name, email, phone, and date before continuing.";
    }

    if (!isPickupDateValid(checkoutForm.pickupDate, checkoutForm.fulfillmentMethod)) {
      if (checkoutForm.fulfillmentMethod === "pickup") {
        if (!pickupOrderingOpen) {
          return "Pickup orders are accepted only Monday through Thursday for the upcoming Saturday and Sunday.";
        }

        return "Please choose the upcoming Saturday or Sunday for pickup.";
      }

      return "Orders must be placed at least 48 hours in advance.";
    }

    if (checkoutForm.fulfillmentMethod === "shipping-request") {
      if (!checkoutForm.shippingAddress.trim()) {
        return "Please enter the delivery address for the shipping request.";
      }

      if (!checkoutForm.shippingRequest.trim()) {
        return "Please tell us where the order would be shipped and any arrangement details.";
      }
    }

    if (checkoutForm.fulfillmentMethod === "shipping-code" && !checkoutForm.shippingApprovalCode.trim()) {
      return "A shipping approval code is required before shipping orders can continue.";
    }

    return "";
  }

  async function submitShippingRequest() {
    const validationError = validateCheckoutDetails();
    if (validationError) {
      setCheckoutError(validationError);
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
    const validationError = validateCheckoutDetails();
    if (validationError) {
      setCheckoutError(validationError);
      return;
    }

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

  async function submitPickupOrder() {
    const validationError = validateCheckoutDetails();
    if (validationError) {
      setCheckoutError(validationError);
      return;
    }

    setIsSubmittingPickupOrder(true);

    try {
      const response = await fetch("/api/pickup-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cart,
          checkoutForm,
        }),
      });

      const payload = (await response.json()) as { ok?: boolean; error?: string; orderId?: string };

      if (!response.ok || !payload.ok || !payload.orderId) {
        throw new Error(payload.error || "We couldn't place your pickup order right now.");
      }

      clearStoredCheckout();
      setCart([]);
      setCheckoutForm(initialCheckoutForm);
      window.location.href = `/checkout/pickup-success?order_id=${encodeURIComponent(payload.orderId)}`;
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "We couldn't place your pickup order.");
      setIsSubmittingPickupOrder(false);
    }
  }

  async function handleCheckoutContinue() {
    if (checkoutForm.fulfillmentMethod === "shipping-request") {
      await submitShippingRequest();
      return;
    }

    if (checkoutForm.fulfillmentMethod === "pickup" && checkoutForm.paymentMethod === "pickup") {
      await submitPickupOrder();
      return;
    }

    await continueToStripeCheckout();
  }

  return (
    <>
      <section className={styles.checkoutSection}>
        <div className={styles.checkoutPanel}>
          <div className={styles.checkoutSummary}>
            <p className={styles.kicker}>Your Cart</p>
            <h2>Review your order before checkout</h2>
            <p>Adjust quantities, remove items, and then continue into a cleaner guided checkout experience.</p>

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

          <div className={styles.checkoutLauncherCard}>
            <p className={styles.kicker}>Checkout</p>
            <h2>Ready to place the order?</h2>
            <p>
              Choose between placing a Union City pickup order or requesting a shipping arrangement in a step-by-step checkout flow.
            </p>
            <button type="button" className={styles.submitButton} disabled={cart.length === 0} onClick={openCheckout}>
              Checkout
            </button>
            {checkoutError ? (
              <div className={styles.successMessage}>
                <strong>Checkout could not continue.</strong>
                <p>{checkoutError}</p>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {isCheckoutOpen ? (
        <div className={styles.modalOverlay} role="presentation" onClick={closeCheckout}>
          <div
            className={`${styles.modalCard} ${styles.checkoutWizardCard}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-wizard-title"
            onClick={(event) => event.stopPropagation()}
          >
            {checkoutStep === 2 ? (
              <div className={styles.checkoutWizardLogo}>
                <Image src="/assets/new_logo.PNG" alt="" fill sizes="220px" />
              </div>
            ) : null}

            <div className={styles.modalHeader}>
              <div>
                <p className={styles.kicker}>Checkout</p>
                <h2 id="checkout-wizard-title">A simple step-by-step checkout</h2>
                <p className={styles.modalIntro}>
                  {checkoutStep === 1
                    ? "Choose how you would like to place this order."
                    : "Enter the details to complete this order."}
                </p>
              </div>

              <button
                type="button"
                className={styles.modalClose}
                onClick={closeCheckout}
                aria-label="Close checkout"
              >
                x
              </button>
            </div>

            <div className={styles.checkoutSteps}>
              <div className={`${styles.checkoutStepPill} ${checkoutStep === 1 ? styles.checkoutStepPillActive : ""}`}>
                1. Order Type
              </div>
              <div className={`${styles.checkoutStepPill} ${checkoutStep === 2 ? styles.checkoutStepPillActive : ""}`}>
                2. Details
              </div>
            </div>

            {checkoutStep === 1 ? (
              <div className={styles.checkoutOptionGrid}>
                <button
                  type="button"
                  className={styles.checkoutOptionCard}
                  disabled={!pickupOrderingOpen}
                  onClick={() => selectCheckoutType("pickup-later")}
                >
                  <strong>Place order, pay and pick up at Union City</strong>
                  <p>
                    {pickupOrderingOpen
                      ? "Available Monday through Thursday for the upcoming Saturday and Sunday pickups."
                      : "Pickup ordering opens Monday through Thursday for the upcoming Saturday and Sunday pickups."}
                  </p>
                </button>

                <button
                  type="button"
                  className={styles.checkoutOptionCard}
                  onClick={() => selectCheckoutType("shipping-request")}
                >
                  <strong>Request shipping arrangement</strong>
                  <p>Requires approval. Extra lead time is necessary for this type of request, so please plan accordingly.</p>
                </button>

                {hasApprovedShippingCode ? (
                  <button
                    type="button"
                    className={styles.checkoutOptionCard}
                    onClick={() => selectCheckoutType("shipping-code")}
                  >
                    <strong>Use approved shipping code</strong>
                    <p>Continue with the shipping approval code that was sent to you.</p>
                  </button>
                ) : null}
              </div>
            ) : (
              <div className={styles.checkoutWizardFormWrap}>
                <div className={styles.checkoutSummaryMini}>
                  <strong>Order summary</strong>
                  <p>{itemCount} items</p>
                  <span>{currency.format(subtotal)}</span>
                </div>

                <form className={styles.checkoutForm} onSubmit={(event) => event.preventDefault()}>
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
                      min={pickupDateMin}
                      max={pickupDateMax}
                      onChange={(event) =>
                        setCheckoutForm((current) => ({ ...current, pickupDate: event.target.value }))
                      }
                      required
                    />
                    {checkoutForm.fulfillmentMethod === "pickup" ? (
                      <span className={styles.fieldHint}>
                        Pickup orders are accepted Monday through Thursday, and pickup dates must be on a future Saturday or Sunday.
                      </span>
                    ) : (
                      <span className={styles.fieldHint}>Please choose a date at least 48 hours away.</span>
                    )}
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
                        Shipping Arrangement Details
                        <textarea
                          rows={3}
                          value={checkoutForm.shippingRequest}
                          onChange={(event) =>
                            setCheckoutForm((current) => ({ ...current, shippingRequest: event.target.value }))
                          }
                          placeholder="Tell us what you need shipped. Extra lead time is necessary for this type of request, so please plan accordingly."
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
                        placeholder="Enter your shipping approval code"
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
                      placeholder="Special requests, timing, packaging, or anything else we should know."
                    />
                  </label>
                </form>

                {checkoutError ? (
                  <div className={styles.successMessage}>
                    <strong>Checkout could not continue.</strong>
                    <p>{checkoutError}</p>
                  </div>
                ) : null}
              </div>
            )}

            <div className={styles.checkoutWizardFooter}>
              {checkoutStep === 2 ? (
                <button
                  type="button"
                  className={styles.secondaryCta}
                  onClick={() => {
                    setCheckoutError("");
                    setCheckoutStep(1);
                  }}
                >
                  Back
                </button>
              ) : (
                <span />
              )}

              {checkoutStep === 2 ? (
                <button
                  type="button"
                  className={styles.submitButton}
                  disabled={isRedirectingToCheckout || isSendingShippingRequest || isSubmittingPickupOrder}
                  onClick={handleCheckoutContinue}
                >
                  {isSendingShippingRequest
                    ? "Sending Shipping Request..."
                    : isSubmittingPickupOrder
                      ? "Placing Pickup Order..."
                      : isRedirectingToCheckout
                        ? "Redirecting to Checkout..."
                        : checkoutForm.fulfillmentMethod === "shipping-request"
                          ? "Submit Shipping Request"
                          : checkoutForm.fulfillmentMethod === "pickup" && checkoutForm.paymentMethod === "pickup"
                            ? "Place Order and Pay at Pickup"
                            : "Continue to Payment"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
