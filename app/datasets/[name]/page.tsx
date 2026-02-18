"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type UniversalRow = {
  id?: any;
  user_id: string;
  dataset_name: string;
  column_names: string[];
  row_data: Record<string, any>;
};

function isEmptyValue(v: any) {
  if (v === null || v === undefined) return true;
  const s = String(v).trim();
  return s === "";
}

// ---------- Step 3 helpers (auto category chart) ----------
function buildCategoryCounts(rows: any[], column: string) {
  const counts = new Map<string, number>();

  for (const r of rows) {
    const v = String(r?.[column] ?? "").trim();
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
}

function pickBestCategoryColumn(columns: string[], sampleRows: any[]) {
  // categorical sweet spot: 2..20 unique values
  let best: { col: string; unique: number } | null = null;

  for (const c of columns) {
    const values = sampleRows
      .map((r) => String(r?.[c] ?? "").trim())
      .filter(Boolean);

    if (values.length === 0) continue;

    const unique = new Set(values).size;

    if (unique >= 2 && unique <= 20) {
      if (!best || unique < best.unique) best = { col: c, unique };
    }
  }

  return best?.col ?? null;
}
// --------------------------------------------------------

// ---------- Step 4 helpers (auto numeric histogram) ----------
function isNumericValue(v: any) {
  if (v === null || v === undefined) return false;
  return !isNaN(Number(v));
}

function pickNumericColumn(columns: string[], sampleRows: any[]) {
  for (const c of columns) {
    let numericCount = 0;

    for (const r of sampleRows) {
      if (isNumericValue(r?.[c])) numericCount++;
    }

    // if most values are numeric, treat as numeric column
    if (numericCount >= Math.max(3, Math.ceil(sampleRows.length * 0.6))) {
      return c;
    }
  }
  return null;
}

function buildHistogram(rows: any[], column: string, bins = 6) {
  const values = rows
    .map((r) => Number(r?.[column]))
    .filter((v) => !isNaN(v));

  if (values.length === 0) return [];

  const min = Math.min(...values);
  const max = Math.max(...values);

  // if all values same, make single bin
  if (min === max) {
    return [{ name: `${min}`, value: values.length }];
  }

  const step = (max - min) / bins || 1;

  const buckets = Array.from({ length: bins }, (_, i) => ({
    name: `${(min + i * step).toFixed(1)}–${(min + (i + 1) * step).toFixed(1)}`,
    value: 0,
  }));

  for (const v of values) {
    const idx = Math.min(Math.floor((v - min) / step), bins - 1);
    buckets[idx].value++;
  }

  return buckets;
}
// ------------------------------------------------------------

export default function DatasetDashboardPage() {
  const router = useRouter();
  const params = useParams();
  const datasetName = decodeURIComponent(String(params?.name || ""));

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [rows, setRows] = useState<UniversalRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");

      const { data: sessionData, error: sessionErr } =
        await supabase.auth.getSession();

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

      const { data, error } = await supabase
        .from("universal_data")
        .select("user_id,dataset_name,column_names,row_data")
        .eq("user_id", userId)
        .eq("dataset_name", datasetName)
        .limit(2000);

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      const typed = (data || []) as UniversalRow[];
      setRows(typed);

      const colSet = new Set<string>();
      typed.forEach((r) =>
        (r.column_names || []).forEach((c) => colSet.add(c))
      );
      setColumns(Array.from(colSet));

      setLoading(false);
    }

    if (datasetName) load();
  }, [datasetName, router]);

  const kpis = useMemo(() => {
    const rowCount = rows.length;
    const colCount = columns.length;

    if (rowCount === 0 || colCount === 0) {
      return {
        rowCount,
        colCount,
        missingPct: 0,
        missingCells: 0,
        totalCells: 0,
      };
    }

    let missingCells = 0;
    const totalCells = rowCount * colCount;

    for (const r of rows) {
      const obj = r.row_data || {};
      for (const c of columns) {
        if (isEmptyValue(obj[c])) missingCells++;
      }
    }

    const missingPct = totalCells ? (missingCells / totalCells) * 100 : 0;

    return { rowCount, colCount, missingPct, missingCells, totalCells };
  }, [rows, columns]);

  const previewRows = useMemo(() => {
    return rows.slice(0, 10).map((r) => r.row_data || {});
  }, [rows]);

  // ---------- Step 3: category chart ----------
  const categoryColumn = useMemo(() => {
    return pickBestCategoryColumn(columns, previewRows);
  }, [columns, previewRows]);

  const barData = useMemo(() => {
    if (!categoryColumn) return [];
    return buildCategoryCounts(previewRows, categoryColumn);
  }, [previewRows, categoryColumn]);
  // ------------------------------------------

  // ---------- Step 4: numeric histogram ----------
  const numericColumn = useMemo(() => {
    return pickNumericColumn(columns, previewRows);
  }, [columns, previewRows]);

  const histogramData = useMemo(() => {
    if (!numericColumn) return [];
    return buildHistogram(previewRows, numericColumn, 6);
  }, [previewRows, numericColumn]);
  // ---------------------------------------------

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #0a0a1f 0%, #2d1b69 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontSize: 22,
          fontWeight: 800,
          fontFamily: "'Inter', -apple-system, sans-serif",
        }}
      >
        Loading dataset…
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0a0a1f 0%, #2d1b69 100%)",
        padding: "40px 20px",
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 38,
                fontWeight: 900,
                color: "#fff",
                margin: 0,
              }}
            >
              📊 {datasetName}
            </h1>
            <p style={{ color: "#94a3b8", marginTop: 10 }}>
              Auto-generated KPI dashboard (Step 4)
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => router.push("/datasets")}
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
              ← Datasets
            </button>
          </div>
        </div>

        {error && (
          <div
            style={{
              marginTop: 18,
              background: "rgba(255, 107, 107, 0.12)",
              border: "2px solid rgba(255, 107, 107, 0.35)",
              borderRadius: 18,
              padding: 16,
              color: "#ff6b6b",
              fontWeight: 800,
            }}
          >
            Error: {error}
          </div>
        )}

        {/* KPI Cards */}
        <div
          style={{
            marginTop: 22,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
          <KpiCard title="Rows" value={kpis.rowCount.toString()} />
          <KpiCard title="Columns" value={kpis.colCount.toString()} />
          <KpiCard title="Missing %" value={`${kpis.missingPct.toFixed(2)}%`} />
        </div>

        {/* ✅ Step 3: Auto Category Chart */}
        {categoryColumn && barData.length > 0 && (
          <div
            style={{
              marginTop: 22,
              background: "rgba(15, 15, 35, 0.9)",
              borderRadius: 26,
              padding: 18,
              border: "2px solid rgba(102, 126, 234, 0.3)",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
            }}
          >
            <div style={{ color: "#fff", fontWeight: 900, marginBottom: 10 }}>
              Auto Chart: Count by{" "}
              <span style={{ color: "#667eea" }}>{categoryColumn}</span>
            </div>

            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={barData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ✅ Step 4: Auto Numeric Histogram */}
        {numericColumn && histogramData.length > 0 && (
          <div
            style={{
              marginTop: 22,
              background: "rgba(15, 15, 35, 0.9)",
              borderRadius: 26,
              padding: 18,
              border: "2px solid rgba(79, 172, 254, 0.3)",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
            }}
          >
            <div style={{ color: "#fff", fontWeight: 900, marginBottom: 10 }}>
              Auto Chart: Distribution of{" "}
              <span style={{ color: "#4facfe" }}>{numericColumn}</span>
            </div>

            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={histogramData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Preview Table */}
        <div
          style={{
            marginTop: 22,
            background: "rgba(15, 15, 35, 0.9)",
            borderRadius: 26,
            padding: 18,
            border: "2px solid rgba(102, 126, 234, 0.3)",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
            overflowX: "auto",
          }}
        >
          <div style={{ color: "#fff", fontWeight: 900, marginBottom: 12 }}>
            Preview (first 10 rows)
          </div>

          {previewRows.length === 0 ? (
            <div style={{ color: "#94a3b8" }}>No rows found in this dataset.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th
                      key={c}
                      style={{
                        textAlign: "left",
                        padding: "10px 12px",
                        color: "#fff",
                        borderBottom: "1px solid rgba(255,255,255,0.12)",
                        fontSize: 14,
                      }}
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((r, idx) => (
                  <tr key={idx}>
                    {columns.map((c) => (
                      <td
                        key={c}
                        style={{
                          padding: "10px 12px",
                          color: "#cbd5e1",
                          borderBottom: "1px solid rgba(255,255,255,0.08)",
                          fontSize: 13,
                          maxWidth: 240,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={String(r?.[c] ?? "")}
                      >
                        {String(r?.[c] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value }: { title: string; value: string }) {
  return (
    <div
      style={{
        background: "rgba(15, 15, 35, 0.9)",
        borderRadius: 22,
        padding: 18,
        border: "2px solid rgba(102, 126, 234, 0.3)",
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.45)",
      }}
    >
      <div
        style={{
          color: "#94a3b8",
          fontWeight: 800,
          letterSpacing: 1,
          textTransform: "uppercase",
        }}
      >
        {title}
      </div>
      <div style={{ marginTop: 8, color: "#fff", fontSize: 34, fontWeight: 900 }}>
        {value}
      </div>
    </div>
  );
}
