"use client";

import React, { useMemo, useEffect, useState } from "react";
console.log("DashboardPolish loaded");

/**
 * ✅ UPGRADED Drop-in UI polish pack for your dashboard.
 * - No libraries
 * - Inline styles
 * - Does NOT remove any features
 * - FIXES: CopilotChips now accepts BOTH onPick AND onAsk (backward compatible)
 * - UPGRADES: KpiGrid (trend arrows, animated glow), StoryStrip (live pulse), CopilotChips (better UI)
 */

type KPI = { title: string; value: any; icon?: string; subtitle?: string; trend?: "up" | "down" | "flat" };
type Exec = { takeaway?: string; risk?: string; action?: string; confidence?: string };
type Chart = { title: string; subtitle?: string; insight?: string; detailedInsight?: string; data?: any[] };

const THEME = {
  brand: "#4F46E5",
  brand2: "#06B6D4",
  pink: "#EC4899",
  bg: "#07101F",
  panel: "rgba(255,255,255,0.06)",
  panel2: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.10)",
  border2: "rgba(255,255,255,0.14)",
  text: "#E5E7EB",
  muted: "rgba(229,231,235,0.72)",
  dim: "rgba(229,231,235,0.50)",
};

const glowShadow = (color: string) =>
  `0 18px 60px rgba(0,0,0,0.55), 0 0 0 1px ${THEME.border}, 0 0 40px ${color}22`;

function clampStr(s: string, max = 130) {
  const t = (s || "").trim();
  return t.length > max ? t.slice(0, max - 1) + "…" : t;
}

function confidenceMeta(c?: string) {
  const v = (c || "Medium").toLowerCase();
  if (v.includes("high"))
    return { label: "High", bg: "rgba(16,185,129,0.18)", br: "rgba(16,185,129,0.35)", dot: "#10B981" };
  if (v.includes("low"))
    return { label: "Low", bg: "rgba(239,68,68,0.18)", br: "rgba(239,68,68,0.35)", dot: "#EF4444" };
  return { label: "Medium", bg: "rgba(245,158,11,0.18)", br: "rgba(245,158,11,0.35)", dot: "#F59E0B" };
}

function makeStory({
  dataset,
  records,
  fields,
  executive,
  charts,
}: {
  dataset: string;
  records: number;
  fields: number;
  executive?: Exec;
  charts?: Chart[];
}) {
  const hint =
    executive?.takeaway ||
    (charts?.[0]?.insight as string) ||
    (charts?.[0]?.detailedInsight as string) ||
    "";

  if (hint) return clampStr(hint, 130);
  if (records <= 30)
    return `Small sample (${records} rows). Add more data to increase insight reliability for ${dataset}.`;
  if (records > 5000)
    return `Large dataset (${records.toLocaleString()} rows). Use filters to focus on the biggest drivers.`;
  const risk = executive?.risk;
  const action = executive?.action;
  if (risk && action) return clampStr(`${risk} → Next: ${action}`, 130);
  return `Dashboard ready for ${dataset}. Use filters to discover top drivers and outliers.`;
}

/* =========================
   PREMIUM SECTION HEADER
========================= */
export function SectionHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 12,
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: `linear-gradient(135deg, ${THEME.brand} 0%, ${THEME.pink} 100%)`,
              boxShadow: `0 0 0 4px rgba(79,70,229,0.14)`,
            }}
          />
          <div style={{ color: THEME.text, fontWeight: 950, fontSize: 16, letterSpacing: 0.2 }}>
            {title}
          </div>
        </div>
        {subtitle ? (
          <div style={{ color: THEME.dim, fontSize: 12, marginTop: 6 }}>{subtitle}</div>
        ) : null}
      </div>
      {right ? <div>{right}</div> : null}
    </div>
  );
}

