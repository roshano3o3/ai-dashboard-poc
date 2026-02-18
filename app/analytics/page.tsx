"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createClient, type User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useTheme } from "../ThemeProvider";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY || "";

const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

const COLORS = ["#4F46E5", "#06B6D4", "#F59E0B", "#EF4444", "#10B981", "#8B5CF6"];

type UniversalRow = {
  id?: string;
  user_id?: string;
  dataset_name: string;
  column_names: string[] | null;
  row_data: Record<string, any> | null;
  created_at?: string;
};

type Mode = "trend" | "compare" | "correlation" | "forecast";

function isNil(v: any) {
  return v === null || v === undefined;
}

function toNum(v: any): number | null {
  if (isNil(v)) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState("");

  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");

  const [allData, setAllData] = useState<UniversalRow[]>([]);
  const [datasets, setDatasets] = useState<string[]>([]);

  const [mode, setMode] = useState<Mode>("trend");

  // Trend Analysis
  const [trendDataset, setTrendDataset] = useState("");
  const [trendMetric, setTrendMetric] = useState("");

  // Dataset Comparison
  const [compareDataset1, setCompareDataset1] = useState("");
  const [compareDataset2, setCompareDataset2] = useState("");
  const [compareMetric, setCompareMetric] = useState("");

  // Correlation
  const [corrDataset, setCorrDataset] = useState("");
  const [corrMetricX, setCorrMetricX] = useState("");
  const [corrMetricY, setCorrMetricY] = useState("");
  const [correlationCoefficient, setCorrelationCoefficient] = useState<number | null>(null);

  // Forecast
  const [forecastDataset, setForecastDataset] = useState("");
  const [forecastMetric, setForecastMetric] = useState("");
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastData, setForecastData] = useState<any[]>([]);
  const [aiInsight, setAiInsight] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        if (!supabase) {
          setFatalError("Missing Supabase env variables");
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.getUser();
        if (error) {
          setFatalError(`Auth error: ${error.message}`);
          setLoading(false);
          return;
        }

        const user = data.user as User | null;
        if (!user) {
          router.push("/auth");
          return;
        }

        setUserEmail(user.email || "");
        setUserId(user.id);

        const { data: records, error: dbErr } = await supabase
          .from("universal_data")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (dbErr) {
          setFatalError(`DB error: ${dbErr.message}`);
          setLoading(false);
          return;
        }

        const rows = (records || []) as UniversalRow[];
        setAllData(rows);

        const uniqueDatasets = Array.from(new Set(rows.map((r) => r.dataset_name))).filter(Boolean);
        setDatasets(uniqueDatasets);

        if (uniqueDatasets.length > 0) {
          setTrendDataset(uniqueDatasets[0]);
          setCompareDataset1(uniqueDatasets[0]);
          setCompareDataset2(uniqueDatasets[1] || uniqueDatasets[0]);
          setCorrDataset(uniqueDatasets[0]);
          setForecastDataset(uniqueDatasets[0]);
        }

        setLoading(false);
      } catch (e: any) {
        setFatalError(e?.message || "Unknown error");
        setLoading(false);
      }
    })();
  }, [router]);

  // Get numeric columns for a dataset
  const getNumericColumns = (datasetName: string) => {
    const filtered = allData.filter((r) => r.dataset_name === datasetName);
    if (!filtered.length) return [];

    const columnSet = new Set<string>();
    filtered.forEach((row) => {
      (row.column_names || []).forEach((col) => columnSet.add(String(col)));
    });

    const columns = Array.from(columnSet);
    const numericCols = columns.filter((col) => {
      let numericCount = 0;
      let totalCount = 0;

      filtered.forEach((row) => {
        const val = (row.row_data || {})[col];
        if (!isNil(val)) {
          totalCount++;
          if (toNum(val) !== null) numericCount++;
        }
      });

      return totalCount >= 5 && numericCount / Math.max(1, totalCount) > 0.8;
    });

    return numericCols;
  };

  // Auto-select first numeric column
  useEffect(() => {
    if (trendDataset && !trendMetric) {
      const cols = getNumericColumns(trendDataset);
      if (cols.length > 0) setTrendMetric(cols[0]);
    }
  }, [trendDataset]);

  useEffect(() => {
    if (compareDataset1 && !compareMetric) {
      const cols = getNumericColumns(compareDataset1);
      if (cols.length > 0) setCompareMetric(cols[0]);
    }
  }, [compareDataset1]);

  useEffect(() => {
    if (corrDataset) {
      const cols = getNumericColumns(corrDataset);
      if (!corrMetricX && cols.length > 0) setCorrMetricX(cols[0]);
      if (!corrMetricY && cols.length > 1) setCorrMetricY(cols[1]);
      if (!corrMetricY && cols.length === 1) setCorrMetricY(cols[0]);
    }
  }, [corrDataset]);

  useEffect(() => {
    if (forecastDataset && !forecastMetric) {
      const cols = getNumericColumns(forecastDataset);
      if (cols.length > 0) setForecastMetric(cols[0]);
    }
  }, [forecastDataset]);

  // TREND DATA
  const trendData = useMemo(() => {
    const filtered = allData.filter((r) => r.dataset_name === trendDataset);
    if (!trendMetric) return [];

    return filtered
      .map((row, index) => {
        const val = toNum((row.row_data || {})[trendMetric]);
        return val !== null ? { index: index + 1, value: val } : null;
      })
      .filter(Boolean) as { index: number; value: number }[];
  }, [allData, trendDataset, trendMetric]);

  const trendStats = useMemo(() => {
    if (!trendData.length) return { avg: 0, max: 0, min: 0, range: 0 };
    const values = trendData.map((d) => d.value);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    return { avg, max, min, range: max - min };
  }, [trendData]);

  // COMPARISON DATA
  const comparisonData = useMemo(() => {
    const data1 = allData.filter((r) => r.dataset_name === compareDataset1);
    const data2 = allData.filter((r) => r.dataset_name === compareDataset2);

    if (!compareMetric) return [];

    const values1 = data1
      .map((r) => toNum((r.row_data || {})[compareMetric]))
      .filter((v) => v !== null) as number[];
    const values2 = data2
      .map((r) => toNum((r.row_data || {})[compareMetric]))
      .filter((v) => v !== null) as number[];

    if (!values1.length || !values2.length) return [];

    const avg1 = values1.reduce((a, b) => a + b, 0) / values1.length;
    const avg2 = values2.reduce((a, b) => a + b, 0) / values2.length;

    return [
      { name: compareDataset1, value: avg1 },
      { name: compareDataset2, value: avg2 },
    ];
  }, [allData, compareDataset1, compareDataset2, compareMetric]);

  const comparisonInsight = useMemo(() => {
    if (comparisonData.length !== 2) return "";
    const diff = comparisonData[1].value - comparisonData[0].value;
    const percentDiff = ((diff / comparisonData[0].value) * 100).toFixed(1);
    
    if (diff > 0) {
      return `📈 ${compareDataset2} is ${percentDiff}% higher than ${compareDataset1}`;
    } else {
      return `📉 ${compareDataset2} is ${Math.abs(parseFloat(percentDiff))}% lower than ${compareDataset1}`;
    }
  }, [comparisonData, compareDataset1, compareDataset2]);

  // CORRELATION DATA
  const correlationData = useMemo(() => {
    const filtered = allData.filter((r) => r.dataset_name === corrDataset);
    if (!corrMetricX || !corrMetricY) return [];

    const pairs: { x: number; y: number }[] = [];
    filtered.forEach((row) => {
      const xVal = toNum((row.row_data || {})[corrMetricX]);
      const yVal = toNum((row.row_data || {})[corrMetricY]);
      if (xVal !== null && yVal !== null) {
        pairs.push({ x: xVal, y: yVal });
      }
    });

    return pairs;
  }, [allData, corrDataset, corrMetricX, corrMetricY]);

  // Calculate Pearson Correlation
  useEffect(() => {
    if (correlationData.length < 3) {
      setCorrelationCoefficient(null);
      return;
    }

    const n = correlationData.length;
    const sumX = correlationData.reduce((sum, p) => sum + p.x, 0);
    const sumY = correlationData.reduce((sum, p) => sum + p.y, 0);
    const sumXY = correlationData.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumX2 = correlationData.reduce((sum, p) => sum + p.x * p.x, 0);
    const sumY2 = correlationData.reduce((sum, p) => sum + p.y * p.y, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    if (denominator === 0) {
      setCorrelationCoefficient(null);
      return;
    }

    const r = numerator / denominator;
    setCorrelationCoefficient(r);
  }, [correlationData]);

  const correlationStrength = useMemo(() => {
    if (correlationCoefficient === null) return { text: "Unknown", color: "#6B7280" };
    const abs = Math.abs(correlationCoefficient);
    if (abs >= 0.7) return { text: "Strong", color: "#10B981" };
    if (abs >= 0.4) return { text: "Moderate", color: "#F59E0B" };
    return { text: "Weak", color: "#EF4444" };
  }, [correlationCoefficient]);

  // AI FORECAST
  const generateForecast = async () => {
    if (!forecastDataset || !forecastMetric) return;

    setForecastLoading(true);
    setForecastData([]);
    setAiInsight("");

    try {
      const filtered = allData.filter((r) => r.dataset_name === forecastDataset);
      const historicalValues = filtered
        .map((r, i) => {
          const val = toNum((r.row_data || {})[forecastMetric]);
          return val !== null ? { period: i + 1, value: val } : null;
        })
        .filter(Boolean) as { period: number; value: number }[];

      if (historicalValues.length < 3) {
        setAiInsight("⚠️ Not enough data for forecasting (need at least 3 records)");
        setForecastLoading(false);
        return;
      }

      // Simple linear forecast (can be replaced with AI)
      const avgChange =
        historicalValues.length > 1
          ? (historicalValues[historicalValues.length - 1].value - historicalValues[0].value) /
            (historicalValues.length - 1)
          : 0;

      const lastValue = historicalValues[historicalValues.length - 1].value;
      const predictions: { period: number; actual?: number; predicted?: number }[] = [];

      // Add historical data
      historicalValues.slice(-10).forEach((h) => {
        predictions.push({ period: h.period, actual: h.value });
      });

      // Add predictions
      for (let i = 1; i <= 5; i++) {
        predictions.push({
          period: historicalValues.length + i,
          predicted: lastValue + avgChange * i,
        });
      }

      setForecastData(predictions);

      // Try AI insight if Groq is available
      if (GROQ_API_KEY) {
        try {
          const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${GROQ_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              messages: [
                {
                  role: "system",
                  content: "You are a data analyst. Provide brief insights about forecast trends.",
                },
                {
                  role: "user",
                  content: `Historical values: ${historicalValues.map((h) => h.value).join(", ")}. Average change per period: ${avgChange.toFixed(2)}. Provide a 2-sentence insight.`,
                },
              ],
              max_tokens: 150,
            }),
          });

          const data = await response.json();
          const insight = data.choices?.[0]?.message?.content || "Forecast generated successfully.";
          setAiInsight(`🤖 ${insight}`);
        } catch (err) {
          setAiInsight("✅ Forecast generated using linear trend analysis.");
        }
      } else {
        setAiInsight("✅ Forecast generated using linear trend analysis.");
      }

      setForecastLoading(false);
    } catch (err) {
      console.error(err);
      setAiInsight("⚠️ Error generating forecast");
      setForecastLoading(false);
    }
  };

  const headerBg = theme === "dark" ? "rgba(11,18,32,0.86)" : "rgba(255,255,255,0.75)";
  const pageBg =
    theme === "dark"
      ? "radial-gradient(1200px 650px at 18% 0%, rgba(79,70,229,0.22), transparent 60%), #0B1220"
      : "linear-gradient(135deg, #f5f7ff 0%, #ffffff 55%, #f8f0ff 100%)";
  const text = theme === "dark" ? "#E5E7EB" : "#0B1220";

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: pageBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 950, color: text }}>Loading Analytics...</div>
      </div>
    );
  }

  if (fatalError) {
    return (
      <div style={{ minHeight: "100vh", background: pageBg, padding: 24 }}>
        <h2 style={{ color: text }}>Analytics Error</h2>
        <pre style={{ background: "rgba(0,0,0,0.1)", padding: 16, borderRadius: 12, color: text }}>
          {fatalError}
        </pre>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: pageBg,
        color: text,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          padding: "16px 20px",
          background: headerBg,
          backdropFilter: "blur(14px)",
          borderBottom:
            theme === "dark" ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(11,18,32,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: "linear-gradient(135deg, #4F46E5 0%, #EC4899 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 950,
              color: "#fff",
              boxShadow: "0 12px 28px rgba(79,70,229,0.35)",
            }}
          >
            R&K
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 950 }}>Advanced Analytics</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>{userEmail}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={toggleTheme} style={btn(theme)} title="Toggle theme">
            {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
          </button>
          <button onClick={() => router.push("/dashboard")} style={btn(theme)}>
            Dashboard
          </button>
          <button onClick={() => router.push("/data")} style={btn(theme)}>
            Tables
          </button>
          <button onClick={() => router.push("/upload")} style={{ ...btn(theme), ...btnPrimary }}>
            Upload
          </button>
        </div>
      </header>

      {/* Main */}
      <main style={{ maxWidth: 1400, margin: "0 auto", padding: "20px 20px 80px" }}>
        {/* Mode Selector */}
        <section style={card(theme)}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 950, marginBottom: 4 }}>Analytics Modes</div>
            <div style={{ fontSize: 13, opacity: 0.7 }}>Choose your analysis type</div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => setMode("trend")} style={modeBtn(theme, mode === "trend")}>
              📈 Trend Analysis
            </button>
            <button onClick={() => setMode("compare")} style={modeBtn(theme, mode === "compare")}>
              ⚖️ Dataset Comparison
            </button>
            <button onClick={() => setMode("correlation")} style={modeBtn(theme, mode === "correlation")}>
              🔗 Correlation Analysis
            </button>
            <button onClick={() => setMode("forecast")} style={modeBtn(theme, mode === "forecast")}>
              🔮 AI Forecasting
            </button>
          </div>
        </section>

        {/* TREND ANALYSIS */}
        {mode === "trend" && (
          <section style={card(theme)}>
            <div style={{ fontSize: 18, fontWeight: 950, marginBottom: 16 }}>📈 Trend Analysis</div>

            <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
              <div>
                <label style={label(theme)}>Dataset</label>
                <select value={trendDataset} onChange={(e) => setTrendDataset(e.target.value)} style={select(theme)}>
                  {datasets.map((d) => (
                    <option key={d} value={d} style={{ color: "#0B1220" }}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={label(theme)}>Metric</label>
                <select value={trendMetric} onChange={(e) => setTrendMetric(e.target.value)} style={select(theme)}>
                  {getNumericColumns(trendDataset).map((c) => (
                    <option key={c} value={c} style={{ color: "#0B1220" }}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Stats Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
              <div style={statCard(theme)}>
                <div style={{ fontSize: 11, fontWeight: 900, opacity: 0.7, textTransform: "uppercase" }}>Average</div>
                <div style={{ fontSize: 24, fontWeight: 950, color: "#4F46E5" }}>{trendStats.avg.toFixed(2)}</div>
              </div>
              <div style={statCard(theme)}>
                <div style={{ fontSize: 11, fontWeight: 900, opacity: 0.7, textTransform: "uppercase" }}>Maximum</div>
                <div style={{ fontSize: 24, fontWeight: 950, color: "#10B981" }}>{trendStats.max.toFixed(2)}</div>
              </div>
              <div style={statCard(theme)}>
                <div style={{ fontSize: 11, fontWeight: 900, opacity: 0.7, textTransform: "uppercase" }}>Minimum</div>
                <div style={{ fontSize: 24, fontWeight: 950, color: "#EF4444" }}>{trendStats.min.toFixed(2)}</div>
              </div>
              <div style={statCard(theme)}>
                <div style={{ fontSize: 11, fontWeight: 900, opacity: 0.7, textTransform: "uppercase" }}>Range</div>
                <div style={{ fontSize: 24, fontWeight: 950, color: "#F59E0B" }}>{trendStats.range.toFixed(2)}</div>
              </div>
            </div>

            {/* Line Chart */}
            <div style={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(11,18,32,0.08)"} />
                  <XAxis dataKey="index" tick={{ fontSize: 11, fill: theme === "dark" ? "rgba(255,255,255,0.7)" : "rgba(11,18,32,0.7)" }} />
                  <YAxis tick={{ fontSize: 11, fill: theme === "dark" ? "rgba(255,255,255,0.7)" : "rgba(11,18,32,0.7)" }} />
                  <Tooltip contentStyle={{ background: theme === "dark" ? "rgba(0,0,0,0.9)" : "#fff", border: "1px solid rgba(79,70,229,0.2)" }} />
                  <Line type="monotone" dataKey="value" stroke="#4F46E5" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Area Chart */}
            <div style={{ height: 300, marginTop: 20 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(11,18,32,0.08)"} />
                  <XAxis dataKey="index" tick={{ fontSize: 11, fill: theme === "dark" ? "rgba(255,255,255,0.7)" : "rgba(11,18,32,0.7)" }} />
                  <YAxis tick={{ fontSize: 11, fill: theme === "dark" ? "rgba(255,255,255,0.7)" : "rgba(11,18,32,0.7)" }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke="#06B6D4" fill="#06B6D4" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* DATASET COMPARISON */}
        {mode === "compare" && (
          <section style={card(theme)}>
            <div style={{ fontSize: 18, fontWeight: 950, marginBottom: 16 }}>⚖️ Dataset Comparison</div>

            <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
              <div>
                <label style={label(theme)}>Dataset 1</label>
                <select value={compareDataset1} onChange={(e) => setCompareDataset1(e.target.value)} style={select(theme)}>
                  {datasets.map((d) => (
                    <option key={d} value={d} style={{ color: "#0B1220" }}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={label(theme)}>Dataset 2</label>
                <select value={compareDataset2} onChange={(e) => setCompareDataset2(e.target.value)} style={select(theme)}>
                  {datasets.map((d) => (
                    <option key={d} value={d} style={{ color: "#0B1220" }}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={label(theme)}>Metric</label>
                <select value={compareMetric} onChange={(e) => setCompareMetric(e.target.value)} style={select(theme)}>
                  {getNumericColumns(compareDataset1).map((c) => (
                    <option key={c} value={c} style={{ color: "#0B1220" }}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Comparison Stats */}
            {comparisonData.length === 2 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, marginBottom: 16 }}>
                <div style={statCard(theme)}>
                  <div style={{ fontSize: 11, fontWeight: 900, opacity: 0.7 }}>{compareDataset1}</div>
                  <div style={{ fontSize: 28, fontWeight: 950, color: "#4F46E5" }}>{comparisonData[0].value.toFixed(2)}</div>
                </div>

                <div style={{ ...statCard(theme), display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 950 }}>vs</div>
                </div>

                <div style={statCard(theme)}>
                  <div style={{ fontSize: 11, fontWeight: 900, opacity: 0.7 }}>{compareDataset2}</div>
                  <div style={{ fontSize: 28, fontWeight: 950, color: "#06B6D4" }}>{comparisonData[1].value.toFixed(2)}</div>
                </div>
              </div>
            )}

            {/* Insight */}
            {comparisonInsight && (
              <div style={insightBox(theme)}>
                {comparisonInsight}
              </div>
            )}

            {/* Bar Chart */}
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(11,18,32,0.08)"} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: theme === "dark" ? "rgba(255,255,255,0.7)" : "rgba(11,18,32,0.7)" }} />
                  <YAxis tick={{ fontSize: 11, fill: theme === "dark" ? "rgba(255,255,255,0.7)" : "rgba(11,18,32,0.7)" }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#4F46E5" radius={[12, 12, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* CORRELATION ANALYSIS */}
        {mode === "correlation" && (
          <section style={card(theme)}>
            <div style={{ fontSize: 18, fontWeight: 950, marginBottom: 16 }}>🔗 Correlation Analysis</div>

            <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
              <div>
                <label style={label(theme)}>Dataset</label>
                <select value={corrDataset} onChange={(e) => setCorrDataset(e.target.value)} style={select(theme)}>
                  {datasets.map((d) => (
                    <option key={d} value={d} style={{ color: "#0B1220" }}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={label(theme)}>X-Axis</label>
                <select value={corrMetricX} onChange={(e) => setCorrMetricX(e.target.value)} style={select(theme)}>
                  {getNumericColumns(corrDataset).map((c) => (
                    <option key={c} value={c} style={{ color: "#0B1220" }}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={label(theme)}>Y-Axis</label>
                <select value={corrMetricY} onChange={(e) => setCorrMetricY(e.target.value)} style={select(theme)}>
                  {getNumericColumns(corrDataset).map((c) => (
                    <option key={c} value={c} style={{ color: "#0B1220" }}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Correlation Result */}
            {correlationCoefficient !== null && (
              <div style={{ ...statCard(theme), marginBottom: 16, textAlign: "center" }}>
                <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.7, textTransform: "uppercase" }}>
                  Pearson Correlation Coefficient
                </div>
                <div style={{ fontSize: 48, fontWeight: 950, color: correlationStrength.color }}>
                  {correlationCoefficient.toFixed(3)}
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, marginTop: 8, color: correlationStrength.color }}>
                  {correlationStrength.text} Correlation
                </div>
              </div>
            )}

            {/* Scatter Plot */}
            <div style={{ height: 450 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(11,18,32,0.08)"} />
                  <XAxis dataKey="x" name={corrMetricX} tick={{ fontSize: 11, fill: theme === "dark" ? "rgba(255,255,255,0.7)" : "rgba(11,18,32,0.7)" }} />
                  <YAxis dataKey="y" name={corrMetricY} tick={{ fontSize: 11, fill: theme === "dark" ? "rgba(255,255,255,0.7)" : "rgba(11,18,32,0.7)" }} />
                  <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                  <Scatter name="Data Points" data={correlationData} fill="#4F46E5" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* AI FORECASTING */}
        {mode === "forecast" && (
          <section style={card(theme)}>
            <div style={{ fontSize: 18, fontWeight: 950, marginBottom: 16 }}>🔮 AI Forecasting</div>

            <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
              <div>
                <label style={label(theme)}>Dataset</label>
                <select value={forecastDataset} onChange={(e) => setForecastDataset(e.target.value)} style={select(theme)}>
                  {datasets.map((d) => (
                    <option key={d} value={d} style={{ color: "#0B1220" }}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={label(theme)}>Metric</label>
                <select value={forecastMetric} onChange={(e) => setForecastMetric(e.target.value)} style={select(theme)}>
                  {getNumericColumns(forecastDataset).map((c) => (
                    <option key={c} value={c} style={{ color: "#0B1220" }}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <button onClick={generateForecast} disabled={forecastLoading} style={{ ...btn(theme), ...btnPrimary, marginTop: 20 }}>
                {forecastLoading ? "Generating..." : "🔮 Generate Forecast"}
              </button>
            </div>

            {/* AI Insight */}
            {aiInsight && (
              <div style={insightBox(theme)}>
                {aiInsight}
              </div>
            )}

            {/* Forecast Chart */}
            {forecastData.length > 0 && (
              <div style={{ height: 400, marginTop: 16 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={forecastData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(11,18,32,0.08)"} />
                    <XAxis dataKey="period" tick={{ fontSize: 11, fill: theme === "dark" ? "rgba(255,255,255,0.7)" : "rgba(11,18,32,0.7)" }} />
                    <YAxis tick={{ fontSize: 11, fill: theme === "dark" ? "rgba(255,255,255,0.7)" : "rgba(11,18,32,0.7)" }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="actual" stroke="#4F46E5" strokeWidth={3} dot={{ r: 5 }} name="Historical" />
                    <Line type="monotone" dataKey="predicted" stroke="#EF4444" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 5 }} name="Forecast" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

// UI Helper Functions
function btn(theme: "dark" | "light"): React.CSSProperties {
  return {
    padding: "10px 14px",
    borderRadius: 12,
    fontWeight: 900,
    fontSize: 13,
    border: theme === "dark" ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(11,18,32,0.15)",
    background: theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.85)",
    color: theme === "dark" ? "#E5E7EB" : "#0B1220",
    cursor: "pointer",
    transition: "all 0.2s",
  };
}

const btnPrimary: React.CSSProperties = {
  background: "linear-gradient(135deg, #4F46E5 0%, #EC4899 100%)",
  border: "none",
  color: "#fff",
  boxShadow: "0 12px 24px rgba(79,70,229,0.25)",
};

function card(theme: "dark" | "light"): React.CSSProperties {
  return {
    background: theme === "dark" ? "rgba(15,23,42,0.85)" : "rgba(255,255,255,0.85)",
    border: theme === "dark" ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(11,18,32,0.10)",
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    boxShadow: theme === "dark" ? "0 10px 30px rgba(0,0,0,0.25)" : "0 10px 30px rgba(11,18,32,0.10)",
    backdropFilter: "blur(10px)",
  };
}

function modeBtn(theme: "dark" | "light", active: boolean): React.CSSProperties {
  return {
    padding: "12px 18px",
    borderRadius: 12,
    fontWeight: 900,
    fontSize: 14,
    border: active
      ? "2px solid #4F46E5"
      : theme === "dark"
      ? "1px solid rgba(255,255,255,0.12)"
      : "1px solid rgba(11,18,32,0.15)",
    background: active
      ? "rgba(79,70,229,0.15)"
      : theme === "dark"
      ? "rgba(255,255,255,0.04)"
      : "rgba(255,255,255,0.6)",
    color: theme === "dark" ? "#E5E7EB" : "#0B1220",
    cursor: "pointer",
    transition: "all 0.2s",
  };
}

function select(theme: "dark" | "light"): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 12,
    border: theme === "dark" ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(11,18,32,0.15)",
    background: theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.90)",
    color: theme === "dark" ? "#E5E7EB" : "#0B1220",
    fontWeight: 800,
    outline: "none",
    cursor: "pointer",
    minWidth: 200,
  };
}

function label(theme: "dark" | "light"): React.CSSProperties {
  return {
    fontSize: 11,
    fontWeight: 950,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    opacity: 0.7,
    marginBottom: 6,
    display: "block",
  };
}

function statCard(theme: "dark" | "light"): React.CSSProperties {
  return {
    background: theme === "dark" ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.7)",
    border: theme === "dark" ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(11,18,32,0.10)",
    borderRadius: 14,
    padding: 16,
  };
}

function insightBox(theme: "dark" | "light"): React.CSSProperties {
  return {
    background: theme === "dark" ? "rgba(79,70,229,0.12)" : "rgba(79,70,229,0.08)",
    border: theme === "dark" ? "1px solid rgba(79,70,229,0.25)" : "1px solid rgba(79,70,229,0.20)",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    fontSize: 14,
    fontWeight: 700,
    color: theme === "dark" ? "#E5E7EB" : "#0B1220",
  };
}