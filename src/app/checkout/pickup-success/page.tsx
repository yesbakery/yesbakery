"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { useLanguage } from "@/components/LanguageProvider";

function PickupSuccessContent() {
  const { language } = useLanguage();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id") || "";
  const isSpanish = language === "es";

  useEffect(() => {
    window.localStorage.removeItem("yesbakery-cart");
    window.localStorage.removeItem("yesbakery-checkout-form");
  }, []);

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
          width: "min(760px, 100%)",
          padding: "36px",
          borderRadius: "28px",
          border: "1px solid rgba(107, 68, 45, 0.12)",
          background: "rgba(255, 250, 247, 0.96)",
          boxShadow: "0 20px 60px rgba(113, 77, 54, 0.1)",
          display: "grid",
          gap: "18px",
        }}
      >
        <p style={{ color: "#ad6b48", fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase" }}>
          {isSpanish ? "Pedido para Recoger Realizado" : "Pickup Order Placed"}
        </p>
        <h1
          style={{
            margin: 0,
            color: "#5f311c",
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2.4rem, 6vw, 3.8rem)",
            lineHeight: 0.98,
          }}
        >
          {isSpanish ? "Su pedido quedó reservado para recoger." : "Your order is reserved for pickup."}
        </h1>
        <p style={{ color: "#6f5143", lineHeight: 1.7, margin: 0 }}>
          {isSpanish
            ? "Eligió hacer su pedido ahora y pagar al recoger. También enviamos por correo los detalles del pedido a usted y a la panadería."
            : "You chose to order now and pay at pickup. We also emailed the order details to you and the bakery."}
        </p>
        {orderId ? (
          <p style={{ color: "#5f311c", fontWeight: 800, margin: 0 }}>
            {isSpanish ? "ID del Pedido" : "Order ID"}: {orderId}
          </p>
        ) : null}
        <p style={{ color: "#6f5143", lineHeight: 1.7, margin: 0 }}>
          {isSpanish
            ? "Yes Bakery está ubicada en Union City, California. Los detalles para recoger se le enviarán por correo electrónico."
            : "Yes Bakery is located in Union City, California. Pickup details will be provided by email."}
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "8px" }}>
          <Link
            href="/shop"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "13px 22px",
              borderRadius: "999px",
              color: "#fff8f4",
              background: "linear-gradient(135deg, #c47a45, #a6542d)",
              fontWeight: 700,
            }}
          >
            {isSpanish ? "Seguir Comprando" : "Continue Shopping"}
          </Link>
          <Link
            href="/about"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "13px 22px",
              borderRadius: "999px",
              color: "#6a4532",
              background: "rgba(255, 255, 255, 0.82)",
              fontWeight: 700,
            }}
          >
            {isSpanish ? "Contactar a la Panadería" : "Contact the Bakery"}
          </Link>
        </div>
      </section>
    </main>
  );
}

export default function PickupSuccessPage() {
  return (
    <Suspense fallback={null}>
      <PickupSuccessContent />
    </Suspense>
  );
}