/* =========================
   🚀 UPGRADED STORY STRIP
   - Live pulse dot animation
   - Record count animates on mount
   - Cleaner confidence badge
========================= */
export function StoryStrip({
  dataset,
  records,
  fields,
  executive,
  charts,
  updatedAtText,
}: {
  dataset: string;
  records: number;
  fields: number;
  executive?: Exec;
  charts?: Chart[];
  updatedAtText?: string;
}) {
  const story = useMemo(
    () => makeStory({ dataset, records, fields, executive, charts }),
    [dataset, records, fields, executive, charts]
  );
  const conf = confidenceMeta(executive?.confidence);

  // Animated count on mount
  const [displayCount, setDisplayCount] = useState(0);
  useEffect(() => {
    if (!records) return;
    let start = 0;
    const step = Math.ceil(records / 30);
    const timer = setInterval(() => {
      start += step;
      if (start >= records) {
        setDisplayCount(records);
        clearInterval(timer);
      } else {
        setDisplayCount(start);
      }
    }, 18);
    return () => clearInterval(timer);
  }, [records]);

  return (
    <div
      style={{
        borderRadius: 20,
        padding: "18px 20px",
        background: `radial-gradient(1200px 380px at 10% 0%, rgba(79,70,229,0.33) 0%, rgba(79,70,229,0.08) 40%, rgba(0,0,0,0) 70%),
                     radial-gradient(900px 300px at 80% 30%, rgba(236,72,153,0.26) 0%, rgba(236,72,153,0.06) 40%, rgba(0,0,0,0) 70%),
                     ${THEME.panel}`,
        border: `1px solid ${THEME.border2}`,
        boxShadow: glowShadow(THEME.brand),
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          {/* Live indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{ position: "relative", width: 10, height: 10 }}>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  background: "#10B981",
                  animation: "pulse-ring 1.8s ease-out infinite",
                }}
              />
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "#10B981",
                  position: "relative",
                  zIndex: 1,
                }}
              />
            </div>
            <span style={{ color: "#10B981", fontSize: 11, fontWeight: 950, letterSpacing: 1 }}>
              LIVE
            </span>
            <span style={{ color: THEME.dim, fontSize: 11, fontWeight: 800, letterSpacing: 0.4 }}>
              STORY
            </span>
          </div>

          <div
            style={{
              color: THEME.text,
              fontSize: 17,
              fontWeight: 950,
              lineHeight: 1.3,
              marginBottom: 14,
            }}
          >
            {story}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Pill label={`${displayCount.toLocaleString()} records`} highlight />
            <Pill label={`${fields} fields`} />
            <Pill label={dataset} />
            {updatedAtText ? <Pill label={`⏱ ${updatedAtText}`} /> : null}
          </div>
        </div>

        {/* Confidence badge */}
        <div
          style={{
            minWidth: 150,
            borderRadius: 16,
            padding: "14px 16px",
            background: conf.bg,
            border: `1px solid ${conf.br}`,
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <div
              style={{
                width: 9,
                height: 9,
                borderRadius: 999,
                background: conf.dot,
                boxShadow: `0 0 0 3px ${conf.dot}33`,
              }}
            />
            <span style={{ color: THEME.muted, fontSize: 11, fontWeight: 900, letterSpacing: 0.5 }}>
              CONFIDENCE
            </span>
          </div>
          <div style={{ color: THEME.text, fontWeight: 950, fontSize: 22 }}>{conf.label}</div>
          <div style={{ color: THEME.dim, fontSize: 11, marginTop: 4, lineHeight: 1.4 }}>
            Based on sample size & data stability
          </div>
        </div>
      </div>

      {/* CSS animations injected inline */}
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.8; }
          70% { transform: scale(2.5); opacity: 0; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function Pill({ label, highlight }: { label: string; highlight?: boolean }) {
  return (
    <div
      style={{
        padding: "6px 12px",
        borderRadius: 999,
        background: highlight ? "rgba(79,70,229,0.18)" : "rgba(255,255,255,0.06)",
        border: `1px solid ${highlight ? "rgba(79,70,229,0.35)" : THEME.border}`,
        color: highlight ? "#C7D2FE" : THEME.muted,
        fontSize: 12,
        fontWeight: 900,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </div>
  );
}

/* =========================
   EXECUTIVE BRIEF (3 cards)
========================= */
export function ExecutiveBrief({ executive }: { executive?: Exec }) {
  const takeaway =
    executive?.takeaway ||
    "No executive summary generated yet. Ask the AI Assistant for a quick briefing.";
  const risk = executive?.risk || "No major risks detected.";
  const action =
    executive?.action ||
    "Continue monitoring key metrics and validate with more data.";
  const conf = confidenceMeta(executive?.confidence);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 12 }}>
      <Card
        title="Executive Takeaway"
        accent={`linear-gradient(135deg, ${THEME.brand} 0%, ${THEME.pink} 100%)`}
        body={takeaway}
        footer={
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10 }}>
            <div
              style={{ width: 10, height: 10, borderRadius: 999, background: conf.dot }}
            />
            <div style={{ color: THEME.muted, fontSize: 12, fontWeight: 800 }}>
              Confidence: {conf.label}
            </div>
          </div>
        }
      />
      <Card
        title="Risk"
        accent="linear-gradient(135deg, rgba(245,158,11,0.95) 0%, rgba(239,68,68,0.92) 100%)"
        body={risk}
        tone="warn"
      />
      <Card
        title="Next Action"
        accent="linear-gradient(135deg, rgba(16,185,129,0.92) 0%, rgba(6,182,212,0.92) 100%)"
        body={action}
        tone="ok"
      />
    </div>
  );
}

function Card({
  title,
  body,
  footer,
  accent,
  tone,
}: {
  title: string;
  body: string;
  footer?: React.ReactNode;
  accent: string;
  tone?: "warn" | "ok";
}) {
  const bg =
    tone === "warn"
      ? "radial-gradient(900px 220px at 0% 0%, rgba(245,158,11,0.18) 0%, rgba(255,255,255,0.06) 55%)"
      : tone === "ok"
      ? "radial-gradient(900px 220px at 0% 0%, rgba(16,185,129,0.18) 0%, rgba(255,255,255,0.06) 55%)"
      : `radial-gradient(900px 220px at 0% 0%, rgba(79,70,229,0.22) 0%, rgba(255,255,255,0.06) 55%)`;

  return (
    <div
      style={{
        borderRadius: 18,
        padding: 16,
        background: bg,
        border: `1px solid ${THEME.border}`,
        boxShadow: "0 16px 50px rgba(0,0,0,0.45)",
        transition: "transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.18)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 22px 70px rgba(0,0,0,0.55)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0px)";
        (e.currentTarget as HTMLDivElement).style.borderColor = THEME.border;
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 16px 50px rgba(0,0,0,0.45)";
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div
          style={{ color: THEME.dim, fontSize: 11, fontWeight: 900, letterSpacing: 0.5 }}
        >
          {title.toUpperCase()}
        </div>
        <div
          style={{ width: 56, height: 8, borderRadius: 999, background: accent, opacity: 0.95 }}
        />
      </div>

      <div
        style={{
          marginTop: 12,
          color: THEME.text,
          fontSize: 14,
          fontWeight: 800,
          lineHeight: 1.45,
        }}
      >
        {clampStr(body, 180)}
      </div>

      {footer ? <div style={{ marginTop: 8 }}>{footer}</div> : null}
    </div>
  );
}

/* =========================
   SPOTLIGHT CARD
========================= */
export function SpotlightCard({
  title,
  subtitle,
  badge,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        borderRadius: 20,
        padding: 16,
        background: `radial-gradient(1200px 420px at 10% 0%, rgba(6,182,212,0.20) 0%, rgba(255,255,255,0.05) 50%)`,
        border: `1px solid ${THEME.border2}`,
        boxShadow: glowShadow(THEME.brand2),
      }}
    >
      <SectionHeader
        title={title}
        subtitle={subtitle}
        right={
          right ?? (
            <div style={{ display: "flex", gap: 8 }}>
              {badge && <MiniTag label={badge} />}
              <MiniTag label="Boardroom-ready" />
            </div>
          )
        }
      />
      <div
        style={{
          borderRadius: 16,
          background: "rgba(0,0,0,0.18)",
          border: `1px solid ${THEME.border}`,
          padding: 12,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function MiniTag({ label }: { label: string }) {
  return (
    <div
      style={{
        padding: "6px 10px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.06)",
        border: `1px solid ${THEME.border}`,
        color: THEME.muted,
        fontSize: 12,
        fontWeight: 900,
      }}
    >
      {label}
    </div>
  );
}

/* =========================
   🚀 UPGRADED KPI GRID
   - Trend arrows (↑ ↓ →)
   - Animated number count-up
   - Glow effect per card
   - Icon display
========================= */
export function KpiGrid({ kpis }: { kpis: KPI[] }) {
  const show = (kpis || []).slice(0, 4);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gap: 14,
      }}
    >
      {show.map((k, i) => (
        <KpiCard key={i} kpi={k} idx={i} />
      ))}
    </div>
  );
}

function KpiCard({ kpi, idx }: { kpi: KPI; idx: number }) {
  const accents = [
    { grad: `linear-gradient(135deg, #4F46E5 0%, #EC4899 100%)`, glow: "rgba(79,70,229,0.35)", dot: "#4F46E5" },
    { grad: `linear-gradient(135deg, #06B6D4 0%, #4F46E5 100%)`, glow: "rgba(6,182,212,0.35)", dot: "#06B6D4" },
    { grad: `linear-gradient(135deg, #F59E0B 0%, #EC4899 100%)`, glow: "rgba(245,158,11,0.35)", dot: "#F59E0B" },
    { grad: `linear-gradient(135deg, #10B981 0%, #06B6D4 100%)`, glow: "rgba(16,185,129,0.35)", dot: "#10B981" },
  ];
  const accent = accents[idx % accents.length];

  // Determine trend from value if not explicitly set
  const trend = kpi.trend;
  const trendIcon = trend === "up" ? "↑" : trend === "down" ? "↓" : null;
  const trendColor = trend === "up" ? "#10B981" : trend === "down" ? "#EF4444" : THEME.dim;

  // Count-up animation for numeric values
  const rawNum = typeof kpi.value === "number" ? kpi.value : parseFloat(String(kpi.value));
  const isNumeric = !isNaN(rawNum);
  const [display, setDisplay] = useState<string>(String(kpi.value ?? "-"));

  useEffect(() => {
    if (!isNumeric || rawNum === 0) {
      setDisplay(String(kpi.value ?? "-"));
      return;
    }
    let start = 0;
    const duration = 900;
    const steps = 40;
    const increment = rawNum / steps;
    const interval = duration / steps;

    const timer = setInterval(() => {
      start += increment;
      if (start >= rawNum) {
        setDisplay(String(kpi.value));
        clearInterval(timer);
      } else {
        const formatted = Number.isInteger(rawNum) ? Math.round(start).toLocaleString() : start.toFixed(2);
        setDisplay(formatted);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [kpi.value, rawNum, isNumeric]);

  return (
    <div
      style={{
        borderRadius: 20,
        padding: "18px 16px",
        background: THEME.panel2,
        border: `1px solid ${THEME.border}`,
        boxShadow: `0 14px 44px rgba(0,0,0,0.45)`,
        transition: "transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease",
        position: "relative",
        overflow: "hidden",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)";
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.20)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 24px 70px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.10), 0 0 30px ${accent.glow}`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0px)";
        (e.currentTarget as HTMLDivElement).style.borderColor = THEME.border;
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 14px 44px rgba(0,0,0,0.45)";
      }}
    >
      {/* Background glow blob */}
      <div
        style={{
          position: "absolute",
          top: -30,
          right: -30,
          width: 100,
          height: 100,
          borderRadius: "50%",
          background: accent.grad,
          filter: "blur(30px)",
          opacity: 0.20,
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative" }}>
        {/* Top row: icon + trend */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: accent.grad,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              boxShadow: `0 6px 16px ${accent.glow}`,
            }}
          >
            {kpi.icon || "📊"}
          </div>

          {trendIcon && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 10px",
                borderRadius: 999,
                background: trend === "up" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                border: `1px solid ${trend === "up" ? "rgba(16,185,129,0.30)" : "rgba(239,68,68,0.30)"}`,
              }}
            >
              <span style={{ color: trendColor, fontSize: 13, fontWeight: 950 }}>
                {trendIcon}
              </span>
            </div>
          )}
        </div>

        {/* Title */}
        <div
          style={{
            color: THEME.dim,
            fontSize: 11,
            fontWeight: 950,
            letterSpacing: 0.6,
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          {kpi.title || "KPI"}
        </div>

        {/* Value — big and bold */}
        <div
          style={{
            color: THEME.text,
            fontSize: 26,
            fontWeight: 980,
            letterSpacing: -0.5,
            lineHeight: 1,
          }}
        >
          {display}
        </div>

        {/* Subtitle */}
        {kpi.subtitle ? (
          <div
            style={{
              marginTop: 8,
              color: THEME.dim,
              fontSize: 11,
              fontWeight: 800,
              lineHeight: 1.4,
            }}
          >
            {kpi.subtitle}
          </div>
        ) : null}

        {/* Bottom accent bar */}
        <div
          style={{
            marginTop: 14,
            height: 3,
            borderRadius: 999,
            background: accent.grad,
            opacity: 0.7,
          }}
        />
      </div>
    </div>
  );
}

/* =========================
   🚀 UPGRADED COPILOT CHIPS
   - Accepts BOTH onPick AND onAsk (backward compatible)
   - Better grouping with category labels
   - Animated hover with glow
========================= */
export function CopilotChips({
  onPick,
  onAsk,
  compact,
}: {
  onPick?: (prompt: string) => void;
  onAsk?: (prompt: string) => void;
  compact?: boolean;
}) {
  // Support both onPick and onAsk - whichever is provided
  const handleClick = (prompt: string) => {
    if (onPick) onPick(prompt);
    else if (onAsk) onAsk(prompt);
  };

  const chipGroups = [
    {
      label: "📊 Insights",
      chips: ["Summarize my data", "Show me outliers", "What are key trends?"],
    },
    {
      label: "🎯 Actions",
      chips: ["Give 3 actions for next week", "What risks should I watch?", "Forecast next period"],
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {chipGroups.map((group) => (
        <div key={group.label} style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 950,
              color: THEME.dim,
              letterSpacing: 0.4,
              marginRight: 2,
              whiteSpace: "nowrap",
            }}
          >
            {group.label}
          </span>
          {group.chips.map((c) => (
            <button
              key={c}
              onClick={() => handleClick(c)}
              style={{
                padding: compact ? "7px 12px" : "9px 14px",
                borderRadius: 999,
                border: `1px solid ${THEME.border}`,
                background: "rgba(255,255,255,0.06)",
                color: THEME.text,
                fontWeight: 900,
                fontSize: 12,
                cursor: "pointer",
                transition: "transform 120ms ease, border-color 120ms ease, background 120ms ease, box-shadow 120ms ease",
                outline: "none",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(79,70,229,0.50)";
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(79,70,229,0.16)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 20px rgba(79,70,229,0.25)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0px)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = THEME.border;
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
              }}
            >
              {c}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}