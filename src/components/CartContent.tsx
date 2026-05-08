"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import styles from "../app/page.module.css";
import { useLanguage } from "./LanguageProvider";
import { getLocalizedProductName } from "../lib/catalog";
import {
  CartItem,
  CheckoutForm,
  clearStoredCheckout,
  currency,
  defaultPickupScheduleSettings,
  getCartItemMinimumQuantity,
  getEarliestPickupDate,
  getPickupDateOptions,
  getEarliestShippingDate,
  getLatestPickupDate,
  initialCheckoutForm,
  isPickupDateValid,
  normalizeCartItem,
  PickupScheduleSettings,
  readStoredCart,
  readStoredForm,
  saveStoredCart,
  saveStoredForm,
} from "../lib/storefront";

type CheckoutStep = 1 | 2;

export function CartContent() {
  const { language } = useLanguage();
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkoutForm, setCheckoutForm] = useState<CheckoutForm>(initialCheckoutForm);
  const [checkoutError, setCheckoutError] = useState("");
  const [isRedirectingToCheckout, setIsRedirectingToCheckout] = useState(false);
  const [isSendingShippingRequest, setIsSendingShippingRequest] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isPickupAcknowledgementOpen, setIsPickupAcknowledgementOpen] = useState(false);
  const [pickupAcknowledged, setPickupAcknowledged] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>(1);
  const [hasLoadedCheckoutState, setHasLoadedCheckoutState] = useState(false);
  const [pickupScheduleSettings, setPickupScheduleSettings] = useState<PickupScheduleSettings>(defaultPickupScheduleSettings);
  const isSpanish = language === "es";

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setCart(readStoredCart());
      setCheckoutForm(readStoredForm());
      setHasLoadedCheckoutState(true);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadStorefrontSettings() {
      try {
        const response = await fetch("/api/storefront-settings", {
          cache: "no-store",
        });
        const payload = (await response.json()) as { settings?: PickupScheduleSettings };

        if (isMounted && payload.settings) {
          setPickupScheduleSettings(payload.settings);
        }
      } catch {
        if (isMounted) {
          setPickupScheduleSettings(defaultPickupScheduleSettings);
        }
      }
    }

    void loadStorefrontSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedCheckoutState) {
      return;
    }

    saveStoredCart(cart);
  }, [cart, hasLoadedCheckoutState]);

  useEffect(() => {
    if (!hasLoadedCheckoutState) {
      return;
    }

    saveStoredForm(checkoutForm);
  }, [checkoutForm, hasLoadedCheckoutState]);

  useEffect(() => {
    if (!isCheckoutOpen) {
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    overlayRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [isCheckoutOpen, checkoutStep]);

  useEffect(() => {
    if (!hasLoadedCheckoutState) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const checkoutParam = params.get("checkout");
    const shippingCode = params.get("shippingCode");

    if (!checkoutParam) {
      if (shippingCode) {
        window.setTimeout(() => {
          setCheckoutForm((current) => ({
            ...current,
            fulfillmentMethod: "shipping-code",
            paymentMethod: "stripe",
            shippingApprovalCode: shippingCode,
          }));
        }, 0);
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
        window.setTimeout(() => {
          setCart(decoded.cart!.map(normalizeCartItem));
        }, 0);
      }

      if (decoded.checkoutForm) {
        const restoredCheckoutForm = decoded.checkoutForm;
        window.setTimeout(() => {
          setCheckoutForm((current) => ({
            ...current,
            ...restoredCheckoutForm,
            fulfillmentMethod: "shipping-code",
            paymentMethod: "stripe",
            shippingApprovalCode: shippingCode || restoredCheckoutForm.shippingApprovalCode || "",
          }));
        }, 0);
      }
    } catch {
      window.setTimeout(() => {
        setCheckoutError(
          isSpanish
            ? "No pudimos restaurar su carrito aprobado desde el enlace del correo."
            : "We couldn't restore your approved shipping cart from the email link.",
        );
      }, 0);
    }
  }, [hasLoadedCheckoutState, isSpanish]);

  const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
  const subtotal = cart.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
  const needsShippingDetails =
    checkoutForm.fulfillmentMethod === "shipping-request" || checkoutForm.fulfillmentMethod === "shipping-code";
  const hasApprovedShippingCode = checkoutForm.shippingApprovalCode.trim().length > 0;
  const pickupDateMin = needsShippingDetails
    ? getEarliestShippingDate()
    : getEarliestPickupDate(pickupScheduleSettings);
  const pickupDateMax = needsShippingDetails ? undefined : getLatestPickupDate();
  const pickupDateOptions = getPickupDateOptions(pickupScheduleSettings);
  const pickupOrderingBlocked = pickupScheduleSettings.blockSaturday && pickupScheduleSettings.blockSunday;
  function formatPickupOption(value: string) {
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat(isSpanish ? "es-US" : "en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(date);
  }

  function updateQuantity(cartKey: string, nextQuantity: number) {
    setCheckoutError("");
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.cartKey === cartKey
            ? { ...item, quantity: Math.max(nextQuantity, getCartItemMinimumQuantity(item)) }
            : item,
        )
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
    setIsPickupAcknowledgementOpen(false);
    setPickupAcknowledged(false);
    setCheckoutStep(1);
  }

  function selectCheckoutType(type: "pickup-later" | "shipping-request" | "shipping-code") {
    setCheckoutError("");

    if (type === "pickup-later") {
      setCheckoutForm((current) => ({
        ...current,
        fulfillmentMethod: "pickup",
        paymentMethod: "stripe",
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
    const minimumQuantityIssue = cart.find((item) => item.quantity < getCartItemMinimumQuantity(item));
    if (minimumQuantityIssue) {
      return isSpanish
        ? `${minimumQuantityIssue.name} requiere una cantidad mínima de ${getCartItemMinimumQuantity(minimumQuantityIssue)}.`
        : `${minimumQuantityIssue.name} requires a minimum quantity of ${getCartItemMinimumQuantity(minimumQuantityIssue)}.`;
    }

    if (!checkoutForm.fullName.trim() || !checkoutForm.email.trim() || !checkoutForm.phone.trim() || !checkoutForm.pickupDate.trim()) {
      return isSpanish
        ? "Por favor complete su nombre, correo electrónico, teléfono y fecha antes de continuar."
        : "Please complete your name, email, phone, and date before continuing.";
    }

    if (checkoutForm.fulfillmentMethod === "pickup" && pickupOrderingBlocked) {
      return isSpanish
        ? "Los pedidos para recoger están temporalmente desactivados."
        : "Pickup ordering is temporarily disabled.";
    }

    if (!isPickupDateValid(checkoutForm.pickupDate, checkoutForm.fulfillmentMethod, pickupScheduleSettings)) {
      if (checkoutForm.fulfillmentMethod === "pickup") {
        return isSpanish
          ? "Por favor elija una fecha de recogida disponible que esté al menos a 48 horas de distancia."
          : "Please choose an available pickup date that is at least 48 hours away.";
      }

      return isSpanish
        ? "Los pedidos deben hacerse con al menos 48 horas de anticipación."
        : "Orders must be placed at least 48 hours in advance.";
    }

    if (checkoutForm.fulfillmentMethod === "shipping-request") {
      if (!checkoutForm.shippingAddress.trim()) {
        return isSpanish
          ? "Por favor ingrese la dirección de entrega para la solicitud de envío."
          : "Please enter the delivery address for the shipping request.";
      }

      if (!checkoutForm.shippingRequest.trim()) {
        return isSpanish
          ? "Por favor indíquenos a dónde se enviaría el pedido y cualquier detalle del arreglo."
          : "Please tell us where the order would be shipped and any arrangement details.";
      }
    }

    if (checkoutForm.fulfillmentMethod === "shipping-code" && !checkoutForm.shippingApprovalCode.trim()) {
      return isSpanish
        ? "Se requiere un código de aprobación de envío antes de continuar con pedidos enviados."
        : "A shipping approval code is required before shipping orders can continue.";
    }

    return "";
  }

  function getPickupOptionDescription() {
    if (pickupOrderingBlocked) {
      return isSpanish
        ? "Los pedidos para recoger están temporalmente desactivados."
        : "Pickup ordering is temporarily unavailable.";
    }

    if (pickupScheduleSettings.blockSaturday) {
      return isSpanish
        ? "La recogida esta disponible solo los domingos."
        : "Pickup is available on Sundays only.";
    }

    if (pickupScheduleSettings.blockSunday) {
      return isSpanish
        ? "La recogida esta disponible solo los sabados. Los pedidos para este sabado cierran el jueves anterior a las 6:00 PM, hora del Pacifico."
        : "Pickup is available on Saturdays only. Orders for this Saturday close the prior Thursday at 6:00 PM Pacific time.";
    }

    return isSpanish
      ? "La recogida del sabado cierra el jueves anterior a las 6:00 PM, hora del Pacifico. Si pierde ese horario, la siguiente fecha disponible sera el proximo sabado."
      : "Saturday pickup closes the prior Thursday at 6:00 PM Pacific time. After that cutoff, the next available pickup date will be the following Saturday.";
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
      setCheckoutError(
        error instanceof Error
          ? error.message
          : isSpanish
            ? "No pudimos enviar su solicitud de envío en este momento."
            : "We couldn't send your shipping request right now.",
      );
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
      setCheckoutError(
        error instanceof Error
          ? error.message
          : isSpanish
            ? "No pudimos iniciar el checkout."
            : "We couldn't start Stripe checkout.",
      );
      setIsRedirectingToCheckout(false);
    }
  }

  async function handleCheckoutContinue() {
    if (checkoutForm.fulfillmentMethod === "shipping-request") {
      await submitShippingRequest();
      return;
    }

    if (checkoutForm.fulfillmentMethod === "pickup") {
      setCheckoutError("");
      setPickupAcknowledged(false);
      setIsPickupAcknowledgementOpen(true);
      return;
    }

    await continueToStripeCheckout();
  }

  async function confirmPickupAcknowledgement() {
    if (!pickupAcknowledged) {
      setCheckoutError(
        isSpanish
          ? "Debe reconocer que recogerá este pedido en Union City antes de continuar."
          : "Please acknowledge that you will pick up this order in Union City before continuing.",
      );
      return;
    }

    setCheckoutError("");
    setIsPickupAcknowledgementOpen(false);
    await continueToStripeCheckout();
  }

  return (
    <>
      <section className={styles.checkoutSection}>
        <div className={styles.checkoutPanel}>
          <div className={styles.checkoutSummary}>
            <p className={styles.kicker}>{isSpanish ? "Su Carrito" : "Your Cart"}</p>
            <h2>{isSpanish ? "Revise su pedido antes de continuar" : "Review your order before checkout"}</h2>
            <p>
              {isSpanish
                ? "Ajuste cantidades, elimine artículos y luego continúe a una experiencia de checkout guiada."
                : "Adjust quantities, remove items, and then continue into a cleaner guided checkout experience."}
            </p>

            <div className={styles.cartList}>
              {cart.length === 0 ? (
                <div className={styles.emptyCart}>
                  <strong>{isSpanish ? "Su carrito está vacío." : "Your cart is empty."}</strong>
                  <p>{isSpanish ? "Agregue panes o pasteles desde la tienda para comenzar su pedido." : "Add breads or pastries from the shop page to begin your order."}</p>
                </div>
              ) : (
                cart.map((item) => {
                  const itemName = getLocalizedProductName(item.id, item.name, language);

                  return (
                    <div key={item.cartKey} className={styles.cartItem}>
                    <div className={styles.cartItemImageWrap}>
                      <Image src={item.image} alt={itemName} fill sizes="92px" />
                    </div>

                    <div className={styles.cartItemInfo}>
                      <strong>{itemName}</strong>
                      <p>{currency.format(item.unitPrice)} {isSpanish ? "cada uno" : "each"}</p>
                      {getCartItemMinimumQuantity(item) > 1 ? (
                        <span className={styles.minimumOrderNote}>
                          {isSpanish
                            ? `Mínimo ${getCartItemMinimumQuantity(item)} cada uno`
                            : `Minimum ${getCartItemMinimumQuantity(item)} each`}
                        </span>
                      ) : null}
                    </div>

                    <div className={styles.cartControls}>
                      <div className={styles.inlineQty}>
                        <button
                          type="button"
                          className={styles.qtyButton}
                          onClick={() => updateQuantity(item.cartKey, item.quantity - 1)}
                          aria-label={
                            isSpanish
                              ? `Disminuir cantidad de ${itemName}`
                              : `Decrease ${itemName} quantity`
                          }
                          disabled={item.quantity <= getCartItemMinimumQuantity(item)}
                        >
                          -
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          className={styles.qtyButton}
                          onClick={() => updateQuantity(item.cartKey, item.quantity + 1)}
                          aria-label={
                            isSpanish
                              ? `Aumentar cantidad de ${itemName}`
                              : `Increase ${itemName} quantity`
                          }
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
                        {isSpanish ? "Eliminar" : "Remove"}
                      </button>
                    </div>
                  </div>
                  );
                })
              )}
            </div>

            <div className={styles.totals}>
              <div>
                <span>{isSpanish ? "Artículos" : "Items"}</span>
                <strong>{itemCount}</strong>
              </div>
              <div>
                <span>{isSpanish ? "Subtotal" : "Subtotal"}</span>
                <strong>{currency.format(subtotal)}</strong>
              </div>
            </div>
          </div>

          <div className={styles.checkoutLauncherCard}>
            <p className={styles.kicker}>{isSpanish ? "Checkout" : "Checkout"}</p>
            <h2>{isSpanish ? "¿Listo para hacer el pedido?" : "Ready to place the order?"}</h2>
            <p>
              {isSpanish
                ? "Pague su pedido en línea para recogerlo en Union City, o solicite un arreglo de envío en un flujo de checkout paso a paso."
                : "Pay for your order online for pickup in Union City, or request a shipping arrangement in a step-by-step checkout flow."}
            </p>
            <button type="button" className={styles.submitButton} disabled={cart.length === 0} onClick={openCheckout}>
              {isSpanish ? "Finalizar Pedido" : "Checkout"}
            </button>
            {checkoutError ? (
              <div className={styles.successMessage}>
                <strong>{isSpanish ? "No se pudo continuar con el checkout." : "Checkout could not continue."}</strong>
                <p>{checkoutError}</p>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {isCheckoutOpen ? (
        <div ref={overlayRef} className={styles.modalOverlay} role="presentation" onClick={closeCheckout}>
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
                <p className={styles.kicker}>{isSpanish ? "Checkout" : "Checkout"}</p>
                <h2 id="checkout-wizard-title">
                  {isSpanish ? "Un checkout simple paso a paso" : "A simple step-by-step checkout"}
                </h2>
                <p className={styles.modalIntro}>
                  {checkoutStep === 1
                    ? isSpanish
                      ? "Elija cómo desea hacer este pedido."
                      : "Choose how you would like to place this order."
                    : isSpanish
                      ? "Ingrese los detalles para completar este pedido."
                      : "Enter the details to complete this order."}
                </p>
              </div>

              <button
                type="button"
                className={styles.modalClose}
                onClick={closeCheckout}
                aria-label={isSpanish ? "Cerrar checkout" : "Close checkout"}
              >
                x
              </button>
            </div>

            <div className={styles.checkoutSteps}>
              <div className={`${styles.checkoutStepPill} ${checkoutStep === 1 ? styles.checkoutStepPillActive : ""}`}>
                {isSpanish ? "1. Tipo de Pedido" : "1. Order Type"}
              </div>
              <div className={`${styles.checkoutStepPill} ${checkoutStep === 2 ? styles.checkoutStepPillActive : ""}`}>
                {isSpanish ? "2. Detalles" : "2. Details"}
              </div>
            </div>

            {checkoutStep === 1 ? (
              <div className={styles.checkoutOptionGrid}>
                <button
                  type="button"
                  className={styles.checkoutOptionCard}
                  onClick={() => selectCheckoutType("pickup-later")}
                  disabled={pickupOrderingBlocked}
                >
                  <strong>
                    {isSpanish ? "Pagar en línea y recoger en Union City" : "Pay online and pick up in Union City"}
                  </strong>
                  <p>{getPickupOptionDescription()}</p>
                </button>

                <button
                  type="button"
                  className={styles.checkoutOptionCard}
                  onClick={() => selectCheckoutType("shipping-request")}
                >
                  <strong>{isSpanish ? "Solicitar arreglo de envío" : "Request shipping arrangement"}</strong>
                  <p>
                    {isSpanish
                      ? "Requiere aprobación. Se necesita más tiempo para este tipo de solicitud, así que por favor planifique con anticipación."
                      : "Requires approval. Extra lead time is necessary for this type of request, so please plan accordingly."}
                  </p>
                </button>

                {hasApprovedShippingCode ? (
                  <button
                    type="button"
                    className={styles.checkoutOptionCard}
                    onClick={() => selectCheckoutType("shipping-code")}
                  >
                    <strong>{isSpanish ? "Usar código de envío aprobado" : "Use approved shipping code"}</strong>
                    <p>
                      {isSpanish
                        ? "Continúe con el código de aprobación de envío que se le envió."
                        : "Continue with the shipping approval code that was sent to you."}
                    </p>
                  </button>
                ) : null}
              </div>
            ) : (
              <div className={styles.checkoutWizardFormWrap}>
                <div className={styles.checkoutSummaryMini}>
                  <strong>{isSpanish ? "Resumen del pedido" : "Order summary"}</strong>
                  <p>{itemCount} {isSpanish ? "artículos" : "items"}</p>
                  <span>{currency.format(subtotal)}</span>
                </div>

                <form className={styles.checkoutForm} onSubmit={(event) => event.preventDefault()}>
                  <label>
                    {isSpanish ? "Nombre Completo" : "Full Name"}
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
                    {isSpanish ? "Correo Electrónico" : "Email"}
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
                    {isSpanish ? "Teléfono" : "Phone"}
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
                    {needsShippingDetails
                      ? isSpanish
                        ? "Fecha Deseada de Entrega"
                        : "Desired Delivered-By Date"
                      : isSpanish
                        ? "Fecha de Recogida"
                        : "Pickup Date"}
                    {checkoutForm.fulfillmentMethod === "pickup" ? (
                      <select
                        value={checkoutForm.pickupDate}
                        onChange={(event) =>
                          setCheckoutForm((current) => ({ ...current, pickupDate: event.target.value }))
                        }
                        required
                      >
                        <option value="">
                          {isSpanish ? "Seleccione una fecha disponible" : "Select an available pickup date"}
                        </option>
                        {pickupDateOptions.map((option) => (
                          <option key={option} value={option}>
                            {formatPickupOption(option)}
                          </option>
                        ))}
                      </select>
                    ) : (
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
                    )}
                    {checkoutForm.fulfillmentMethod === "pickup" ? (
                      <span className={styles.fieldHint}>
                        {getPickupOptionDescription()}
                      </span>
                    ) : (
                      <span className={styles.fieldHint}>
                        {isSpanish ? "Por favor elija una fecha con al menos 48 horas de anticipación." : "Please choose a date at least 48 hours away."}
                      </span>
                    )}
                  </label>

                  {checkoutForm.fulfillmentMethod === "shipping-request" ? (
                    <>
                      <label>
                        {isSpanish ? "Dirección de Entrega" : "Delivery Address"}
                        <textarea
                          rows={3}
                          value={checkoutForm.shippingAddress}
                          onChange={(event) =>
                            setCheckoutForm((current) => ({ ...current, shippingAddress: event.target.value }))
                          }
                          placeholder={
                            isSpanish
                              ? "Dirección, ciudad, estado, código postal y cualquier instrucción de entrega."
                              : "Street address, city, state, ZIP code, and any delivery instructions."
                          }
                        />
                      </label>

                      <label>
                        {isSpanish ? "Detalles del Arreglo de Envío" : "Shipping Arrangement Details"}
                        <textarea
                          rows={3}
                          value={checkoutForm.shippingRequest}
                          onChange={(event) =>
                            setCheckoutForm((current) => ({ ...current, shippingRequest: event.target.value }))
                          }
                          placeholder={
                            isSpanish
                              ? "Cuéntenos lo que necesita enviar. Este tipo de solicitud requiere más tiempo, así que por favor planifique con anticipación."
                              : "Tell us what you need shipped. Extra lead time is necessary for this type of request, so please plan accordingly."
                          }
                        />
                      </label>
                    </>
                  ) : null}

                  {checkoutForm.fulfillmentMethod === "shipping-code" ? (
                    <label>
                      {isSpanish ? "Código de Aprobación de Envío" : "Shipping Approval Code"}
                      <input
                        type="text"
                        value={checkoutForm.shippingApprovalCode}
                        onChange={(event) =>
                          setCheckoutForm((current) => ({ ...current, shippingApprovalCode: event.target.value }))
                        }
                        placeholder={isSpanish ? "Ingrese su código de aprobación de envío" : "Enter your shipping approval code"}
                      />
                    </label>
                  ) : null}

                  <label>
                    {isSpanish ? "Notas del Pedido" : "Order Notes"}
                    <textarea
                      rows={4}
                      value={checkoutForm.notes}
                      onChange={(event) =>
                        setCheckoutForm((current) => ({ ...current, notes: event.target.value }))
                      }
                      placeholder={
                        isSpanish
                          ? "Solicitudes especiales, horario, empaque o cualquier otra cosa que debamos saber."
                          : "Special requests, timing, packaging, or anything else we should know."
                      }
                    />
                  </label>
                </form>

                {checkoutError ? (
                  <div className={styles.successMessage}>
                    <strong>{isSpanish ? "No se pudo continuar con el checkout." : "Checkout could not continue."}</strong>
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
                  {isSpanish ? "Atrás" : "Back"}
                </button>
              ) : (
                <span />
              )}

              {checkoutStep === 2 ? (
                <>
                  <button
                    type="button"
                    className={styles.submitButton}
                    disabled={isRedirectingToCheckout || isSendingShippingRequest}
                    onClick={handleCheckoutContinue}
                  >
                    {isSendingShippingRequest
                      ? isSpanish
                        ? "Enviando Solicitud de Envío..."
                        : "Sending Shipping Request..."
                      : isRedirectingToCheckout
                          ? isSpanish
                            ? "Redirigiendo al Checkout..."
                            : "Redirecting to Checkout..."
                          : checkoutForm.fulfillmentMethod === "shipping-request"
                            ? isSpanish
                              ? "Enviar Solicitud de Envío"
                              : "Submit Shipping Request"
                            : isSpanish
                              ? "Continuar al Pago"
                              : "Continue to Payment"}
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {isPickupAcknowledgementOpen ? (
        <div className={styles.pickupAlertOverlay} role="presentation">
          <div
            className={styles.pickupAlertCard}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pickup-alert-title"
          >
            <p className={styles.pickupAlertEyebrow}>{isSpanish ? "Aviso Importante" : "Important Notice"}</p>
            <h2 id="pickup-alert-title">
              {isSpanish
                ? "Este no es un pedido de entrega"
                : "This is not a delivery order"}
            </h2>
            <p className={styles.pickupAlertLead}>
              {isSpanish
                ? "Tendra que recoger este pedido en Union City, California."
                : "You will have to pick up this order in Union City, California."}
            </p>
            <div className={styles.pickupAlertLocation}>
              <strong>Union City, California</strong>
              <span>{formatPickupOption(checkoutForm.pickupDate || getEarliestPickupDate(pickupScheduleSettings))}</span>
            </div>
            <label className={styles.pickupAlertCheckbox}>
              <input
                type="checkbox"
                checked={pickupAcknowledged}
                onChange={(event) => setPickupAcknowledged(event.target.checked)}
              />
              <span>
                {isSpanish
                  ? `Reconozco que recogere este pedido el ${formatPickupOption(checkoutForm.pickupDate)}.`
                  : `I acknowledge that I will be picking up this order on ${formatPickupOption(checkoutForm.pickupDate)}.`}
              </span>
            </label>
            <div className={styles.pickupAlertActions}>
              <button
                type="button"
                className={styles.secondaryCta}
                onClick={() => {
                  setIsPickupAcknowledgementOpen(false);
                  setPickupAcknowledged(false);
                }}
              >
                {isSpanish ? "Volver" : "Back"}
              </button>
              <button
                type="button"
                className={styles.submitButton}
                onClick={confirmPickupAcknowledgement}
                disabled={!pickupAcknowledged || isRedirectingToCheckout}
              >
                {isRedirectingToCheckout
                  ? isSpanish
                    ? "Redirigiendo al Checkout..."
                    : "Redirecting to Checkout..."
                  : isSpanish
                    ? "Entiendo, Continuar al Pago"
                    : "I Understand, Continue to Payment"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
