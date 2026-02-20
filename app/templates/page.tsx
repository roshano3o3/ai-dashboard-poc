"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Pre-built templates with sample data
const TEMPLATES = [
  {
    id: "sales-dashboard",
    name: "Sales Dashboard",
    description: "Track revenue, deals, and sales performance",
    icon: "💰",
    category: "Sales",
    color: "#10B981",
    features: ["Revenue tracking", "Deal pipeline", "Sales trends", "Team performance"],
    sampleData: [
      { month: "January", revenue: 45000, deals: 12, conversion_rate: 23.5, sales_rep: "John Smith" },
      { month: "February", revenue: 52000, deals: 15, conversion_rate: 28.2, sales_rep: "Sarah Lee" },
      { month: "March", revenue: 48000, deals: 13, conversion_rate: 25.8, sales_rep: "Mike Brown" },
      { month: "April", revenue: 61000, deals: 18, conversion_rate: 31.4, sales_rep: "John Smith" },
      { month: "May", revenue: 58000, deals: 16, conversion_rate: 29.7, sales_rep: "Sarah Lee" },
      { month: "June", revenue: 67000, deals: 20, conversion_rate: 34.2, sales_rep: "Mike Brown" },
    ],
  },
  {
    id: "marketing-dashboard",
    name: "Marketing Dashboard",
    description: "Monitor campaigns, leads, and ROI",
    icon: "📈",
    category: "Marketing",
    color: "#F59E0B",
    features: ["Campaign performance", "Lead generation", "ROI tracking", "Channel analysis"],
    sampleData: [
      { campaign: "Email Campaign", impressions: 45000, clicks: 3200, conversions: 156, cost: 2400, channel: "Email" },
      { campaign: "Social Media Ads", impressions: 120000, clicks: 8500, conversions: 425, cost: 5600, channel: "Social" },
      { campaign: "Google Ads", impressions: 85000, clicks: 6200, conversions: 312, cost: 4800, channel: "Search" },
      { campaign: "Content Marketing", impressions: 35000, clicks: 2800, conversions: 98, cost: 1200, channel: "Organic" },
      { campaign: "Referral Program", impressions: 12000, clicks: 1500, conversions: 85, cost: 800, channel: "Referral" },
      { campaign: "Video Ads", impressions: 95000, clicks: 7100, conversions: 278, cost: 3900, channel: "Video" },
    ],
  },
  {
    id: "hr-dashboard",
    name: "HR Dashboard",
    description: "Employee analytics and workforce insights",
    icon: "👥",
    category: "HR",
    color: "#8B5CF6",
    features: ["Headcount tracking", "Turnover analysis", "Performance metrics", "Hiring pipeline"],
    sampleData: [
      { department: "Engineering", headcount: 45, new_hires: 8, resignations: 3, satisfaction_score: 8.2, avg_tenure_months: 28 },
      { department: "Sales", headcount: 32, new_hires: 5, resignations: 4, satisfaction_score: 7.8, avg_tenure_months: 22 },
      { department: "Marketing", headcount: 18, new_hires: 3, resignations: 1, satisfaction_score: 8.5, avg_tenure_months: 31 },
      { department: "Product", headcount: 25, new_hires: 4, resignations: 2, satisfaction_score: 8.7, avg_tenure_months: 34 },
      { department: "Operations", headcount: 22, new_hires: 2, resignations: 2, satisfaction_score: 7.5, avg_tenure_months: 26 },
      { department: "Customer Success", headcount: 15, new_hires: 3, resignations: 1, satisfaction_score: 8.1, avg_tenure_months: 19 },
    ],
  },
  {
    id: "finance-dashboard",
    name: "Finance Dashboard",
    description: "Financial metrics and budget tracking",
    icon: "💼",
    category: "Finance",
    color: "#3B82F6",
    features: ["P&L statements", "Budget vs actual", "Cash flow", "Expense analysis"],
    sampleData: [
      { category: "Revenue", q1: 485000, q2: 532000, q3: 601000, q4: 678000, budget: 2100000, variance: 96000 },
      { category: "Cost of Sales", q1: 145500, q2: 159600, q3: 180300, q4: 203400, budget: 650000, variance: -38800 },
      { category: "Marketing", q1: 72500, q2: 79800, q3: 90150, q4: 101700, budget: 325000, variance: -18850 },
      { category: "R&D", q1: 121250, q2: 133200, q3: 150250, q4: 169500, budget: 550000, variance: -24200 },
      { category: "Operations", q1: 96800, q2: 106400, q3: 120200, q4: 135600, budget: 440000, variance: -19000 },
      { category: "Admin", q1: 48500, q2: 53300, q3: 60100, q4: 67800, budget: 220000, variance: -9700 },
    ],
  },
];

