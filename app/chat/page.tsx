"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type ChatMessage = {
  role: "assistant" | "user";
  content: string;
  time: string;
};

type UniversalRow = {
  dataset_name: string;
  column_names: string[] | null;
  row_data: Record<string, any> | null;
};

function safeString(v: any, max = 80) {
  const s = String(v ?? "").trim();
  if (!s) return "";
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

export default function ChatPage() {
  const router = useRouter();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hello! I am your AI assistant. I can help you analyze your data and answer questions. What would you like to know?",
      time: new Date().toLocaleTimeString(),
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [dataCount, setDataCount] = useState(0);
  const [allData, setAllData] = useState<UniversalRow[]>([]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    (async () => {
      await checkAuth();
      await loadData();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const checkAuth = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) router.push("/auth");
  };

  const loadData = async () => {
    // IMPORTANT: count only works if you request it explicitly
    const { data, count, error } = await supabase
      .from("universal_data")
      .select("*", { count: "exact" });

    if (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ Could not load data: ${error.message}`,
          time: new Date().toLocaleTimeString(),
        },
      ]);
      setDataCount(0);
      setAllData([]);
      return;
    }

    setDataCount(count || 0);
    setAllData((data || []) as UniversalRow[]);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Build a compact data context so you don't blow tokens
  const buildDataContext = () => {
    if (!allData || allData.length === 0) return "";

    const datasets = Array.from(new Set(allData.map((d) => d.dataset_name))).filter(
      Boolean
    );

    const colSet = new Set<string>();
    for (const item of allData) {
      (item.column_names || []).forEach((c) => colSet.add(String(c)));
    }
    const columns = Array.from(colSet);

    // sample up to 5 records (trim values to keep prompt small)
    const sampleRecords = allData.slice(0, 5).map((d) => {
      const rd = d.row_data || {};
      const trimmed: Record<string, any> = {};
      for (const k of Object.keys(rd).slice(0, 40)) {
        const v = rd[k];
        trimmed[k] =
          typeof v === "string" ? safeString(v, 120) : v;
      }
      return trimmed;
    });

    return `
User data context:
- Total records: ${dataCount}
- Datasets: ${datasets.slice(0, 20).join(", ")}${datasets.length > 20 ? "…" : ""}
- Columns: ${columns.slice(0, 60).join(", ")}${columns.length > 60 ? "…" : ""}

Sample data (first ${sampleRecords.length} records):
${JSON.stringify(sampleRecords, null, 2)}
`.trim();
  };

  // SAFE: calls your server route (Groq key stays on server)
  const callAI = async (userQuestion: string) => {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: userQuestion,
          context: buildDataContext(),
        }),
      });

      if (!res.ok) return "AI service error. Please try again.";
      const data = await res.json();
      return data?.answer || "No response.";
    } catch (e) {
      return "AI service unavailable. Please try again.";
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const question = input.trim();

    const userMsg: ChatMessage = {
      role: "user",
      content: question,
      time: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const aiResponse = await callAI(question);

    const aiMsg: ChatMessage = {
      role: "assistant",
      content: aiResponse,
      time: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, aiMsg]);
    setLoading(false);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0a0a1f 0%, #2d1b69 100%)",
        padding: "50px 30px",
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "40px", textAlign: "center" }}>
          <h1
            style={{
              fontSize: "72px",
              fontWeight: "900",
              background: "linear-gradient(135deg, #667eea 0%, #f5576c 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              marginBottom: "20px",
              letterSpacing: "-2px",
            }}
          >
            🤖 AI Assistant
          </h1>

          <p
            style={{
              color: "#94a3b8",
              fontSize: "24px",
              marginBottom: "10px",
              fontWeight: "500",
            }}
          >
            Powered by Groq AI ⚡ Lightning Fast
          </p>

          <p
            style={{
              color: "#4facfe",
              fontSize: "20px",
              fontWeight: "600",
            }}
          >
            📊 You have {dataCount} records in your database
          </p>
        </div>

        {/* Chat Container */}
        <div
          style={{
            background: "rgba(15, 15, 35, 0.95)",
            borderRadius: "40px",
            padding: "50px",
            border: "3px solid rgba(102, 126, 234, 0.4)",
            boxShadow: "0 30px 80px rgba(0, 0, 0, 0.6)",
            minHeight: "700px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              marginBottom: "30px",
              paddingRight: "20px",
            }}
          >
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  marginBottom: "30px",
                  display: "flex",
                  justifyContent:
                    msg.role === "user" ? "flex-end" : "flex-start",
                  animation: "fadeIn 0.3s ease-in",
                }}
              >
                <div
                  style={{
                    maxWidth: "80%",
                    padding: "24px 32px",
                    borderRadius: "28px",
                    background:
                      msg.role === "user"
                        ? "linear-gradient(135deg, #667eea 0%, #f5576c 100%)"
                        : "rgba(102, 126, 234, 0.12)",
                    border:
                      msg.role === "assistant"
                        ? "2px solid rgba(102, 126, 234, 0.4)"
                        : "none",
                    boxShadow:
                      msg.role === "user"
                        ? "0 15px 40px rgba(102, 126, 234, 0.5)"
                        : "0 10px 30px rgba(0, 0, 0, 0.3)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "20px",
                      color: "#ffffff",
                      lineHeight: "1.7",
                      whiteSpace: "pre-wrap",
                      fontWeight: "500",
                    }}
                  >
                    {msg.content}
                  </div>

                  <div
                    style={{
                      fontSize: "15px",
                      color:
                        msg.role === "user"
                          ? "rgba(255,255,255,0.8)"
                          : "#94a3b8",
                      marginTop: "12px",
                      fontWeight: "500",
                    }}
                  >
                    {msg.time}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div
                style={{
                  marginBottom: "30px",
                  display: "flex",
                  justifyContent: "flex-start",
                }}
              >
                <div
                  style={{
                    padding: "24px 32px",
                    borderRadius: "28px",
                    background: "rgba(102, 126, 234, 0.12)",
                    border: "2px solid rgba(102, 126, 234, 0.4)",
                    color: "#ffffff",
                    fontSize: "20px",
                    fontWeight: "600",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      animation: "pulse 1.5s ease-in-out infinite",
                    }}
                  >
                    ⚡ AI is thinking...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask me anything... (Press Enter to send)"
              disabled={loading}
              style={{
                flex: 1,
                padding: "24px 32px",
                fontSize: "20px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "2px solid rgba(102, 126, 234, 0.4)",
                borderRadius: "24px",
                color: "#ffffff",
                outline: "none",
                fontWeight: "500",
                transition: "all 0.3s ease",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#667eea";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(102, 126, 234, 0.4)";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
              }}
            />

            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              style={{
                padding: "24px 48px",
                fontSize: "20px",
                fontWeight: "800",
                background:
                  !input.trim() || loading
                    ? "#444"
                    : "linear-gradient(135deg, #667eea 0%, #f5576c 100%)",
                border: "none",
                borderRadius: "24px",
                color: "#ffffff",
                cursor: !input.trim() || loading ? "not-allowed" : "pointer",
                boxShadow:
                  !input.trim() || loading
                    ? "none"
                    : "0 15px 40px rgba(102, 126, 234, 0.5)",
                transition: "all 0.3s ease",
                letterSpacing: "0.5px",
              }}
              onMouseEnter={(e) => {
                if (input.trim() && !loading) {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.boxShadow =
                    "0 20px 50px rgba(102, 126, 234, 0.7)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow =
                  "0 15px 40px rgba(102, 126, 234, 0.5)";
              }}
            >
              {loading ? "⏳ Sending" : "🚀 Send"}
            </button>
          </div>
        </div>

        {/* Tips Box */}
        {dataCount > 0 && (
          <div
            style={{
              marginTop: "30px",
              background: "rgba(102, 126, 234, 0.12)",
              border: "2px solid rgba(102, 126, 234, 0.4)",
              borderRadius: "24px",
              padding: "28px 36px",
            }}
          >
            <p
              style={{
                color: "#ffffff",
                fontSize: "19px",
                margin: 0,
                fontWeight: "500",
                lineHeight: "1.6",
              }}
            >
              💡{" "}
              <strong style={{ color: "#4facfe", fontSize: "21px" }}>
                Try asking:
              </strong>
              <br />
              <span
                style={{
                  color: "#94a3b8",
                  marginLeft: "30px",
                  display: "block",
                  marginTop: "12px",
                }}
              >
                • "Summarize my data"
                <br />
                • "What datasets do I have?"
                <br />
                • "Show me insights about my records"
              </span>
            </p>
          </div>
        )}

        {/* Back Button */}
        <div style={{ marginTop: "40px", textAlign: "center" }}>
          <button
            onClick={() => router.push("/dashboard")}
            style={{
              padding: "20px 48px",
              fontSize: "19px",
              fontWeight: "700",
              background: "transparent",
              border: "2px solid rgba(102, 126, 234, 0.6)",
              borderRadius: "20px",
              color: "#667eea",
              cursor: "pointer",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(102, 126, 234, 0.15)";
              e.currentTarget.style.borderColor = "#667eea";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "rgba(102, 126, 234, 0.6)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  );
}
