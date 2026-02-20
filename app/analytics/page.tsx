"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createClient, type User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area,
  BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
} from "recharts";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY || "";

const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

type UniversalRow = {
  id?: string; user_id?: string; dataset_name: string;
  column_names: string[] | null; row_data: Record<string, any> | null; created_at?: string;
};
type Mode = "trend" | "compare" | "correlation" | "forecast";

function isNil(v: any) { return v === null || v === undefined; }
function toNum(v: any): number | null {
  if (isNil(v)) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

const DarkTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "rgba(11,18,32,0.96)", border: "1px solid rgba(79,70,229,0.30)", borderRadius: 12, padding: "10px 14px", fontSize: 13, fontWeight: 800, color: "#E5E7EB", boxShadow: "0 8px 24px rgba(0,0,0,0.40)" }}>
      <div style={{ marginBottom: 4, opacity: 0.65, fontSize: 11 }}>Period {label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color, marginTop: 2 }}>
          {p.name}: <b>{typeof p.value === "number" ? p.value.toFixed(2) : p.value}</b>
        </div>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [allData, setAllData] = useState<UniversalRow[]>([]);
  const [datasets, setDatasets] = useState<string[]>([]);
  const [mode, setMode] = useState<Mode>("trend");

  const [trendDataset, setTrendDataset] = useState("");
  const [trendMetric, setTrendMetric] = useState("");
  const [compareDataset1, setCompareDataset1] = useState("");
  const [compareDataset2, setCompareDataset2] = useState("");
  const [compareMetric, setCompareMetric] = useState("");
  const [corrDataset, setCorrDataset] = useState("");
  const [corrMetricX, setCorrMetricX] = useState("");
  const [corrMetricY, setCorrMetricY] = useState("");
  const [corrCoeff, setCorrCoeff] = useState<number | null>(null);
  const [forecastDataset, setForecastDataset] = useState("");
  const [forecastMetric, setForecastMetric] = useState("");
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastData, setForecastData] = useState<any[]>([]);
  const [aiInsight, setAiInsight] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        if (!supabase) { setFatalError("Missing Supabase env"); setLoading(false); return; }
        const { data, error } = await supabase.auth.getUser();
        if (error) { setFatalError(`Auth: ${error.message}`); setLoading(false); return; }
        const user = data.user as User | null;
        if (!user) { router.push("/auth"); return; }
        setUserEmail(user.email || "");
        const { data: records, error: dbErr } = await supabase
          .from("universal_data").select("*").eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (dbErr) { setFatalError(`DB: ${dbErr.message}`); setLoading(false); return; }
        const rows = (records || []) as UniversalRow[];
        setAllData(rows);
        const uds = Array.from(new Set(rows.map((r) => r.dataset_name))).filter(Boolean);
        setDatasets(uds);
        if (uds.length > 0) {
          setTrendDataset(uds[0]); setCompareDataset1(uds[0]);
          setCompareDataset2(uds[1] || uds[0]); setCorrDataset(uds[0]); setForecastDataset(uds[0]);
        }
        setLoading(false);
      } catch (e: any) { setFatalError(e?.message || "Unknown error"); setLoading(false); }
    })();
  }, [router]);

  const getNumericColumns = (dsName: string) => {
    const rows = allData.filter((r) => r.dataset_name === dsName);
    if (!rows.length) return [];
    const colSet = new Set<string>();
    rows.forEach((r) => (r.column_names || []).forEach((c) => colSet.add(String(c))));
    return Array.from(colSet).filter((col) => {
      let num = 0, tot = 0;
      rows.forEach((r) => { const v = (r.row_data || {})[col]; if (!isNil(v)) { tot++; if (toNum(v) !== null) num++; } });
      return tot >= 3 && num / Math.max(1, tot) > 0.8;
    });
  };

  useEffect(() => { const c = getNumericColumns(trendDataset); if (c.length) setTrendMetric(c[0]); }, [trendDataset, allData]);
  useEffect(() => { const c = getNumericColumns(compareDataset1); if (c.length) setCompareMetric(c[0]); }, [compareDataset1, allData]);
  useEffect(() => {
    const c = getNumericColumns(corrDataset);
    if (c.length > 0) setCorrMetricX(c[0]);
    if (c.length > 1) setCorrMetricY(c[1]); else if (c.length === 1) setCorrMetricY(c[0]);
  }, [corrDataset, allData]);
  useEffect(() => { const c = getNumericColumns(forecastDataset); if (c.length) setForecastMetric(c[0]); }, [forecastDataset, allData]);

  const trendData = useMemo(() => {
    const rows = allData.filter((r) => r.dataset_name === trendDataset);
    const raw = rows.map((r, i) => { const v = toNum((r.row_data || {})[trendMetric]); return v !== null ? { index: i + 1, value: v } : null; }).filter(Boolean) as { index: number; value: number }[];
    return raw.map((d, i) => {
      const slice = raw.slice(Math.max(0, i - 2), i + 1);
      return { ...d, movingAvg: parseFloat((slice.reduce((s, x) => s + x.value, 0) / slice.length).toFixed(2)) };
    });
  }, [allData, trendDataset, trendMetric]);

  const trendStats = useMemo(() => {
    if (!trendData.length) return { avg: 0, max: 0, min: 0, range: 0 };
    const vals = trendData.map((d) => d.value);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const max = Math.max(...vals); const min = Math.min(...vals);
    return { avg, max, min, range: max - min };
  }, [trendData]);

  const comparisonBarData = useMemo(() => {
    if (!compareMetric) return [];
    const getStats = (ds: string) => {
      const vals = allData.filter((r) => r.dataset_name === ds).map((r) => toNum((r.row_data || {})[compareMetric])).filter((v) => v !== null) as number[];
      if (!vals.length) return null;
      return { avg: vals.reduce((a, b) => a + b, 0) / vals.length, max: Math.max(...vals), min: Math.min(...vals), count: vals.length };
    };
    const s1 = getStats(compareDataset1); const s2 = getStats(compareDataset2);
    if (!s1 || !s2) return [];
    return [
      { metric: "Average", [compareDataset1]: +s1.avg.toFixed(2), [compareDataset2]: +s2.avg.toFixed(2) },
      { metric: "Maximum", [compareDataset1]: s1.max, [compareDataset2]: s2.max },
      { metric: "Minimum", [compareDataset1]: s1.min, [compareDataset2]: s2.min },
      { metric: "Records", [compareDataset1]: s1.count, [compareDataset2]: s2.count },
    ];
  }, [allData, compareDataset1, compareDataset2, compareMetric]);

  const compareInsight = useMemo(() => {
    if (!comparisonBarData.length) return "";
    const v1 = comparisonBarData[0][compareDataset1] as number;
    const v2 = comparisonBarData[0][compareDataset2] as number;
    if (!v1) return "";
    const d = ((v2 - v1) / v1 * 100).toFixed(1);
    return parseFloat(d) >= 0
      ? `📈 ${compareDataset2} avg is ${d}% higher than ${compareDataset1}`
      : `📉 ${compareDataset2} avg is ${Math.abs(parseFloat(d))}% lower than ${compareDataset1}`;
  }, [comparisonBarData, compareDataset1, compareDataset2]);

  const corrData = useMemo(() => {
    if (!corrMetricX || !corrMetricY) return [];
    return allData.filter((r) => r.dataset_name === corrDataset).map((r) => {
      const x = toNum((r.row_data || {})[corrMetricX]); const y = toNum((r.row_data || {})[corrMetricY]);
      return x !== null && y !== null ? { x, y } : null;
    }).filter(Boolean) as { x: number; y: number }[];
  }, [allData, corrDataset, corrMetricX, corrMetricY]);

  useEffect(() => {
    if (corrData.length < 3) { setCorrCoeff(null); return; }
    const n = corrData.length;
    const sX = corrData.reduce((s, p) => s + p.x, 0), sY = corrData.reduce((s, p) => s + p.y, 0);
    const sXY = corrData.reduce((s, p) => s + p.x * p.y, 0);
    const sX2 = corrData.reduce((s, p) => s + p.x ** 2, 0), sY2 = corrData.reduce((s, p) => s + p.y ** 2, 0);
    const den = Math.sqrt((n * sX2 - sX ** 2) * (n * sY2 - sY ** 2));
    setCorrCoeff(den === 0 ? null : (n * sXY - sX * sY) / den);
  }, [corrData]);

  const corrStrength = useMemo(() => {
    if (corrCoeff === null) return { text: "Unknown", color: "#6B7280" };
    const a = Math.abs(corrCoeff);
    if (a >= 0.7) return { text: "Strong", color: "#10B981" };
    if (a >= 0.4) return { text: "Moderate", color: "#F59E0B" };
    return { text: "Weak", color: "#EF4444" };
  }, [corrCoeff]);

  const generateForecast = async () => {
    if (!forecastDataset || !forecastMetric) return;
    setForecastLoading(true); setForecastData([]); setAiInsight("");
    try {
      const rows = allData.filter((r) => r.dataset_name === forecastDataset);
      const hist = rows.map((r, i) => { const v = toNum((r.row_data || {})[forecastMetric]); return v !== null ? { period: i + 1, value: v } : null; }).filter(Boolean) as { period: number; value: number }[];
      if (hist.length < 3) { setAiInsight("⚠️ Need at least 3 records."); setForecastLoading(false); return; }
      const n = hist.length;
      const sX = hist.reduce((s, d) => s + d.period, 0), sY = hist.reduce((s, d) => s + d.value, 0);
      const sXY = hist.reduce((s, d) => s + d.period * d.value, 0), sX2 = hist.reduce((s, d) => s + d.period ** 2, 0);
      const slope = (n * sXY - sX * sY) / (n * sX2 - sX ** 2);
      const intercept = (sY - slope * sX) / n;
      const chartPoints: any[] = [];
      hist.slice(-15).forEach((h) => chartPoints.push({ period: h.period, actual: h.value }));
      for (let i = 1; i <= 5; i++) {
        const p = hist.length + i;
        chartPoints.push({ period: p, predicted: +(slope * p + intercept).toFixed(2) });
      }
      setForecastData(chartPoints);
      if (GROQ_API_KEY) {
        try {
          const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [
              { role: "system", content: "You are a concise data analyst. 2 sentences only." },
              { role: "user", content: `Dataset: "${forecastDataset}", metric: "${forecastMetric}". Values: [${hist.map(h => h.value).join(", ")}]. Slope: ${slope.toFixed(3)}. Give 2-sentence forecast insight.` },
            ], max_tokens: 120 }),
          });
          const d = await res.json();
          setAiInsight("🤖 " + (d.choices?.[0]?.message?.content || "Forecast ready."));
        } catch { setAiInsight(`✅ Trend: ${slope > 0 ? "↑ increasing" : "↓ decreasing"} at ${Math.abs(slope).toFixed(2)}/period.`); }
      } else {
        setAiInsight(`✅ Linear regression. Slope: ${slope > 0 ? "+" : ""}${slope.toFixed(2)} per period.`);
      }
    } catch { setAiInsight("⚠️ Error generating forecast."); }
    setForecastLoading(false);
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ padding: 32, borderRadius: 20, background: "rgba(79,70,229,0.18)", textAlign: "center" }}>
        <div style={{ fontSize: 28, fontWeight: 950, color: "#E5E7EB" }}>Loading Analytics…</div>
        <div style={{ marginTop: 8, fontSize: 14, color: "rgba(255,255,255,0.55)" }}>Fetching your datasets</div>
      </div>
    </div>
  );

  if (fatalError) return (
    <div style={{ minHeight: "100vh", background: BG, padding: 24 }}>
      <h2 style={{ color: "#fff" }}>Error</h2>
      <pre style={{ color: "#FCA5A5", background: "rgba(239,68,68,0.10)", padding: 16, borderRadius: 12 }}>{fatalError}</pre>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: BG, color: "#E5E7EB", fontFamily: "'Inter', system-ui, sans-serif" }}>

      <header style={S.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={S.logo}>R&K</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 950, color: "#fff" }}>Advanced Analytics</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>{userEmail}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {[{ label: "📊 Dashboard", path: "/dashboard" }, { label: "📋 Tables", path: "/data" }, { label: "⬆️ Upload", path: "/upload" }].map(({ label, path }) => (
            <button key={path} onClick={() => router.push(path)} style={S.navBtn}>{label}</button>
          ))}
        </div>
      </header>

      <main style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 20px 80px" }}>

        <div style={S.card}>
          <div style={S.cardTitle}>Analytics Modes</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginTop: 4, marginBottom: 16 }}>Choose your analysis type</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {([
              { key: "trend", label: "📈 Trend Analysis" },
              { key: "compare", label: "⚖️ Dataset Comparison" },
              { key: "correlation", label: "🔗 Correlation Analysis" },
              { key: "forecast", label: "🔮 AI Forecasting" },
            ] as const).map(({ key, label }) => (
              <button key={key} onClick={() => setMode(key)} style={{ ...S.modeBtn, ...(mode === key ? S.modeBtnActive : {}) }}>{label}</button>
            ))}
          </div>
        </div>

        {mode === "trend" && (
          <div style={S.card}>
            <div style={S.cardTitle}>📈 Trend Analysis</div>
            <div style={S.cardSub}>Metric over time with 3-period moving average overlay</div>
            <div style={{ display: "flex", gap: 16, marginTop: 18, flexWrap: "wrap" }}>
              <div><div style={S.label}>Dataset</div>
                <select value={trendDataset} onChange={(e) => setTrendDataset(e.target.value)} style={S.select}>
                  {datasets.map((d) => <option key={d} value={d} style={{ color: '#0B1220', background: '#fff' }}>{d}</option>)}</select></div>
              <div><div style={S.label}>Metric</div>
                <select value={trendMetric} onChange={(e) => setTrendMetric(e.target.value)} style={S.select}>
                  {getNumericColumns(trendDataset).map((c) => <option key={c} value={c} style={{ color: '#0B1220', background: '#fff' }}>{c}</option>)}</select></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginTop: 20 }}>
              {[
                { label: "Average", val: trendStats.avg.toFixed(2), color: "#4F46E5" },
                { label: "Maximum", val: trendStats.max.toFixed(2), color: "#10B981" },
                { label: "Minimum", val: trendStats.min.toFixed(2), color: "#EF4444" },
                { label: "Range",   val: trendStats.range.toFixed(2), color: "#F59E0B" },
              ].map(({ label, val, color }) => (
                <div key={label} style={S.statCard}>
                  <div style={{ fontSize: 11, fontWeight: 900, opacity: 0.65, textTransform: "uppercase" }}>{label}</div>
                  <div style={{ fontSize: 26, fontWeight: 950, color, marginTop: 4 }}>{val}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, fontWeight: 950, opacity: 0.55, textTransform: "uppercase", letterSpacing: 0.6, marginTop: 20, marginBottom: 6 }}>Actual + 3-Period Moving Average</div>
            <div style={{ height: 340 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#4F46E5" stopOpacity={0.40} />
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradCyan" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#06B6D4" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="index" tick={TICK} axisLine={{ stroke: "rgba(255,255,255,0.10)" }} tickLine={false} />
                  <YAxis tick={TICK} axisLine={false} tickLine={false} />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: 12, fontSize: 12, fontWeight: 800 }} />
                  <Area type="monotone" dataKey="value"     name="Actual"          stroke="#4F46E5" strokeWidth={2.5} fill="url(#gradBlue)" dot={{ r: 3, fill: "#4F46E5" }} />
                  <Area type="monotone" dataKey="movingAvg" name="Moving Avg (3p)" stroke="#06B6D4" strokeWidth={2}   fill="url(#gradCyan)" strokeDasharray="6 3" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {trendData.length > 1 && (() => {
              const first = trendData[0].value, last = trendData[trendData.length - 1].value;
              const chg = ((last - first) / Math.max(1, Math.abs(first)) * 100).toFixed(1);
              const up = last >= first;
              return (
                <div style={{ ...S.insightBox, marginTop: 16 }}>
                  {up ? "📈" : "📉"} Overall change: <b style={{ color: up ? "#10B981" : "#EF4444" }}>{up ? "+" : ""}{chg}%</b> from first to last record · Moving average smooths short-term noise.
                </div>
              );
            })()}
          </div>
        )}

        {mode === "compare" && (
          <div style={S.card}>
            <div style={S.cardTitle}>⚖️ Dataset Comparison</div>
            <div style={S.cardSub}>Side-by-side comparison across Average, Max, Min, and Record count</div>
            <div style={{ display: "flex", gap: 16, marginTop: 18, flexWrap: "wrap" }}>
              {[{ label: "Dataset 1", val: compareDataset1, set: setCompareDataset1 }, { label: "Dataset 2", val: compareDataset2, set: setCompareDataset2 }].map(({ label, val, set }) => (
                <div key={label}><div style={S.label}>{label}</div>
                  <select value={val} onChange={(e) => set(e.target.value)} style={S.select}>
                    {datasets.map((d) => <option key={d} value={d} style={{ color: '#0B1220', background: '#fff' }}>{d}</option>)}</select></div>
              ))}
              <div><div style={S.label}>Metric</div>
                <select value={compareMetric} onChange={(e) => setCompareMetric(e.target.value)} style={S.select}>
                  {getNumericColumns(compareDataset1).map((c) => <option key={c} value={c} style={{ color: '#0B1220', background: '#fff' }}>{c}</option>)}</select></div>
            </div>
            {compareInsight && <div style={{ ...S.insightBox, marginTop: 16 }}>{compareInsight}</div>}
            {comparisonBarData.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 950, opacity: 0.55, textTransform: "uppercase", letterSpacing: 0.6, marginTop: 20, marginBottom: 6 }}>Side-by-Side: {compareMetric}</div>
                <div style={{ height: 360 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonBarData} barGap={6}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="metric" tick={TICK} axisLine={{ stroke: "rgba(255,255,255,0.10)" }} tickLine={false} />
                      <YAxis tick={TICK} axisLine={false} tickLine={false} />
                      <Tooltip content={<DarkTooltip />} />
                      <Legend wrapperStyle={{ paddingTop: 12, fontSize: 12, fontWeight: 800 }} />
                      <Bar dataKey={compareDataset1} fill="#4F46E5" radius={[8,8,0,0]} maxBarSize={55} />
                      <Bar dataKey={compareDataset2} fill="#06B6D4" radius={[8,8,0,0]} maxBarSize={55} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ fontSize: 11, fontWeight: 950, opacity: 0.55, textTransform: "uppercase", letterSpacing: 0.6, marginTop: 20, marginBottom: 8 }}>Summary Table</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr>{["Statistic", compareDataset1, compareDataset2, "Δ Diff"].map((h) => (
                      <th key={h} style={{ padding: "10px 12px", fontWeight: 950, fontSize: 11, opacity: 0.60, textTransform: "uppercase", borderBottom: "1px solid rgba(255,255,255,0.10)", textAlign: h === "Statistic" ? "left" : "right" }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {comparisonBarData.map((row, i) => {
                      const v1 = row[compareDataset1] as number, v2 = row[compareDataset2] as number;
                      const diff = v2 - v1;
                      return (
                        <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                          <td style={{ padding: "10px 12px", fontWeight: 800, color: "rgba(255,255,255,0.75)" }}>{row.metric}</td>
                          <td style={{ padding: "10px 12px", textAlign: "right", color: "#4F46E5", fontWeight: 900 }}>{v1.toFixed(2)}</td>
                          <td style={{ padding: "10px 12px", textAlign: "right", color: "#06B6D4", fontWeight: 900 }}>{v2.toFixed(2)}</td>
                          <td style={{ padding: "10px 12px", textAlign: "right", color: diff >= 0 ? "#10B981" : "#EF4444", fontWeight: 950 }}>{diff >= 0 ? "+" : ""}{diff.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}

        {mode === "correlation" && (
          <div style={S.card}>
            <div style={S.cardTitle}>🔗 Correlation Analysis</div>
            <div style={S.cardSub}>Pearson coefficient + scatter plot to discover metric relationships</div>
            <div style={{ display: "flex", gap: 16, marginTop: 18, flexWrap: "wrap" }}>
              <div><div style={S.label}>Dataset</div>
                <select value={corrDataset} onChange={(e) => setCorrDataset(e.target.value)} style={S.select}>
                  {datasets.map((d) => <option key={d} value={d} style={{ color: '#0B1220', background: '#fff' }}>{d}</option>)}</select></div>
              <div><div style={S.label}>X-Axis</div>
                <select value={corrMetricX} onChange={(e) => setCorrMetricX(e.target.value)} style={S.select}>
                  {getNumericColumns(corrDataset).map((c) => <option key={c} value={c} style={{ color: '#0B1220', background: '#fff' }}>{c}</option>)}</select></div>
              <div><div style={S.label}>Y-Axis</div>
                <select value={corrMetricY} onChange={(e) => setCorrMetricY(e.target.value)} style={S.select}>
                  {getNumericColumns(corrDataset).map((c) => <option key={c} value={c} style={{ color: '#0B1220', background: '#fff' }}>{c}</option>)}</select></div>
            </div>
            {corrCoeff !== null && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginTop: 20 }}>
                {[
                  { label: "Pearson r",   val: corrCoeff.toFixed(3), color: corrStrength.color },
                  { label: "Strength",    val: corrStrength.text,    color: corrStrength.color },
                  { label: "Data Points", val: String(corrData.length), color: "#E5E7EB" },
                ].map(({ label, val, color }) => (
                  <div key={label} style={S.statCard}>
                    <div style={{ fontSize: 11, fontWeight: 900, opacity: 0.65, textTransform: "uppercase" }}>{label}</div>
                    <div style={{ fontSize: 28, fontWeight: 950, color, marginTop: 4 }}>{val}</div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ ...S.insightBox, marginTop: 16 }}>
              {corrCoeff !== null
                ? `${corrStrength.text} ${corrCoeff >= 0 ? "positive" : "negative"} correlation between "${corrMetricX}" and "${corrMetricY}" (r = ${corrCoeff.toFixed(3)})`
                : "Select two numeric metrics to calculate Pearson correlation."}
            </div>
            <div style={{ height: 420, marginTop: 8 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="x" name={corrMetricX} tick={TICK} axisLine={{ stroke: "rgba(255,255,255,0.10)" }} tickLine={false} label={{ value: corrMetricX, position: "insideBottom", offset: -4, fill: "rgba(255,255,255,0.55)", fontSize: 11 }} />
                  <YAxis dataKey="y" name={corrMetricY} tick={TICK} axisLine={false} tickLine={false} label={{ value: corrMetricY, angle: -90, position: "insideLeft", fill: "rgba(255,255,255,0.55)", fontSize: 11 }} />
                  <Tooltip cursor={{ strokeDasharray: "3 3", stroke: "rgba(255,255,255,0.15)" }} contentStyle={{ background: "rgba(11,18,32,0.96)", border: "1px solid rgba(79,70,229,0.30)", borderRadius: 12, color: "#E5E7EB", fontSize: 13, fontWeight: 800 }} />
                  <Scatter name="Data Points" data={corrData} fill="#4F46E5" fillOpacity={0.75} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {mode === "forecast" && (
          <div style={S.card}>
            <div style={S.cardTitle}>🔮 AI Forecasting</div>
            <div style={S.cardSub}>Linear regression forecast + Groq AI insight for next 5 periods</div>
            <div style={{ display: "flex", gap: 16, marginTop: 18, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div><div style={S.label}>Dataset</div>
                <select value={forecastDataset} onChange={(e) => setForecastDataset(e.target.value)} style={S.select}>
                  {datasets.map((d) => <option key={d} value={d} style={{ color: '#0B1220', background: '#fff' }}>{d}</option>)}</select></div>
              <div><div style={S.label}>Metric</div>
                <select value={forecastMetric} onChange={(e) => setForecastMetric(e.target.value)} style={S.select}>
                  {getNumericColumns(forecastDataset).map((c) => <option key={c} value={c} style={{ color: '#0B1220', background: '#fff' }}>{c}</option>)}</select></div>
              <button onClick={generateForecast} disabled={forecastLoading} style={{ ...S.primaryBtn, opacity: forecastLoading ? 0.6 : 1 }}>
                {forecastLoading ? "⏳ Generating…" : "🔮 Generate Forecast"}
              </button>
            </div>
            {aiInsight && (
              <div style={{ ...S.insightBox, marginTop: 20, borderColor: "rgba(139,92,246,0.40)", background: "rgba(139,92,246,0.10)" }}>{aiInsight}</div>
            )}
            {forecastData.length > 0 && (
              <div style={{ display: "flex", gap: 20, marginTop: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,0.70)" }}>
                  <div style={{ width: 28, height: 3, background: "#4F46E5", borderRadius: 2 }} /> Historical
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,0.70)" }}>
                  <div style={{ width: 28, height: 3, background: "#EF4444", borderRadius: 2 }} /> Forecast (next 5)
                </div>
              </div>
            )}
            {forecastData.length > 0 && (
              <div style={{ height: 420, marginTop: 12 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={forecastData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="period" tick={TICK} axisLine={{ stroke: "rgba(255,255,255,0.10)" }} tickLine={false} />
                    <YAxis tick={TICK} axisLine={false} tickLine={false} />
                    <Tooltip content={<DarkTooltip />} />
                    <ReferenceLine x={forecastData.filter((d) => d.actual !== undefined).length} stroke="rgba(255,255,255,0.18)" strokeDasharray="4 4" label={{ value: "Forecast →", fill: "rgba(255,255,255,0.45)", fontSize: 11 }} />
                    <Line type="monotone" dataKey="actual"    name="Historical" stroke="#4F46E5" strokeWidth={3} dot={{ r: 5, fill: "#4F46E5", strokeWidth: 2, stroke: "#fff" }} connectNulls={false} />
                    <Line type="monotone" dataKey="predicted" name="Forecast"   stroke="#EF4444" strokeWidth={3} strokeDasharray="6 4" dot={{ r: 6, fill: "#EF4444", strokeWidth: 2, stroke: "#fff" }} connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            {forecastData.length === 0 && !forecastLoading && (
              <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, opacity: 0.50 }}>
                <div style={{ fontSize: 52 }}>🔮</div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>Click "Generate Forecast" to see predictions</div>
                <div style={{ fontSize: 13 }}>Linear regression + Groq AI insight</div>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}

const BG = "radial-gradient(1200px 650px at 18% 0%, rgba(79,70,229,0.22), transparent 60%), #0B1220";
const TICK = { fontSize: 11, fill: "rgba(255,255,255,0.60)" };

const S: Record<string, React.CSSProperties> = {
  header: { position: "sticky", top: 0, zIndex: 50, padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(11,18,32,0.92)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.08)" },
  logo: { width: 44, height: 44, borderRadius: 14, background: "linear-gradient(135deg, #4F46E5 0%, #EC4899 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 950, color: "#fff", fontSize: 14, boxShadow: "0 8px 20px rgba(79,70,229,0.35)" },
  navBtn: { padding: "10px 14px", borderRadius: 12, fontWeight: 900, fontSize: 13, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#E5E7EB", cursor: "pointer" },
  card: { background: "rgba(15,23,42,0.85)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 24, marginBottom: 20, backdropFilter: "blur(12px)", boxShadow: "0 16px 40px rgba(0,0,0,0.28)" },
  cardTitle: { fontSize: 20, fontWeight: 950, color: "#fff" },
  cardSub: { fontSize: 13, color: "rgba(255,255,255,0.55)", marginTop: 4, fontWeight: 700 },
  modeBtn: { padding: "12px 20px", borderRadius: 12, fontWeight: 900, fontSize: 14, cursor: "pointer", border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)", color: "#E5E7EB", transition: "all 0.2s" },
  modeBtnActive: { background: "rgba(79,70,229,0.20)", border: "2px solid rgba(79,70,229,0.60)", color: "#C7D2FE", boxShadow: "0 0 0 3px rgba(79,70,229,0.12)" },
  select: { padding: "10px 14px", borderRadius: 12, fontWeight: 800, outline: "none", cursor: "pointer", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#E5E7EB", minWidth: 200, fontSize: 13 },
  label: { fontSize: 11, fontWeight: 950, textTransform: "uppercase", letterSpacing: 0.8, opacity: 0.65, marginBottom: 6 },
  statCard: { background: "rgba(0,0,0,0.22)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "14px 16px" },
  insightBox: { padding: "12px 16px", borderRadius: 12, fontSize: 13, fontWeight: 800, lineHeight: 1.5, background: "rgba(79,70,229,0.10)", borderLeft: "3px solid #4F46E5", color: "rgba(255,255,255,0.90)" },
  primaryBtn: { padding: "12px 20px", borderRadius: 14, border: "none", background: "linear-gradient(135deg, #4F46E5 0%, #EC4899 100%)", color: "#fff", fontWeight: 950, fontSize: 14, cursor: "pointer", boxShadow: "0 8px 20px rgba(79,70,229,0.35)" },
};