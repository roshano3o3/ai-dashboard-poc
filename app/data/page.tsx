"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient, type User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import ExportButton from "../dashboard/ExportButton";
import AIInsights from "../dashboard/AIInsights";
import { GaugeChart, HeatmapChart, FunnelChartComponent, RadarChartComponent, TreemapChart } from "../dashboard/AdvancedCharts";

import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { GaugeChart, HeatmapChart, FunnelChartComponent, RadarChartComponent, TreemapChart } from "./AdvancedCharts";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY || "";

const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

const COLORS = ["#4F46E5", "#06B6D4", "#F59E0B", "#EF4444", "#10B981", "#8B5CF6", "#F97316", "#14B8A6"];

type UniversalRow = {
  id?: string;
  user_id?: string;
  dataset_name: string;
  column_names: string[] | null;
  row_data: Record<string, any> | null;
  created_at?: string;
};

type KPI = {
  id: string;
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color: string;
};

type ChartSpec = {
  id: string;
  type: "pie" | "bar" | "line" | "donut" | "heatmap" | "gauge" | "funnel" | "radar" | "treemap";
  title: string;
  subtitle: string;
  data: { name: string; value: number }[];
  insight: string;
  detailedInsight: string;
};

type Insight = {
  icon: string;
  title: string;
  text: string;
  details: string;
  recommendation?: string;
};

type DashboardResult = {
  kpis: KPI[];
  charts: ChartSpec[];
  insights: Insight[];
  findings: string[];
  summary: string;
  executive?: {
    takeaway: string;
    risk: string;
    action: string;
    confidence: "Low" | "Medium" | "High";
  };
};

type ChatMessage = { role: "user" | "assistant"; content: string; time: string };
type FilterState = { [columnName: string]: string };
type Toast = { id: string; message: string; kind: "info" | "success" | "warning" | "error" };

function isNil(v: any) {
  return v === null || v === undefined;
}
function toNum(v: any): number | null {
  if (isNil(v)) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}
function safeLabel(s: any, max = 20) {
  const str = String(s ?? "").trim();
  if (!str) return "Unknown";
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}
function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}
function pct(part: number, total: number) {
  if (!total) return "0%";
  return `${((part / total) * 100).toFixed(1)}%`;
}

