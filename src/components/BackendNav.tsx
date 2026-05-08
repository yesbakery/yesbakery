"use client";

type BackendNavProps = {
  active: "orders" | "baking-dashboard" | "archive" | "customers" | "block-days" | "shipping-requests";
};

function linkStyle(active: boolean) {
  return {
    padding: "11px 16px",
    borderRadius: "999px",
    textDecoration: "none",
    background: active ? "linear-gradient(135deg, #c47a45, #a6542d)" : "rgba(255, 243, 236, 0.9)",
    color: active ? "#fff8f4" : "#64351e",
    fontWeight: 700,
  } as const;
}

function buttonStyle() {
  return {
    padding: "11px 16px",
    borderRadius: "999px",
    border: 0,
    background: "rgba(255, 243, 236, 0.9)",
    color: "#64351e",
    fontWeight: 700,
    cursor: "pointer",
  } as const;
}

export function BackendNav({ active }: BackendNavProps) {
  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/backend/login";
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "18px" }}>
      <a href="/backend/orders" style={linkStyle(active === "orders")}>
        Check Orders
      </a>
      <a href="/backend/baking-dashboard" style={linkStyle(active === "baking-dashboard")}>
        Baking Dashboard
      </a>
      <a href="/backend/orders-archive" style={linkStyle(active === "archive")}>
        Orders Archive
      </a>
      <a href="/backend/customers" style={linkStyle(active === "customers")}>
        Customer Lists
      </a>
      <a href="/backend/block-days" style={linkStyle(active === "block-days")}>
        Block Days
      </a>
      <a href="/backend/shipping-requests" style={linkStyle(active === "shipping-requests")}>
        Shipping Requests
      </a>
      <button type="button" onClick={logout} style={buttonStyle()}>
        Sign Out
      </button>
    </div>
  );
}
