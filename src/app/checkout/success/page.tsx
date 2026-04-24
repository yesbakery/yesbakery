"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

type SessionDetails = {
  sessionId: string;
  customerEmail: string;
  customerName: string;
  phone: string;
  pickupDate: string;
  fulfillmentMethod: string;
  shippingRequest: string;
  notes: string;
  orderSummary: string;
  paymentStatus: string;
  amountTotal: number;
  currency: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    amountTotal: number;
    currency: string;
  }>;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function formatAmount(amountInCents: number) {
  return currencyFormatter.format(amountInCents / 100);
}

function formatPickupDate(value: string) {
  if (!value) {
    return "Not provided";
  }

  const date = new Date(`${value}T12:00:00`);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(date);
}

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = useMemo(() => searchParams.get("session_id") || "", [searchParams]);
  const [sessionDetails, setSessionDetails] = useState<SessionDetails | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    window.localStorage.removeItem("yesbakery-cart");
    window.localStorage.removeItem("yesbakery-checkout-form");
  }, []);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    let isMounted = true;

    async function loadSessionDetails() {
      try {
        const response = await fetch(`/api/checkout/session?session_id=${encodeURIComponent(sessionId)}`);
        const payload = (await response.json()) as SessionDetails & { error?: string };

        if (!response.ok) {
          throw new Error(payload.error || "Stripe payment details could not be loaded.");
        }

        if (isMounted) {
          setSessionDetails(payload);
        }
      } catch (error) {
        if (isMounted) {
          setLoadError(error instanceof Error ? error.message : "Stripe payment details could not be loaded.");
        }
      }
    }

    loadSessionDetails();

    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background:
          "radial-gradient(circle at top left, rgba(240, 204, 186, 0.7), transparent 28%), linear-gradient(180deg, #fbf3ef 0%, #f7eadf 50%, #fff8f2 100%)",
      }}
    >
      <section
        style={{
          width: "min(820px, 100%)",
          padding: "36px",
          borderRadius: "28px",
          border: "1px solid rgba(107, 68, 45, 0.12)",
          background: "rgba(255, 250, 247, 0.96)",
          boxShadow: "0 20px 60px rgba(113, 77, 54, 0.1)",
        }}
      >
        <p style={{ color: "#ad6b48", fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase" }}>
          Payment complete
        </p>
        <h1
          style={{
            margin: "12px 0 14px",
            color: "#5f311c",
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2.6rem, 6vw, 4rem)",
            lineHeight: 0.95,
          }}
        >
          Thank you. Your order has been paid.
        </h1>
        <p style={{ color: "#6f5143", lineHeight: 1.7 }}>
          Stripe confirmed the payment successfully. The cart and checkout form were cleared for the next order.
        </p>

        {sessionDetails ? (
          <div
            style={{
              display: "grid",
              gap: "18px",
              marginTop: "26px",
              padding: "22px",
              borderRadius: "24px",
              background: "rgba(255, 255, 255, 0.72)",
            }}
          >
            <div style={{ display: "grid", gap: "8px" }}>
              <strong style={{ color: "#64351e" }}>Order summary</strong>
              <span style={{ color: "#6f5143" }}>{sessionDetails.orderSummary || "Stripe order recorded."}</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "14px" }}>
              <div style={{ display: "grid", gap: "4px" }}>
                <span style={{ color: "#94654e", fontWeight: 700 }}>Customer</span>
                <strong style={{ color: "#5f311c" }}>{sessionDetails.customerName || "Not provided"}</strong>
              </div>
              <div style={{ display: "grid", gap: "4px" }}>
                <span style={{ color: "#94654e", fontWeight: 700 }}>Email</span>
                <strong style={{ color: "#5f311c" }}>{sessionDetails.customerEmail || "Not provided"}</strong>
              </div>
              <div style={{ display: "grid", gap: "4px" }}>
                <span style={{ color: "#94654e", fontWeight: 700 }}>Phone</span>
                <strong style={{ color: "#5f311c" }}>{sessionDetails.phone || "Not provided"}</strong>
              </div>
              <div style={{ display: "grid", gap: "4px" }}>
                <span style={{ color: "#94654e", fontWeight: 700 }}>Pickup date</span>
                <strong style={{ color: "#5f311c" }}>{formatPickupDate(sessionDetails.pickupDate)}</strong>
              </div>
              <div style={{ display: "grid", gap: "4px" }}>
                <span style={{ color: "#94654e", fontWeight: 700 }}>Fulfillment</span>
                <strong style={{ color: "#5f311c" }}>
                  {sessionDetails.fulfillmentMethod
                    ? `${sessionDetails.fulfillmentMethod.charAt(0).toUpperCase()}${sessionDetails.fulfillmentMethod.slice(1)}`
                    : "Pickup"}
                </strong>
              </div>
            </div>

            <div style={{ display: "grid", gap: "10px" }}>
              <strong style={{ color: "#64351e" }}>Paid items</strong>
              {sessionDetails.lineItems.map((item, index) => (
                <div
                  key={`${item.description}-${index}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "14px",
                    padding: "12px 14px",
                    borderRadius: "18px",
                    background: "rgba(250, 241, 235, 0.88)",
                  }}
                >
                  <span style={{ color: "#6f5143" }}>
                    {item.description} x{item.quantity}
                  </span>
                  <strong style={{ color: "#5f311c" }}>{formatAmount(item.amountTotal)}</strong>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gap: "8px" }}>
              <strong style={{ color: "#64351e" }}>Total paid</strong>
              <span style={{ color: "#5f311c", fontSize: "1.25rem", fontWeight: 800 }}>
                {formatAmount(sessionDetails.amountTotal)}
              </span>
            </div>

            {sessionDetails.notes && sessionDetails.notes !== "None" ? (
              <div style={{ display: "grid", gap: "8px" }}>
                <strong style={{ color: "#64351e" }}>Order notes</strong>
                <span style={{ color: "#6f5143", lineHeight: 1.7 }}>{sessionDetails.notes}</span>
              </div>
            ) : null}

            {sessionDetails.shippingRequest && sessionDetails.shippingRequest !== "None" ? (
              <div style={{ display: "grid", gap: "8px" }}>
                <strong style={{ color: "#64351e" }}>Shipping request</strong>
                <span style={{ color: "#6f5143", lineHeight: 1.7 }}>{sessionDetails.shippingRequest}</span>
              </div>
            ) : null}
          </div>
        ) : loadError ? (
          <div
            style={{
              marginTop: "24px",
              padding: "18px",
              borderRadius: "22px",
              background: "rgba(248, 239, 228, 0.96)",
              color: "#6f5143",
            }}
          >
            {loadError}
          </div>
        ) : (
          <div
            style={{
              marginTop: "24px",
              padding: "18px",
              borderRadius: "22px",
              background: "rgba(248, 239, 228, 0.96)",
              color: "#6f5143",
            }}
          >
            Loading Stripe payment details...
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "22px" }}>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              padding: "13px 20px",
              borderRadius: "999px",
              color: "#fff8f4",
              background: "linear-gradient(135deg, #c47a45, #a6542d)",
              fontWeight: 700,
            }}
          >
            Back to bakery
          </Link>
          <Link
            href="/#menu"
            style={{
              display: "inline-flex",
              padding: "13px 20px",
              borderRadius: "999px",
              color: "#6b4432",
              background: "rgba(255, 255, 255, 0.76)",
              fontWeight: 700,
            }}
          >
            Start another order
          </Link>
        </div>
      </section>
    </main>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <main
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: "24px",
            background:
              "radial-gradient(circle at top left, rgba(240, 204, 186, 0.7), transparent 28%), linear-gradient(180deg, #fbf3ef 0%, #f7eadf 50%, #fff8f2 100%)",
          }}
        >
          <section
            style={{
              width: "min(820px, 100%)",
              padding: "36px",
              borderRadius: "28px",
              border: "1px solid rgba(107, 68, 45, 0.12)",
              background: "rgba(255, 250, 247, 0.96)",
              boxShadow: "0 20px 60px rgba(113, 77, 54, 0.1)",
              color: "#6f5143",
            }}
          >
            Loading Stripe payment details...
          </section>
        </main>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  );
}
