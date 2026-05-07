"use client";

import { useEffect, useState } from "react";
import { BackendNav } from "../../../components/BackendNav";

type ArchivedOrder = {
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
  status: "new" | "in-progress" | "done" | "picked-up";
  archivedAt: string;
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

async function readJsonResponse<T>(response: Response) {
  const text = await response.text();
  return JSON.parse(text) as T;
}

function buildOrderKey(order: ArchivedOrder) {
  return `${order.type}:${order.id}`;
}

function buttonStyle() {
  return {
    padding: "10px 14px",
    borderRadius: "999px",
    border: "1px solid rgba(107, 68, 45, 0.12)",
    background: "rgba(255, 243, 236, 0.9)",
    color: "#64351e",
    fontWeight: 700,
    cursor: "pointer",
  } as const;
}

export default function OrdersArchivePage() {
  const [orders, setOrders] = useState<ArchivedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState("");
  const [restoringKey, setRestoringKey] = useState("");

  async function loadOrders() {
    try {
      const response = await fetch("/api/admin/orders?scope=archived", {
        cache: "no-store",
      });
      const payload = (await response.json()) as { orders?: ArchivedOrder[] };
      setOrders(Array.isArray(payload.orders) ? payload.orders : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrders();
  }, []);

  async function restoreOrder(order: ArchivedOrder) {
    setActionMessage("");
    setRestoringKey(buildOrderKey(order));

    try {
      const response = await fetch("/api/admin/orders/archive", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: order.id,
          type: order.type,
          archived: false,
        }),
      });

      const payload = await readJsonResponse<{ error?: string; order?: ArchivedOrder }>(response);

      if (!response.ok || !payload.order) {
        throw new Error(payload.error || "Order could not be restored.");
      }

      setOrders((currentOrders) => currentOrders.filter((entry) => buildOrderKey(entry) !== buildOrderKey(order)));
      setActionMessage("Order restored to the active list.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Order could not be restored.");
    } finally {
      setRestoringKey("");
    }
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
            Orders Archive
          </h1>
          <p style={{ marginTop: "12px", color: "#6f5143", lineHeight: 1.7 }}>
            Review archived orders and restore any order back into the active queue when needed.
          </p>
          <BackendNav active="archive" />
        </header>

        {actionMessage ? (
          <div
            style={{
              padding: "16px 18px",
              borderRadius: "20px",
              background: "rgba(248, 239, 228, 0.96)",
              border: "1px solid rgba(107, 68, 45, 0.09)",
              color: "#64351e",
            }}
          >
            {actionMessage}
          </div>
        ) : null}

        {loading ? (
          <div
            style={{
              padding: "24px",
              borderRadius: "24px",
              background: "rgba(255, 250, 247, 0.96)",
              border: "1px solid rgba(107, 68, 45, 0.12)",
            }}
          >
            Loading archived orders...
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
            No archived orders yet.
          </div>
        ) : (
          <div style={{ display: "grid", gap: "14px" }}>
            {orders.map((order) => (
              <article
                key={buildOrderKey(order)}
                style={{
                  padding: "20px",
                  borderRadius: "22px",
                  background: "rgba(255, 250, 247, 0.96)",
                  border: "1px solid rgba(107, 68, 45, 0.12)",
                  boxShadow: "0 18px 48px rgba(113, 77, 54, 0.08)",
                  display: "grid",
                  gap: "12px",
                }}
              >
                <div style={{ display: "grid", gap: "8px", color: "#6f5143", lineHeight: 1.7 }}>
                  <strong style={{ color: "#64351e", fontSize: "1.05rem" }}>{order.customerName || "Order"}</strong>
                  <div><strong style={{ color: "#5f311c" }}>Order ID:</strong> {order.id}</div>
                  <div><strong style={{ color: "#5f311c" }}>Archived:</strong> {formatDate(order.archivedAt)}</div>
                  <div><strong style={{ color: "#5f311c" }}>Pickup date:</strong> {order.pickupDate || "Not provided"}</div>
                  <div><strong style={{ color: "#5f311c" }}>Payment:</strong> {order.paymentLabel}</div>
                  <div><strong style={{ color: "#5f311c" }}>Total:</strong> {formatMoney(order.amountTotal, order.currency)}</div>
                  <div><strong style={{ color: "#5f311c" }}>Items:</strong> {order.orderSummary}</div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                  <span style={{ color: "#6f5143" }}>{order.customerEmail || "No email"} · {order.phone || "No phone"}</span>
                  <button
                    type="button"
                    onClick={() => restoreOrder(order)}
                    disabled={restoringKey.length > 0}
                    style={buttonStyle()}
                  >
                    Restore Order
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
