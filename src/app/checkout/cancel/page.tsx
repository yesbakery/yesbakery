import Link from "next/link";

export default function CheckoutCancelPage() {
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
          width: "min(680px, 100%)",
          padding: "36px",
          borderRadius: "28px",
          border: "1px solid rgba(107, 68, 45, 0.12)",
          background: "rgba(255, 250, 247, 0.96)",
          boxShadow: "0 20px 60px rgba(113, 77, 54, 0.1)",
        }}
      >
        <p style={{ color: "#ad6b48", fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase" }}>
          Checkout canceled
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
          Your cart is still waiting for you.
        </h1>
        <p style={{ color: "#6f5143", lineHeight: 1.7 }}>
          No payment was completed. You can go back to the bakery page, adjust the cart, and try Stripe checkout
          again whenever you are ready.
        </p>
        <Link
          href="/cart"
          style={{
            display: "inline-flex",
            marginTop: "22px",
            padding: "13px 20px",
            borderRadius: "999px",
            color: "#fff8f4",
            background: "linear-gradient(135deg, #c47a45, #a6542d)",
            fontWeight: 700,
          }}
        >
          Return to checkout
        </Link>
      </section>
    </main>
  );
}
