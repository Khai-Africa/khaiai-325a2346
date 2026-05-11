import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-pro";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You suggest exactly 4 high-quality, real, relevant external resources based on a user's recent conversation with an AI assistant.
Return STRICT JSON only matching this schema, no prose, no markdown:
{"links":[{"title":string,"description":string,"url":string,"source":string}]}
Rules:
- Exactly 4 items.
- title <= 60 chars, description <= 110 chars, plain text, no asterisks.
- url MUST be a real, publicly reachable https URL on a reputable domain (Wikipedia, official docs, MDN, BBC, Reuters, gov, well-known orgs, major media, GitHub, etc).
- source = the bare domain (e.g. "wikipedia.org").
- Pick a diverse mix (overview, deep-dive, tutorial/guide, news/reference) tailored to the topic.
- If conversation has no clear topic, pick generally useful starting points related to the most recent user question.`;

async function generate(prompt: string) {
  // Try Gemini direct first
  if (GEMINI_API_KEY) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              { role: "user", parts: [{ text: SYSTEM }] },
              { role: "model", parts: [{ text: "Understood. I will return strict JSON only." }] },
              { role: "user", parts: [{ text: prompt }] },
            ],
            generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
          }),
        },
      );
      if (r.ok) {
        const data = await r.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      }
    } catch (_) { /* fall through */ }
  }
  // Fallback: Lovable AI Gateway
  if (LOVABLE_API_KEY) {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (r.ok) {
      const data = await r.json();
      return data?.choices?.[0]?.message?.content ?? "";
    }
  }
  throw new Error("No AI provider available");
}

function safeParse(text: string) {
  try {
    const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ links: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build a compact transcript using only last ~6 messages, text only.
    const tail = messages.slice(-6).map((m: any) => {
      const text = typeof m.content === "string"
        ? m.content
        : Array.isArray(m.content)
          ? m.content.filter((p: any) => p?.type === "text").map((p: any) => p.text).join(" ")
          : "";
      return `${m.role?.toUpperCase() || "USER"}: ${String(text).slice(0, 800)}`;
    }).join("\n");

    const prompt = `Conversation transcript (most recent last):\n${tail}\n\nReturn the JSON now.`;

    const raw = await generate(prompt);
    const parsed = safeParse(raw);
    const links = Array.isArray(parsed?.links) ? parsed.links.slice(0, 4) : [];

    return new Response(JSON.stringify({ links }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("related-links error", err);
    return new Response(JSON.stringify({ links: [], error: String(err) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});