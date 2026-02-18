"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";

interface InsightData {
  type: "finding" | "trend" | "anomaly" | "recommendation";
  severity: "high" | "medium" | "low";
  icon: string;
  title: string;
  description: string;
  action?: string;
}

interface AIInsightsProps {
  data: any[]; // expects UniversalRow[] shape with row_data
  datasetName: string;
  dashboardData: any;
  onMessage: (msg: string) => void;
}

export default function AIInsights({ data, datasetName, dashboardData, onMessage }: AIInsightsProps) {
  const [insights, setInsights] = useState<InsightData[]>([]);
  const [loading, setLoading] = useState(false);
  const [performanceScore, setPerformanceScore] = useState(0);
  const [expanded, setExpanded] = useState(true);

  // ---- Build a stable "fingerprint" so we only auto-generate once per dataset state
  const kpiFingerprint = useMemo(() => {
    const kpis = dashboardData?.kpis ?? [];
    // keep it small + stable
    return kpis
      .slice(0, 6)
      .map((k: any) => `${k.title}:${String(k.value)}`)
      .join("|");
  }, [dashboardData?.kpis]);

  const autoKey = useMemo(() => {
    return `${datasetName}::rows=${data?.length ?? 0}::kpis=${kpiFingerprint}`;
  }, [datasetName, data?.length, kpiFingerprint]);

  const lastAutoKeyRef = useRef<string>("");

  // ---- Helpers that rely on data
  const analyzeRecentTrends = useCallback(() => {
    if (!data || data.length < 5) return { trend: "stable", change: 0 };

    const firstRow = data[0]?.row_data ?? {};
    const numericCols = Object.keys(firstRow).filter((key) => {
      const value = firstRow[key];
      return !isNaN(parseFloat(String(value)));
    });

    if (numericCols.length === 0) return { trend: "stable", change: 0 };

    const col = numericCols[0];

    const recentData = data
      .slice(-5)
      .map((r) => parseFloat(r?.row_data?.[col]))
      .filter((v) => Number.isFinite(v));

    const olderData = data
      .slice(0, 5)
      .map((r) => parseFloat(r?.row_data?.[col]))
      .filter((v) => Number.isFinite(v));

    if (recentData.length === 0 || olderData.length === 0) return { trend: "stable", change: 0, metric: col };

    const recentAvg = recentData.reduce((a, b) => a + b, 0) / recentData.length;
    const olderAvg = olderData.reduce((a, b) => a + b, 0) / olderData.length;

    if (!Number.isFinite(olderAvg) || olderAvg === 0) return { trend: "stable", change: 0, metric: col };

    const change = ((recentAvg - olderAvg) / olderAvg) * 100;

    return {
      trend: change > 5 ? "increasing" : change < -5 ? "decreasing" : "stable",
      change,
      metric: col,
    };
  }, [data]);

  const detectAnomalies = useCallback(() => {
    const anomalies: any[] = [];
    if (!data || data.length === 0) return anomalies;

    const firstRow = data[0]?.row_data ?? {};
    const numericCols = Object.keys(firstRow).filter((key) => {
      const value = firstRow[key];
      return !isNaN(parseFloat(String(value)));
    });

    numericCols.forEach((col) => {
      const values = data
        .map((r) => parseFloat(r?.row_data?.[col]))
        .filter((v) => Number.isFinite(v));

      if (values.length < 3) return;

      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);

      if (!Number.isFinite(stdDev) || stdDev === 0) return;

      const outliers = values.filter((v) => Math.abs(v - mean) > 2 * stdDev);

      if (outliers.length > 0) {
        anomalies.push({
          metric: col,
          count: outliers.length,
          severity: outliers.length > values.length * 0.1 ? "high" : "medium",
        });
      }
    });

    return anomalies;
  }, [data]);

  const getDistributions = useCallback(() => {
    if (!data || data.length === 0) return {};

    const firstRow = data[0]?.row_data ?? {};
    const categoricalCols = Object.keys(firstRow).filter((key) => {
      const value = firstRow[key];
      return isNaN(parseFloat(String(value)));
    });

    const distributions: any = {};

    categoricalCols.forEach((col) => {
      const counts: Record<string, number> = {};
      data.forEach((row) => {
        const value = String(row?.row_data?.[col] ?? "");
        if (!value) return;
        counts[value] = (counts[value] || 0) + 1;
      });

      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

      if (sorted.length > 0) {
        distributions[col] = {
          top: sorted[0][0],
          topCount: sorted[0][1],
          unique: sorted.length,
        };
      }
    });

    return distributions;
  }, [data]);

  const generateRuleBasedInsights = useCallback((summary: any): InsightData[] => {
    const out: InsightData[] = [];

    if (summary.totalRecords > 100) {
      out.push({
        type: "finding",
        severity: "high",
        icon: "📊",
        title: "Strong Dataset Size",
        description: `You have ${summary.totalRecords} records, enabling more reliable analysis.`,
        action: "Keep collecting data to validate long-term trends",
      });
    } else if (summary.totalRecords < 20) {
      out.push({
        type: "recommendation",
        severity: "medium",
        icon: "⚠️",
        title: "Limited Data Sample",
        description: `Only ${summary.totalRecords} records available. Insight confidence is limited.`,
        action: "Upload more data for stronger conclusions",
      });
    }

    const trends = summary.recentTrends;
    if (trends?.change > 20) {
      out.push({
        type: "trend",
        severity: "high",
        icon: "📈",
        title: "Strong Upward Trend",
        description: `${trends.metric} increased by ${trends.change.toFixed(1)}% recently.`,
        action: "Identify drivers and replicate what’s working",
      });
    } else if (trends?.change < -20) {
      out.push({
        type: "trend",
        severity: "high",
        icon: "📉",
        title: "Declining Trend",
        description: `${trends.metric} decreased by ${Math.abs(trends.change).toFixed(1)}% recently.`,
        action: "Investigate root causes and mitigate quickly",
      });
    } else if (trends?.trend === "stable") {
      out.push({
        type: "finding",
        severity: "low",
        icon: "➡️",
        title: "Stable Performance",
        description: `Metrics are relatively stable with limited variance.`,
        action: "Maintain strategy and look for small optimizations",
      });
    }

    if (summary.anomalies?.length > 0) {
      const highSeverity = summary.anomalies.filter((a: any) => a.severity === "high");
      out.push(
        highSeverity.length > 0
          ? {
              type: "anomaly",
              severity: "high",
              icon: "⚠️",
              title: "Significant Outliers",
              description: `${highSeverity.length} metric(s) contain unusual outliers.`,
              action: "Review outliers for data quality issues or exceptional events",
            }
          : {
              type: "anomaly",
              severity: "medium",
              icon: "🔍",
              title: "Minor Outliers",
              description: `Some values fall outside typical ranges.`,
              action: "Inspect flagged records for context",
            }
      );
    }

    Object.entries(summary.distributions ?? {}).forEach(([col, dist]: [string, any]) => {
      const dominance = (dist.topCount / Math.max(1, summary.totalRecords)) * 100;

      if (dominance > 60) {
        out.push({
          type: "finding",
          severity: "medium",
          icon: "📊",
          title: `${col} Concentration`,
          description: `${dist.top} accounts for ~${dominance.toFixed(0)}% of records.`,
          action: `Reduce concentration risk by diversifying ${col}`,
        });
      } else if (dist.unique > summary.totalRecords * 0.8) {
        out.push({
          type: "finding",
          severity: "low",
          icon: "🎯",
          title: `High ${col} Diversity`,
          description: `${dist.unique} unique values suggest high variation.`,
          action: "Use segmentation to find high-performing slices",
        });
      }
    });

    const kpis = summary.kpis ?? [];
    if (kpis.length > 0) {
      out.push({
        type: "recommendation",
        severity: "medium",
        icon: "💡",
        title: "Focus a Primary KPI",
        description: `Track ${kpis[0].title} (${kpis[0].value}) as the main outcome metric.`,
        action: "Set targets and review weekly",
      });
    }

    return out.slice(0, 8);
  }, []);

  const calculatePerformanceScore = useCallback((ins: InsightData[]) => {
    let score = 70;
    ins.forEach((i) => {
      if (i.type === "trend" && i.description.includes("increased")) score += 5;
      if (i.type === "trend" && i.description.includes("decreased")) score -= 5;
      if (i.severity === "high" && i.type === "anomaly") score -= 10;
      if (i.type === "finding" && i.severity === "high") score += 3;
    });
    setPerformanceScore(Math.min(100, Math.max(0, score)));
  }, []);

  const generateInsights = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!data || data.length === 0) return;

      setLoading(true);

      try {
        const summary = {
          dataset: datasetName,
          totalRecords: data.length,
          kpis: (dashboardData?.kpis ?? []).map((kpi: any) => ({
            title: kpi.title,
            value: kpi.value,
            subtitle: kpi.subtitle,
          })),
          recentTrends: analyzeRecentTrends(),
          anomalies: detectAnomalies(),
          distributions: getDistributions(),
        };

        const GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY;

        if (!GROQ_API_KEY) {
          const ruleBasedInsights = generateRuleBasedInsights(summary);
          setInsights(ruleBasedInsights);
          calculatePerformanceScore(ruleBasedInsights);
          if (!opts?.silent) onMessage("💡 Insights generated (rule-based mode)");
          return;
        }

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
                content: `You are a business intelligence expert analyzing data. Generate actionable insights in JSON format.

Respond ONLY with a JSON array of insights. Each insight must have:
{
  "type": "finding" | "trend" | "anomaly" | "recommendation",
  "severity": "high" | "medium" | "low",
  "icon": "emoji (📊/📈/⚠️/💡/📉/➡️/🔍/🎯)",
  "title": "Short title (under 50 chars)",
  "description": "Detailed explanation (under 150 chars)",
  "action": "Optional specific action to take (under 100 chars)"
}

Generate 5-8 insights. Focus on:
- Significant changes (>20%)
- Trends over time
- Unusual patterns
- Actionable recommendations`,
              },
              {
                role: "user",
                content: `Analyze this data and provide insights:\n\n${JSON.stringify(summary, null, 2)}\n\nReturn ONLY a JSON array.`,
              },
            ],
            max_tokens: 1000,
            temperature: 0.7,
          }),
        });

        if (!response.ok) throw new Error("AI request failed");

        const result = await response.json();
        const content = result.choices?.[0]?.message?.content || "[]";

        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error("Invalid AI response");

        const aiInsights = JSON.parse(jsonMatch[0]);
        setInsights(aiInsights);
        calculatePerformanceScore(aiInsights);
        if (!opts?.silent) onMessage("💡 AI Insights generated successfully!");
      } catch (error) {
        console.error("AI Insights error:", error);

        const summary = {
          dataset: datasetName,
          totalRecords: data.length,
          kpis: dashboardData?.kpis ?? [],
          recentTrends: analyzeRecentTrends(),
          anomalies: detectAnomalies(),
          distributions: getDistributions(),
        };

        const ruleBasedInsights = generateRuleBasedInsights(summary);
        setInsights(ruleBasedInsights);
        calculatePerformanceScore(ruleBasedInsights);
        if (!opts?.silent) onMessage("💡 Insights generated (rule-based mode)");
      } finally {
        setLoading(false);
      }
    },
    [
      data,
      datasetName,
      dashboardData,
      analyzeRecentTrends,
      detectAnomalies,
      getDistributions,
      generateRuleBasedInsights,
      calculatePerformanceScore,
      onMessage,
    ]
  );

  // ✅ Auto-run ONCE per "autoKey"
  useEffect(() => {
    if (!data || data.length === 0) return;

    // prevent duplicate auto-run (including StrictMode double-invoke)
    if (lastAutoKeyRef.current === autoKey) return;
    lastAutoKeyRef.current = autoKey;

    // silent = don't spam the chat every time the component mounts
    generateInsights({ silent: true });
  }, [autoKey, data?.length, generateInsights, data]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "#ef4444";
      case "medium":
        return "#f59e0b";
      case "low":
        return "#10b981";
      default:
        return "#6b7280";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "finding":
        return "#3b82f6";
      case "trend":
        return "#8b5cf6";
      case "anomaly":
        return "#ef4444";
      case "recommendation":
        return "#10b981";
      default:
        return "#6b7280";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "#10b981";
    if (score >= 60) return "#f59e0b";
    return "#ef4444";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Needs Attention";
  };

  return (
    <div
      style={{
        background: "linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(245, 87, 108, 0.05) 100%)",
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        border: "2px solid rgba(102, 126, 234, 0.2)",
      }}
    >
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 32 }}>🤖</div>
          <div>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "#111827" }}>AI Auto-Insights</h3>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Powered by Advanced Analytics</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* PERFORMANCE SCORE */}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", marginBottom: 4 }}>PERFORMANCE SCORE</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: getScoreColor(performanceScore), lineHeight: 1 }}>
              {performanceScore}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: getScoreColor(performanceScore), marginTop: 4 }}>
              {getScoreLabel(performanceScore)}
            </div>
          </div>

          {/* EXPAND/COLLAPSE */}
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 700,
              background: expanded ? "#667eea" : "transparent",
              border: "2px solid #667eea",
              borderRadius: 8,
              color: expanded ? "#fff" : "#667eea",
              cursor: "pointer",
            }}
          >
            {expanded ? "Collapse" : "Expand"}
          </button>
        </div>
      </div>

      {expanded && (
        <>
          {loading ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🔄</div>
              <div style={{ fontSize: 16, color: "#6b7280" }}>Analyzing data with AI...</div>
            </div>
          ) : insights.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
              <div style={{ fontSize: 16, color: "#6b7280" }}>No insights available yet</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
              {insights.map((insight, index) => (
                <div
                  key={index}
                  style={{
                    background: "#fff",
                    borderRadius: 12,
                    padding: 16,
                    border: `2px solid ${getTypeColor(insight.type)}20`,
                    borderLeft: `4px solid ${getTypeColor(insight.type)}`,
                    transition: "transform 0.2s, box-shadow 0.2s",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  {/* HEADER */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 24 }}>{insight.icon}</span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: getTypeColor(insight.type),
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                        }}
                      >
                        {insight.type}
                      </span>
                    </div>
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: getSeverityColor(insight.severity),
                      }}
                    />
                  </div>

                  {/* TITLE */}
                  <h4
                    style={{
                      margin: "0 0 8px 0",
                      fontSize: 15,
                      fontWeight: 800,
                      color: "#111827",
                      lineHeight: 1.3,
                    }}
                  >
                    {insight.title}
                  </h4>

                  {/* DESCRIPTION */}
                  <p style={{ margin: "0 0 12px 0", fontSize: 13, color: "#374151", lineHeight: 1.5 }}>
                    {insight.description}
                  </p>

                  {/* ACTION */}
                  {insight.action && (
                    <div
                      style={{
                        padding: "8px 12px",
                        background: `${getTypeColor(insight.type)}10`,
                        borderRadius: 8,
                        fontSize: 12,
                        color: getTypeColor(insight.type),
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span>💡</span>
                      <span>{insight.action}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* REFRESH BUTTON */}
          {!loading && (
            <div style={{ marginTop: 20, textAlign: "center" }}>
              <button
                onClick={() => generateInsights({ silent: false })}
                style={{
                  padding: "12px 24px",
                  fontSize: 14,
                  fontWeight: 800,
                  background: "linear-gradient(135deg, #667eea 0%, #f5576c 100%)",
                  border: "none",
                  borderRadius: 10,
                  color: "#fff",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
                }}
              >
                🔄 Refresh Insights
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
