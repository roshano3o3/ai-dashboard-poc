"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export default function WelcomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");

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

      setUserEmail(data.user.email || "");
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div style={styles.loadingPage}>
        <div style={{ fontSize: 24, fontWeight: 900 }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Hero Section */}
      <section style={styles.hero}>
        <div style={styles.heroContent}>
          {/* Logo */}
          <div style={styles.logoLarge}>R&K</div>

          {/* Welcome Text */}
          <h1 style={styles.heroTitle}>Welcome to R&K Analytics</h1>
          <p style={styles.heroSubtitle}>
            AI-Powered Business Intelligence Platform
          </p>
          <p style={styles.heroDescription}>
            Transform your data into actionable insights with real-time analytics, AI-powered recommendations, and professional reporting.
          </p>

          {/* User Greeting */}
          <div style={styles.userGreeting}>
            👋 Hello, <strong>{userEmail}</strong>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section style={styles.featuresSection}>
        <h2 style={styles.sectionTitle}>✨ What You Can Do</h2>

        <div style={styles.featureGrid}>
          <div style={styles.featureCard}>
            <div style={styles.featureIcon}>📊</div>
            <div style={styles.featureTitle}>Smart Dashboards</div>
            <div style={styles.featureDescription}>
              Upload your data and get instant visualizations with 8 chart types
            </div>
          </div>

          <div style={styles.featureCard}>
            <div style={styles.featureIcon}>🤖</div>
            <div style={styles.featureTitle}>AI Assistant</div>
            <div style={styles.featureDescription}>
              Ask questions about your data and get intelligent insights
            </div>
          </div>

          <div style={styles.featureCard}>
            <div style={styles.featureIcon}>📈</div>
            <div style={styles.featureTitle}>Advanced Analytics</div>
            <div style={styles.featureDescription}>
              Trend analysis, forecasting, and correlation discovery
            </div>
          </div>

          <div style={styles.featureCard}>
            <div style={styles.featureIcon}>📄</div>
            <div style={styles.featureTitle}>Professional Reports</div>
            <div style={styles.featureDescription}>
              Export beautiful PDFs, Excel, and CSV files with one click
            </div>
          </div>

          <div style={styles.featureCard}>
            <div style={styles.featureIcon}>🎨</div>
            <div style={styles.featureTitle}>Ready Templates</div>
            <div style={styles.featureDescription}>
              Start fast with pre-built templates for Sales, Marketing, HR, Finance
            </div>
          </div>

          <div style={styles.featureCard}>
            <div style={styles.featureIcon}>⚡</div>
            <div style={styles.featureTitle}>Real-Time Updates</div>
            <div style={styles.featureDescription}>
              Your dashboards refresh automatically every 30 seconds
            </div>
          </div>
        </div>
      </section>

      {/* Getting Started */}
      <section style={styles.getStartedSection}>
        <h2 style={styles.sectionTitle}>🚀 Get Started in 3 Steps</h2>

        <div style={styles.stepsGrid}>
          <div style={styles.stepCard}>
            <div style={styles.stepNumber}>1</div>
            <div style={styles.stepTitle}>Upload Your Data</div>
            <div style={styles.stepDescription}>
              Import CSV or Excel files with any columns - we'll automatically adapt!
            </div>
            {/* CHANGED: Now goes to /home */}
            <button onClick={() => router.push("/home")} style={styles.stepButton}>
              🚀 Get Started
            </button>
          </div>

          <div style={styles.stepCard}>
            <div style={styles.stepNumber}>2</div>
            <div style={styles.stepTitle}>Or Use a Template</div>
            <div style={styles.stepDescription}>
              Browse pre-built dashboards with sample data to explore features
            </div>
            {/* CHANGED: Now goes to /home */}
            <button onClick={() => router.push("/home")} style={styles.stepButton}>
              🚀 Get Started
            </button>
          </div>

          <div style={styles.stepCard}>
            <div style={styles.stepNumber}>3</div>
            <div style={styles.stepTitle}>Explore Features</div>
            <div style={styles.stepDescription}>
              Check out analytics, customize branding, and ask the AI assistant
            </div>
            {/* CHANGED: Now goes to /home */}
            <button onClick={() => router.push("/home")} style={styles.stepButton}>
              🚀 Get Started
            </button>
          </div>
        </div>
      </section>

      {/* Quick Navigation */}
      <section style={styles.navigationSection}>
        <h2 style={styles.sectionTitle}>🧭 Quick Navigation</h2>

        <div style={styles.navGrid}>
          <button onClick={() => router.push("/dashboard")} style={styles.navCard}>
            <div style={styles.navIcon}>📊</div>
            <div style={styles.navTitle}>Dashboard</div>
            <div style={styles.navDescription}>View your data visualizations</div>
          </button>

          <button onClick={() => router.push("/analytics")} style={styles.navCard}>
            <div style={styles.navIcon}>📈</div>
            <div style={styles.navTitle}>Analytics</div>
            <div style={styles.navDescription}>Advanced analysis tools</div>
          </button>

          <button onClick={() => router.push("/data")} style={styles.navCard}>
            <div style={styles.navIcon}>📋</div>
            <div style={styles.navTitle}>Tables</div>
            <div style={styles.navDescription}>View and manage data</div>
          </button>

          <button onClick={() => router.push("/upload")} style={styles.navCard}>
            <div style={styles.navIcon}>⬆️</div>
            <div style={styles.navTitle}>Upload</div>
            <div style={styles.navDescription}>Import new datasets</div>
          </button>

          <button onClick={() => router.push("/templates")} style={styles.navCard}>
            <div style={styles.navIcon}>🎨</div>
            <div style={styles.navTitle}>Templates</div>
            <div style={styles.navDescription}>Pre-built dashboards</div>
          </button>

          <button onClick={() => router.push("/branding")} style={styles.navCard}>
            <div style={styles.navIcon}>⚙️</div>
            <div style={styles.navTitle}>Branding</div>
            <div style={styles.navDescription}>Customize your look</div>
          </button>
        </div>
      </section>

      {/* CTA Section */}
      <section style={styles.ctaSection}>
        <div style={styles.ctaCard}>
          <h3 style={styles.ctaTitle}>Ready to Get Started?</h3>
          <p style={styles.ctaDescription}>
            Choose your path and start exploring
          </p>
          <div style={styles.ctaButtons}>
            {/* CHANGED: Now goes to /home */}
            <button onClick={() => router.push("/home")} style={styles.ctaPrimary}>
              🚀 Get Started
            </button>
            {/* CHANGED: Now goes to /home */}
            <button onClick={() => router.push("/home")} style={styles.ctaSecondary}>
              🎨 Explore Features
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <div style={styles.footerLeft}>
            <div style={styles.footerLogo}>R&K</div>
            <div style={styles.footerText}>AI-Powered Analytics Platform</div>
          </div>
          <div style={styles.footerRight}>
            {/* CHANGED: Now goes to /home */}
            <button onClick={() => router.push("/home")} style={styles.footerLink}>
              Continue to Home →
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "radial-gradient(1200px 650px at 50% 20%, rgba(79,70,229,0.22), transparent 60%), #0B1220",
    color: "#E5E7EB",
    fontFamily: "'Inter', system-ui, sans-serif",
    overflowX: "hidden",
  },

  loadingPage: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0B1220",
    color: "#fff",
  },

  hero: {
    padding: "80px 20px 60px",
    textAlign: "center",
    maxWidth: 900,
    margin: "0 auto",
  },

  heroContent: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 20,
  },

  logoLarge: {
    width: 100,
    height: 100,
    borderRadius: 24,
    background: "linear-gradient(135deg, #4F46E5 0%, #EC4899 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 42,
    fontWeight: 950,
    color: "#fff",
    boxShadow: "0 20px 50px rgba(79,70,229,0.40)",
  },

  heroTitle: {
    fontSize: 48,
    fontWeight: 950,
    background: "linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.8) 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    margin: 0,
  },

  heroSubtitle: {
    fontSize: 22,
    color: "rgba(255,255,255,0.80)",
    margin: 0,
    fontWeight: 700,
  },

  heroDescription: {
    fontSize: 17,
    color: "rgba(255,255,255,0.70)",
    maxWidth: 600,
    lineHeight: 1.7,
    margin: 0,
  },

  userGreeting: {
    padding: "14px 24px",
    borderRadius: 999,
    background: "rgba(79,70,229,0.15)",
    border: "1px solid rgba(79,70,229,0.30)",
    fontSize: 16,
    color: "#E5E7EB",
    fontWeight: 700,
    marginTop: 10,
  },

  featuresSection: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "60px 20px",
  },

  sectionTitle: {
    fontSize: 32,
    fontWeight: 950,
    textAlign: "center",
    marginBottom: 40,
    color: "#fff",
  },

  featureGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 24,
  },

  featureCard: {
    background: "rgba(15,23,42,0.85)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 28,
    textAlign: "center",
    transition: "all 0.3s",
    cursor: "default",
  },

  featureIcon: {
    fontSize: 48,
    marginBottom: 16,
  },

  featureTitle: {
    fontSize: 20,
    fontWeight: 950,
    color: "#fff",
    marginBottom: 12,
  },

  featureDescription: {
    fontSize: 15,
    color: "rgba(255,255,255,0.70)",
    lineHeight: 1.6,
  },

  getStartedSection: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "40px 20px 60px",
  },

  stepsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 24,
  },

  stepCard: {
    background: "rgba(15,23,42,0.85)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 32,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
  },

  stepNumber: {
    width: 60,
    height: 60,
    borderRadius: 999,
    background: "linear-gradient(135deg, #4F46E5 0%, #EC4899 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 28,
    fontWeight: 950,
    color: "#fff",
    marginBottom: 20,
  },

  stepTitle: {
    fontSize: 22,
    fontWeight: 950,
    color: "#fff",
    marginBottom: 12,
  },

  stepDescription: {
    fontSize: 15,
    color: "rgba(255,255,255,0.70)",
    lineHeight: 1.6,
    marginBottom: 24,
  },

  stepButton: {
    padding: "14px 28px",
    borderRadius: 12,
    border: "none",
    background: "linear-gradient(135deg, #4F46E5 0%, #EC4899 100%)",
    color: "#fff",
    fontSize: 15,
    fontWeight: 950,
    cursor: "pointer",
    boxShadow: "0 8px 20px rgba(79,70,229,0.35)",
    transition: "all 0.2s",
  },

  navigationSection: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "40px 20px 60px",
  },

  navGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: 20,
  },

  navCard: {
    background: "rgba(15,23,42,0.85)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 24,
    textAlign: "center",
    cursor: "pointer",
    transition: "all 0.3s",
  },

  navIcon: {
    fontSize: 42,
    marginBottom: 12,
  },

  navTitle: {
    fontSize: 18,
    fontWeight: 950,
    color: "#fff",
    marginBottom: 8,
  },

  navDescription: {
    fontSize: 14,
    color: "rgba(255,255,255,0.65)",
  },

  ctaSection: {
    maxWidth: 800,
    margin: "0 auto",
    padding: "40px 20px 60px",
  },

  ctaCard: {
    background: "linear-gradient(135deg, rgba(79,70,229,0.20) 0%, rgba(236,72,153,0.15) 100%)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 24,
    padding: 48,
    textAlign: "center",
  },

  ctaTitle: {
    fontSize: 32,
    fontWeight: 950,
    color: "#fff",
    marginBottom: 16,
  },

  ctaDescription: {
    fontSize: 17,
    color: "rgba(255,255,255,0.75)",
    marginBottom: 32,
  },

  ctaButtons: {
    display: "flex",
    gap: 16,
    justifyContent: "center",
    flexWrap: "wrap",
  },

  ctaPrimary: {
    padding: "16px 32px",
    borderRadius: 14,
    border: "none",
    background: "linear-gradient(135deg, #4F46E5 0%, #EC4899 100%)",
    color: "#fff",
    fontSize: 16,
    fontWeight: 950,
    cursor: "pointer",
    boxShadow: "0 12px 28px rgba(79,70,229,0.40)",
  },

  ctaSecondary: {
    padding: "16px 32px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.20)",
    background: "rgba(255,255,255,0.08)",
    color: "#E5E7EB",
    fontSize: 16,
    fontWeight: 950,
    cursor: "pointer",
  },

  footer: {
    borderTop: "1px solid rgba(255,255,255,0.08)",
    padding: "32px 20px",
  },

  footerContent: {
    maxWidth: 1200,
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 20,
  },

  footerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },

  footerLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    background: "linear-gradient(135deg, #4F46E5 0%, #EC4899 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
    fontWeight: 950,
    color: "#fff",
  },

  footerText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.70)",
    fontWeight: 700,
  },

  footerRight: {},

  footerLink: {
    padding: "10px 20px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "#E5E7EB",
    fontSize: 14,
    fontWeight: 900,
    cursor: "pointer",
  },
};