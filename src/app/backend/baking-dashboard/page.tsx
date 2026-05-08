"use client";

import { useEffect, useMemo, useState } from "react";
import { BackendNav } from "../../../components/BackendNav";

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
  archivedAt: string;
};

type ItemCount = {
  name: string;
  quantity: number;
};

type DayDashboard = {
  label: string;
  dateKey: string;
  orders: BackendOrder[];
  items: ItemCount[];
  totalItems: number;
};

const chartColors = ["#a6542d", "#c47a45", "#e2a879", "#8f2f24", "#dfc07d", "#6f4a33", "#f0ccb4", "#b85f3c"];

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

function getSaturdayForDate(date: Date) {
  const saturday = new Date(date);
  const day = saturday.getDay();
  const daysToSaturday = day === 0 ? -1 : 6 - day;
  saturday.setDate(saturday.getDate() + daysToSaturday);
  saturday.setHours(12, 0, 0, 0);
  return saturday;
}

function getComingSaturday() {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return getSaturdayForDate(today);
}

function getWeekendKeys(selectedSaturdayKey: string) {
  const selectedDate = parsePickupDate(selectedSaturdayKey) || getComingSaturday();
  const saturday = getSaturdayForDate(selectedDate);
  const sunday = new Date(saturday);
  sunday.setDate(saturday.getDate() + 1);

  return {
    saturdayKey: toDateKey(saturday),
    sundayKey: toDateKey(sunday),
  };
}

