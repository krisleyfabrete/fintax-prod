// supabase/functions/financial-insights/index.ts
import { getServiceClient } from "../_shared/admin.ts";
import { handleCors, json } from "../_shared/cors.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-3.6-flash";

interface TxRow {
  description: string;
  amount: number;
  type: string;
  date: string;
}

interface Body {
  transactions: TxRow[];
  goals?: { name: string; target: number; current: number }[];
  accounts?: { name: string; balance: number }[];
}

Deno.serve(async (req) => {
  const cors = handleCors(req); if (cors) return cors;
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Não autenticado" }, { status: 401 });
    const supabase = getServiceClient();
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return json({ error: "Não autenticado" }, { status: 401 });

    if (!GEMINI_API_KEY) return json({ error: "GEMINI_API_KEY não configurada" }, { status: 500 });

    const body: Body = await req.json().catch(() => ({} as Body));
    const sys = `Você é um consultor financeiro. Analise os dados e gere 3-5 insights práticos em português.
Responda EXCLUSIVAMENTE JSON: {"insights":[{"title":"...","description":"..."]}"`;
    const prompt = JSON.stringify(body);

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: sys }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.7 },
      }),
    });
    const gem = await res.json();
    if (!res.ok) return json({ error: "Gemini falhou", details: gem }, { status: 500 });
    const text = gem?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    return json(JSON.parse(text));
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 400 });
  }
});