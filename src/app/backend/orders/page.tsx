"use client";

import { useEffect, useState } from "react";

type BackendOrder = {
  id: string;
  type: "paid-online" | "pay-at-pickup";
  customerName: string;
  customerEmail: string;
  phone: string;
  pickupDate: string;
  orderSummary: string;
  notes: string;
  amountTotal: number;
  currency: string;
  paymentLabel: string;
  createdAt: string;
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

export default function BackendOrdersPage() {
  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrders() {
      setLoading(true);

      try {
        const response = await fetch("/api/admin/orders");
        const payload = (await response.json()) as { orders?: BackendOrder[] };
        setOrders(Array.isArray(payload.orders) ? payload.orders : []);
      } finally {
        setLoading(false);
      }
    }

    void loadOrders();
  }, []);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/backend/login";
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "24px",
        background: "linear-gradient(180deg, #fbf3ef 0%, #f7eadf 50%, #fff8f2 100%)",
      }}
    >
      <div style={{ width: "min(1200px, 100%)", margin: "0 auto", display: "grid", gap: "18px" }}>
        <header
          style={{
            padding: "28px 32px",
            borderRadius: "28px",
            background: "rgba(255, 250, 247, 0.96)",
            border: "1px solid rgba(107, 68, 45, 0.12)",
            boxShadow: "0 20px 60px rgba(113, 77, 54, 0.1)",
          }}
        >
          <p style={{ color: "#ad6b48", fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase" }}>
            Backend
          </p>
          <h1 style={{ marginTop: "10px", color: "#5f311c", fontFamily: "var(--font-display)", fontSize: "3rem" }}>
            Orders
          </h1>
          <p style={{ marginTop: "12px", color: "#6f5143", lineHeight: 1.7 }}>
            View paid online orders and pay-at-pickup orders in one place.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "18px" }}>
            <a
              href="/backend/orders"
              style={{
                padding: "11px 16px",
                borderRadius: "999px",
                textDecoration: "none",
                background: "linear-gradient(135deg, #c47a45, #a6542d)",
                color: "#fff8f4",
                fontWeight: 700,
              }}
            >
              Orders
            </a>
            <a
              href="/backend/shipping-requests"
              style={{
                padding: "11px 16px",
                borderRadius: "999px",
                textDecoration: "none",
                background: "rgba(255, 243, 236, 0.9)",
                color: "#64351e",
                fontWeight: 700,
              }}
            >
              Shipping Requests
            </a>
            <button
              type="button"
              onClick={logout}
              style={{
                padding: "11px 16px",
                borderRadius: "999px",
                border: 0,
                background: "rgba(255, 243, 236, 0.9)",
                color: "#64351e",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Sign Out
            </button>
          </div>
        </header>

        {loading ? (
          <div
            style={{
              padding: "24px",
              borderRadius: "24px",
              background: "rgba(255, 250, 247, 0.96)",
              border: "1px solid rgba(107, 68, 45, 0.12)",
            }}
          >
            Loading orders...
          </div>
        ) : orders.length === 0 ? (
          <div
            style={{
              padding: "24px",
              borderRadius: "24px",
              background: "rgba(255, 250, 247, 0.96)",
              border: "1px solid rgba(107, 68, 45, 0.12)",
            }}
          >
            No orders yet.
          </div>
        ) : (
          orders.map((order) => (
            <article
              key={`${order.type}-${order.id}`}
              style={{
                padding: "24px",
                borderRadius: "26px",
                background: "rgba(255, 250, 247, 0.96)",
                border: "1px solid rgba(107, 68, 45, 0.12)",
                boxShadow: "0 20px 60px rgba(113, 77, 54, 0.08)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  marginBottom: "16px",
                }}
              >
                <div>
                  <h2 style={{ color: "#5f311c", fontFamily: "var(--font-display)", fontSize: "2rem" }}>
                    {order.customerName || "Order"}
                  </h2>
                  <p style={{ color: "#6f5143" }}>{order.customerEmail}</p>
                </div>
                <span
                  style={{
                    padding: "8px 14px",
                    borderRadius: "999px",
                    background: order.type === "paid-online" ? "#dcefdc" : "#f8dfcf",
                    color: "#64351e",
                    fontWeight: 800,
                  }}
                >
                  {order.paymentLabel}
                </span>
              </div>

              <div style={{ display: "grid", gap: "8px", color: "#6f5143", lineHeight: 1.7 }}>
                <p>
                  <strong style={{ color: "#64351e" }}>Order ID:</strong> {order.id}
                </p>
                <p>
                  <strong style={{ color: "#64351e" }}>Phone:</strong> {order.phone || "Not provided"}
                </p>
                <p>
                  <strong style={{ color: "#64351e" }}>Pickup date:</strong> {order.pickupDate}
                </p>
                <p>
                  <strong style={{ color: "#64351e" }}>Submitted:</strong> {formatDate(order.createdAt)}
                </p>
                <p>
                  <strong style={{ color: "#64351e" }}>Items:</strong> {order.orderSummary}
                </p>
                <p>
                  <strong style={{ color: "#64351e" }}>Total:</strong> {formatMoney(order.amountTotal, order.currency)}
                </p>
                {order.notes ? (
                  <p>
                    <strong style={{ color: "#64351e" }}>Notes:</strong> {order.notes}
                  </p>
                ) : null}
              </div>
            </article>
          ))
        )}
      </div>
    </main>
  );
}
