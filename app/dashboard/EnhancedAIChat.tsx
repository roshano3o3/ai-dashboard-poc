"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";

type UniversalRow = {
  id?: string;
  user_id?: string;
  dataset_name: string;
  column_names: string[] | null;
  row_data: Record<string, any> | null;
  created_at?: string;
};

type DashboardResult = {
  kpis: any[];
  charts: any[];
  insights: any[];
  findings: string[];
  summary: string;
  executive?: {
    takeaway: string;
    risk: string;
    action: string;
    confidence: "Low" | "Medium" | "High";
  };
};

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  time: string;
  metadata?: {
    suggestedFilters?: { column: string; value: string }[];
    suggestedQuestions?: string[];
    confidence?: number;
  };
};

type FilterState = { [columnName: string]: string };

interface EnhancedAIChatProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDataset: string;
  allData: UniversalRow[];
  dashboardData: DashboardResult | null;
  filters: FilterState;
  onApplyFilter?: (column: string, value: string) => void;
  onMessage?: (msg: string) => void;
}

const GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY || "";

function isNil(v: any) {
  return v === null || v === undefined;
}
function toNum(v: any): number | null {
  if (isNil(v)) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

export default function EnhancedAIChat({
  isOpen,
  onClose,
  selectedDataset,
  allData,
  dashboardData,
  filters,
  onApplyFilter,
  onMessage,
}: EnhancedAIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Seed welcome message on dataset change (reset if dataset changes)
  useEffect(() => {
    if (!selectedDataset) return;
    setMessages([
      {
        role: "assistant",
        content: `👋 **Welcome to AI Analytics Assistant**\n\nI'm analyzing **${selectedDataset}**. I can help you:\n\n✨ Discover hidden patterns\n📊 Explain visualizations\n🎯 Suggest optimal filters\n💡 Provide actionable recommendations\n\nAsk me anything about your data!`,
        time: new Date().toLocaleTimeString(),
        metadata: {
          suggestedQuestions: [
            "What are the key trends?",
            "Show me outliers",
            "Which segment performs best?",
            "Recommend filters to explore",
          ],
        },
      },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDataset]);

  useEffect(() => {
    if (!isOpen) return;
    inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const generateEnhancedContext = useCallback(() => {
    if (!selectedDataset || !dashboardData || allData.length === 0) {
      return "No data available for analysis.";
    }

    const datasetRows = allData.filter((r) => r.dataset_name === selectedDataset);

    const allColumns = new Set<string>();
    datasetRows.forEach((item) => (item.column_names || []).forEach((col) => allColumns.add(String(col))));
    const columns = Array.from(allColumns);

    // Light stats per column (avoid huge prompt)
    const stats: Record<string, any> = {};
    columns.slice(0, 25).forEach((col) => {
      const values = datasetRows
        .map((r) => r.row_data?.[col])
        .filter((v) => !isNil(v))
        .slice(0, 1500);

      const numericValues = values.map(toNum).filter((n) => n !== null) as number[];

      if (numericValues.length > 20) {
        const sum = numericValues.reduce((a, b) => a + b, 0);
        const avg = sum / numericValues.length;
        const sorted = [...numericValues].sort((a, b) => a - b);
        const min = sorted[0];
        const max = sorted[sorted.length - 1];
        const median = sorted[Math.floor(sorted.length / 2)];

        stats[col] = { type: "numeric", count: numericValues.length, avg: +avg.toFixed(2), min, max, median };
      } else {
        const freq: Record<string, number> = {};
        values.forEach((v) => {
          const k = String(v);
          freq[k] = (freq[k] || 0) + 1;
        });
        const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, c]) => `${k}(${c})`);
        stats[col] = { type: "categorical", count: values.length, unique: Object.keys(freq).length, top };
      }
    });

    const dashboardSummary = {
      totalRecords: datasetRows.length,
      fields: columns.length,
      kpis: (dashboardData.kpis || []).slice(0, 10).map((kpi: any) => `${kpi.title}: ${kpi.value}`),
      charts: (dashboardData.charts || []).slice(0, 6).map((c: any) => ({
        title: c.title,
        topSegment: c.data?.[0]?.name,
        topValue: c.data?.[0]?.value,
      })),
      executiveSummary: dashboardData.executive?.takeaway,
      confidence: dashboardData.executive?.confidence,
    };

    const activeFilters = Object.entries(filters)
      .map(([k, v]) => `${k}=${v}`)
      .join(", ");

    return `
# DATASET CONTEXT
Dataset: ${selectedDataset}
Total Records: ${dashboardSummary.totalRecords}
Fields: ${dashboardSummary.fields}
Active Filters: ${activeFilters || "None"}

# KPIs
${dashboardSummary.kpis.join("\n")}

# Charts (top segment)
${dashboardSummary.charts
  .map((c) => `- ${c.title}: top "${c.topSegment}" (${c.topValue})`)
  .join("\n")}

# Column Stats (sample)
${Object.entries(stats)
  .map(([col, s]) =>
    s.type === "numeric"
      ? `- ${col} (num): avg=${s.avg} min=${s.min} max=${s.max} median=${s.median}`
      : `- ${col} (cat): unique=${s.unique} top=${(s.top || []).join(", ")}`
  )
  .join("\n")}

Executive: ${dashboardSummary.executiveSummary || "—"} (Confidence: ${dashboardSummary.confidence || "—"})
Available columns: ${columns.join(", ")}
`;
  }, [selectedDataset, allData, dashboardData, filters]);

  const callEnhancedAI = async (question: string): Promise<ChatMessage> => {
    if (!GROQ_API_KEY) {
      return {
        role: "assistant",
        content: "⚠️ **API Key Missing**\n\nAdd `NEXT_PUBLIC_GROQ_API_KEY` to `.env.local`, then restart the dev server.",
        time: new Date().toLocaleTimeString(),
      };
    }

    try {
      const context = generateEnhancedContext();
      const history = messages.slice(-6).map((m) => ({
        role: m.role === "system" ? "system" : m.role,
        content: m.content,
      }));

      const systemPrompt = `You are an elite data analyst (BI + statistics + storytelling).

Use this context:
${context}

Rules:
- Be specific (use numbers).
- Be actionable (next steps).
- Use markdown formatting.
- If you recommend filters, write them explicitly like: \`column = value\`.

Response format:
**Key Finding:** ...
**Analysis:** ...
**Recommendation:** ...
**Suggested Filters:** (optional)
**Next Questions:** (optional)
`;

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "system", content: systemPrompt }, ...history, { role: "user", content: question }],
          max_tokens: 900,
          temperature: 0.7,
        }),
      });

      if (!response.ok) throw new Error("AI service unavailable");
      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content || "No response from AI.";

      // Parse `column = value` suggestions
      const filterMatches = aiResponse.match(/`([^`]+)\s*=\s*([^`]+)`/g);
      const suggestedFilters =
        filterMatches
          ?.map((match) => {
            const m = match.match(/`([^`]+)\s*=\s*([^`]+)`/);
            if (!m) return null;
            return { column: m[1].trim(), value: m[2].trim() };
          })
          .filter(Boolean) || [];

      // Optional: suggested questions (simple heuristic)
      const suggestedQuestions: string[] = [];
      if (/outlier|anomal/i.test(aiResponse)) suggestedQuestions.push("Show me the top outliers with values.");
      if (/trend/i.test(aiResponse)) suggestedQuestions.push("Which segment drives the trend the most?");
      if (/filter/i.test(aiResponse)) suggestedQuestions.push("What filter should I try next for deeper insight?");

      return {
        role: "assistant",
        content: aiResponse,
        time: new Date().toLocaleTimeString(),
        metadata: {
          suggestedFilters: suggestedFilters as any,
          suggestedQuestions: suggestedQuestions.length ? suggestedQuestions.slice(0, 3) : undefined,
          confidence: 0.85,
        },
      };
    } catch (error) {
      console.error("AI Error:", error);
      return {
        role: "assistant",
        content: "⚠️ **Connection Error**\n\nUnable to reach AI service. Please try again.",
        time: new Date().toLocaleTimeString(),
      };
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const question = input.trim();
    setInput("");
    setIsLoading(true);

    setMessages((prev) => [...prev, { role: "user", content: question, time: new Date().toLocaleTimeString() }]);

    const aiMsg = await callEnhancedAI(question);
    setMessages((prev) => [...prev, aiMsg]);
    setIsLoading(false);
  };

  const handleSuggestedQuestion = (q: string) => {
    setInput(q);
    inputRef.current?.focus();
  };

  const handleApplyFilter = (column: string, value: string) => {
    if (!onApplyFilter) return;
    onApplyFilter(column, value);
    onMessage?.(`Applied filter: ${column} = ${value}`);
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <style>{`
        @keyframes aiBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: .6; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
        .ai-md p { margin: 0 0 10px 0; }
        .ai-md ul { margin: 8px 0 12px 18px; }
        .ai-md li { margin: 4px 0; }
        .ai-md strong { color: #ffffff; }
        .ai-md code { background: rgba(255,255,255,0.10); padding: 2px 6px; border-radius: 6px; }
        .ai-md h1,.ai-md h2,.ai-md h3 { margin: 10px 0 8px 0; }
      `}</style>

      <div style={styles.drawer} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.aiIcon}>🤖</div>
            <div>
              <div style={styles.headerTitle}>AI Analytics Assistant</div>
              <div style={styles.headerSub}>
                Analyzing <span style={styles.datasetBadge}>{selectedDataset}</span>
              </div>
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={styles.messagesContainer}>
          <div style={styles.messagesList}>
            {messages.map((msg, idx) => (
              <div key={idx} style={styles.messageWrapper}>
                {msg.role === "assistant" ? (
                  <div style={styles.assistantMessage}>
                    <div style={styles.assistantAvatar}>🤖</div>

                    <div style={styles.assistantContent}>
                      <div style={styles.messageHeader}>
                        <span style={styles.messageName}>AI Assistant</span>
                        <span style={styles.messageTime}>{msg.time}</span>
                      </div>

                      <div style={styles.markdownContent} className="ai-md">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>

                      {msg.metadata?.suggestedFilters?.length ? (
                        <div style={styles.suggestedFilters}>
                          <div style={styles.suggestedTitle}>💡 Suggested Filters</div>
                          <div style={styles.filterChips}>
                            {msg.metadata.suggestedFilters.map((f, i) => (
                              <button
                                key={i}
                                style={styles.filterChip}
                                onClick={() => handleApplyFilter(f.column, f.value)}
                              >
                                {f.column} = {f.value}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {msg.metadata?.suggestedQuestions?.length ? (
                        <div style={styles.suggestedQuestions}>
                          <div style={styles.suggestedTitle}>🎯 Try asking</div>
                          <div style={styles.questionChips}>
                            {msg.metadata.suggestedQuestions.map((q, i) => (
                              <button key={i} style={styles.questionChip} onClick={() => handleSuggestedQuestion(q)}>
                                {q}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {typeof msg.metadata?.confidence === "number" ? (
                        <div style={styles.confidenceBadge}>
                          Confidence: {(msg.metadata.confidence * 100).toFixed(0)}%
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div style={styles.userMessage}>
                    <div style={styles.userContent}>
                      <div style={styles.messageHeader}>
                        <span style={styles.messageName}>You</span>
                        <span style={styles.messageTime}>{msg.time}</span>
                      </div>
                      <div style={styles.userText}>{msg.content}</div>
                    </div>
                    <div style={styles.userAvatar}>👤</div>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div style={styles.assistantMessage}>
                <div style={styles.assistantAvatar}>🤖</div>
                <div style={styles.typingIndicator}>
                  <div style={styles.typingDot} />
                  <div style={{ ...styles.typingDot, animationDelay: "0.18s" }} />
                  <div style={{ ...styles.typingDot, animationDelay: "0.36s" }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        <div style={styles.inputContainer}>
          <div style={styles.inputWrapper}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask about trends, patterns, outliers…"
              style={styles.input}
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              style={{
                ...styles.sendBtn,
                opacity: !input.trim() || isLoading ? 0.55 : 1,
                cursor: !input.trim() || isLoading ? "not-allowed" : "pointer",
              }}
            >
              {isLoading ? "⏳" : "🚀"}
            </button>
          </div>

          <div style={styles.inputHint}>
            Press <kbd style={styles.kbd}>Enter</kbd> to send • Powered by Groq
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.7)",
    backdropFilter: "blur(8px)",
    zIndex: 1000,
    display: "flex",
    justifyContent: "flex-end",
  },
  drawer: {
    width: 520,
    maxWidth: "95vw",
    height: "100%",
    background: "linear-gradient(to bottom, #0B1220 0%, #0F1729 100%)",
    borderLeft: "1px solid rgba(255, 255, 255, 0.1)",
    boxShadow: "-20px 0 60px rgba(0, 0, 0, 0.5)",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    padding: "20px 24px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "rgba(255, 255, 255, 0.03)",
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 14 },
  aiIcon: { fontSize: 32, filter: "drop-shadow(0 4px 12px rgba(79, 70, 229, 0.4))" },
  headerTitle: { fontSize: 18, fontWeight: 950, color: "#fff", letterSpacing: 0.3 },
  headerSub: { fontSize: 13, color: "rgba(255, 255, 255, 0.65)", marginTop: 2 },
  datasetBadge: {
    padding: "2px 8px",
    borderRadius: 6,
    background: "rgba(79, 70, 229, 0.2)",
    border: "1px solid rgba(79, 70, 229, 0.3)",
    color: "#A5B4FC",
    fontWeight: 800,
    fontSize: 12,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    border: "1px solid rgba(255, 255, 255, 0.12)",
    background: "rgba(255, 255, 255, 0.05)",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 16,
  },

  messagesContainer: { flex: 1, overflowY: "auto", padding: "18px 18px 8px", background: "rgba(0, 0, 0, 0.10)" },
  messagesList: { display: "flex", flexDirection: "column", gap: 18 },
  messageWrapper: { display: "flex", flexDirection: "column" },

  assistantMessage: { display: "flex", gap: 12, alignItems: "flex-start" },
  assistantAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
    flexShrink: 0,
    boxShadow: "0 8px 20px rgba(79, 70, 229, 0.3)",
  },
  assistantContent: {
    flex: 1,
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    padding: "14px 16px",
    maxWidth: "calc(100% - 50px)",
  },

  userMessage: { display: "flex", gap: 12, alignItems: "flex-start", justifyContent: "flex-end" },
  userContent: {
    background: "linear-gradient(135deg, #4F46E5 0%, #EC4899 100%)",
    borderRadius: 16,
    padding: "14px 16px",
    maxWidth: "80%",
    boxShadow: "0 8px 24px rgba(79, 70, 229, 0.3)",
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: "linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
    flexShrink: 0,
    boxShadow: "0 8px 20px rgba(245, 158, 11, 0.3)",
  },

  messageHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  messageName: { fontSize: 13, fontWeight: 900, color: "#fff" },
  messageTime: { fontSize: 11, color: "rgba(255, 255, 255, 0.5)" },

  markdownContent: { fontSize: 14, lineHeight: 1.65, color: "rgba(255, 255, 255, 0.92)" },
  userText: { fontSize: 14, lineHeight: 1.55, color: "#fff", fontWeight: 650 },

  suggestedFilters: {
    marginTop: 14,
    padding: 12,
    background: "rgba(79, 70, 229, 0.10)",
    border: "1px solid rgba(79, 70, 229, 0.20)",
    borderRadius: 12,
  },
  suggestedQuestions: {
    marginTop: 14,
    padding: 12,
    background: "rgba(16, 185, 129, 0.08)",
    border: "1px solid rgba(16, 185, 129, 0.16)",
    borderRadius: 12,
  },
  suggestedTitle: { fontSize: 12, fontWeight: 950, color: "rgba(255,255,255,0.85)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.6 },

  filterChips: { display: "flex", flexWrap: "wrap", gap: 8 },
  filterChip: {
    padding: "7px 12px",
    borderRadius: 10,
    background: "rgba(79, 70, 229, 0.15)",
    border: "1px solid rgba(79, 70, 229, 0.30)",
    color: "#C7D2FE",
    fontSize: 12,
    fontWeight: 900,
    cursor: "pointer",
  },

  questionChips: { display: "flex", flexDirection: "column", gap: 8 },
  questionChip: {
    padding: "9px 12px",
    borderRadius: 10,
    background: "rgba(16, 185, 129, 0.10)",
    border: "1px solid rgba(16, 185, 129, 0.22)",
    color: "#A7F3D0",
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
    textAlign: "left",
  },

  confidenceBadge: {
    marginTop: 10,
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 8,
    background: "rgba(16, 185, 129, 0.14)",
    border: "1px solid rgba(16, 185, 129, 0.24)",
    color: "#6EE7B7",
    fontSize: 11,
    fontWeight: 950,
  },

  typingIndicator: {
    display: "flex",
    gap: 8,
    padding: "12px 16px",
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.10)",
    borderRadius: 16,
    alignItems: "center",
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#A5B4FC",
    animation: "aiBounce 1.1s infinite ease-in-out",
  },

  inputContainer: { padding: "16px 18px", borderTop: "1px solid rgba(255, 255, 255, 0.08)", background: "rgba(255, 255, 255, 0.03)" },
  inputWrapper: { display: "flex", gap: 10, alignItems: "center" },
  input: {
    flex: 1,
    padding: "14px 16px",
    borderRadius: 12,
    border: "1px solid rgba(255, 255, 255, 0.12)",
    background: "rgba(255, 255, 255, 0.06)",
    color: "#fff",
    fontSize: 14,
    fontWeight: 650,
    outline: "none",
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    border: "none",
    background: "linear-gradient(135deg, #4F46E5 0%, #EC4899 100%)",
    color: "#fff",
    fontSize: 18,
    boxShadow: "0 8px 20px rgba(79, 70, 229, 0.3)",
  },
  inputHint: { marginTop: 8, fontSize: 11, color: "rgba(255, 255, 255, 0.55)", textAlign: "center" },
  kbd: { padding: "2px 6px", borderRadius: 6, background: "rgba(255, 255, 255, 0.10)", border: "1px solid rgba(255, 255, 255, 0.18)", fontSize: 10, fontWeight: 900 },
};
