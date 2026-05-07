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

type CustomerCard = {
  key: string;
  customerName: string;
  customerEmail: string;
  phone: string;
  totalSpentCents: number;
  totalOrders: number;
  lastOrderAt: string;
  orders: BackendOrder[];
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

export default function CustomersPage() {
  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadOrders() {
      try {
        const response = await fetch("/api/admin/orders?scope=all", {
          cache: "no-store",
        });
        const payload = (await response.json()) as { orders?: BackendOrder[] };
        setOrders(Array.isArray(payload.orders) ? payload.orders : []);
      } finally {
        setLoading(false);
      }
    }

    void loadOrders();
  }, []);

  const customers = useMemo(() => {
    const map = new Map<string, CustomerCard>();

    orders.forEach((order) => {
      const key = (order.customerEmail || `${order.customerName}|${order.phone}`).toLowerCase();
      const existing = map.get(key);

      if (existing) {
        existing.orders.push(order);
        existing.totalOrders += 1;
        existing.totalSpentCents += order.amountTotal;
        if (new Date(order.createdAt).getTime() > new Date(existing.lastOrderAt).getTime()) {
          existing.lastOrderAt = order.createdAt;
        }
        return;
      }

      map.set(key, {
        key,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        phone: order.phone,
        totalSpentCents: order.amountTotal,
        totalOrders: 1,
        lastOrderAt: order.createdAt,
        orders: [order],
      });
    });

    return [...map.values()]
      .map((customer) => ({
        ...customer,
        orders: customer.orders.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()),
      }))
      .filter((customer) => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) {
          return true;
        }

        return [customer.customerName, customer.customerEmail, customer.phone].join(" ").toLowerCase().includes(query);
      })
      .sort((left, right) => new Date(right.lastOrderAt).getTime() - new Date(left.lastOrderAt).getTime());
  }, [orders, searchQuery]);

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "24px",
        background: "linear-gradient(180deg, #fbf3ef 0%, #f7eadf 50%, #fff8f2 100%)",
      }}
    >
      <div style={{ width: "min(1240px, 100%)", margin: "0 auto", display: "grid", gap: "18px" }}>
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
            Customer Lists
          </h1>
          <p style={{ marginTop: "12px", color: "#6f5143", lineHeight: 1.7 }}>
            Browse customer cards and see what each customer has ordered in the past.
          </p>
          <BackendNav active="customers" />
        </header>

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
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search customer name, email, or phone"
            style={{
              padding: "12px 14px",
              borderRadius: "16px",
              border: "1px solid rgba(107, 68, 45, 0.14)",
              background: "rgba(255, 255, 255, 0.86)",
              color: "#4f2c1a",
            }}
          />

          {loading ? (
            <div>Loading customers...</div>
          ) : customers.length === 0 ? (
            <div>No customers found.</div>
          ) : (
            <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
              {customers.map((customer) => (
                <article
                  key={customer.key}
                  style={{
                    padding: "22px",
                    borderRadius: "22px",
                    background: "rgba(255, 250, 247, 0.96)",
                    border: "1px solid rgba(107, 68, 45, 0.12)",
                    boxShadow: "0 18px 48px rgba(113, 77, 54, 0.08)",
                    display: "grid",
                    gap: "12px",
                  }}
                >
                  <div>
                    <strong style={{ color: "#5f311c", fontSize: "1.15rem" }}>{customer.customerName || "Customer"}</strong>
                    <div style={{ color: "#6f5143", marginTop: "6px", lineHeight: 1.6 }}>
                      <div>{customer.customerEmail || "No email"}</div>
                      <div>{customer.phone || "No phone"}</div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "10px" }}>
                    <div style={{ padding: "12px", borderRadius: "16px", background: "rgba(248, 239, 228, 0.92)" }}>
                      <div style={{ color: "#8f583c", fontSize: "0.8rem", fontWeight: 700 }}>Orders</div>
                      <strong style={{ color: "#5f311c" }}>{customer.totalOrders}</strong>
                    </div>
                    <div style={{ padding: "12px", borderRadius: "16px", background: "rgba(248, 239, 228, 0.92)" }}>
                      <div style={{ color: "#8f583c", fontSize: "0.8rem", fontWeight: 700 }}>Spent</div>
                      <strong style={{ color: "#5f311c" }}>{formatMoney(customer.totalSpentCents, "usd")}</strong>
                    </div>
                    <div style={{ padding: "12px", borderRadius: "16px", background: "rgba(248, 239, 228, 0.92)" }}>
                      <div style={{ color: "#8f583c", fontSize: "0.8rem", fontWeight: 700 }}>Last Order</div>
                      <strong style={{ color: "#5f311c" }}>{formatDate(customer.lastOrderAt)}</strong>
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: "10px" }}>
                    <strong style={{ color: "#5f311c" }}>Order History</strong>
                    {customer.orders.map((order) => (
                      <div
                        key={`${order.type}:${order.id}`}
                        style={{
                          padding: "12px 14px",
                          borderRadius: "16px",
                          background: "rgba(248, 239, 228, 0.92)",
                          color: "#6f5143",
                          lineHeight: 1.6,
                        }}
                      >
                        <div><strong style={{ color: "#5f311c" }}>{order.id}</strong> · {formatDate(order.createdAt)}</div>
                        <div>{order.orderSummary}</div>
                        <div>{formatMoney(order.amountTotal, order.currency)} · {order.paymentLabel}</div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
