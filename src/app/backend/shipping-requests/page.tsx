"use client";

import { useEffect, useState } from "react";

type ShippingRequestRecord = {
  id: string;
  status: "pending" | "approved" | "rejected";
  fullName: string;
  email: string;
  phone: string;
  pickupDate: string;
  shippingRequest: string;
  notes: string;
  orderSummary: string;
  createdAt: string;
  approvalCode: string | null;
  approvalUrl: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function ShippingRequestsBackendPage() {
  const [requests, setRequests] = useState<ShippingRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState("");
  const [approvingId, setApprovingId] = useState("");
  const [rejectingId, setRejectingId] = useState("");

  async function loadRequests() {
    setLoading(true);

    try {
      const response = await fetch("/api/admin/shipping-requests");
      const payload = (await response.json()) as { requests?: ShippingRequestRecord[] };
      setRequests(Array.isArray(payload.requests) ? payload.requests : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRequests();
  }, []);

  async function approveRequest(requestId: string) {
    setActionMessage("");
    setApprovingId(requestId);

    try {
      const response = await fetch("/api/admin/shipping-requests/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requestId }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Shipping approval could not be sent.");
      }

      setActionMessage("Shipping approval email sent successfully.");
      await loadRequests();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Shipping approval could not be sent.");
    } finally {
      setApprovingId("");
    }
  }

  async function rejectRequest(requestId: string) {
    setActionMessage("");
    setRejectingId(requestId);

    try {
      const response = await fetch("/api/admin/shipping-requests/reject", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requestId }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Shipping rejection could not be sent.");
      }

      setActionMessage("Shipping rejection email sent successfully.");
      await loadRequests();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Shipping rejection could not be sent.");
    } finally {
      setRejectingId("");
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
            Shipping Requests
          </h1>
          <p style={{ marginTop: "12px", color: "#6f5143", lineHeight: 1.7 }}>
            Review shipping arrangement requests, approve the ones you want to fulfill, and send the customer
            their approval code with a preloaded cart link.
          </p>
          <button
            type="button"
            onClick={logout}
            style={{
              marginTop: "18px",
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
            Loading shipping requests...
          </div>
        ) : requests.length === 0 ? (
          <div
            style={{
              padding: "24px",
              borderRadius: "24px",
              background: "rgba(255, 250, 247, 0.96)",
              border: "1px solid rgba(107, 68, 45, 0.12)",
            }}
          >
            No shipping requests yet.
          </div>
        ) : (
          requests.map((request) => (
            <article
              key={request.id}
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
                    {request.fullName}
                  </h2>
                  <p style={{ color: "#6f5143" }}>{request.email}</p>
                </div>
                <span
                  style={{
                    padding: "8px 14px",
                    borderRadius: "999px",
                    background:
                      request.status === "approved" ? "#dcefdc" : request.status === "rejected" ? "#f0dddd" : "#f8dfcf",
                    color: "#64351e",
                    fontWeight: 800,
                  }}
                >
                  {request.status === "approved" ? "Approved" : request.status === "rejected" ? "Rejected" : "Pending"}
                </span>
              </div>

              <div style={{ display: "grid", gap: "8px", color: "#6f5143", lineHeight: 1.7 }}>
                <p>
                  <strong style={{ color: "#64351e" }}>Phone:</strong> {request.phone || "Not provided"}
                </p>
                <p>
                  <strong style={{ color: "#64351e" }}>Requested date:</strong> {request.pickupDate}
                </p>
                <p>
                  <strong style={{ color: "#64351e" }}>Submitted:</strong> {formatDate(request.createdAt)}
                </p>
                <p>
                  <strong style={{ color: "#64351e" }}>Items:</strong> {request.orderSummary}
                </p>
                <p>
                  <strong style={{ color: "#64351e" }}>Shipping details:</strong> {request.shippingRequest}
                </p>
                {request.notes ? (
                  <p>
                    <strong style={{ color: "#64351e" }}>Notes:</strong> {request.notes}
                  </p>
                ) : null}
                {request.approvalCode ? (
                  <p>
                    <strong style={{ color: "#64351e" }}>Approval code:</strong> {request.approvalCode}
                  </p>
                ) : null}
                {request.approvalUrl ? (
                  <p>
                    <strong style={{ color: "#64351e" }}>Approval URL:</strong>{" "}
                    <a href={request.approvalUrl} style={{ color: "#a6542d" }}>
                      Open prefilled cart
                    </a>
                  </p>
                ) : null}
              </div>

              {request.status === "pending" ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "18px" }}>
                  <button
                    type="button"
                    onClick={() => approveRequest(request.id)}
                    disabled={approvingId === request.id || rejectingId === request.id}
                    style={{
                      padding: "13px 20px",
                      border: 0,
                      borderRadius: "999px",
                      color: "#fff8f4",
                      background: "linear-gradient(135deg, #c47a45, #a6542d)",
                      fontWeight: 700,
                      cursor: "pointer",
                      opacity: approvingId === request.id || rejectingId === request.id ? 0.55 : 1,
                    }}
                  >
                    {approvingId === request.id ? "Approving..." : "Approve and Send Code"}
                  </button>

                  <button
                    type="button"
                    onClick={() => rejectRequest(request.id)}
                    disabled={approvingId === request.id || rejectingId === request.id}
                    style={{
                      padding: "13px 20px",
                      border: 0,
                      borderRadius: "999px",
                      color: "#64351e",
                      background: "#f5ddd0",
                      fontWeight: 700,
                      cursor: "pointer",
                      opacity: approvingId === request.id || rejectingId === request.id ? 0.55 : 1,
                    }}
                  >
                    {rejectingId === request.id ? "Rejecting..." : "Reject Request"}
                  </button>
                </div>
              ) : null}
            </article>
          ))
        )}
      </div>
    </main>
  );
}
