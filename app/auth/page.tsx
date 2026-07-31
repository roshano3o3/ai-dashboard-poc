"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

// ✅ FIX: Create client inside a function so env vars are always loaded
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase environment variables. Check your .env.local file.");
  }

  return createClient(url, key);
}

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    let supabase;
    try {
      supabase = getSupabaseClient();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
      setLoading(false);
      return;
    }

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage(`Error: ${error.message}`);
      } else {
        setMessage("Login successful! Redirecting...");
        setTimeout(() => router.push("/dashboard"), 1000);
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setMessage(`Error: ${error.message}`);
      } else {
        setMessage("Success! Check your email to confirm your account.");
      }
    }

    setLoading(false);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0a0a1f 0%, #1a1a3e 50%, #2d1b69 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', -apple-system, sans-serif",
        padding: "20px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Animated Grid Background */}
      <div
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: `
            linear-gradient(rgba(102, 126, 234, 0.15) 2px, transparent 2px),
            linear-gradient(90deg, rgba(102, 126, 234, 0.15) 2px, transparent 2px)
          `,
          backgroundSize: "60px 60px",
          animation: "gridMove 25s linear infinite",
          zIndex: 0,
        }}
      />

      {/* Floating Orbs */}
      <div style={{
        position: "absolute", width: "700px", height: "700px",
        background: "radial-gradient(circle, rgba(102, 126, 234, 0.4) 0%, transparent 70%)",
        borderRadius: "50%", top: "-250px", left: "-250px",
        filter: "blur(120px)", animation: "float 18s ease-in-out infinite", zIndex: 0,
      }} />
      <div style={{
        position: "absolute", width: "600px", height: "600px",
        background: "radial-gradient(circle, rgba(245, 87, 108, 0.4) 0%, transparent 70%)",
        borderRadius: "50%", bottom: "-200px", right: "-200px",
        filter: "blur(120px)", animation: "float 15s ease-in-out infinite reverse", zIndex: 0,
      }} />

      {/* Main card */}
      <div style={{
        position: "relative",
        background: "rgba(15, 15, 35, 0.95)",
        backdropFilter: "blur(30px)",
        borderRadius: "40px",
        padding: "70px 60px",
        maxWidth: "600px",
        width: "100%",
        boxShadow: "0 40px 100px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(102, 126, 234, 0.4)",
        border: "2px solid rgba(102, 126, 234, 0.3)",
        zIndex: 1,
      }}>
        {/* Outer Glow */}
        <div style={{
          position: "absolute", top: "-3px", left: "-3px", right: "-3px", bottom: "-3px",
          background: "linear-gradient(135deg, rgba(102, 126, 234, 0.6), rgba(245, 87, 108, 0.6))",
          borderRadius: "40px", filter: "blur(25px)", opacity: 0.6, zIndex: -1,
        }} />

        {/* Logo */}
        <div style={{
          width: "120px", height: "120px",
          background: "linear-gradient(135deg, #667eea 0%, #f5576c 100%)",
          borderRadius: "30px", display: "flex", alignItems: "center",
          justifyContent: "center", margin: "0 auto 40px",
          boxShadow: "0 15px 50px rgba(102, 126, 234, 0.7)",
          transform: "rotate(-5deg)",
        }}>
          <div style={{
            fontSize: "56px", fontWeight: "900", color: "#fff",
            letterSpacing: "-2px", textShadow: "0 4px 15px rgba(0,0,0,0.3)",
          }}>R&K</div>
        </div>

        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: "35px" }}>
          <h2 style={{
            fontSize: "28px", fontWeight: "800",
            background: "linear-gradient(135deg, #667eea 0%, #f5576c 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            margin: "0 0 8px 0", letterSpacing: "1px",
          }}>R&K AI Dashboard</h2>
          <p style={{
            fontSize: "16px", color: "#94a3b8", margin: 0,
            fontWeight: "600", letterSpacing: "2px", textTransform: "uppercase",
          }}>AI-Powered Intelligence</p>
        </div>

        {/* Toggle */}
        <div style={{
          display: "flex",
          background: "rgba(15, 52, 96, 0.4)",
          borderRadius: "20px", padding: "8px",
          marginBottom: "45px", border: "2px solid rgba(102, 126, 234, 0.3)",
        }}>
          {["SIGN IN", "SIGN UP"].map((label, i) => {
            const active = i === 0 ? isLogin : !isLogin;
            return (
              <button key={label} onClick={() => setIsLogin(i === 0)} style={{
                flex: 1, padding: "18px", fontSize: "20px", fontWeight: "800",
                background: active ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "transparent",
                color: active ? "#fff" : "#94a3b8", border: "none", borderRadius: "16px",
                cursor: "pointer", transition: "all 0.3s ease",
                boxShadow: active ? "0 6px 20px rgba(102, 126, 234, 0.5)" : "none",
                letterSpacing: "1px",
              }}>{label}</button>
            );
          })}
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: "52px", fontWeight: "900", textAlign: "center",
          background: "linear-gradient(135deg, #667eea 0%, #f5576c 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          marginBottom: "16px", letterSpacing: "-2px", lineHeight: "1.1",
        }}>
          {isLogin ? "Welcome Back!" : "Join The Future"}
        </h1>
        <p style={{
          textAlign: "center", color: "#94a3b8", marginBottom: "45px",
          fontSize: "19px", fontWeight: "600", lineHeight: "1.5",
        }}>
          {isLogin
            ? "Sign in to access your AI-powered dashboard"
            : "Create your account and unlock limitless possibilities"}
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "28px" }}>
            <label style={{
              display: "block", fontSize: "18px", fontWeight: "800",
              color: "#e2e8f0", marginBottom: "12px",
              letterSpacing: "1.5px", textTransform: "uppercase",
            }}>EMAIL ADDRESS</label>
            <input
              type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              required placeholder="you@example.com"
              style={{
                width: "100%", padding: "20px 24px", fontSize: "19px",
                border: "3px solid rgba(102, 126, 234, 0.4)", borderRadius: "18px",
                outline: "none", transition: "all 0.3s ease", boxSizing: "border-box",
                background: "rgba(15, 52, 96, 0.25)", color: "#ffffff", fontWeight: "600",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#667eea";
                e.target.style.boxShadow = "0 0 0 6px rgba(102, 126, 234, 0.15)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(102, 126, 234, 0.4)";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          <div style={{ marginBottom: "38px" }}>
            <label style={{
              display: "block", fontSize: "18px", fontWeight: "800",
              color: "#e2e8f0", marginBottom: "12px",
              letterSpacing: "1.5px", textTransform: "uppercase",
            }}>PASSWORD</label>
            <input
              type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              required placeholder="••••••••"
              style={{
                width: "100%", padding: "20px 24px", fontSize: "19px",
                border: "3px solid rgba(102, 126, 234, 0.4)", borderRadius: "18px",
                outline: "none", transition: "all 0.3s ease", boxSizing: "border-box",
                background: "rgba(15, 52, 96, 0.25)", color: "#ffffff", fontWeight: "600",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#667eea";
                e.target.style.boxShadow = "0 0 0 6px rgba(102, 126, 234, 0.15)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(102, 126, 234, 0.4)";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          <button
            type="submit" disabled={loading}
            style={{
              width: "100%", padding: "22px", fontSize: "22px",
              fontWeight: "900", color: "#fff",
              background: loading ? "#475569" : "linear-gradient(135deg, #667eea 0%, #f5576c 100%)",
              border: "none", borderRadius: "18px",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.3s ease",
              boxShadow: loading ? "none" : "0 10px 35px rgba(102, 126, 234, 0.6)",
              letterSpacing: "2px", textTransform: "uppercase",
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.transform = "translateY(-4px)"; }}
            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.transform = "translateY(0)"; }}
          >
            {loading
              ? (isLogin ? "SIGNING IN..." : "CREATING...")
              : (isLogin ? "SIGN IN →" : "CREATE ACCOUNT →")}
          </button>
        </form>

        {/* Message */}
        {message && (
          <div style={{
            marginTop: "28px", padding: "20px 24px", borderRadius: "18px",
            fontSize: "17px", fontWeight: "700",
            background: message.includes("Error") ? "rgba(239, 68, 68, 0.25)" : "rgba(34, 197, 94, 0.25)",
            color: message.includes("Error") ? "#fca5a5" : "#86efac",
            border: message.includes("Error") ? "2px solid rgba(239, 68, 68, 0.4)" : "2px solid rgba(34, 197, 94, 0.4)",
            textAlign: "center",
          }}>
            {message}
          </div>
        )}

        {/* Footer */}
        <p style={{
          textAlign: "center", marginTop: "38px",
          fontSize: "17px", color: "#64748b", fontWeight: "600",
        }}>
          {isLogin ? "New to R&K AI?" : "Already have an account?"}{" "}
          <span
            onClick={() => { setIsLogin(!isLogin); setMessage(""); }}
            style={{
              color: "#667eea", fontWeight: "800", cursor: "pointer",
              borderBottom: "3px solid transparent", transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderBottomColor = "#667eea";
              e.currentTarget.style.color = "#f5576c";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderBottomColor = "transparent";
              e.currentTarget.style.color = "#667eea";
            }}
          >
            {isLogin ? "CREATE ACCOUNT" : "SIGN IN"}
          </span>
        </p>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(40px, -40px) rotate(120deg); }
          66% { transform: translate(-30px, 30px) rotate(240deg); }
        }
        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(60px, 60px); }
        }
      `}</style>
    </div>
  );
}