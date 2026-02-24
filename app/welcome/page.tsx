"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

// ─── DASHBOARD PREVIEW MINI COMPONENTS ───────────────────────
const MiniBarChart = () => (
  <svg width="100%" height="60" viewBox="0 0 120 60">
    {[20, 45, 30, 55, 40, 60, 35].map((h, i) => (
      <rect
        key={i}
        x={i * 17 + 2}
        y={60 - h}
        width={13}
        height={h}
        rx={3}
        fill={`rgba(99,102,241,${0.4 + i * 0.08})`}
        style={{
          animation: `barRise 0.6s ease ${i * 0.08}s both`,
        }}
      />
    ))}
  </svg>
);

const MiniDonut = () => (
  <svg width="60" height="60" viewBox="0 0 60 60">
    <circle cx="30" cy="30" r="22" fill="none" stroke="rgba(99,102,241,0.15)" strokeWidth="10" />
    <circle cx="30" cy="30" r="22" fill="none" stroke="#6366F1" strokeWidth="10"
      strokeDasharray="69 69" strokeDashoffset="0" strokeLinecap="round"
      transform="rotate(-90 30 30)" style={{ animation: "donutFill 1s ease 0.3s both" }} />
    <circle cx="30" cy="30" r="22" fill="none" stroke="#EC4899" strokeWidth="10"
      strokeDasharray="35 103" strokeDashoffset="-69" strokeLinecap="round"
      transform="rotate(-90 30 30)" />
    <circle cx="30" cy="30" r="14" fill="rgba(15,23,42,0.95)" />
    <text x="30" y="34" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="800">57%</text>
  </svg>
);

const MiniLineChart = () => (
  <svg width="100%" height="50" viewBox="0 0 120 50">
    <defs>
      <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#6366F1" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
      </linearGradient>
    </defs>
    <path d="M0,40 L20,28 L40,32 L60,15 L80,22 L100,8 L120,12" fill="none"
      stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round"
      style={{ strokeDasharray: 300, strokeDashoffset: 300, animation: "drawLine 1.2s ease 0.2s forwards" }} />
    <path d="M0,40 L20,28 L40,32 L60,15 L80,22 L100,8 L120,12 L120,50 L0,50Z"
      fill="url(#lineGrad)" opacity="0.6" />
  </svg>
);

// ─── FEATURE CARDS DATA ───────────────────────────────────────
const FEATURES = [
  {
    icon: "📊",
    title: "Smart Dashboards",
    desc: "Upload any CSV/Excel and instantly get 8 chart types — pie, bar, line, donut, heatmap, gauge, radar, treemap.",
    color: "#6366F1",
    glow: "rgba(99,102,241,0.35)",
    preview: <MiniBarChart />,
    tag: "8 Chart Types",
  },
  {
    icon: "🤖",
    title: "AI Assistant",
    desc: "Ask questions in plain English. Get data-driven answers, insights, and business recommendations instantly.",
    color: "#EC4899",
    glow: "rgba(236,72,153,0.35)",
    preview: (
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", lineHeight: 1.5, padding: "4px 0" }}>
        <div style={{ color: "#EC4899", fontWeight: 800, marginBottom: 4 }}>🤖 AI says:</div>
        <div>"Sales peaked on Friday with 34% above average. Top performer: Chris Martin."</div>
      </div>
    ),
    tag: "Groq AI Powered",
  },
  {
    icon: "📈",
    title: "Advanced Analytics",
    desc: "Trend analysis, dataset comparison, Pearson correlation, and AI-powered forecasting all in one place.",
    color: "#06B6D4",
    glow: "rgba(6,182,212,0.35)",
    preview: <MiniLineChart />,
    tag: "4 Analytics Modes",
  },
  {
    icon: "📄",
    title: "Professional Reports",
    desc: "Export beautiful multi-page PDFs with chart images, Excel files, and CSV — share-ready in seconds.",
    color: "#10B981",
    glow: "rgba(16,185,129,0.35)",
    preview: (
      <div style={{ display: "flex", gap: 6, justifyContent: "center", paddingTop: 4 }}>
        {["PDF", "XLSX", "CSV"].map((t) => (
          <div key={t} style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.4)", fontSize: 11, fontWeight: 800, color: "#10B981" }}>{t}</div>
        ))}
      </div>
    ),
    tag: "3 Export Formats",
  },
  {
    icon: "⚡",
    title: "Real-Time Updates",
    desc: "Dashboards refresh every 30 seconds automatically. Live Supabase subscriptions keep data fresh.",
    color: "#F59E0B",
    glow: "rgba(245,158,11,0.35)",
    preview: (
      <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", paddingTop: 4 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981", boxShadow: "0 0 8px #10B981", animation: "pulse 1.5s infinite" }} />
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: 700 }}>Live — Updated 2s ago</span>
      </div>
    ),
    tag: "30s Auto-Refresh",
  },
  {
    icon: "🎨",
    title: "Ready Templates",
    desc: "Pre-built dashboards for Sales, Marketing, HR, and Finance. Start exploring in one click.",
    color: "#8B5CF6",
    glow: "rgba(139,92,246,0.35)",
    preview: (
      <div style={{ display: "flex", gap: 5, justifyContent: "center", flexWrap: "wrap", paddingTop: 4 }}>
        {["Sales", "HR", "Finance", "Marketing"].map((t) => (
          <div key={t} style={{ padding: "3px 9px", borderRadius: 6, background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.4)", fontSize: 10, fontWeight: 700, color: "#A78BFA" }}>{t}</div>
        ))}
      </div>
    ),
    tag: "4 Templates",
  },
];