export default function TemplatesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [importing, setImporting] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  useEffect(() => {
    const checkAuth = async () => {
      if (!supabase) {
        router.push("/auth");
        return;
      }

      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/auth");
        return;
      }

      setUserId(data.user.id);
      setUserEmail(data.user.email || "");
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  const importTemplate = async (template: typeof TEMPLATES[0]) => {
    if (!supabase || !userId) return;

    setImporting(template.id);

    try {
      // Get column names from first row
      const firstRow = template.sampleData[0];
      const columnNames = Object.keys(firstRow);

      // Insert all rows
      const rowsToInsert = template.sampleData.map((row) => ({
        user_id: userId,
        dataset_name: template.name,
        column_names: columnNames,
        row_data: row,
        created_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from("universal_data").insert(rowsToInsert);

      if (error) {
        alert(`Error importing template: ${error.message}`);
        setImporting(null);
        return;
      }

      // Success - redirect to dashboard
      alert(`✅ ${template.name} imported successfully!`);
      router.push("/dashboard");
    } catch (err: any) {
      alert(`Error: ${err.message}`);
      setImporting(null);
    }
  };

  const categories = ["All", ...Array.from(new Set(TEMPLATES.map((t) => t.category)))];
  const filteredTemplates = selectedCategory === "All" 
    ? TEMPLATES 
    : TEMPLATES.filter((t) => t.category === selectedCategory);

  if (loading) {
    return (
      <div style={styles.loadingPage}>
        <div style={{ fontSize: 24, fontWeight: 900 }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.brand}>
          <div style={styles.logo}>R&K</div>
          <div>
            <div style={styles.brandTitle}>Dashboard Templates</div>
            <div style={styles.brandSub}>{userEmail}</div>
          </div>
        </div>

        <div style={styles.headerRight}>
          <button onClick={() => router.push("/dashboard")} style={styles.btn}>
            ← Back to Dashboard
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        {/* Hero Section */}
        <section style={styles.hero}>
          <div style={styles.heroContent}>
            <h1 style={styles.heroTitle}>🎨 Dashboard Templates</h1>
            <p style={styles.heroSubtitle}>
              Get started instantly with pre-built templates. One-click import with sample data included.
            </p>
          </div>
        </section>

        {/* Category Filter */}
        <section style={styles.filterSection}>
          <div style={styles.filterLabel}>Filter by category:</div>
          <div style={styles.categoryButtons}>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  ...styles.categoryBtn,
                  ...(selectedCategory === cat ? styles.categoryBtnActive : {}),
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        {/* Template Grid */}
        <section style={styles.templateGrid}>
          {filteredTemplates.map((template) => (
            <div key={template.id} style={styles.templateCard}>
              {/* Card Header */}
              <div style={{ ...styles.templateHeader, background: template.color }}>
                <div style={styles.templateIcon}>{template.icon}</div>
              </div>

              {/* Card Body */}
              <div style={styles.templateBody}>
                <div style={styles.templateCategory}>{template.category}</div>
                <h3 style={styles.templateName}>{template.name}</h3>
                <p style={styles.templateDescription}>{template.description}</p>

                {/* Features List */}
                <div style={styles.featuresList}>
                  {template.features.map((feature, idx) => (
                    <div key={idx} style={styles.featureItem}>
                      <span style={styles.featureCheck}>✓</span>
                      <span style={styles.featureText}>{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Sample Data Info */}
                <div style={styles.dataInfo}>
                  <span style={styles.dataIcon}>📊</span>
                  <span style={styles.dataText}>{template.sampleData.length} sample records included</span>
                </div>

                {/* Import Button */}
                <button
                  onClick={() => importTemplate(template)}
                  disabled={importing === template.id}
                  style={{
                    ...styles.importBtn,
                    ...(importing === template.id ? styles.importBtnLoading : {}),
                  }}
                >
                  {importing === template.id ? (
                    <>
                      <span style={styles.spinner}>⏳</span> Importing...
                    </>
                  ) : (
                    <>
                      <span>⚡</span> Import Template
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </section>

        {/* Empty State */}
        {filteredTemplates.length === 0 && (
          <div style={styles.emptyState}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🔍</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No templates found</div>
            <div style={{ fontSize: 14, opacity: 0.7 }}>Try selecting a different category</div>
          </div>
        )}

        {/* Info Section */}
        <section style={styles.infoSection}>
          <div style={styles.infoCard}>
            <div style={styles.infoIcon}>⚡</div>
            <div style={styles.infoTitle}>Instant Setup</div>
            <div style={styles.infoText}>
              Click "Import Template" and your dashboard will be ready in seconds with sample data
            </div>
          </div>

          <div style={styles.infoCard}>
            <div style={styles.infoIcon}>🎨</div>
            <div style={styles.infoTitle}>Fully Customizable</div>
            <div style={styles.infoText}>
              Replace sample data with your own and customize charts, filters, and visualizations
            </div>
          </div>

          <div style={styles.infoCard}>
            <div style={styles.infoIcon}>📈</div>
            <div style={styles.infoTitle}>Best Practices</div>
            <div style={styles.infoText}>
              Built by experts with industry-standard KPIs and metrics for each business function
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "radial-gradient(1200px 650px at 18% 0%, rgba(79,70,229,0.22), transparent 60%), #0B1220",
    color: "#E5E7EB",
    fontFamily: "'Inter', system-ui, sans-serif",
  },

  loadingPage: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0B1220",
    color: "#fff",
  },

  header: {
    position: "sticky",
    top: 0,
    zIndex: 50,
    padding: "16px 20px",
    background: "rgba(11,18,32,0.92)",
    backdropFilter: "blur(16px)",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  brand: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },

  logo: {
    width: 44,
    height: 44,
    borderRadius: 14,
    background: "linear-gradient(135deg, #4F46E5 0%, #EC4899 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 950,
    color: "#fff",
  },

  brandTitle: {
    fontSize: 16,
    fontWeight: 950,
    color: "#fff",
  },

  brandSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.60)",
    marginTop: 2,
  },

  headerRight: {
    display: "flex",
    gap: 10,
  },

  btn: {
    padding: "10px 16px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "#E5E7EB",
    fontWeight: 900,
    fontSize: 13,
    cursor: "pointer",
    transition: "all 0.2s",
  },

  main: {
    maxWidth: 1400,
    margin: "0 auto",
    padding: "40px 20px 80px",
  },

  hero: {
    textAlign: "center",
    marginBottom: 48,
  },

  heroContent: {
    maxWidth: 700,
    margin: "0 auto",
  },

  heroTitle: {
    fontSize: 42,
    fontWeight: 950,
    marginBottom: 16,
    background: "linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.8) 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },

  heroSubtitle: {
    fontSize: 18,
    color: "rgba(255,255,255,0.75)",
    lineHeight: 1.6,
  },

  filterSection: {
    marginBottom: 32,
  },

  filterLabel: {
    fontSize: 13,
    fontWeight: 900,
    color: "rgba(255,255,255,0.70)",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  categoryButtons: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },

  categoryBtn: {
    padding: "10px 18px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    color: "#E5E7EB",
    fontWeight: 800,
    fontSize: 14,
    cursor: "pointer",
    transition: "all 0.2s",
  },

  categoryBtnActive: {
    background: "rgba(79,70,229,0.20)",
    borderColor: "#4F46E5",
    color: "#fff",
  },

  templateGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
    gap: 24,
    marginBottom: 48,
  },

  templateCard: {
    background: "rgba(15,23,42,0.85)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 18,
    overflow: "hidden",
    transition: "all 0.3s",
    cursor: "pointer",
  },

  templateHeader: {
    height: 120,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#4F46E5",
  },

  templateIcon: {
    fontSize: 64,
  },

  templateBody: {
    padding: 24,
  },

  templateCategory: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 6,
    background: "rgba(79,70,229,0.15)",
    color: "#A5B4FC",
    fontSize: 11,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },

  templateName: {
    fontSize: 22,
    fontWeight: 950,
    color: "#fff",
    marginBottom: 8,
  },

  templateDescription: {
    fontSize: 14,
    color: "rgba(255,255,255,0.70)",
    lineHeight: 1.5,
    marginBottom: 16,
  },

  featuresList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginBottom: 16,
  },

  featureItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },

  featureCheck: {
    width: 18,
    height: 18,
    borderRadius: 4,
    background: "rgba(16,185,129,0.15)",
    color: "#10B981",
    fontSize: 12,
    fontWeight: 900,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  featureText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.80)",
    fontWeight: 600,
  },

  dataInfo: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 12px",
    borderRadius: 10,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    marginBottom: 16,
  },

  dataIcon: {
    fontSize: 18,
  },

  dataText: {
    fontSize: 13,
    fontWeight: 700,
    color: "rgba(255,255,255,0.80)",
  },

  importBtn: {
    width: "100%",
    padding: "14px 20px",
    borderRadius: 12,
    border: "none",
    background: "linear-gradient(135deg, #4F46E5 0%, #EC4899 100%)",
    color: "#fff",
    fontSize: 15,
    fontWeight: 950,
    cursor: "pointer",
    transition: "all 0.2s",
    boxShadow: "0 8px 20px rgba(79,70,229,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  importBtnLoading: {
    opacity: 0.7,
    cursor: "not-allowed",
  },

  spinner: {
    animation: "spin 1s linear infinite",
  },

  emptyState: {
    textAlign: "center",
    padding: 80,
    color: "rgba(255,255,255,0.70)",
  },

  infoSection: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 24,
  },

  infoCard: {
    padding: 24,
    background: "rgba(15,23,42,0.60)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16,
    textAlign: "center",
  },

  infoIcon: {
    fontSize: 48,
    marginBottom: 16,
  },

  infoTitle: {
    fontSize: 18,
    fontWeight: 900,
    color: "#fff",
    marginBottom: 8,
  },

  infoText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.70)",
    lineHeight: 1.6,
  },
};