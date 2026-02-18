import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const question = String(body?.question || "").trim();
    const context = String(body?.context || "").trim();

    if (!question) {
      return NextResponse.json({ answer: "Please type a question." }, { status: 200 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { answer: "❌ GROQ_API_KEY missing. Add it to .env.local then restart npm run dev." },
        { status: 200 }
      );
    }

    const system = [
      "You are a helpful data analyst assistant.",
      "Be concise and specific.",
      "If asked to summarize data, give bullet insights + next steps.",
      context ? `\nDATA CONTEXT:\n${context}\n` : "",
    ].join("\n");

    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: system },
          { role: "user", content: question },
        ],
        max_tokens: 600,
        temperature: 0.6,
      }),
    });

    const raw = await resp.text();

    if (!resp.ok) {
      return NextResponse.json({ answer: `❌ Groq error (${resp.status}): ${raw}` }, { status: 200 });
    }

    const data = JSON.parse(raw);
    const answer = data?.choices?.[0]?.message?.content?.trim() || "No response.";

    return NextResponse.json({ answer }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { answer: `❌ Server exception: ${err?.message || "Unknown error"}` },
      { status: 200 }
    );
  }
}
