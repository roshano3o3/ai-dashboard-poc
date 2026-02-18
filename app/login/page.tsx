"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage("Login successful!");
      setTimeout(() => router.push("/dashboard"), 1000);
    }

    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Inter', -apple-system, sans-serif",
      padding: "20px"
    }}>
      {/* Animated background circles */}
      <div style={{
        position: "absolute",
        width: "400px",
        height: "400px",
        background: "rgba(255, 255, 255, 0.1)",
        borderRadius: "50%",
        top: "-100px",
        left: "-100px",
        filter: "blur(60px)"
      }} />
      <div style={{
        position: "absolute",
        width: "300px",
        height: "300px",
        background: "rgba(255, 255, 255, 0.1)",
        borderRadius: "50%",
        bottom: "-50px",
        right: "-50px",
        filter: "blur(60px)"
      }} />

      {/* Main card */}
      <div style={{
        position: "relative",
        background: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(10px)",
        borderRadius: "24px",
        padding: "48px 40px",
        maxWidth: "440px",
        width: "100%",
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
        border: "1px solid rgba(255, 255, 255, 0.3)"
      }}>
        {/* Logo/Icon */}
        <div style={{
          width: "64px",
          height: "64px",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          borderRadius: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 24px",
          boxShadow: "0 8px 24px rgba(102, 126, 234, 0.4)"
        }}>
          <span style={{ fontSize: "32px" }}>🔐</span>
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: "32px",
          fontWeight: "700",
          textAlign: "center",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginBottom: "8px"
        }}>
          Welcome Back
        </h1>
        <p style={{
          textAlign: "center",
          color: "#64748b",
          marginBottom: "32px",
          fontSize: "14px"
        }}>
          Sign in to access your dashboard
        </p>

        {/* Form */}
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: "20px" }}>
            <label style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "600",
              color: "#334155",
              marginBottom: "8px"
            }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              style={{
                width: "100%",
                padding: "14px 16px",
                fontSize: "15px",
                border: "2px solid #e2e8f0",
                borderRadius: "12px",
                outline: "none",
                transition: "all 0.3s ease",
                boxSizing: "border-box",
                background: "#fff"
              }}
              onFocus={(e) => e.target.style.borderColor = "#667eea"}
              onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "600",
              color: "#334155",
              marginBottom: "8px"
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{
                width: "100%",
                padding: "14px 16px",
                fontSize: "15px",
                border: "2px solid #e2e8f0",
                borderRadius: "12px",
                outline: "none",
                transition: "all 0.3s ease",
                boxSizing: "border-box",
                background: "#fff"
              }}
              onFocus={(e) => e.target.style.borderColor = "#667eea"}
              onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              fontSize: "16px",
              fontWeight: "600",
              color: "#fff",
              background: loading ? "#94a3b8" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              border: "none",
              borderRadius: "12px",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.3s ease",
              boxShadow: loading ? "none" : "0 4px 15px rgba(102, 126, 234, 0.4)",
              transform: loading ? "scale(1)" : "scale(1)",
            }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = "translateY(-2px)")}
            onMouseLeave={(e) => !loading && (e.currentTarget.style.transform = "translateY(0)")}
          >
            {loading ? "Signing In..." : "Sign In →"}
          </button>
        </form>

        {/* Message */}
        {message && (
          <div style={{
            marginTop: "20px",
            padding: "12px 16px",
            borderRadius: "12px",
            fontSize: "14px",
            fontWeight: "500",
            background: message.includes("Error") ? "#fee2e2" : "#d1fae5",
            color: message.includes("Error") ? "#991b1b" : "#065f46",
            border: message.includes("Error") ? "1px solid #fca5a5" : "1px solid #6ee7b7"
          }}>
            {message}
          </div>
        )}

        {/* Footer */}
        <p style={{
          textAlign: "center",
          marginTop: "24px",
          fontSize: "14px",
          color: "#64748b"
        }}>
          Don't have an account?{" "}
          <a href="/signup" style={{
            color: "#667eea",
            fontWeight: "600",
            textDecoration: "none"
          }}>
            Sign Up
          </a>
        </p>
      </div>
    </div>
  );
}