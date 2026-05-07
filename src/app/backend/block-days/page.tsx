"use client";

import { useEffect, useState } from "react";
import { BackendNav } from "../../../components/BackendNav";

type StorefrontSettings = {
  blockSaturday: boolean;
  blockSunday: boolean;
};

export default function BlockDaysPage() {
  const [settings, setSettings] = useState<StorefrontSettings>({
    blockSaturday: false,
    blockSunday: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadSettings() {
    try {
      const response = await fetch("/api/admin/block-days", {
        cache: "no-store",
      });
      const payload = (await response.json()) as { settings?: StorefrontSettings };
      if (payload.settings) {
        setSettings(payload.settings);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSettings();
  }, []);

  async function saveSettings() {
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/block-days", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      const payload = (await response.json()) as { settings?: StorefrontSettings; error?: string };

      if (!response.ok || !payload.settings) {
        throw new Error(payload.error || "Block day settings could not be saved.");
      }

      setSettings(payload.settings);
      setMessage("Storefront pickup-day settings saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Block day settings could not be saved.");
    } finally {
      setSaving(false);
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
      <div style={{ width: "min(980px, 100%)", margin: "0 auto", display: "grid", gap: "18px" }}>
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
            Block Days
          </h1>
          <p style={{ marginTop: "12px", color: "#6f5143", lineHeight: 1.7 }}>
            Control whether customers can place pickup orders for Saturdays and Sundays.
          </p>
          <BackendNav active="block-days" />
        </header>

        {message ? (
          <div
            style={{
              padding: "16px 18px",
              borderRadius: "20px",
              background: "rgba(248, 239, 228, 0.96)",
              border: "1px solid rgba(107, 68, 45, 0.09)",
              color: "#64351e",
            }}
          >
            {message}
          </div>
        ) : null}

        <section
          style={{
            padding: "28px",
            borderRadius: "26px",
            background: "rgba(255, 250, 247, 0.96)",
            border: "1px solid rgba(107, 68, 45, 0.12)",
            boxShadow: "0 20px 60px rgba(113, 77, 54, 0.08)",
            display: "grid",
            gap: "18px",
          }}
        >
          {loading ? (
            <div>Loading settings...</div>
          ) : (
            <>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "18px",
                  padding: "18px 20px",
                  borderRadius: "20px",
                  background: "rgba(248, 239, 228, 0.92)",
                  border: "1px solid rgba(107, 68, 45, 0.08)",
                }}
              >
                <div>
                  <strong style={{ color: "#5f311c", display: "block", marginBottom: "6px" }}>Block Saturdays</strong>
                  <span style={{ color: "#6f5143", lineHeight: 1.6 }}>
                    Customers will not be able to choose Saturday pickup dates.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.blockSaturday}
                  onChange={(event) =>
                    setSettings((current) => ({ ...current, blockSaturday: event.target.checked }))
                  }
                />
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "18px",
                  padding: "18px 20px",
                  borderRadius: "20px",
                  background: "rgba(248, 239, 228, 0.92)",
                  border: "1px solid rgba(107, 68, 45, 0.08)",
                }}
              >
                <div>
                  <strong style={{ color: "#5f311c", display: "block", marginBottom: "6px" }}>Block Sundays</strong>
                  <span style={{ color: "#6f5143", lineHeight: 1.6 }}>
                    Customers will not be able to choose Sunday pickup dates.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.blockSunday}
                  onChange={(event) =>
                    setSettings((current) => ({ ...current, blockSunday: event.target.checked }))
                  }
                />
              </label>

              <button
                type="button"
                onClick={saveSettings}
                disabled={saving}
                style={{
                  padding: "13px 18px",
                  borderRadius: "999px",
                  border: 0,
                  background: "linear-gradient(135deg, #c47a45, #a6542d)",
                  color: "#fff8f4",
                  fontWeight: 700,
                  cursor: "pointer",
                  justifySelf: "start",
                }}
              >
                {saving ? "Saving..." : "Save Block Days"}
              </button>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