// ─── NAV ITEMS ────────────────────────────────────────────────
const NAV_ITEMS = [
  { icon: "📊", label: "Dashboard", desc: "View your data visualizations", href: "/dashboard", color: "#6366F1" },
  { icon: "📈", label: "Analytics", desc: "Advanced analysis tools", href: "/analytics", color: "#06B6D4" },
  { icon: "📋", label: "Tables", desc: "View and manage data", href: "/data", color: "#10B981" },
  { icon: "⬆️", label: "Upload", desc: "Import new datasets", href: "/upload", color: "#F59E0B" },
  { icon: "🎨", label: "Templates", desc: "Pre-built dashboards", href: "/templates", color: "#8B5CF6" },
  { icon: "⚙️", label: "Branding", desc: "Customize your look", href: "/branding", color: "#EC4899" },
];

// ─── MAIN COMPONENT ───────────────────────────────────────────
export default function WelcomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [page, setPage] = useState(1); // 1 = intro, 2 = get started
  const [transitioning, setTransitioning] = useState(false);
  const [visible, setVisible] = useState(false);
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);
  const [hoveredNav, setHoveredNav] = useState<number | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      if (!supabase) { router.push("/auth"); return; }
      const { data } = await supabase.auth.getUser();
      if (!data.user) { router.push("/auth"); return; }
      setUserEmail(data.user.email || "");
      setLoading(false);
      setTimeout(() => setVisible(true), 80);
    };
    checkAuth();
  }, [router]);

  const goToPage2 = () => {
    setTransitioning(true);
    setTimeout(() => {
      setPage(2);
      setTransitioning(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 420);
  };

  const goToPage1 = () => {
    setTransitioning(true);
    setTimeout(() => {
      setPage(1);
      setTransitioning(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 420);
  };

  if (loading) {
    return (
      <div style={S.loadingPage}>
        <div style={S.loadingSpinner} />
        <div style={{ fontSize: 18, fontWeight: 800, color: "rgba(255,255,255,0.8)", marginTop: 20 }}>Loading R&K Analytics...</div>
      </div>
    );
  }

  return (
    <>
      {/* Global keyframe styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:wght@400;500;700&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes slideLeft { from { opacity:1; transform:translateX(0); } to { opacity:0; transform:translateX(-60px); } }
        @keyframes slideRight { from { opacity:1; transform:translateX(0); } to { opacity:0; transform:translateX(60px); } }
        @keyframes slideInLeft { from { opacity:0; transform:translateX(60px); } to { opacity:1; transform:translateX(0); } }
        @keyframes slideInRight { from { opacity:0; transform:translateX(-60px); } to { opacity:1; transform:translateX(0); } }
        @keyframes barRise { from { transform:scaleY(0); transform-origin:bottom; } to { transform:scaleY(1); } }
        @keyframes drawLine { to { stroke-dashoffset:0; } }
        @keyframes donutFill { from { stroke-dasharray:0 138; } to { stroke-dasharray:69 69; } }
        @keyframes pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.6; transform:scale(1.3); } }
        @keyframes floatOrb { 0%,100% { transform:translateY(0) scale(1); } 50% { transform:translateY(-24px) scale(1.04); } }
        @keyframes shimmer { 0% { background-position:-200% 0; } 100% { background-position:200% 0; } }
        @keyframes starTwinkle { 0%,100% { opacity:0.3; } 50% { opacity:1; } }
        @keyframes progressFill { from { width:0%; } to { width:50%; } }
        .feature-card:hover { transform:translateY(-6px) scale(1.02) !important; }
        .nav-card:hover { transform:translateY(-4px) !important; }
        .step-card:hover { transform:translateY(-4px) !important; }
        .next-btn:hover { transform:scale(1.04) !important; box-shadow:0 20px 50px rgba(99,102,241,0.55) !important; }
        .back-btn:hover { border-color:rgba(255,255,255,0.4) !important; }
        .go-btn:hover { opacity:0.88 !important; transform:scale(1.03) !important; }
      `}</style>

      <div style={{
        ...S.page,
        animation: transitioning ? (page === 1 ? "slideLeft 0.42s ease forwards" : "slideRight 0.42s ease forwards") : (visible ? "fadeIn 0.5s ease forwards" : "none"),
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}>

        {/* ── BACKGROUND ORBS ── */}
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
          <div style={{ position: "absolute", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.13) 0%, transparent 70%)", top: "-200px", left: "-200px", animation: "floatOrb 8s ease-in-out infinite" }} />
          <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(236,72,153,0.10) 0%, transparent 70%)", bottom: "10%", right: "-100px", animation: "floatOrb 10s ease-in-out infinite reverse" }} />
          <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)", top: "40%", left: "30%", animation: "floatOrb 12s ease-in-out infinite 2s" }} />
          {/* Star dots */}
          {[...Array(20)].map((_, i) => (
            <div key={i} style={{
              position: "absolute",
              width: Math.random() * 2 + 1,
              height: Math.random() * 2 + 1,
              borderRadius: "50%",
              background: "#fff",
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animation: `starTwinkle ${2 + Math.random() * 3}s ease-in-out infinite ${Math.random() * 2}s`,
            }} />
          ))}
        </div>

        {/* ── TOP BAR ── */}
        <div style={S.topBar}>
          <div style={S.topLogo}>
            <div style={S.topLogoIcon}>R&K</div>
            <span style={S.topLogoText}>Analytics</span>
          </div>
          <div style={S.topRight}>
            {/* Page dots */}
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ width: page === 1 ? 24 : 8, height: 8, borderRadius: 4, background: page === 1 ? "#6366F1" : "rgba(255,255,255,0.25)", transition: "all 0.3s" }} />
              <div style={{ width: page === 2 ? 24 : 8, height: 8, borderRadius: 4, background: page === 2 ? "#6366F1" : "rgba(255,255,255,0.25)", transition: "all 0.3s" }} />
            </div>
            <div style={S.userPill}>👋 {userEmail}</div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════ */}
        {/* PAGE 1 — HERO + FEATURES                          */}
        {/* ═══════════════════════════════════════════════════ */}
        {page === 1 && (
          <div style={{ animation: "fadeUp 0.5s ease both", position: "relative", zIndex: 1 }}>

            {/* HERO */}
            <section style={S.hero}>
              <div style={{ ...S.heroTag, animation: "fadeUp 0.4s ease 0.1s both" }}>
                ✨ AI-Powered Business Intelligence
              </div>
              <h1 style={{ ...S.heroTitle, animation: "fadeUp 0.5s ease 0.2s both" }}>
                Welcome to{" "}
                <span style={{ background: "linear-gradient(135deg, #6366F1, #EC4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  R&K Analytics
                </span>
              </h1>
              <p style={{ ...S.heroSub, animation: "fadeUp 0.5s ease 0.3s both" }}>
                Transform your data into actionable insights — real-time analytics,<br />
                AI-powered recommendations, and professional reporting.
              </p>

              {/* MINI DASHBOARD PREVIEW */}
              <div style={{ ...S.dashPreview, animation: "fadeUp 0.6s ease 0.4s both" }}>
                <div style={S.dashPreviewHeader}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#EF4444" }} />
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#F59E0B" }} />
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#10B981" }} />
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 700 }}>R&K Dashboard — Live Preview</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981", animation: "pulse 1.5s infinite" }} />
                    <span style={{ fontSize: 10, color: "#10B981", fontWeight: 700 }}>LIVE</span>
                  </div>
                </div>
                <div style={S.dashPreviewBody}>
                  {/* KPI row */}
                  <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                    {[
                      { label: "Total Records", val: "1,284", color: "#6366F1" },
                      { label: "Avg Revenue", val: "$4,820", color: "#EC4899" },
                      { label: "Growth", val: "+18.4%", color: "#10B981" },
                    ].map((k) => (
                      <div key={k.label} style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "10px 12px", border: `1px solid ${k.color}30` }}>
                        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", marginBottom: 3, fontWeight: 700 }}>{k.label}</div>
                        <div style={{ fontSize: 16, fontWeight: 900, color: k.color }}>{k.val}</div>
                      </div>
                    ))}
                  </div>
                  {/* Charts row */}
                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ flex: 2, background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "10px 14px", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", fontWeight: 700, marginBottom: 4 }}>Revenue Trend</div>
                      <MiniLineChart />
                    </div>
                    <div style={{ flex: 1, background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "10px", border: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", fontWeight: 700, marginBottom: 4 }}>Status</div>
                      <MiniDonut />
                    </div>
                  </div>
                  {/* Bar */}
                  <div style={{ marginTop: 10, background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "10px 14px", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", fontWeight: 700, marginBottom: 4 }}>Sales by Region</div>
                    <MiniBarChart />
                  </div>
                </div>
              </div>
            </section>

            {/* WHAT YOU CAN DO */}
            <section style={S.featuresSection}>
              <div style={S.sectionLabel}>CAPABILITIES</div>
              <h2 style={S.sectionTitle}>✨ What You Can Do</h2>
              <p style={S.sectionSub}>Everything you need to turn raw data into business decisions</p>

              <div style={S.featureGrid}>
                {FEATURES.map((f, i) => (
                  <div
                    key={f.title}
                    className="feature-card"
                    onMouseEnter={() => setHoveredFeature(i)}
                    onMouseLeave={() => setHoveredFeature(null)}
                    style={{
                      ...S.featureCard,
                      borderColor: hoveredFeature === i ? `${f.color}60` : "rgba(255,255,255,0.07)",
                      boxShadow: hoveredFeature === i ? `0 20px 50px ${f.glow}` : "0 4px 20px rgba(0,0,0,0.3)",
                      animation: `fadeUp 0.5s ease ${0.1 + i * 0.07}s both`,
                      transition: "all 0.3s ease",
                    }}
                  >
                    {/* Top row */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
                      <div style={{ ...S.featureIconBox, background: `${f.color}20`, border: `1px solid ${f.color}40` }}>
                        <span style={{ fontSize: 26 }}>{f.icon}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ ...S.featureTitle }}>{f.title}</div>
                        <div style={{ padding: "3px 8px", borderRadius: 6, background: `${f.color}18`, border: `1px solid ${f.color}35`, display: "inline-block", fontSize: 10, fontWeight: 800, color: f.color, marginTop: 4 }}>{f.tag}</div>
                      </div>
                    </div>
                    {/* Description */}
                    <p style={S.featureDesc}>{f.desc}</p>
                    {/* Preview */}
                    <div style={{ ...S.featurePreview, borderColor: `${f.color}20` }}>
                      {f.preview}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* NEXT BUTTON */}
            <div style={S.nextSection}>
              <div style={S.nextHint}>Looks good? Let's get you started →</div>
              <button className="next-btn" onClick={goToPage2} style={S.nextBtn}>
                Continue to Setup
                <span style={{ marginLeft: 10, fontSize: 20 }}>→</span>
              </button>
              <div style={{ marginTop: 16, fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
                Step 1 of 2 — See how to get started
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════ */}
        {/* PAGE 2 — GET STARTED + NAVIGATION                 */}
        {/* ═══════════════════════════════════════════════════ */}
        {page === 2 && (
          <div style={{ animation: "slideInLeft 0.45s ease both", position: "relative", zIndex: 1 }}>

            {/* Back button */}
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 24px 0" }}>
              <button className="back-btn" onClick={goToPage1} style={S.backBtn}>
                ← Back
              </button>
            </div>

            {/* GET STARTED */}
            <section style={S.stepsSection}>
              <div style={S.sectionLabel}>QUICK SETUP</div>
              <h2 style={S.sectionTitle}>🚀 Get Started in 3 Steps</h2>
              <p style={S.sectionSub}>Choose your path and start analyzing data in minutes</p>

              <div style={S.stepsGrid}>
                {[
                  {
                    num: "01",
                    icon: "📁",
                    title: "Upload Your Data",
                    desc: "Import CSV or Excel files with any columns — we'll automatically adapt and understand your data structure.",
                    action: "Start Upload",
                    href: "/upload",
                    color: "#6366F1",
                  },
                  {
                    num: "02",
                    icon: "🎯",
                    title: "Or Use a Template",
                    desc: "Browse pre-built dashboards with sample data to explore all features instantly. No file needed.",
                    action: "Browse Templates",
                    href: "/home",
                    color: "#EC4899",
                  },
                  {
                    num: "03",
                    icon: "🔬",
                    title: "Explore Features",
                    desc: "Check out analytics, customize branding, and ask the AI assistant anything about your data.",
                    action: "Go to Dashboard",
                    href: "/dashboard",
                    color: "#06B6D4",
                  },
                ].map((step, i) => (
                  <div
                    key={step.num}
                    className="step-card"
                    style={{
                      ...S.stepCard,
                      borderColor: `${step.color}30`,
                      animation: `fadeUp 0.5s ease ${0.1 + i * 0.1}s both`,
                      transition: "all 0.3s ease",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                      <div style={{ ...S.stepNumBadge, background: `${step.color}18`, border: `1px solid ${step.color}40`, color: step.color }}>{step.num}</div>
                      <div style={{ fontSize: 40 }}>{step.icon}</div>
                    </div>
                    <div style={S.stepTitle}>{step.title}</div>
                    <p style={S.stepDesc}>{step.desc}</p>
                    <button
                      className="go-btn"
                      onClick={() => router.push(step.href)}
                      style={{ ...S.stepBtn, background: `linear-gradient(135deg, ${step.color} 0%, ${step.color}BB 100%)` }}
                    >
                      🚀 {step.action}
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* QUICK NAVIGATION */}
            <section style={S.navSection}>
              <div style={S.sectionLabel}>NAVIGATION</div>
              <h2 style={S.sectionTitle}>🧭 Quick Navigation</h2>
              <p style={S.sectionSub}>Jump directly to any part of the platform</p>

              <div style={S.navGrid}>
                {NAV_ITEMS.map((n, i) => (
                  <button
                    key={n.label}
                    className="nav-card"
                    onClick={() => router.push(n.href)}
                    onMouseEnter={() => setHoveredNav(i)}
                    onMouseLeave={() => setHoveredNav(null)}
                    style={{
                      ...S.navCard,
                      borderColor: hoveredNav === i ? `${n.color}55` : "rgba(255,255,255,0.07)",
                      boxShadow: hoveredNav === i ? `0 12px 35px ${n.color}30` : "0 4px 15px rgba(0,0,0,0.2)",
                      animation: `fadeUp 0.5s ease ${0.15 + i * 0.07}s both`,
                      transition: "all 0.3s ease",
                    }}
                  >
                    <div style={{ ...S.navIconBox, background: `${n.color}18`, border: `1px solid ${n.color}30` }}>
                      <span style={{ fontSize: 28 }}>{n.icon}</span>
                    </div>
                    <div style={S.navLabel}>{n.label}</div>
                    <div style={S.navDesc}>{n.desc}</div>
                    <div style={{ marginTop: 12, fontSize: 12, color: n.color, fontWeight: 700 }}>Open →</div>
                  </button>
                ))}
              </div>
            </section>

            {/* CTA */}
            <section style={S.ctaSection}>
              <div style={S.ctaCard}>
                <div style={{ fontSize: 52, marginBottom: 16 }}>🎉</div>
                <h3 style={S.ctaTitle}>Ready to Analyze Your Data?</h3>
                <p style={S.ctaDesc}>Upload your first dataset and watch the magic happen in seconds.</p>
                <div style={S.ctaBtns}>
                  <button className="go-btn" onClick={() => router.push("/home")} style={S.ctaPrimary}>
                    🚀 Get Started Now
                  </button>
                  <button className="go-btn" onClick={() => router.push("/dashboard")} style={S.ctaSecondary}>
                    📊 View Dashboard
                  </button>
                </div>
              </div>
            </section>

            {/* Footer */}
            <footer style={S.footer}>
              <div style={S.footerInner}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={S.footerLogo}>R&K</div>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", fontWeight: 700 }}>AI-Powered Analytics Platform</span>
                </div>
                <button onClick={() => router.push("/home")} style={S.footerLink}>
                  Continue to Home →
                </button>
              </div>
            </footer>
          </div>
        )}
      </div>
    </>
  );
}

// ─── STYLES ───────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "radial-gradient(ellipse 1200px 700px at 50% 0%, rgba(79,70,229,0.18), transparent 65%), #070D1A",
    color: "#E5E7EB",
    overflowX: "hidden",
  },
  loadingPage: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#070D1A",
    color: "#fff",
  },
  loadingSpinner: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    border: "3px solid rgba(99,102,241,0.2)",
    borderTop: "3px solid #6366F1",
    animation: "spin 0.8s linear infinite",
  },

  // TOP BAR
  topBar: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 28px",
    background: "rgba(7,13,26,0.85)",
    backdropFilter: "blur(20px)",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  topLogo: { display: "flex", alignItems: "center", gap: 12 },
  topLogoIcon: {
    width: 38, height: 38, borderRadius: 10,
    background: "linear-gradient(135deg, #6366F1, #EC4899)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 15, fontWeight: 900, color: "#fff",
    boxShadow: "0 4px 14px rgba(99,102,241,0.4)",
  },
  topLogoText: { fontSize: 17, fontWeight: 800, color: "#fff" },
  topRight: { display: "flex", alignItems: "center", gap: 20 },
  userPill: {
    padding: "7px 16px", borderRadius: 999,
    background: "rgba(99,102,241,0.12)",
    border: "1px solid rgba(99,102,241,0.25)",
    fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)",
    maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
  },

  // HERO
  hero: {
    maxWidth: 900,
    margin: "0 auto",
    padding: "70px 24px 50px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  heroTag: {
    padding: "6px 18px", borderRadius: 999,
    background: "rgba(99,102,241,0.12)",
    border: "1px solid rgba(99,102,241,0.30)",
    fontSize: 13, fontWeight: 700, color: "rgba(200,200,255,0.85)",
    marginBottom: 24,
    display: "inline-block",
  },
  heroTitle: {
    fontSize: "clamp(36px, 6vw, 64px)",
    fontWeight: 900,
    color: "#fff",
    margin: "0 0 18px",
    lineHeight: 1.1,
    fontFamily: "'Syne', sans-serif",
  },
  heroSub: {
    fontSize: 18,
    color: "rgba(255,255,255,0.62)",
    lineHeight: 1.7,
    maxWidth: 560,
    margin: "0 0 36px",
  },

  // DASHBOARD PREVIEW
  dashPreview: {
    width: "100%",
    maxWidth: 680,
    background: "rgba(15,23,42,0.9)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 20,
    overflow: "hidden",
    boxShadow: "0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.1)",
  },
  dashPreviewHeader: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "12px 18px",
    background: "rgba(255,255,255,0.04)",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  dashPreviewBody: { padding: "18px 20px" },

  // FEATURES
  featuresSection: { maxWidth: 1200, margin: "0 auto", padding: "60px 24px" },
  sectionLabel: {
    fontSize: 12, fontWeight: 800, letterSpacing: "0.15em",
    color: "rgba(99,102,241,0.8)", textAlign: "center", marginBottom: 12,
  },
  sectionTitle: {
    fontSize: "clamp(26px, 4vw, 42px)", fontWeight: 900,
    color: "#fff", textAlign: "center", margin: "0 0 12px",
    fontFamily: "'Syne', sans-serif",
  },
  sectionSub: {
    fontSize: 16, color: "rgba(255,255,255,0.5)",
    textAlign: "center", maxWidth: 500, margin: "0 auto 48px",
  },
  featureGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
    gap: 22,
  },
  featureCard: {
    background: "rgba(15,23,42,0.88)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 20,
    padding: 28,
    cursor: "default",
  },
  featureIconBox: {
    width: 54, height: 54, borderRadius: 14,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  featureTitle: { fontSize: 18, fontWeight: 800, color: "#fff" },
  featureDesc: { fontSize: 14, color: "rgba(255,255,255,0.58)", lineHeight: 1.65, margin: "0 0 14px" },
  featurePreview: {
    padding: "14px 16px", borderRadius: 12,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid transparent",
    minHeight: 60,
  },

  // NEXT BUTTON SECTION
  nextSection: {
    textAlign: "center",
    padding: "40px 24px 80px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
  },
  nextHint: { fontSize: 15, color: "rgba(255,255,255,0.45)", fontWeight: 600 },
  nextBtn: {
    display: "flex", alignItems: "center",
    padding: "18px 48px",
    borderRadius: 16,
    border: "none",
    background: "linear-gradient(135deg, #6366F1 0%, #EC4899 100%)",
    color: "#fff",
    fontSize: 18,
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 14px 40px rgba(99,102,241,0.45)",
    transition: "all 0.25s ease",
    fontFamily: "'Syne', sans-serif",
  },

  // PAGE 2 — BACK
  backBtn: {
    padding: "9px 20px", borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.75)",
    fontSize: 14, fontWeight: 700, cursor: "pointer",
    transition: "border-color 0.2s",
  },

  // STEPS
  stepsSection: { maxWidth: 1100, margin: "0 auto", padding: "50px 24px" },
  stepsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 24,
  },
  stepCard: {
    background: "rgba(15,23,42,0.88)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 22,
    padding: 32,
    display: "flex", flexDirection: "column",
  },
  stepNumBadge: {
    padding: "5px 12px", borderRadius: 8,
    fontSize: 13, fontWeight: 900, letterSpacing: "0.05em",
  },
  stepTitle: { fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 10 },
  stepDesc: { fontSize: 14, color: "rgba(255,255,255,0.58)", lineHeight: 1.65, flex: 1, margin: "0 0 24px" },
  stepBtn: {
    padding: "13px 22px", borderRadius: 12, border: "none",
    color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer",
    transition: "all 0.2s",
  },

  // NAV
  navSection: { maxWidth: 1100, margin: "0 auto", padding: "40px 24px 60px" },
  navGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 18,
  },
  navCard: {
    background: "rgba(15,23,42,0.88)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 18, padding: "24px 20px",
    cursor: "pointer",
    display: "flex", flexDirection: "column", alignItems: "center",
    textAlign: "center",
    color: "#E5E7EB",
  },
  navIconBox: {
    width: 56, height: 56, borderRadius: 14, marginBottom: 14,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  navLabel: { fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 6 },
  navDesc: { fontSize: 12, color: "rgba(255,255,255,0.50)", lineHeight: 1.5 },

  // CTA
  ctaSection: { maxWidth: 780, margin: "0 auto", padding: "20px 24px 60px" },
  ctaCard: {
    background: "linear-gradient(135deg, rgba(99,102,241,0.18), rgba(236,72,153,0.12))",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 28, padding: "56px 40px",
    textAlign: "center",
    boxShadow: "0 30px 80px rgba(99,102,241,0.2)",
  },
  ctaTitle: { fontSize: 34, fontWeight: 900, color: "#fff", margin: "0 0 14px", fontFamily: "'Syne', sans-serif" },
  ctaDesc: { fontSize: 16, color: "rgba(255,255,255,0.6)", margin: "0 0 36px" },
  ctaBtns: { display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" },
  ctaPrimary: {
    padding: "15px 36px", borderRadius: 14, border: "none",
    background: "linear-gradient(135deg, #6366F1, #EC4899)",
    color: "#fff", fontSize: 16, fontWeight: 900, cursor: "pointer",
    boxShadow: "0 10px 30px rgba(99,102,241,0.4)", transition: "all 0.2s",
  },
  ctaSecondary: {
    padding: "15px 36px", borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.2)",
    background: "rgba(255,255,255,0.07)",
    color: "#E5E7EB", fontSize: 16, fontWeight: 900, cursor: "pointer",
    transition: "all 0.2s",
  },

  // FOOTER
  footer: { borderTop: "1px solid rgba(255,255,255,0.07)", padding: "28px 24px" },
  footerInner: {
    maxWidth: 1100, margin: "0 auto",
    display: "flex", justifyContent: "space-between", alignItems: "center",
    flexWrap: "wrap", gap: 16,
  },
  footerLogo: {
    width: 40, height: 40, borderRadius: 10,
    background: "linear-gradient(135deg, #6366F1, #EC4899)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 15, fontWeight: 900, color: "#fff",
  },
  footerLink: {
    padding: "10px 20px", borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "#E5E7EB", fontSize: 14, fontWeight: 800, cursor: "pointer",
  },
};