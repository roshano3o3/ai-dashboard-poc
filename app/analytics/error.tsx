"use client";

import React, { useEffect } from "react";

export default function AnalyticsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Analytics route error:", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 24,
        background: "#0B1220",
        color: "#E5E7EB",
        fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      }}
    >
      <h1 style={{ marginTop: 0, fontSize: 22 }}>Analytics crashed</h1>

      <div
        style={{
          marginTop: 14,
          padding: 14,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(255,255,255,0.06)",
          whiteSpace: "pre-wrap",
          lineHeight: 1.5,
        }}
      >
        <b>Error:</b> {error?.message || "Unknown error"}
        {error?.digest ? `\n\nDigest: ${error.digest}` : ""}
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          onClick={() => reset()}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(79,70,229,0.18)",
            color: "#E5E7EB",
            cursor: "pointer",
            fontWeight: 800,
          }}
        >
          Retry
        </button>

        <button
          onClick={() => (window.location.href = "/dashboard")}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(255,255,255,0.06)",
            color: "#E5E7EB",
            cursor: "pointer",
            fontWeight: 800,
          }}
        >
          Go to Dashboard
        </button>
      </div>

      <p style={{ marginTop: 16, color: "rgba(229,231,235,0.75)" }}>
        Open DevTools → Console to see the full stack trace.
      </p>
    </div>
  );
}
