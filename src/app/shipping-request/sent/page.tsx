import Link from "next/link";

export default function ShippingRequestSentPage() {
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
          Shipping Request Sent
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
          Your shipping request has been sent to Yes Bakery.
        </h1>
        <p style={{ color: "#6f5143", lineHeight: 1.7, margin: 0 }}>
          We will review the request and email you if shipping is approved. If approved, you will receive a link
          back to your cart with your selected items already loaded, along with the approval code needed to
          continue to checkout.
        </p>
        <p style={{ color: "#6f5143", lineHeight: 1.7, margin: 0 }}>
          Standard pickup orders remain available in Union City, California.
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
            Return to Shop
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
            Contact the Bakery
          </Link>
        </div>
      </section>
    </main>
  );
}