export default function DashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState<string>("");

  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState<string>("");

  const [showDashboard, setShowDashboard] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardResult | null>(null);

  const [allData, setAllData] = useState<UniversalRow[]>([]);
  const [selectedDataset, setSelectedDataset] = useState("");
  const [availableDatasets, setAvailableDatasets] = useState<string[]>([]);

  const [filters, setFilters] = useState<FilterState>({});
  const [availableFilters, setAvailableFilters] = useState<{ [column: string]: string[] }>({});

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UniversalRow[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [chartTypes, setChartTypes] = useState<{ [chartId: string]: "pie" | "bar" | "line" | "donut" | "heatmap" | "gauge" | "funnel" | "radar" | "treemap" }>({});
  const [expandedSegments, setExpandedSegments] = useState<{ [chartId: string]: boolean }>({});

  const datasetCache = useRef(new Map<string, { data: UniversalRow[]; filters: { [col: string]: string[] } }>());
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const pushToast = useCallback((message: string, kind: Toast["kind"] = "info") => {
    const id = uid();
    setToasts((prev) => [...prev, { id, message, kind }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200);
  }, []);

  useEffect(() => {
    if (!chatOpen) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatOpen, messages]);

  const extractFilters = useCallback((data: UniversalRow[]) => {
    const filterOptions: { [col: string]: Set<string> } = {};
    for (const row of data) {
      const rd = row.row_data || {};
      for (const col in rd) {
        const val = rd[col];
        if (isNil(val)) continue;
        const valStr = String(val);
        if (!filterOptions[col]) filterOptions[col] = new Set();
        if (filterOptions[col].size < 50) filterOptions[col].add(valStr);
      }
    }

    const result: { [col: string]: string[] } = {};
    for (const col in filterOptions) {
      const values = Array.from(filterOptions[col]);
      if (values.length >= 2 && values.length <= 20) {
        const allNumeric = values.every((v) => !isNaN(parseFloat(v)));
        if (!allNumeric) result[col] = values.sort();
      }
    }
    return result;
  }, []);

  const applyFilters = useCallback((data: UniversalRow[], filterState: FilterState): UniversalRow[] => {
    if (Object.keys(filterState).length === 0) return data;
    return data.filter((row) => {
      const rd = row.row_data || {};
      for (const col in filterState) {
        const filterValue = filterState[col];
        if (filterValue === "All") continue;
        const rowValue = String(rd[col] ?? "");
        if (rowValue !== filterValue) return false;
      }
      return true;
    });
  }, []);

  const performSearch = useCallback((query: string, data: UniversalRow[]) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const lowerQuery = query.toLowerCase().trim();

    const results = data.filter((row) => {
      const rd = row.row_data || {};
      for (const key in rd) {
        const value = String(rd[key] ?? "").toLowerCase();
        if (value.includes(lowerQuery)) return true;
      }
      if (row.dataset_name.toLowerCase().includes(lowerQuery)) return true;
      return false;
    });

    setSearchResults(results);
    pushToast(`Found ${results.length} result${results.length !== 1 ? 's' : ''}`, "info");
  }, [pushToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        const datasetRows = allData.filter((r) => r.dataset_name === selectedDataset);
        performSearch(searchQuery, datasetRows);
      } else {
        setSearchResults([]);
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, allData, selectedDataset, performSearch]);

  const generateDashboard = useMemo(() => {
    return (data: UniversalRow[], filterState: FilterState): DashboardResult => {
      const filtered = applyFilters(data, filterState);
      const totalRecords = filtered.length;

      const colSet = new Set<string>();
      for (const row of filtered) {
        const cols = row.column_names || [];
        for (const c of cols) colSet.add(String(c));
      }
      const columns = Array.from(colSet);

      type ColProfile = {
        name: string;
        totalCount: number;
        numericCount: number;
        numericSum: number;
        numericMax: number;
        numericMin: number;
        uniques: Map<string, number>;
      };

      const MAX_UNIQUES_TRACKED = 200;
      const profiles: ColProfile[] = columns.map((name) => ({
        name,
        totalCount: 0,
        numericCount: 0,
        numericSum: 0,
        numericMax: Number.NEGATIVE_INFINITY,
        numericMin: Number.POSITIVE_INFINITY,
        uniques: new Map(),
      }));

      const pIndex = new Map<string, ColProfile>();
      profiles.forEach((p) => pIndex.set(p.name, p));

      for (const row of filtered) {
        const rd = row.row_data || {};
        for (const col of columns) {
          const v = rd[col];
          if (isNil(v)) continue;
          const prof = pIndex.get(col)!;
          prof.totalCount++;

          const n = toNum(v);
          if (n !== null) {
            prof.numericCount++;
            prof.numericSum += n;
            if (n > prof.numericMax) prof.numericMax = n;
            if (n < prof.numericMin) prof.numericMin = n;
          }

          if (prof.uniques.size < MAX_UNIQUES_TRACKED) {
            const key = safeLabel(v, 60);
            prof.uniques.set(key, (prof.uniques.get(key) || 0) + 1);
          }
        }
      }

      const columnAnalysis = profiles.map((p) => {
        const uniqueCountObserved = p.uniques.size;
        const isNumeric = p.numericCount > 0 && p.numericCount / Math.max(1, p.totalCount) > 0.9;
        const isCategorical = !isNumeric && uniqueCountObserved >= 2 && uniqueCountObserved <= 12;
        return {
          name: p.name,
          totalCount: p.totalCount,
          numericCount: p.numericCount,
          numericSum: p.numericSum,
          numericMax: p.numericMax,
          numericMin: p.numericMin,
          uniqueCount: uniqueCountObserved,
          uniques: p.uniques,
          isNumeric,
          isCategorical,
        };
      });

      const kpis: KPI[] = [
        { id: "total", title: "Total Records", value: totalRecords, icon: "📊", color: "#4F46E5" },
        { id: "columns", title: "Data Fields", value: columns.length, icon: "🧾", color: "#06B6D4" },
      ];

      const numericCols = columnAnalysis.filter((c) => c.isNumeric && c.numericCount >= 5).sort((a, b) => b.numericCount - a.numericCount);

      numericCols.slice(0, 2).forEach((c) => {
        const avg = c.numericCount > 0 ? c.numericSum / c.numericCount : Number.NaN;
        kpis.push({
          id: `avg-${c.name}`,
          title: `Avg ${c.name}`,
          value: Number.isFinite(avg) ? avg.toFixed(2) : "—",
          subtitle: Number.isFinite(c.numericMin) && Number.isFinite(c.numericMax) ? `Range: ${c.numericMin.toFixed(1)} - ${c.numericMax.toFixed(1)}` : undefined,
          icon: "📈",
          color: "#F59E0B",
        });
      });

      const charts: ChartSpec[] = [];
      const categoricalCols = columnAnalysis.filter((c) => c.isCategorical && c.uniqueCount >= 2).slice(0, 4);

      for (const c of categoricalCols) {
        const entries = Array.from(c.uniques.entries())
          .map(([name, value]) => ({ name: safeLabel(name, 22), value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 10);

        if (entries.length >= 2) {
          const top = entries[0];
          const denom = Math.max(1, c.totalCount);
          const topPercent = ((top.value / denom) * 100).toFixed(1);

          charts.push({
            id: `chart-${c.name}`,
            type: "donut",
            title: `${c.name} Distribution`,
            subtitle: `${c.uniqueCount} categories analyzed`,
            data: entries,
            insight: `${top.name} leads with ${top.value} (${topPercent}%)`,
            detailedInsight: `${top.name} is currently leading at ${topPercent}%. Validate across filters.`,
          });
        }
      }

      const confidence: "Low" | "Medium" | "High" = totalRecords < 50 ? "Low" : totalRecords < 200 ? "Medium" : "High";
      const takeaway = charts.length > 0 ? `${charts[0].title}: "${charts[0].data[0]?.name}" is the leading segment.` : `Dataset has ${totalRecords} rows across ${columns.length} fields.`;
      const riskParts: string[] = [];
      if (totalRecords < 50) riskParts.push(`Small sample size (${totalRecords} rows).`);
      if (Object.keys(filterState).length > 0) riskParts.push(`Filters applied (${Object.keys(filterState).length}).`);
      const risk = riskParts.length ? riskParts.join(" ") : "No obvious anomaly detected.";
      const action = confidence === "Low" ? "Collect more rows (target 50–200) then re-check stability." : "Use filters to validate whether the leading segment holds across subsets.";

      const insights: Insight[] = [
        {
          icon: "📊",
          title: "Data Overview",
          text: `Showing ${totalRecords} records across ${columns.length} fields.`,
          details: `This dataset includes ${totalRecords} rows and ${columns.length} detected fields.`,
          recommendation: confidence === "Low" ? "Upload more data for stronger conclusions." : "Good data volume for analysis.",
        },
      ];

      const findings: string[] = [];
      if (charts[0]?.data?.[0]) findings.push(`${charts[0].data[0].name} is dominant in ${charts[0].title}.`);

      return {
        kpis,
        charts,
        insights,
        findings,
        summary: `${totalRecords} records analyzed with ${charts.length} visualization(s)`,
        executive: { takeaway, risk, action, confidence },
      };
    };
  }, [applyFilters]);

  const fetchData = useCallback(async () => {
    if (!supabase || !userId) return;

    setIsRefreshing(true);
    try {
      const { data: records, error: dbErr } = await supabase
        .from("universal_data")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (dbErr) {
        console.error("Fetch error:", dbErr);
        setIsRefreshing(false);
        return;
      }

      const rows = (records || []) as UniversalRow[];

      if (rows.length === 0) {
        setShowDashboard(false);
        setAllData([]);
        setIsRefreshing(false);
        return;
      }

      setAllData(rows);
      setLastUpdate(new Date());

      const datasets = Array.from(new Set(rows.map((r) => r.dataset_name))).filter(Boolean);
      setAvailableDatasets(datasets);

      if (selectedDataset) {
        const datasetRows = rows.filter((r) => r.dataset_name === selectedDataset);
        const datasetFilters = extractFilters(datasetRows);

        datasetCache.current.set(selectedDataset, { data: datasetRows, filters: datasetFilters });
        setAvailableFilters(datasetFilters);

        const result = generateDashboard(datasetRows, filters);
        setDashboardData(result);
      }

      setIsRefreshing(false);
    } catch (e: any) {
      console.error("Real-time fetch error:", e);
      setIsRefreshing(false);
    }
  }, [userId, selectedDataset, filters, extractFilters, generateDashboard]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        if (!supabase) {
          setFatalError("Missing Supabase env. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local then restart dev server.");
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

        const { data: records, error: dbErr } = await supabase.from("universal_data").select("*").eq("user_id", user.id).order("created_at", { ascending: false });

        if (dbErr) {
          setFatalError(`DB error: ${dbErr.message}`);
          setLoading(false);
          return;
        }

        const rows = (records || []) as UniversalRow[];
        if (rows.length === 0) {
          setShowDashboard(false);
          setMessages([{ role: "assistant", content: '👋 Welcome! Upload your first dataset to get started.', time: new Date().toLocaleTimeString() }]);
          pushToast('Welcome! Click "Upload" to begin.', "info");
          setLoading(false);
          return;
        }

        setAllData(rows);

        const datasets = Array.from(new Set(rows.map((r) => r.dataset_name))).filter(Boolean);
        setAvailableDatasets(datasets);

        const latest = rows[0].dataset_name;
        setSelectedDataset(latest);

        const datasetRows = rows.filter((r) => r.dataset_name === latest);
        const datasetFilters = extractFilters(datasetRows);

        datasetCache.current.set(latest, { data: datasetRows, filters: datasetFilters });
        setAvailableFilters(datasetFilters);

        const result = generateDashboard(datasetRows, {});
        setDashboardData(result);

        setMessages([{ role: "assistant", content: `🎉 Dashboard ready for "${latest}". Real-time updates enabled!`, time: new Date().toLocaleTimeString() }]);

        pushToast(`Dashboard ready: ${latest}`, "success");
        setLoading(false);
      } catch (e: any) {
        setFatalError(e?.message || "Unknown error");
        setLoading(false);
      }
    })();
  }, [router, pushToast, extractFilters, generateDashboard]);

  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(() => fetchData(), 30000);
    return () => clearInterval(interval);
  }, [userId, fetchData]);

  useEffect(() => {
    if (!supabase || !userId) return;

    const channel = supabase
      .channel("universal_data_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "universal_data", filter: `user_id=eq.${userId}` }, (payload) => {
        console.log("🔔 Real-time change detected:", payload);
        fetchData();
        pushToast("📊 Data updated!", "info");
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchData, pushToast]);

  const switchDataset = useCallback(
    (datasetName: string) => {
      setSelectedDataset(datasetName);
      setFilters({});
      setExpandedSegments({});
      setChartTypes({});
      setSearchQuery("");
      setSearchResults([]);
      setIsSearching(false);

      let datasetRows: UniversalRow[];
      let datasetFilters: { [col: string]: string[] };

      if (datasetCache.current.has(datasetName)) {
        const cached = datasetCache.current.get(datasetName)!;
        datasetRows = cached.data;
        datasetFilters = cached.filters;
      } else {
        datasetRows = allData.filter((r) => r.dataset_name === datasetName);
        datasetFilters = extractFilters(datasetRows);
        datasetCache.current.set(datasetName, { data: datasetRows, filters: datasetFilters });
      }

      setAvailableFilters(datasetFilters);
      const result = generateDashboard(datasetRows, {});
      setDashboardData(result);

      setMessages((prev) => [...prev, { role: "assistant", content: `✅ Switched to "${datasetName}". Ask AI anything.`, time: new Date().toLocaleTimeString() }]);
      pushToast(`Switched: ${datasetName}`, "info");
    },
    [allData, extractFilters, generateDashboard, pushToast]
  );

  const handleFilterChange = useCallback(
    (column: string, value: string) => {
      const next = { ...filters };
      if (value === "All") delete next[column];
      else next[column] = value;

      setFilters(next);

      const datasetRows = allData.filter((r) => r.dataset_name === selectedDataset);
      const result = generateDashboard(datasetRows, next);
      setDashboardData(result);
      pushToast(`Filter: ${column} = ${value}`, "info");
    },
    [filters, allData, selectedDataset, generateDashboard, pushToast]
  );

  const clearAllFilters = useCallback(() => {
    setFilters({});
    const datasetRows = allData.filter((r) => r.dataset_name === selectedDataset);
    const result = generateDashboard(datasetRows, {});
    setDashboardData(result);
    pushToast("Filters cleared", "info");
  }, [allData, selectedDataset, generateDashboard, pushToast]);

  const handleLogout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.push("/auth");
  };

  const callAI = async (q: string) => {
    if (!GROQ_API_KEY) return "⚠️ GROQ key missing. Add NEXT_PUBLIC_GROQ_API_KEY in .env.local.";

    try {
      let dataContext = "";
      if (selectedDataset && dashboardData && allData.length > 0) {
        const datasetRows = allData.filter((r) => r.dataset_name === selectedDataset);

        const allColumns = new Set<string>();
        datasetRows.forEach((item) => (item.column_names || []).forEach((col) => allColumns.add(String(col))));
        const columns = Array.from(allColumns);

        const sampleData = datasetRows.slice(0, 10).map((r) => r.row_data);

        dataContext = `
CURRENT DATASET: "${selectedDataset}"
Total Records: ${datasetRows.length}
Columns: ${columns.join(", ")}

SAMPLE DATA (first 10 rows):
${JSON.stringify(sampleData, null, 2)}

DASHBOARD KPIs:
${dashboardData.kpis.map((kpi) => `${kpi.title}: ${kpi.value}${kpi.subtitle ? " (" + kpi.subtitle + ")" : ""}`).join("\n")}

CURRENT FILTERS: ${Object.keys(filters).length > 0 ? Object.entries(filters).map(([k, v]) => `${k}=${v}`).join(", ") : "None"}
`;
      }

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: `You are a professional data analyst. Be specific and actionable.\n\n${dataContext}` },
            { role: "user", content: q },
          ],
          max_tokens: 700,
          temperature: 0.7,
        }),
      });

      if (!response.ok) return "⚠️ AI service unavailable. Please try again.";
      const data = await response.json();
      return data.choices?.[0]?.message?.content || "No response from AI.";
    } catch (err) {
      console.error(err);
      return "⚠️ Error connecting to AI service.";
    }
  };

  const handleSend = async () => {
    if (!input.trim() || chatLoading) return;
    const question = input.trim();
    setInput("");
    setChatLoading(true);

    setMessages((prev) => [...prev, { role: "user", content: question, time: new Date().toLocaleTimeString() }]);
    const ai = await callAI(question);
    setMessages((prev) => [...prev, { role: "assistant", content: ai, time: new Date().toLocaleTimeString() }]);

    setChatLoading(false);
  };

  const askAIAboutChart = (chart: ChartSpec) => {
    const top = [...chart.data].sort((a, b) => b.value - a.value)[0];
    const prompt = `Explain this chart: "${chart.title}". Top segment is "${top?.name}" with ${top?.value}. Why is it leading? Does it still lead if I change filters? Suggest 2 filters to validate the pattern.`;
    setChatOpen(true);
    setInput(prompt);
    pushToast("AI prompt prepared for this chart ✅", "success");
  };

  const selectedDatasetRows = allData.filter((r) => r.dataset_name === selectedDataset);
  const dataToDisplay = isSearching && searchQuery ? searchResults : selectedDatasetRows;
  const selectedDatasetRowsFiltered = applyFilters(dataToDisplay, filters);
  const filteredCount = selectedDatasetRowsFiltered.length || 0;

  if (loading) {
    return (
      <div style={ui.loadingPage}>
        <div style={ui.loadingCard}>
          <div style={{ fontSize: 28, fontWeight: 950 }}>Loading dashboard…</div>
          <div style={{ marginTop: 8, color: "rgba(255,255,255,0.7)" }}>Preparing your data experience</div>
        </div>
      </div>
    );
  }

  if (fatalError) {
    return (
      <div style={ui.errorPage}>
        <h2 style={{ marginTop: 0 }}>Dashboard Error</h2>
        <pre style={ui.errorPre}>{fatalError}</pre>
        <div style={{ marginTop: 12, color: "#9CA3AF" }}>
          Fix env, then restart: <b>npm run dev</b>
        </div>
      </div>
    );
  }

  // 🆕 WELCOME SCREEN for new users
  if (!showDashboard || allData.length === 0) {
    return (
      <div style={ui.welcomePage}>
        <div style={ui.welcomeCard}>
          <div style={ui.welcomeLogo}>R&K</div>
          
          <div style={ui.welcomeTitle}>Welcome to R&K Analytics Dashboard</div>
          <div style={ui.welcomeSubtitle}>AI-Powered Business Intelligence Platform</div>

          <div style={ui.welcomeFeatures}>
            <div style={ui.featureBox}>
              <div style={ui.featureIcon}>📊</div>
              <div style={ui.featureTitle}>Smart Dashboards</div>
              <div style={ui.featureText}>Automatic visualization of your data with 8 chart types</div>
            </div>

            <div style={ui.featureBox}>
              <div style={ui.featureIcon}>🤖</div>
              <div style={ui.featureTitle}>AI Assistant</div>
              <div style={ui.featureText}>Ask questions in plain English, get instant insights</div>
            </div>

            <div style={ui.featureBox}>
              <div style={ui.featureIcon}>📈</div>
              <div style={ui.featureTitle}>Advanced Analytics</div>
              <div style={ui.featureText}>Trends, comparisons, correlations, and AI forecasting</div>
            </div>

            <div style={ui.featureBox}>
              <div style={ui.featureIcon}>📤</div>
              <div style={ui.featureTitle}>Professional Exports</div>
              <div style={ui.featureText}>Generate PDFs, Excel, and CSV reports instantly</div>
            </div>
          </div>

          <button onClick={() => router.push("/upload")} style={ui.welcomeCTA}>
            ⬆️ Upload Your First Dataset
          </button>

          <div style={ui.welcomeActions}>
            <button onClick={() => router.push("/analytics")} style={ui.welcomeSecondary}>
              📈 View Analytics
            </button>
            <button onClick={() => router.push("/data")} style={ui.welcomeSecondary}>
              📋 Data Tables
            </button>
            <button onClick={handleLogout} style={ui.welcomeSecondary}>
              🚪 Logout
            </button>
          </div>

          <div style={ui.welcomeFooter}>
            <div style={ui.welcomeEmail}>{userEmail}</div>
            <div style={ui.welcomeHint}>Upload CSV or Excel files to get started</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={ui.page} id="export-area">
      {/* 🆕 REDESIGNED HEADER with BIG ICONS */}
      <header style={ui.topbar}>
        <div style={ui.brand}>
          <div style={ui.logo}>R&K</div>
          <div>
            <div style={ui.brandTitle}>R&K Analytics</div>
            <div style={ui.brandSub}>{userEmail}</div>
          </div>
        </div>

        <div style={ui.topbarCenter}>
          <button onClick={() => {}} style={ui.navIcon} title="Dashboard">
            <div style={ui.navIconCircle}>📊</div>
            <div style={ui.navIconLabel}>Dashboard</div>
          </button>

          <button onClick={() => router.push("/analytics")} style={ui.navIcon} title="Analytics">
            <div style={ui.navIconCircle}>📈</div>
            <div style={ui.navIconLabel}>Analytics</div>
          </button>

          <button onClick={() => router.push("/data")} style={ui.navIcon} title="Tables">
            <div style={ui.navIconCircle}>📋</div>
            <div style={ui.navIconLabel}>Tables</div>
          </button>

          <button onClick={() => router.push("/upload")} style={ui.navIcon} title="Upload">
            <div style={ui.navIconCircle}>⬆️</div>
            <div style={ui.navIconLabel}>Upload</div>
          </button>
        </div>

        <div style={ui.topbarRight}>
          <div style={ui.refreshBadge}>
            {isRefreshing ? (
              <>🔄 Updating...</>
            ) : (
              <>
                ✅ Live • {lastUpdate.toLocaleTimeString()}
                <button onClick={fetchData} style={ui.refreshBtn} title="Refresh now">
                  🔄
                </button>
              </>
            )}
          </div>

          <ExportButton selectedDataset={selectedDataset} allData={allData} dashboardData={dashboardData} onMessage={(msg) => pushToast(msg, "success")} />

          <button onClick={handleLogout} style={ui.btnLogout}>
            Logout
          </button>
        </div>
      </header>

      <div style={{ display: "flex", height: "calc(100vh - 90px)" }}>
        {/* Main Content */}
        <main style={ui.main}>
          {/* Search Bar */}
          <section style={ui.searchSection}>
            <div style={ui.searchWrapper}>
              <div style={ui.searchIcon}>🔍</div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search across all data fields..."
                style={ui.searchInput}
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                    setIsSearching(false);
                  }}
                  style={ui.searchClear}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {isSearching && searchQuery && (
              <div style={ui.searchResultsBadge}>
                {searchResults.length > 0 ? (
                  <>
                    ✅ Found <strong>{searchResults.length}</strong> result{searchResults.length !== 1 ? "s" : ""} for "{searchQuery}"
                  </>
                ) : (
                  <>⚠️ No results found for "{searchQuery}"</>
                )}
              </div>
            )}
          </section>

          {/* Dataset Selector */}
          <section style={ui.datasetBar}>
            <div style={ui.datasetLabel}>Current Dataset:</div>
            <select value={selectedDataset} onChange={(e) => switchDataset(e.target.value)} style={ui.datasetSelect}>
              {availableDatasets.map((ds) => (
                <option key={ds} value={ds}>
                  {ds}
                </option>
              ))}
            </select>
            <div style={ui.countPill}>
              Showing <b>{filteredCount}</b> records
            </div>
          </section>

          {/* Filters */}
          {Object.keys(availableFilters).length > 0 && (
            <section style={ui.filtersCard}>
              <div style={ui.filtersHeader}>
                <div style={ui.filtersTitle}>🎯 Filters</div>
                {Object.keys(filters).length > 0 && (
                  <button onClick={clearAllFilters} style={ui.clearBtn}>
                    Clear All
                  </button>
                )}
              </div>

              <div style={ui.filterGrid}>
                {Object.keys(availableFilters).map((col) => (
                  <div key={col}>
                    <div style={ui.filterLabel}>{col}</div>
                    <select value={filters[col] || "All"} onChange={(e) => handleFilterChange(col, e.target.value)} style={ui.filterSelect}>
                      <option value="All">All</option>
                      {availableFilters[col].map((val) => (
                        <option key={val} value={val}>
                          {val}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Dashboard Content - SAME AS BEFORE */}
          {showDashboard && dashboardData && (
            <>
              {/* Executive Summary */}
              <section style={ui.hero}>
                <div style={ui.heroLeft}>
                  <div style={ui.heroKicker}>Executive Summary</div>
                  <div style={ui.heroTitle}>{dashboardData.executive?.takeaway ?? dashboardData.summary}</div>

                  <div style={ui.heroPills}>
                    <div style={ui.pill}>
                      Confidence: <b style={{ marginLeft: 6 }}>{dashboardData.executive?.confidence ?? "—"}</b>
                    </div>
                    <div style={ui.pillSoft}>
                      Dataset: <b style={{ marginLeft: 6 }}>{safeLabel(selectedDataset, 28)}</b>
                    </div>
                  </div>

                  <div style={ui.heroBoxes}>
                    <div style={{ ...ui.heroBox, borderLeftColor: "#F59E0B" }}>
                      <div style={ui.heroBoxTitle}>Risk / Anomaly</div>
                      <div style={ui.heroBoxText}>{dashboardData.executive?.risk ?? "—"}</div>
                    </div>
                    <div style={{ ...ui.heroBox, borderLeftColor: "#10B981" }}>
                      <div style={ui.heroBoxTitle}>Recommended Action</div>
                      <div style={ui.heroBoxText}>{dashboardData.executive?.action ?? "—"}</div>
                    </div>
                  </div>
                </div>

                <div style={ui.heroRight}>
                  <div style={ui.heroStat}>
                    <div style={ui.heroStatLabel}>Records</div>
                    <div style={ui.heroStatValue}>{dashboardData.kpis.find((k) => k.id === "total")?.value ?? "—"}</div>
                  </div>
                  <div style={ui.heroStat}>
                    <div style={ui.heroStatLabel}>Fields</div>
                    <div style={ui.heroStatValue}>{dashboardData.kpis.find((k) => k.id === "columns")?.value ?? "—"}</div>
                  </div>
                </div>
              </section>

              {/* KPI Cards */}
              <section style={ui.kpiGrid}>
                {dashboardData.kpis.slice(0, 4).map((kpi) => (
                  <div key={kpi.id} style={ui.kpiCard}>
                    <div style={ui.kpiTop}>
                      <div style={ui.kpiIcon}>{kpi.icon}</div>
                      <div style={{ ...ui.kpiDot, background: kpi.color }} />
                    </div>
                    <div style={ui.kpiTitle}>{kpi.title}</div>
                    <div style={{ ...ui.kpiValue, color: kpi.color }}>{kpi.value}</div>
                    {kpi.subtitle && <div style={ui.kpiSub}>{kpi.subtitle}</div>}
                  </div>
                ))}
              </section>

              {/* Charts - keeping all existing chart code */}
              <section style={ui.sectionCard}>
                <div style={ui.sectionHeader}>
                  <div>
                    <div style={ui.sectionTitle}>Visualizations</div>
                    <div style={ui.muted}>Executive-first, analyst-on-demand breakdown.</div>
                  </div>
                </div>

                <div style={ui.vizGrid}>
                  {dashboardData.charts.map((chart) => {
                    const currentType = chartTypes[chart.id] || chart.type;
                    const total = chart.data.reduce((a, b) => a + b.value, 0);
                    const sorted = [...chart.data].sort((a, b) => b.value - a.value);
                    const expanded = !!expandedSegments[chart.id];
                    const shown = expanded ? sorted.slice(0, 8) : sorted.slice(0, 3);
                    const top = sorted[0];

                    return (
                      <div key={chart.id} style={ui.vizCard}>
                        <div style={ui.vizHeader}>
                          <div>
                            <div style={ui.vizTitle}>{chart.title}</div>
                            <div style={ui.vizSub}>{chart.subtitle}</div>
                          </div>

                          <div style={ui.vizControls}>
                            {([
                              { type: "donut", icon: "🍩" },
                              { type: "bar", icon: "📊" },
                              { type: "line", icon: "📈" },
                              { type: "heatmap", icon: "🔥" },
                              { type: "gauge", icon: "⏱️" },
                              { type: "funnel", icon: "🔻" },
                              { type: "radar", icon: "🕸️" },
                              { type: "treemap", icon: "🗂️" },
                            ] as const).map(({ type: t, icon }) => (
                              <button
                                key={t}
                                onClick={() => setChartTypes((prev) => ({ ...prev, [chart.id]: t }))}
                                style={{
                                  ...ui.chip,
                                  background: currentType === t ? "rgba(79,70,229,0.14)" : "transparent",
                                  borderColor: currentType === t ? "rgba(79,70,229,0.35)" : "rgba(255,255,255,0.12)",
                                  color: currentType === t ? "#E5E7EB" : "rgba(255,255,255,0.72)",
                                }}
                                title={t}
                              >
                                {icon}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div style={ui.quickInsight}>
                          🔍 <span style={{ fontWeight: 950 }}>{chart.insight}</span>
                        </div>

                        <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "14px 0" }} />

                        <div style={ui.vizBody}>
                          <div style={ui.vizChartWrap}>
                            <div style={ui.vizChartBox}>
                              <ResponsiveContainer width="100%" height="100%">
                                {currentType === "donut" ? (
                                  <PieChart>
                                    <Pie data={sorted} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={2} dataKey="value" label={false}>
                                      {sorted.map((_, i) => (
                                        <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                                      ))}
                                    </Pie>
                                    <Tooltip contentStyle={ui.tooltip} />
                                  </PieChart>
                                ) : currentType === "line" ? (
                                  <LineChart data={sorted}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "rgba(255,255,255,0.7)" }} />
                                    <YAxis tick={{ fontSize: 11, fill: "rgba(255,255,255,0.7)" }} />
                                    <Tooltip contentStyle={ui.tooltip} />
                                    <Line type="monotone" dataKey="value" stroke="#4F46E5" strokeWidth={3} dot={{ r: 4 }} />
                                  </LineChart>
                                ) : currentType === "bar" ? (
                                  <BarChart data={sorted}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "rgba(255,255,255,0.7)" }} />
                                    <YAxis tick={{ fontSize: 11, fill: "rgba(255,255,255,0.7)" }} />
                                    <Tooltip contentStyle={ui.tooltip} />
                                    <Bar dataKey="value" fill="#4F46E5" radius={[12, 12, 0, 0]} />
                                  </BarChart>
                                ) : currentType === "heatmap" ? (
                                  <HeatmapChart data={sorted} />
                                ) : currentType === "gauge" ? (
                                  <GaugeChart value={top?.value || 0} max={total} title={chart.title} color="#4F46E5" />
                                ) : currentType === "funnel" ? (
                                  <FunnelChartComponent data={sorted} />
                                ) : currentType === "radar" ? (
                                  <RadarChartComponent data={sorted} />
                                ) : currentType === "treemap" ? (
                                  <TreemapChart data={sorted} />
                                ) : null}
                              </ResponsiveContainer>

                              {currentType === "donut" && top && (
                                <div style={ui.centerStat}>
                                  <div style={ui.centerStatLabel}>Top Segment</div>
                                  <div style={ui.centerStatValue}>{safeLabel(top.name, 18)}</div>
                                  <div style={ui.centerStatSub}>{pct(top.value, total)}</div>
                                </div>
                              )}
                            </div>

                            <button style={ui.askChartBtn} onClick={() => askAIAboutChart(chart)} title="Ask AI about this chart">
                              🤖 Ask AI about this chart
                            </button>
                          </div>

                          <div style={ui.vizRight}>
                            <div style={ui.vizSideTitle}>Top Segments</div>

                            <div style={ui.rankList}>
                              {shown.map((d, idx) => {
                                const intensity = idx < 3 ? 1 : 0.65;
                                return (
                                  <div key={d.name} style={{ ...ui.rankRow, opacity: intensity }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                      <div style={{ ...ui.rankBadge, background: COLORS[idx % COLORS.length] }} />
                                      <div>
                                        <div style={ui.rankName}>{safeLabel(d.name, 22)}</div>
                                        <div style={ui.rankMeta}>
                                          {d.value} • {pct(d.value, total)}
                                        </div>
                                      </div>
                                    </div>

                                    <div style={ui.rankBarOuter}>
                                      <div
                                        style={{
                                          ...ui.rankBarInner,
                                          width: `${Math.max(6, (d.value / Math.max(1, top?.value || 1)) * 100)}%`,
                                          background: COLORS[idx % COLORS.length],
                                        }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {sorted.length > 3 && (
                              <button onClick={() => setExpandedSegments((p) => ({ ...p, [chart.id]: !expanded }))} style={ui.moreBtn}>
                                {expanded ? "Show less" : `Show more (${Math.min(8, sorted.length)} segments)`}
                              </button>
                            )}

                            <div style={ui.keyInsightBox}>
                              <div style={ui.keyInsightTitle}>Key Insight</div>
                              <div style={ui.keyInsightText}>{chart.detailedInsight}</div>
                              <div style={ui.keyInsightHint}>Tip: Apply a filter to see if the leader changes.</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* AI Insights */}
              <section style={ui.sectionCard}>
                <AIInsights data={selectedDatasetRowsFiltered} datasetName={selectedDataset} dashboardData={dashboardData} onMessage={(msg) => pushToast(msg, "info")} />
              </section>

              {/* Insights */}
              <section style={ui.sectionCard}>
                <div style={ui.sectionHeader}>
                  <div>
                    <div style={ui.sectionTitle}>Insights</div>
                    <div style={ui.muted}>Interpretation and recommended next steps.</div>
                  </div>
                </div>

                <div style={ui.insightGrid}>
                  {dashboardData.insights.map((ins, idx) => (
                    <div key={idx} style={ui.insightCard}>
                      <div style={ui.insightTop}>
                        <div style={{ fontSize: 22 }}>{ins.icon}</div>
                        <div>
                          <div style={ui.insightTitle}>{ins.title}</div>
                          <div style={ui.insightText}>{ins.text}</div>
                        </div>
                      </div>

                      <div style={ui.insightDetails}>{ins.details}</div>

                      {ins.recommendation && <div style={ui.recoBox}>✅ Recommendation: {ins.recommendation}</div>}
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </main>

        {/* 🆕 BIGGER CHAT SIDEBAR - RIGHT SIDE */}
        <aside style={chatOpen ? ui.chatSidebarOpen : ui.chatSidebarClosed}>
          <div style={ui.chatHeader}>
            <div>
              <div style={ui.chatTitle}>🤖 AI Assistant</div>
              <div style={ui.chatSub}>Ask questions about your data</div>
            </div>
            <button style={ui.chatToggle} onClick={() => setChatOpen(!chatOpen)} title={chatOpen ? "Close chat" : "Open chat"}>
              {chatOpen ? "✕" : "💬"}
            </button>
          </div>

          {chatOpen && (
            <>
              <div style={ui.chatBody}>
                {messages.length === 0 ? (
                  <div style={ui.chatEmpty}>
                    <div style={ui.chatEmptyTitle}>💡 Try asking:</div>
                    <button style={ui.suggestChip} onClick={() => setInput("What are the key insights?")}>
                      What are the key insights?
                    </button>
                    <button style={ui.suggestChip} onClick={() => setInput("Show me top performers")}>
                      Show me top performers
                    </button>
                    <button style={ui.suggestChip} onClick={() => setInput("Any anomalies?")}>
                      Any anomalies?
                    </button>
                  </div>
                ) : (
                  <div style={ui.msgList}>
                    {messages.map((m, idx) => (
                      <div key={idx} style={{ ...ui.msgRow, justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                        <div
                          style={{
                            ...ui.msgBubble,
                            background: m.role === "user" ? "linear-gradient(135deg, #4F46E5 0%, #EC4899 100%)" : "rgba(255,255,255,0.08)",
                            border: m.role === "user" ? "none" : "1px solid rgba(255,255,255,0.12)",
                          }}
                        >
                          <div style={ui.msgText}>{m.content}</div>
                          <div style={ui.msgTime}>{m.time}</div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              <div style={ui.chatFooter}>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Ask about your data…"
                  style={ui.chatInput}
                />
                <button onClick={handleSend} disabled={!input.trim() || chatLoading} style={{ ...ui.chatSend, opacity: !input.trim() || chatLoading ? 0.5 : 1 }}>
                  {chatLoading ? "..." : "Send"}
                </button>
              </div>
            </>
          )}
        </aside>
      </div>

      {/* Toasts */}
      <div style={ui.toastWrap}>
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              ...ui.toast,
              borderLeftColor: t.kind === "success" ? "#10B981" : t.kind === "warning" ? "#F59E0B" : t.kind === "error" ? "#EF4444" : "#4F46E5",
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}

const ui: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "radial-gradient(1200px 650px at 18% 0%, rgba(79,70,229,0.22), transparent 60%), #0B1220",
    color: "#E5E7EB",
    fontFamily: "'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  },

  // 🆕 WELCOME SCREEN STYLES
  welcomePage: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "radial-gradient(1200px 650px at 50% 20%, rgba(79,70,229,0.25), transparent 70%), #0B1220",
    padding: 24,
  },

  welcomeCard: {
    maxWidth: 900,
    width: "100%",
    background: "rgba(15,23,42,0.90)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 24,
    padding: 48,
    boxShadow: "0 24px 60px rgba(0,0,0,0.40)",
    backdropFilter: "blur(12px)",
    textAlign: "center",
  },

  welcomeLogo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    background: "linear-gradient(135deg, #4F46E5 0%, #EC4899 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 24px",
    fontSize: 32,
    fontWeight: 950,
    color: "#fff",
    boxShadow: "0 16px 40px rgba(79,70,229,0.40)",
  },

  welcomeTitle: {
    fontSize: 32,
    fontWeight: 950,
    color: "#fff",
    marginBottom: 12,
  },

  welcomeSubtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.70)",
    marginBottom: 40,
  },

  welcomeFeatures: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 20,
    marginBottom: 40,
  },

  featureBox: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 24,
    textAlign: "left",
  },

  featureIcon: {
    fontSize: 32,
    marginBottom: 12,
  },

  featureTitle: {
    fontSize: 16,
    fontWeight: 950,
    color: "#fff",
    marginBottom: 8,
  },

  featureText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.70)",
    lineHeight: 1.5,
  },

  welcomeCTA: {
    padding: "16px 32px",
    borderRadius: 14,
    border: "none",
    background: "linear-gradient(135deg, #4F46E5 0%, #EC4899 100%)",
    color: "#fff",
    fontSize: 16,
    fontWeight: 950,
    cursor: "pointer",
    boxShadow: "0 16px 40px rgba(79,70,229,0.30)",
    marginBottom: 24,
  },

  welcomeActions: {
    display: "flex",
    gap: 12,
    justifyContent: "center",
    marginBottom: 32,
  },

  welcomeSecondary: {
    padding: "12px 20px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.05)",
    color: "#E5E7EB",
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
  },

  welcomeFooter: {
    borderTop: "1px solid rgba(255,255,255,0.08)",
    paddingTop: 24,
  },

  welcomeEmail: {
    fontSize: 14,
    color: "rgba(255,255,255,0.80)",
    fontWeight: 700,
    marginBottom: 8,
  },

  welcomeHint: {
    fontSize: 13,
    color: "rgba(255,255,255,0.60)",
  },

  // 🆕 REDESIGNED HEADER
  topbar: {
    position: "sticky",
    top: 0,
    zIndex: 50,
    padding: "14px 20px",
    display: "grid",
    gridTemplateColumns: "250px 1fr 300px",
    alignItems: "center",
    gap: 20,
    background: "rgba(11,18,32,0.92)",
    backdropFilter: "blur(16px)",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },

  brand: { display: "flex", alignItems: "center", gap: 12 },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 950,
    background: "linear-gradient(135deg, #4F46E5 0%, #EC4899 100%)",
    color: "#fff",
    boxShadow: "0 12px 28px rgba(79,70,229,0.35)",
  },
  brandTitle: { fontSize: 15, fontWeight: 950, letterSpacing: 0.4, color: "#fff" },
  brandSub: { fontSize: 11, color: "rgba(255,255,255,0.60)", marginTop: 2 },

  // 🆕 BIG ICON NAVIGATION
  topbarCenter: {
    display: "flex",
    gap: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  navIcon: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    padding: "8px 16px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)",
    cursor: "pointer",
    transition: "all 0.2s",
  },

  navIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 999,
    background: "rgba(79,70,229,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
  },

  navIconLabel: {
    fontSize: 11,
    fontWeight: 900,
    color: "rgba(255,255,255,0.80)",
  },

  topbarRight: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    justifyContent: "flex-end",
  },

  refreshBadge: {
    padding: "8px 12px",
    borderRadius: 999,
    background: "rgba(16,185,129,0.12)",
    border: "1px solid rgba(16,185,129,0.25)",
    fontSize: 11,
    color: "#A7F3D0",
    fontWeight: 850,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },

  refreshBtn: {
    padding: "4px 8px",
    borderRadius: 6,
    border: "1px solid rgba(16,185,129,0.25)",
    background: "rgba(16,185,129,0.08)",
    color: "#A7F3D0",
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 900,
  },

  btnLogout: {
    padding: "10px 14px",
    borderRadius: 12,
    fontWeight: 900,
    fontSize: 12,
    border: "1px solid rgba(239,68,68,0.25)",
    background: "rgba(239,68,68,0.12)",
    color: "#FCA5A5",
    cursor: "pointer",
  },

  main: {
    flex: 1,
    overflowY: "auto",
    padding: "20px 18px 40px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },

  // SEARCH
  searchSection: {
    background: "rgba(15,23,42,0.85)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 8px 24px rgba(0,0,0,0.20)",
  },

  searchWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: 12,
  },

  searchIcon: {
    position: "absolute",
    left: 16,
    fontSize: 18,
    opacity: 0.6,
    pointerEvents: "none",
  },

  searchInput: {
    flex: 1,
    padding: "12px 12px 12px 48px",
    borderRadius: 12,
    border: "2px solid rgba(79,70,229,0.25)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    fontSize: 14,
    fontWeight: 700,
    outline: "none",
  },

  searchClear: {
    position: "absolute",
    right: 12,
    width: 26,
    height: 26,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.08)",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 14,
  },

  searchResultsBadge: {
    marginTop: 10,
    padding: "8px 12px",
    borderRadius: 10,
    background: "rgba(79,70,229,0.12)",
    border: "1px solid rgba(79,70,229,0.25)",
    fontSize: 12,
    fontWeight: 800,
    color: "#E5E7EB",
  },

  datasetBar: {
    background: "rgba(15,23,42,0.85)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 16,
    padding: 14,
    display: "flex",
    alignItems: "center",
    gap: 12,
  },

  datasetLabel: {
    fontSize: 13,
    fontWeight: 900,
    color: "rgba(255,255,255,0.75)",
  },

  datasetSelect: {
    flex: 1,
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    fontWeight: 800,
    outline: "none",
    cursor: "pointer",
  },

  countPill: {
    padding: "8px 12px",
    borderRadius: 999,
    background: "rgba(79,70,229,0.15)",
    border: "1px solid rgba(79,70,229,0.25)",
    fontSize: 12,
    color: "#E5E7EB",
    fontWeight: 850,
  },

  filtersCard: {
    background: "rgba(15,23,42,0.85)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 16,
    padding: 16,
  },

  filtersHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  filtersTitle: {
    fontSize: 14,
    fontWeight: 950,
    color: "#fff",
  },

  clearBtn: {
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid rgba(239,68,68,0.25)",
    background: "rgba(239,68,68,0.12)",
    color: "#FCA5A5",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 900,
  },

  filterGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 12,
  },

  filterLabel: {
    fontSize: 11,
    fontWeight: 900,
    color: "rgba(255,255,255,0.65)",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },

  filterSelect: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    fontWeight: 800,
    outline: "none",
    cursor: "pointer",
  },

  // 🆕 BIGGER CHAT SIDEBAR
  chatSidebarClosed: {
    width: 60,
    background: "rgba(15,23,42,0.92)",
    borderLeft: "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    flexDirection: "column",
    transition: "width 0.3s ease",
  },

  chatSidebarOpen: {
    width: 550,
    background: "rgba(15,23,42,0.92)",
    borderLeft: "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    flexDirection: "column",
    transition: "width 0.3s ease",
  },

  chatHeader: {
    padding: 20,
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },

  chatTitle: {
    fontSize: 19,
    fontWeight: 950,
    color: "#fff",
  },

  chatSub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.65)",
    marginTop: 4,
  },

  chatToggle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    cursor: "pointer",
    fontSize: 18,
    fontWeight: 900,
  },

  chatBody: {
    flex: 1,
    overflowY: "auto",
    padding: 20,
  },

  chatEmpty: {
    padding: 20,
    borderRadius: 14,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },

  chatEmptyTitle: {
    fontSize: 16,
    fontWeight: 900,
    color: "rgba(255,255,255,0.80)",
    marginBottom: 8,
  },

  suggestChip: {
    padding: "12px 16px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.05)",
    color: "#E5E7EB",
    fontWeight: 800,
    cursor: "pointer",
    fontSize: 15,
    textAlign: "left",
  },

  msgList: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },

  msgRow: {
    display: "flex",
  },

  msgBubble: {
    maxWidth: "90%",
    padding: "16px 20px",
    borderRadius: 16,
  },

  msgText: {
    whiteSpace: "pre-wrap",
    fontSize: 17,
    color: "#fff",
    lineHeight: 1.8,
    fontWeight: 600,
  },

  msgTime: {
    marginTop: 8,
    fontSize: 12,
    color: "rgba(255,255,255,0.60)",
  },

  chatFooter: {
    padding: 18,
    borderTop: "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    gap: 12,
  },

  chatInput: {
    flex: 1,
    padding: "14px 16px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    outline: "none",
    fontWeight: 700,
    fontSize: 16,
  },

  chatSend: {
    padding: "14px 22px",
    borderRadius: 12,
    border: "none",
    cursor: "pointer",
    fontWeight: 950,
    color: "#fff",
    background: "linear-gradient(135deg, #4F46E5 0%, #EC4899 100%)",
    fontSize: 16,
  },

  // Keep ALL existing dashboard styles...
  hero: {
    display: "grid",
    gridTemplateColumns: "1.35fr 0.65fr",
    gap: 14,
    background: "linear-gradient(135deg, rgba(79,70,229,0.22) 0%, rgba(236,72,153,0.12) 100%)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 18,
    padding: 18,
    boxShadow: "0 16px 44px rgba(0,0,0,0.30)",
  },

  heroLeft: { display: "flex", flexDirection: "column", gap: 10 },
  heroKicker: { fontSize: 11, letterSpacing: 1.0, textTransform: "uppercase", fontWeight: 950, color: "rgba(255,255,255,0.72)" },
  heroTitle: { fontSize: 18, fontWeight: 950, color: "#fff", lineHeight: 1.25 },
  heroPills: { display: "flex", gap: 10, flexWrap: "wrap" },
  pill: { padding: "8px 10px", borderRadius: 999, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.10)", fontSize: 12, color: "#fff", fontWeight: 850 },
  pillSoft: { padding: "8px 10px", borderRadius: 999, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", fontSize: 12, color: "rgba(255,255,255,0.82)", fontWeight: 850 },
  heroBoxes: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 },
  heroBox: { background: "rgba(0,0,0,0.18)", borderRadius: 14, padding: 14, border: "1px solid rgba(255,255,255,0.08)", borderLeft: "4px solid #F59E0B" },
  heroBoxTitle: { fontSize: 12, fontWeight: 950, color: "rgba(255,255,255,0.82)" },
  heroBoxText: { marginTop: 6, fontSize: 13, color: "rgba(255,255,255,0.78)", lineHeight: 1.45 },
  heroRight: { display: "grid", gridTemplateColumns: "1fr", gap: 12 },
  heroStat: { background: "rgba(0,0,0,0.18)", borderRadius: 16, padding: 14, border: "1px solid rgba(255,255,255,0.08)" },
  heroStatLabel: { fontSize: 11, fontWeight: 950, color: "rgba(255,255,255,0.70)", textTransform: "uppercase", letterSpacing: 0.9 },
  heroStatValue: { marginTop: 6, fontSize: 28, fontWeight: 950, color: "#fff" },

  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 },
  kpiCard: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 14, boxShadow: "0 8px 24px rgba(0,0,0,0.20)" },
  kpiTop: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  kpiIcon: { fontSize: 22 },
  kpiDot: { width: 10, height: 10, borderRadius: 999 },
  kpiTitle: { marginTop: 10, fontSize: 12, fontWeight: 950, color: "rgba(255,255,255,0.72)", textTransform: "uppercase", letterSpacing: 0.9 },
  kpiValue: { marginTop: 6, fontSize: 28, fontWeight: 950 },
  kpiSub: { marginTop: 6, fontSize: 12, color: "rgba(255,255,255,0.65)" },

  sectionCard: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 16, boxShadow: "0 8px 24px rgba(0,0,0,0.20)" },
  sectionHeader: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: 950, color: "#fff" },
  muted: { fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 4 },

  vizGrid: { display: "grid", gridTemplateColumns: "1fr", gap: 14 },
  vizCard: { background: "rgba(0,0,0,0.16)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 14 },
  vizHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  vizTitle: { fontSize: 15, fontWeight: 950, color: "#fff" },
  vizSub: { fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 3 },
  vizControls: { display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" },

  quickInsight: { marginTop: 10, padding: "10px 12px", borderRadius: 12, background: "rgba(79,70,229,0.12)", border: "1px solid rgba(79,70,229,0.20)", color: "rgba(255,255,255,0.86)", fontSize: 13, fontWeight: 800 },

  vizBody: { display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 14, alignItems: "stretch" },
  vizChartWrap: { display: "flex", flexDirection: "column", gap: 10 },
  vizChartBox: { height: 380, borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", position: "relative", overflow: "hidden", padding: 8 },

  tooltip: { background: "rgba(255,255,255,0.95)", border: "1px solid rgba(11,18,32,0.12)", borderRadius: 12, boxShadow: "0 16px 36px rgba(0,0,0,0.20)", color: "#0B1220", fontWeight: 900 },

  centerStat: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", flexDirection: "column", gap: 4 },
  centerStatLabel: { fontSize: 11, color: "rgba(255,255,255,0.65)", fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.9 },
  centerStatValue: { fontSize: 16, fontWeight: 950, color: "#fff" },
  centerStatSub: { fontSize: 12, fontWeight: 900, color: "rgba(255,255,255,0.78)" },

  askChartBtn: { padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(79,70,229,0.12)", color: "#E5E7EB", cursor: "pointer", fontWeight: 950 },

  vizRight: { display: "flex", flexDirection: "column", gap: 12 },
  vizSideTitle: { fontSize: 12, fontWeight: 950, color: "rgba(255,255,255,0.82)", textTransform: "uppercase", letterSpacing: 0.9 },

  rankList: { display: "flex", flexDirection: "column", gap: 10 },
  rankRow: { padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", gap: 10 },
  rankBadge: { width: 10, height: 10, borderRadius: 999, boxShadow: "0 8px 16px rgba(0,0,0,0.20)" },
  rankName: { fontSize: 13, fontWeight: 950, color: "#fff" },
  rankMeta: { fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 2, fontWeight: 750 },
  rankBarOuter: { width: "100%", height: 8, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden" },
  rankBarInner: { height: "100%", borderRadius: 999 },

  moreBtn: { padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.86)", cursor: "pointer", fontWeight: 950 },

  keyInsightBox: { marginTop: "auto", borderRadius: 14, padding: 14, background: "rgba(79,70,229,0.10)", border: "1px solid rgba(79,70,229,0.18)" },
  keyInsightTitle: { fontSize: 11, fontWeight: 950, color: "rgba(255,255,255,0.82)", textTransform: "uppercase", letterSpacing: 0.9 },
  keyInsightText: { marginTop: 8, fontSize: 13, color: "rgba(255,255,255,0.80)", lineHeight: 1.5, fontWeight: 700 },
  keyInsightHint: { marginTop: 10, fontSize: 12, color: "rgba(255,255,255,0.60)" },

  chip: { padding: "7px 11px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", cursor: "pointer", fontSize: 11, fontWeight: 950 },

  insightGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 },
  insightCard: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 14 },
  insightTop: { display: "flex", gap: 12, alignItems: "flex-start" },
  insightTitle: { fontSize: 14, fontWeight: 950, color: "#fff" },
  insightText: { fontSize: 13, color: "rgba(255,255,255,0.70)", marginTop: 3 },
  insightDetails: { marginTop: 10, fontSize: 13, color: "rgba(255,255,255,0.78)", lineHeight: 1.5 },
  recoBox: { marginTop: 12, padding: 12, borderRadius: 12, background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.18)", color: "#A7F3D0", fontWeight: 900, fontSize: 13 },

  toastWrap: { position: "fixed", right: 18, bottom: 18, display: "flex", flexDirection: "column", gap: 10, zIndex: 200 },
  toast: { minWidth: 260, maxWidth: 380, padding: "12px 14px", borderRadius: 12, background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.10)", borderLeft: "4px solid #4F46E5", color: "#fff", fontWeight: 850, boxShadow: "0 16px 36px rgba(0,0,0,0.40)" },

  loadingPage: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0B1220", color: "#fff", padding: 24 },
  loadingCard: { padding: 22, borderRadius: 18, background: "linear-gradient(135deg, rgba(79,70,229,0.25), rgba(236,72,153,0.14))", border: "1px solid rgba(255,255,255,0.10)", boxShadow: "0 16px 44px rgba(0,0,0,0.50)", textAlign: "center" },
  errorPage: { minHeight: "100vh", padding: 24, background: "#0B1220", color: "#fff" },
  errorPre: { whiteSpace: "pre-wrap", background: "rgba(255,255,255,0.06)", padding: 16, borderRadius: 12 },
};