function formatDateKey(dateKey: string) {
  const date = parsePickupDate(dateKey);
  if (!date) {
    return dateKey;
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatStatusLabel(status: BackendOrder["status"]) {
  switch (status) {
    case "in-progress":
      return "In Progress";
    case "done":
      return "Ready for Pickup";
    case "picked-up":
      return "Picked Up";
    default:
      return "New";
  }
}

function parseOrderItems(orderSummary: string) {
  return orderSummary
    .split("|")
    .map((rawItem) => rawItem.trim())
    .map((item) => {
      const match = item.match(/^(\d+)\s*x\s+(.+)$/i);
      if (!match) {
        return { name: item, quantity: 1 };
      }

      return {
        name: match[2].trim(),
        quantity: Number(match[1]) || 1,
      };
    })
    .filter((item) => item.name);
}

function buildDayDashboard(label: string, dateKey: string, orders: BackendOrder[]): DayDashboard {
  const dayOrders = orders
    .filter((order) => order.pickupDate === dateKey && order.status !== "picked-up")
    .sort((left, right) => left.customerName.localeCompare(right.customerName));

  const itemMap = new Map<string, number>();

  dayOrders.forEach((order) => {
    parseOrderItems(order.orderSummary).forEach((item) => {
      itemMap.set(item.name, (itemMap.get(item.name) || 0) + item.quantity);
    });
  });

  const items = [...itemMap.entries()]
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((left, right) => right.quantity - left.quantity || left.name.localeCompare(right.name));

  return {
    label,
    dateKey,
    orders: dayOrders,
    items,
    totalItems: items.reduce((total, item) => total + item.quantity, 0),
  };
}

function buildPieBackground(items: ItemCount[]) {
  const total = items.reduce((sum, item) => sum + item.quantity, 0);
  if (total <= 0) {
    return "#f2dfd4";
  }

  let cursor = 0;
  const slices = items.map((item, index) => {
    const start = cursor;
    cursor += (item.quantity / total) * 100;
    const color = chartColors[index % chartColors.length];
    return `${color} ${start}% ${cursor}%`;
  });

  return `conic-gradient(${slices.join(", ")})`;
}

function statCardStyle() {
  return {
    padding: "18px",
    borderRadius: "22px",
    background: "rgba(248, 239, 228, 0.94)",
    border: "1px solid rgba(107, 68, 45, 0.1)",
  } as const;
}

function panelStyle() {
  return {
    padding: "24px",
    borderRadius: "28px",
    background: "rgba(255, 250, 247, 0.96)",
    border: "1px solid rgba(107, 68, 45, 0.12)",
    boxShadow: "0 20px 60px rgba(113, 77, 54, 0.08)",
  } as const;
}

function DayPanel({ day }: { day: DayDashboard }) {
  return (
    <section style={{ ...panelStyle(), display: "grid", gap: "22px" }}>
      <div>
        <p style={{ margin: 0, color: "#ad6b48", fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase" }}>
          {day.label}
        </p>
        <h2 style={{ margin: "8px 0 0", color: "#5f311c", fontFamily: "var(--font-display)", fontSize: "2.4rem" }}>
          {formatDateKey(day.dateKey)}
        </h2>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px" }}>
        <div style={statCardStyle()}>
          <div style={{ color: "#8f583c", fontWeight: 800 }}>Orders</div>
          <strong style={{ color: "#5f311c", fontSize: "2rem" }}>{day.orders.length}</strong>
        </div>
        <div style={statCardStyle()}>
          <div style={{ color: "#8f583c", fontWeight: 800 }}>Items to Bake</div>
          <strong style={{ color: "#5f311c", fontSize: "2rem" }}>{day.totalItems}</strong>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "180px minmax(0, 1fr)", gap: "20px", alignItems: "center" }}>
        <div
          aria-label={`${day.label} item pie chart`}
          style={{
            width: "180px",
            aspectRatio: "1",
            borderRadius: "50%",
            background: buildPieBackground(day.items),
            boxShadow: "inset 0 0 0 16px rgba(255, 250, 247, 0.72), 0 18px 42px rgba(95, 49, 28, 0.16)",
          }}
        />

        <div style={{ display: "grid", gap: "10px" }}>
          {day.items.length === 0 ? (
            <p style={{ margin: 0, color: "#6f5143", lineHeight: 1.6 }}>No active pickup items for this day yet.</p>
          ) : (
            day.items.map((item, index) => (
              <div
                key={item.name}
                style={{
                  display: "grid",
                  gridTemplateColumns: "18px minmax(0, 1fr) auto",
                  alignItems: "center",
                  gap: "10px",
                  color: "#5f311c",
                }}
              >
                <span
                  style={{
                    width: "14px",
                    height: "14px",
                    borderRadius: "50%",
                    background: chartColors[index % chartColors.length],
                  }}
                />
                <span style={{ fontWeight: 800 }}>{item.name}</span>
                <strong>{item.quantity}</strong>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ display: "grid", gap: "12px" }}>
        <strong style={{ color: "#5f311c", fontSize: "1.1rem" }}>Pickup Order List</strong>
        {day.orders.length === 0 ? (
          <div style={{ padding: "16px", borderRadius: "18px", background: "rgba(248, 239, 228, 0.92)", color: "#6f5143" }}>
            No orders scheduled for this day.
          </div>
        ) : (
          day.orders.map((order) => (
            <article
              key={`${order.type}:${order.id}`}
              style={{
                padding: "16px",
                borderRadius: "18px",
                background: "rgba(248, 239, 228, 0.92)",
                border: "1px solid rgba(107, 68, 45, 0.1)",
                color: "#6f5143",
                lineHeight: 1.6,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                <strong style={{ color: "#5f311c" }}>{order.customerName || "Customer"}</strong>
                <span style={{ color: "#8f583c", fontWeight: 800 }}>{formatStatusLabel(order.status)}</span>
              </div>
              <div>{order.orderSummary}</div>
              {order.notes ? <div><strong>Notes:</strong> {order.notes}</div> : null}
              <div style={{ color: "#8f583c", fontSize: "0.92rem" }}>{order.paymentLabel} · {order.phone || "No phone"}</div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

export default function BakingDashboardPage() {
  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSaturdayKey, setSelectedSaturdayKey] = useState(() => toDateKey(getComingSaturday()));

  async function loadOrders() {
    try {
      const response = await fetch("/api/admin/orders?scope=active", {
        cache: "no-store",
      });
      const payload = (await response.json()) as { orders?: BackendOrder[] };
      setOrders(Array.isArray(payload.orders) ? payload.orders : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrders();

    const intervalId = window.setInterval(() => {
      void loadOrders();
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, []);

  const weekend = useMemo(() => getWeekendKeys(selectedSaturdayKey), [selectedSaturdayKey]);

  const dashboardDays = useMemo(
    () => [
      buildDayDashboard("Saturday Pickups", weekend.saturdayKey, orders),
      buildDayDashboard("Sunday Pickups", weekend.sundayKey, orders),
    ],
    [orders, weekend.saturdayKey, weekend.sundayKey],
  );

  const weekendTotals = useMemo(
    () => ({
      orders: dashboardDays.reduce((total, day) => total + day.orders.length, 0),
      items: dashboardDays.reduce((total, day) => total + day.totalItems, 0),
    }),
    [dashboardDays],
  );

  function chooseWeekend(dateKey: string) {
    const date = parsePickupDate(dateKey);
    if (!date) {
      return;
    }

    setSelectedSaturdayKey(toDateKey(getSaturdayForDate(date)));
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "24px",
        background: "linear-gradient(180deg, #fbf3ef 0%, #f7eadf 50%, #fff8f2 100%)",
      }}
    >
      <div style={{ width: "min(1280px, 100%)", margin: "0 auto", display: "grid", gap: "18px" }}>
        <header style={panelStyle()}>
          <p style={{ margin: 0, color: "#ad6b48", fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase" }}>
            Backend
          </p>
          <h1 style={{ margin: "10px 0 0", color: "#5f311c", fontFamily: "var(--font-display)", fontSize: "3rem" }}>
            Baking Dashboard
          </h1>
          <p style={{ margin: "12px 0 0", color: "#6f5143", lineHeight: 1.7 }}>
            See what needs to be baked for Saturday and Sunday pickups, with item counts and quick order lists.
          </p>
          <BackendNav active="baking-dashboard" />
        </header>

        <section
          style={{
            ...panelStyle(),
            display: "grid",
            gap: "18px",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))",
            alignItems: "end",
          }}
        >
          <label style={{ display: "grid", gap: "8px", color: "#5f311c", fontWeight: 800 }}>
            Pick a weekend
            <input
              type="date"
              value={selectedSaturdayKey}
              onChange={(event) => chooseWeekend(event.target.value)}
              style={{
                padding: "12px 14px",
                borderRadius: "16px",
                border: "1px solid rgba(107, 68, 45, 0.14)",
                background: "rgba(255, 255, 255, 0.86)",
                color: "#4f2c1a",
                fontWeight: 700,
              }}
            />
            <span style={{ color: "#8f583c", fontWeight: 600 }}>
              Showing {formatDateKey(weekend.saturdayKey)} and {formatDateKey(weekend.sundayKey)}.
            </span>
          </label>

          <div style={statCardStyle()}>
            <div style={{ color: "#8f583c", fontWeight: 800 }}>Weekend Orders</div>
            <strong style={{ color: "#5f311c", fontSize: "2rem" }}>{loading ? "..." : weekendTotals.orders}</strong>
          </div>
          <div style={statCardStyle()}>
            <div style={{ color: "#8f583c", fontWeight: 800 }}>Weekend Items</div>
            <strong style={{ color: "#5f311c", fontSize: "2rem" }}>{loading ? "..." : weekendTotals.items}</strong>
          </div>
        </section>

        {loading ? (
          <section style={panelStyle()}>Loading baking dashboard...</section>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(420px, 100%), 1fr))", gap: "18px" }}>
            {dashboardDays.map((day) => (
              <DayPanel key={day.dateKey} day={day} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
