"use client";

import { useEffect, useMemo, useState } from "react";

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

type OrderStatus = BackendOrder["status"];
type OrderTypeFilter = "all" | BackendOrder["type"];
type PickupFilter = "all" | "coming-weekend" | "future" | "no-date";

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
    saturdayKey: toDateKey(saturday),
    sundayKey: toDateKey(sunday),
    today,
  };
}

function formatStatusLabel(status: OrderStatus) {
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

function statusPillBackground(status: OrderStatus) {
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

function typeLabel(type: BackendOrder["type"]) {
  return type === "paid-online" ? "Paid Online" : "Pay at Pickup";
}

function buildOrderKey(order: BackendOrder) {
  return `${order.type}:${order.id}`;
}

function buttonStyle(active = false) {
  return {
    padding: "10px 14px",
    borderRadius: "999px",
    border: active ? "0" : "1px solid rgba(107, 68, 45, 0.12)",
    background: active ? "linear-gradient(135deg, #c47a45, #a6542d)" : "rgba(255, 243, 236, 0.9)",
    color: active ? "#fff8f4" : "#64351e",
    fontWeight: 700,
    cursor: "pointer",
  } as const;
}

export default function BackendOrdersPage() {
  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState("");
  const [updatingKey, setUpdatingKey] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const [typeFilter, setTypeFilter] = useState<OrderTypeFilter>("all");
  const [pickupFilter, setPickupFilter] = useState<PickupFilter>("all");
  const [selectedOrderKeys, setSelectedOrderKeys] = useState<string[]>([]);

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

  const filteredOrders = useMemo(() => {
    const { saturdayKey, sundayKey, today } = getComingWeekend();
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return orders.filter((order) => {
      if (statusFilter !== "all" && order.status !== statusFilter) {
        return false;
      }

      if (typeFilter !== "all" && order.type !== typeFilter) {
        return false;
      }

      const pickupDate = parsePickupDate(order.pickupDate);
      const pickupDateKey = pickupDate ? toDateKey(pickupDate) : "";

      if (pickupFilter === "coming-weekend" && pickupDateKey !== saturdayKey && pickupDateKey !== sundayKey) {
        return false;
      }

      if (pickupFilter === "future") {
        if (!pickupDate) {
          return false;
        }

        const normalizedPickupDate = new Date(pickupDate);
        normalizedPickupDate.setHours(0, 0, 0, 0);
        if (normalizedPickupDate < today) {
          return false;
        }
      }

      if (pickupFilter === "no-date" && pickupDate) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        order.id,
        order.customerName,
        order.customerEmail,
        order.phone,
        order.pickupDate,
        order.orderSummary,
        order.notes,
        order.paymentLabel,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [orders, pickupFilter, searchQuery, statusFilter, typeFilter]);

  const selectedFilteredOrders = filteredOrders.filter((order) => selectedOrderKeys.includes(buildOrderKey(order)));
  const allFilteredSelected = filteredOrders.length > 0 && selectedFilteredOrders.length === filteredOrders.length;

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

  async function updateStatus(order: BackendOrder, status: OrderStatus) {
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

  async function updateMultipleStatuses(status: OrderStatus) {
    if (selectedFilteredOrders.length === 0) {
      setActionMessage("Select at least one order first.");
      return;
    }

    setActionMessage("");
    setUpdatingKey(`batch:${status}`);

    try {
      const updates = await Promise.all(
        selectedFilteredOrders.map(async (order) => {
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
            throw new Error(payload.error || `Order ${order.id} could not be updated.`);
          }

          return payload.order;
        }),
      );

      const updatesByKey = new Map(updates.map((order) => [buildOrderKey(order), order]));

      setOrders((currentOrders) =>
        currentOrders.map((order) => updatesByKey.get(buildOrderKey(order)) || order),
      );

      setSelectedOrderKeys([]);
      setActionMessage(
        status === "picked-up"
          ? `${updates.length} order${updates.length === 1 ? "" : "s"} marked as picked up.`
          : `${updates.length} order${updates.length === 1 ? "" : "s"} marked as ${formatStatusLabel(status).toLowerCase()}.`,
      );
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Selected orders could not be updated.");
    } finally {
      setUpdatingKey("");
    }
  }

  function toggleOrderSelection(order: BackendOrder) {
    const orderKey = buildOrderKey(order);
    setSelectedOrderKeys((current) =>
      current.includes(orderKey) ? current.filter((entry) => entry !== orderKey) : [...current, orderKey],
    );
  }

  function toggleSelectAllFiltered() {
    if (allFilteredSelected) {
      const filteredKeys = new Set(filteredOrders.map(buildOrderKey));
      setSelectedOrderKeys((current) => current.filter((entry) => !filteredKeys.has(entry)));
      return;
    }

    const merged = new Set(selectedOrderKeys);
    filteredOrders.forEach((order) => merged.add(buildOrderKey(order)));
    setSelectedOrderKeys([...merged]);
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
      <div style={{ width: "min(1320px, 100%)", margin: "0 auto", display: "grid", gap: "18px" }}>
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
            View every order in one list, filter the queue, and manage several orders at once.
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
            <button type="button" onClick={logout} style={buttonStyle()}>
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
            padding: "24px",
            borderRadius: "26px",
            background: "rgba(255, 250, 247, 0.96)",
            border: "1px solid rgba(107, 68, 45, 0.12)",
            boxShadow: "0 20px 60px rgba(113, 77, 54, 0.08)",
            display: "grid",
            gap: "18px",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "space-between" }}>
            <div>
              <h2 style={{ color: "#5f311c", fontFamily: "var(--font-display)", fontSize: "2rem", margin: 0 }}>
                Order List
              </h2>
              <p style={{ marginTop: "8px", color: "#6f5143", lineHeight: 1.6 }}>
                {filteredOrders.length} visible order{filteredOrders.length === 1 ? "" : "s"} · {selectedFilteredOrders.length} selected
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gap: "10px",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                width: "min(820px, 100%)",
              }}
            >
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search name, email, notes, or order ID"
                style={{
                  padding: "12px 14px",
                  borderRadius: "16px",
                  border: "1px solid rgba(107, 68, 45, 0.14)",
                  background: "rgba(255, 255, 255, 0.86)",
                  color: "#4f2c1a",
                }}
              />

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as "all" | OrderStatus)}
                style={{
                  padding: "12px 14px",
                  borderRadius: "16px",
                  border: "1px solid rgba(107, 68, 45, 0.14)",
                  background: "rgba(255, 255, 255, 0.86)",
                  color: "#4f2c1a",
                }}
              >
                <option value="all">All Statuses</option>
                <option value="new">New</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
                <option value="picked-up">Picked Up</option>
              </select>

              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as OrderTypeFilter)}
                style={{
                  padding: "12px 14px",
                  borderRadius: "16px",
                  border: "1px solid rgba(107, 68, 45, 0.14)",
                  background: "rgba(255, 255, 255, 0.86)",
                  color: "#4f2c1a",
                }}
              >
                <option value="all">All Payment Types</option>
                <option value="paid-online">Paid Online</option>
                <option value="pay-at-pickup">Pay at Pickup</option>
              </select>

              <select
                value={pickupFilter}
                onChange={(event) => setPickupFilter(event.target.value as PickupFilter)}
                style={{
                  padding: "12px 14px",
                  borderRadius: "16px",
                  border: "1px solid rgba(107, 68, 45, 0.14)",
                  background: "rgba(255, 255, 255, 0.86)",
                  color: "#4f2c1a",
                }}
              >
                <option value="all">All Pickup Dates</option>
                <option value="coming-weekend">Coming Weekend</option>
                <option value="future">Today or Future</option>
                <option value="no-date">No Pickup Date</option>
              </select>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px",
              borderRadius: "18px",
              background: "rgba(248, 239, 228, 0.92)",
              border: "1px solid rgba(107, 68, 45, 0.08)",
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
              <button type="button" onClick={toggleSelectAllFiltered} style={buttonStyle()}>
                {allFilteredSelected ? "Clear Visible Selection" : "Select All Visible"}
              </button>
              <button
                type="button"
                onClick={() => updateMultipleStatuses("in-progress")}
                disabled={selectedFilteredOrders.length === 0 || updatingKey.startsWith("batch:")}
                style={buttonStyle()}
              >
                Mark In Progress
              </button>
              <button
                type="button"
                onClick={() => updateMultipleStatuses("done")}
                disabled={selectedFilteredOrders.length === 0 || updatingKey.startsWith("batch:")}
                style={buttonStyle()}
              >
                Mark Done
              </button>
              <button
                type="button"
                onClick={() => updateMultipleStatuses("picked-up")}
                disabled={selectedFilteredOrders.length === 0 || updatingKey.startsWith("batch:")}
                style={buttonStyle()}
              >
                Mark Picked Up
              </button>
            </div>

            <div style={{ color: "#6f5143", fontWeight: 700 }}>
              {selectedFilteredOrders.length > 0
                ? `${selectedFilteredOrders.length} selected`
                : "Select orders to use batch actions"}
            </div>
          </div>

          {loading ? (
            <div
              style={{
                padding: "24px",
                borderRadius: "22px",
                background: "rgba(255, 250, 247, 0.96)",
                border: "1px solid rgba(107, 68, 45, 0.12)",
              }}
            >
              Loading orders...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div
              style={{
                padding: "24px",
                borderRadius: "22px",
                background: "rgba(255, 250, 247, 0.96)",
                border: "1px solid rgba(107, 68, 45, 0.12)",
              }}
            >
              No orders match the current filters.
            </div>
          ) : (
            <div style={{ display: "grid", gap: "14px" }}>
              {filteredOrders.map((order) => {
                const orderKey = buildOrderKey(order);
                const isSelected = selectedOrderKeys.includes(orderKey);

                return (
                  <article
                    key={orderKey}
                    style={{
                      padding: "20px",
                      borderRadius: "22px",
                      background: isSelected ? "rgba(250, 233, 219, 0.95)" : "rgba(255, 250, 247, 0.96)",
                      border: isSelected
                        ? "1px solid rgba(166, 84, 45, 0.28)"
                        : "1px solid rgba(107, 68, 45, 0.12)",
                      boxShadow: "0 18px 48px rgba(113, 77, 54, 0.08)",
                      display: "grid",
                      gap: "14px",
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gap: "14px",
                        gridTemplateColumns: "auto minmax(0, 1.1fr) minmax(220px, 0.9fr)",
                        alignItems: "start",
                      }}
                    >
                      <label
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "36px",
                          height: "36px",
                          marginTop: "4px",
                          borderRadius: "12px",
                          background: "rgba(255,255,255,0.8)",
                          border: "1px solid rgba(107, 68, 45, 0.12)",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOrderSelection(order)}
                          aria-label={`Select order ${order.id}`}
                        />
                      </label>

                      <div style={{ display: "grid", gap: "8px" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
                          <strong style={{ color: "#64351e", fontSize: "1.05rem" }}>
                            {order.customerName || "Order"}
                          </strong>
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
                          <span
                            style={{
                              padding: "6px 10px",
                              borderRadius: "999px",
                              background: "rgba(255, 243, 236, 0.95)",
                              color: "#64351e",
                              fontWeight: 700,
                              fontSize: "0.86rem",
                            }}
                          >
                            {typeLabel(order.type)}
                          </span>
                        </div>

                        <div style={{ color: "#6f5143", lineHeight: 1.7 }}>
                          <div>
                            <strong style={{ color: "#5f311c" }}>Order ID:</strong> {order.id}
                          </div>
                          <div>
                            <strong style={{ color: "#5f311c" }}>Items:</strong> {order.orderSummary}
                          </div>
                          <div>
                            <strong style={{ color: "#5f311c" }}>Pickup:</strong> {order.pickupDate || "Not provided"}
                          </div>
                          <div>
                            <strong style={{ color: "#5f311c" }}>Submitted:</strong> {formatDate(order.createdAt)}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "grid", gap: "8px", color: "#6f5143", lineHeight: 1.7 }}>
                        <div>
                          <strong style={{ color: "#5f311c" }}>Email:</strong> {order.customerEmail || "Not provided"}
                        </div>
                        <div>
                          <strong style={{ color: "#5f311c" }}>Phone:</strong> {order.phone || "Not provided"}
                        </div>
                        <div>
                          <strong style={{ color: "#5f311c" }}>Payment:</strong> {order.paymentLabel}
                        </div>
                        <div>
                          <strong style={{ color: "#5f311c" }}>Total:</strong> {formatMoney(order.amountTotal, order.currency)}
                        </div>
                        {order.notes ? (
                          <div>
                            <strong style={{ color: "#5f311c" }}>Notes:</strong> {order.notes}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "10px",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingTop: "12px",
                        borderTop: "1px solid rgba(107, 68, 45, 0.12)",
                      }}
                    >
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                        <button
                          type="button"
                          onClick={() => updateStatus(order, "new")}
                          disabled={updatingKey.length > 0}
                          style={buttonStyle(order.status === "new")}
                        >
                          New
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStatus(order, "in-progress")}
                          disabled={updatingKey.length > 0}
                          style={buttonStyle(order.status === "in-progress")}
                        >
                          In Progress
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStatus(order, "done")}
                          disabled={updatingKey.length > 0}
                          style={buttonStyle(order.status === "done")}
                        >
                          Done
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStatus(order, "picked-up")}
                          disabled={updatingKey.length > 0}
                          style={buttonStyle(order.status === "picked-up")}
                        >
                          Picked Up
                        </button>
                      </div>

                      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                        <button type="button" onClick={() => printOrder(order)} style={buttonStyle()}>
                          Print
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
