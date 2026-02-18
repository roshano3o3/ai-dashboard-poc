"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function DatasetsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [datasets, setDatasets] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDatasets() {
      setLoading(true);
      setError("");

      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();

      if (sessionErr) {
        setError(sessionErr.message);
        setLoading(false);
        return;
      }

      if (!sessionData.session) {
        router.push("/auth");
        return;
      }

      const userId = sessionData.session.user.id;

      // Get all dataset names from universal_data for this user
      const { data, error } = await supabase
        .from("universal_data")
        .select("dataset_name")
        .eq("user_id", userId);

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      const names = (data || [])
        .map((r: any) => String(r.dataset_name || "").trim())
        .filter(Boolean);

      // Make unique list
      const unique = Array.from(new Set(names));

      setDatasets(unique);
      setLoading(false);
    }

    loadDatasets();
  }, [router]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0a0a1f 0%, #2d1b69 100%)",
        padding: "40px 20px",
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <h1
              style={{
                fontSize: 42,
                fontWeight: 900,
                background: "linear-gradient(135deg, #667eea 0%, #f5576c 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                margin: 0,
              }}
            >
              📚 Datasets
            </h1>
            <p style={{ color: "#94a3b8", marginTop: 10 }}>
              Click a dataset to open its dashboard.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => router.push("/dashboard")}
              style={{
                padding: "14px 18px",
                borderRadius: 14,
                border: "2px solid rgba(102,126,234,0.45)",
                background: "rgba(102,126,234,0.15)",
                color: "#fff",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              ← Back
            </button>

            <button
              onClick={() => router.push("/upload")}
              style={{
                padding: "14px 18px",
                borderRadius: 14,
                border: "none",
                background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                color: "#0a0a1f",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              + Upload CSV
            </button>
          </div>
        </div>

        <div
          style={{
            marginTop: 24,
            background: "rgba(15, 15, 35, 0.9)",
            borderRadius: 26,
            padding: 26,
            border: "2px solid rgba(102, 126, 234, 0.3)",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
          }}
        >
          {loading ? (
            <div style={{ color: "#fff", fontSize: 20, fontWeight: 800 }}>Loading…</div>
          ) : error ? (
            <div style={{ color: "#ff6b6b", fontSize: 16, fontWeight: 800 }}>
              Error: {error}
            </div>
          ) : datasets.length === 0 ? (
            <div style={{ color: "#fff" }}>
              <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 8 }}>
                No datasets found
              </div>
              <div style={{ color: "#94a3b8" }}>
                Upload a CSV first, then come back here.
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 16,
              }}
            >
              {datasets.map((name) => (
                <div
                  key={name}
                  onClick={() => router.push(`/datasets/${encodeURIComponent(name)}`)}
                  style={{
                    cursor: "pointer",
                    background: "rgba(255,255,255,0.04)",
                    borderRadius: 18,
                    padding: 18,
                    border: "2px solid rgba(102, 126, 234, 0.25)",
                    transition: "transform 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-4px)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                >
                  <div style={{ color: "#fff", fontSize: 18, fontWeight: 900 }}>
                    {name}
                  </div>
                  <div style={{ color: "#94a3b8", marginTop: 8, fontWeight: 700 }}>
                    Open dashboard →
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
