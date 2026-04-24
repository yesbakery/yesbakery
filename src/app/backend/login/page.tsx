"use client";

import { FormEvent, useState } from "react";

export default function BackendLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      const payload = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Login failed.");
      }

      window.location.href = "/backend/shipping-requests";
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Login failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background: "linear-gradient(180deg, #fbf3ef 0%, #f7eadf 50%, #fff8f2 100%)",
      }}
    >
      <section
        style={{
          width: "min(480px, 100%)",
          padding: "32px",
          borderRadius: "28px",
          border: "1px solid rgba(107, 68, 45, 0.12)",
          background: "rgba(255, 250, 247, 0.96)",
          boxShadow: "0 20px 60px rgba(113, 77, 54, 0.1)",
        }}
      >
        <p style={{ color: "#ad6b48", fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase" }}>
          Backend Login
        </p>
        <h1 style={{ margin: "12px 0 14px", color: "#5f311c", fontFamily: "var(--font-display)", fontSize: "3rem" }}>
          Enter dashboard password
        </h1>
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "14px" }}>
          <label style={{ display: "grid", gap: "8px", color: "#64351e", fontWeight: 700 }}>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: "18px",
                border: "1px solid rgba(107, 68, 45, 0.16)",
                background: "rgba(255, 255, 255, 0.86)",
                color: "#4f2c1a",
                font: "inherit",
              }}
              required
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: "13px 20px",
              border: 0,
              borderRadius: "999px",
              color: "#fff8f4",
              background: "linear-gradient(135deg, #c47a45, #a6542d)",
              fontWeight: 700,
              cursor: "pointer",
              opacity: isSubmitting ? 0.5 : 1,
            }}
          >
            {isSubmitting ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {error ? (
          <div
            style={{
              marginTop: "18px",
              padding: "16px",
              borderRadius: "18px",
              background: "rgba(248, 239, 228, 0.96)",
              color: "#64351e",
            }}
          >
            {error}
          </div>
        ) : null}
      </section>
    </main>
  );
}
