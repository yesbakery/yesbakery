"use client";

import { useEffect, useState } from "react";
import { BackendNav } from "../../../components/BackendNav";

type StorefrontSettings = {
  blockSaturday: boolean;
  blockSunday: boolean;
  blockedDates: string[];
};

export default function BlockDaysPage() {
  const [settings, setSettings] = useState<StorefrontSettings>({
    blockSaturday: false,
    blockSunday: false,
    blockedDates: [],
  });
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function normalizeSettings(value: Partial<StorefrontSettings>): StorefrontSettings {
    return {
      blockSaturday: Boolean(value.blockSaturday),
      blockSunday: Boolean(value.blockSunday),
      blockedDates: Array.from(new Set(value.blockedDates || [])).sort(),
    };
  }

  function formatBlockedDate(dateString: string) {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "America/Los_Angeles",
    }).format(new Date(`${dateString}T12:00:00`));
  }

  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch("/api/admin/block-days", {
          cache: "no-store",
        });
        const payload = (await response.json()) as { settings?: StorefrontSettings };
        if (payload.settings) {
          setSettings(normalizeSettings(payload.settings));
        }
      } finally {
        setLoading(false);
      }
    }

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
        body: JSON.stringify(normalizeSettings(settings)),
      });

      const payload = (await response.json()) as { settings?: StorefrontSettings; error?: string };

      if (!response.ok || !payload.settings) {
        throw new Error(payload.error || "Block day settings could not be saved.");
      }

      setSettings(normalizeSettings(payload.settings));
      setMessage("Blocked pickup days saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Block day settings could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  function addBlockedDate() {
    if (!selectedDate) {
      setMessage("Choose a date from the calendar first.");
      return;
    }

    setSettings((current) =>
      normalizeSettings({
        ...current,
        blockedDates: [...current.blockedDates, selectedDate],
      }),
    );
    setSelectedDate("");
    setMessage("");
  }

  function removeBlockedDate(dateToRemove: string) {
    setSettings((current) => ({
      ...current,
      blockedDates: current.blockedDates.filter((date) => date !== dateToRemove),
    }));
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
            Block full weekend days or choose exact dates when the bakery will be closed. Blocked dates will not appear as customer pickup options.
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

              <div
                style={{
                  display: "grid",
                  gap: "16px",
                  padding: "20px",
                  borderRadius: "22px",
                  background: "rgba(255, 248, 242, 0.96)",
                  border: "1px solid rgba(107, 68, 45, 0.1)",
                }}
              >
                <div>
                  <strong style={{ color: "#5f311c", display: "block", marginBottom: "6px" }}>
                    Block Specific Pickup Dates
                  </strong>
                  <span style={{ color: "#6f5143", lineHeight: 1.6 }}>
                    Pick any date the baker wants to be out. Saved dates are hidden from checkout and rejected by the order API.
                  </span>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(event) => setSelectedDate(event.target.value)}
                    style={{
                      minWidth: "220px",
                      padding: "12px 14px",
                      borderRadius: "16px",
                      border: "1px solid rgba(107, 68, 45, 0.16)",
                      background: "rgba(255, 255, 255, 0.9)",
                      color: "#4f2c1a",
                      font: "inherit",
                    }}
                  />
                  <button
                    type="button"
                    onClick={addBlockedDate}
                    style={{
                      padding: "12px 16px",
                      borderRadius: "999px",
                      border: 0,
                      background: "#5f311c",
                      color: "#fff8f4",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    Add Date
                  </button>
                </div>

                <div style={{ display: "grid", gap: "10px" }}>
                  <strong style={{ color: "#5f311c" }}>Blocked Dates List</strong>
                  {settings.blockedDates.length === 0 ? (
                    <div
                      style={{
                        padding: "14px 16px",
                        borderRadius: "18px",
                        background: "rgba(248, 239, 228, 0.92)",
                        color: "#6f5143",
                      }}
                    >
                      No specific dates are blocked yet.
                    </div>
                  ) : (
                    settings.blockedDates.map((date) => (
                      <div
                        key={date}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "12px",
                          padding: "14px 16px",
                          borderRadius: "18px",
                          background: "rgba(248, 239, 228, 0.92)",
                          border: "1px solid rgba(107, 68, 45, 0.08)",
                        }}
                      >
                        <div style={{ display: "grid", gap: "4px" }}>
                          <strong style={{ color: "#5f311c" }}>{formatBlockedDate(date)}</strong>
                          <span style={{ color: "#8b654f", fontSize: "0.92rem" }}>{date}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeBlockedDate(date)}
                          style={{
                            padding: "9px 12px",
                            borderRadius: "999px",
                            border: 0,
                            background: "rgba(122, 65, 37, 0.1)",
                            color: "#7a4125",
                            fontWeight: 800,
                            cursor: "pointer",
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

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
                {saving ? "Saving..." : "Save Blocked Dates"}
              </button>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
