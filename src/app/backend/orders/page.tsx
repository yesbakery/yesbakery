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
  status: "new" | "in-progress" | "done" | "picked-up";
  statusUpdatedAt: string;
  pickedUpAt: string;
  followUpEmailSentAt: string;
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

function parsePickupDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatPickupDayHeading(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

function getComingWeekend() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = today.getDay();
  const daysUntilSaturday = day === 6 ? 0 : (6 - day + 7) % 7;
  const saturday = new Date(today);
  saturday.setDate(today.getDate() + daysUntilSaturday);
  const sunday = new Date(saturday);
  sunday.setDate(saturday.getDate() + 1);

  return {
    saturday,
    sunday,
  };
}

function formatStatusLabel(status: BackendOrder["status"]) {
  switch (status) {
    case "in-progress":
      return "In Progress";
    case "done":
      return "Done";
    case "picked-up":
      return "Picked Up";
    default:
      return "New";
  }
}

function statusPillBackground(status: BackendOrder["status"]) {
  switch (status) {
    case "picked-up":
      return "#dcefdc";
    case "done":
      return "#efe3d3";
    case "in-progress":
      return "#f8dfcf";
    default:
      return "#f7eee8";
  }
}

export default function BackendOrdersPage() {
  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState("");
  const [updatingKey, setUpdatingKey] = useState("");
  const { saturday, sunday } = getComingWeekend();
  const saturdayKey = toDateKey(saturday);
  const sundayKey = toDateKey(sunday);
  const saturdayOrders = orders.filter((order) => {
    const pickupDate = parsePickupDate(order.pickupDate);
    return pickupDate && toDateKey(pickupDate) === saturdayKey && order.status !== "picked-up";
  });
  const sundayOrders = orders.filter((order) => {
    const pickupDate = parsePickupDate(order.pickupDate);
    return pickupDate && toDateKey(pickupDate) === sundayKey && order.status !== "picked-up";
  });

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

  function printOrder(order: BackendOrder) {
    const popup = window.open("", "_blank", "width=760,height=900");
    if (!popup) {
      return;
    }

    popup.document.write(`
      <html>
        <head>
          <title>Print Order ${order.id}</title>
          <style>
            body { font-family: Georgia, serif; padding: 32px; color: #3d2817; }
            h1, h2 { margin: 0 0 12px; color: #5f311c; }
            .card { border: 1px solid rgba(107, 68, 45, 0.18); border-radius: 18px; padding: 24px; }
            p { line-height: 1.7; margin: 0 0 10px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Yes Bakery Order</h1>
            <p><strong>Order ID:</strong> ${order.id}</p>
            <p><strong>Status:</strong> ${formatStatusLabel(order.status)}</p>
            <p><strong>Name:</strong> ${order.customerName}</p>
            <p><strong>Email:</strong> ${order.customerEmail}</p>
            <p><strong>Phone:</strong> ${order.phone || "Not provided"}</p>
            <p><strong>Pickup date:</strong> ${order.pickupDate || "Not provided"}</p>
            <p><strong>Payment:</strong> ${order.paymentLabel}</p>
            <p><strong>Total:</strong> ${formatMoney(order.amountTotal, order.currency)}</p>
            <p><strong>Submitted:</strong> ${formatDate(order.createdAt)}</p>
            <p><strong>Items:</strong> ${order.orderSummary}</p>
            ${order.notes ? `<p><strong>Notes:</strong> ${order.notes}</p>` : ""}
          </div>
        </body>
      </html>
    `);
    popup.document.close();
    popup.focus();
    popup.print();
  }

  async function updateStatus(order: BackendOrder, status: BackendOrder["status"]) {
    setActionMessage("");
    setUpdatingKey(`${order.type}:${order.id}:${status}`);

    try {
      const response = await fetch("/api/admin/orders/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: order.id,
          type: order.type,
          status,
        }),
      });

      const payload = (await response.json()) as { error?: string; order?: BackendOrder };

      if (!response.ok || !payload.order) {
        throw new Error(payload.error || "Order could not be updated.");
      }

      setOrders((currentOrders) =>
        currentOrders.map((currentOrder) =>
          currentOrder.id === order.id && currentOrder.type === order.type ? payload.order! : currentOrder,
        ),
      );

      setActionMessage(
        status === "picked-up"
          ? "Order marked as picked up. Thank-you email sent when possible."
          : `Order marked as ${formatStatusLabel(status).toLowerCase()}.`,
      );
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Order could not be updated.");
    } finally {
      setUpdatingKey("");
    }
  }

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

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "18px",
          }}
        >
          {[
            { label: formatPickupDayHeading(saturday), orders: saturdayOrders, accent: "#c47a45" },
            { label: formatPickupDayHeading(sunday), orders: sundayOrders, accent: "#a6542d" },
          ].map((day) => (
            <article
              key={day.label}
              style={{
                padding: "24px",
                borderRadius: "26px",
                background: "rgba(255, 250, 247, 0.96)",
                border: "1px solid rgba(107, 68, 45, 0.12)",
                boxShadow: "0 20px 60px rgba(113, 77, 54, 0.08)",
                display: "grid",
                gap: "14px",
              }}
            >
              <div>
                <p
                  style={{
                    color: day.accent,
                    fontWeight: 800,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    marginBottom: "8px",
                  }}
                >
                  This Coming Weekend
                </p>
                <h2 style={{ color: "#5f311c", fontFamily: "var(--font-display)", fontSize: "2rem", margin: 0 }}>
                  {day.label}
                </h2>
                <p style={{ marginTop: "8px", color: "#6f5143", lineHeight: 1.6 }}>
                  {day.orders.length > 0
                    ? `${day.orders.length} order${day.orders.length === 1 ? "" : "s"} still need pickup attention.`
                    : "No active pickups scheduled for this day."}
                </p>
              </div>

              {day.orders.length > 0 ? (
                <div style={{ display: "grid", gap: "12px" }}>
                  {day.orders.map((order) => (
                    <div
                      key={`${day.label}-${order.type}-${order.id}`}
                      style={{
                        padding: "14px 16px",
                        borderRadius: "18px",
                        background: "rgba(248, 239, 228, 0.92)",
                        border: "1px solid rgba(107, 68, 45, 0.08)",
                        display: "grid",
                        gap: "6px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                        <strong style={{ color: "#64351e" }}>{order.customerName || "Order"}</strong>
                        <span
                          style={{
                            padding: "6px 10px",
                            borderRadius: "999px",
                            background: statusPillBackground(order.status),
                            color: "#64351e",
                            fontWeight: 700,
                            fontSize: "0.86rem",
                          }}
                        >
                          {formatStatusLabel(order.status)}
                        </span>
                      </div>
                      <span style={{ color: "#6f5143" }}>{order.orderSummary}</span>
                      <span style={{ color: "#6f5143" }}>
                        {order.paymentLabel} · {formatMoney(order.amountTotal, order.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </section>

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
                    background: statusPillBackground(order.status),
                    color: "#64351e",
                    fontWeight: 800,
                  }}
                >
                  {formatStatusLabel(order.status)}
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
                  <strong style={{ color: "#64351e" }}>Payment:</strong> {order.paymentLabel}
                </p>
                <p>
                  <strong style={{ color: "#64351e" }}>Submitted:</strong> {formatDate(order.createdAt)}
                </p>
                <p>
                  <strong style={{ color: "#64351e" }}>Last updated:</strong> {formatDate(order.statusUpdatedAt)}
                </p>
                <p>
                  <strong style={{ color: "#64351e" }}>Items:</strong> {order.orderSummary}
                </p>
                <p>
                  <strong style={{ color: "#64351e" }}>Total:</strong> {formatMoney(order.amountTotal, order.currency)}
                </p>
                {order.followUpEmailSentAt ? (
                  <p>
                    <strong style={{ color: "#64351e" }}>Thank-you email:</strong> Sent {formatDate(order.followUpEmailSentAt)}
                  </p>
                ) : null}
                {order.notes ? (
                  <p>
                    <strong style={{ color: "#64351e" }}>Notes:</strong> {order.notes}
                  </p>
                ) : null}
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "10px",
                  marginTop: "18px",
                }}
              >
                <a
                  href={`mailto:${order.customerEmail}?subject=${encodeURIComponent(`Yes Bakery order ${order.id}`)}`}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "999px",
                    textDecoration: "none",
                    background: "rgba(255, 243, 236, 0.9)",
                    color: "#64351e",
                    fontWeight: 700,
                  }}
                >
                  Email Customer
                </a>
                {order.phone ? (
                  <a
                    href={`tel:${order.phone}`}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "999px",
                      textDecoration: "none",
                      background: "rgba(255, 243, 236, 0.9)",
                      color: "#64351e",
                      fontWeight: 700,
                    }}
                  >
                    Call Customer
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => printOrder(order)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "999px",
                    border: 0,
                    background: "rgba(255, 243, 236, 0.9)",
                    color: "#64351e",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Print Order
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "10px",
                  marginTop: "14px",
                }}
              >
                {(["new", "in-progress", "done", "picked-up"] as const).map((status) => {
                  const isCurrentStatus = order.status === status;
                  const isUpdating = updatingKey === `${order.type}:${order.id}:${status}`;

                  return (
                    <button
                      key={status}
                      type="button"
                      disabled={isCurrentStatus || Boolean(updatingKey)}
                      onClick={() => updateStatus(order, status)}
                      style={{
                        padding: "10px 14px",
                        borderRadius: "999px",
                        border: 0,
                        background: isCurrentStatus
                          ? "linear-gradient(135deg, #c47a45, #a6542d)"
                          : "rgba(255, 243, 236, 0.9)",
                        color: isCurrentStatus ? "#fff8f4" : "#64351e",
                        fontWeight: 700,
                        cursor: isCurrentStatus || updatingKey ? "default" : "pointer",
                        opacity: isCurrentStatus ? 1 : updatingKey ? 0.55 : 1,
                      }}
                    >
                      {isUpdating ? "Updating..." : formatStatusLabel(status)}
                    </button>
                  );
                })}
              </div>
            </article>
          ))
        )}
      </div>
    </main>
  );
}
