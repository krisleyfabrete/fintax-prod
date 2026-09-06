// supabase/functions/suggest-category/index.ts
import { getServiceClient } from "../_shared/admin.ts";
import { handleCors, json } from "../_shared/cors.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-3.6-flash";

interface Body {
  description: string;
  type: "income" | "expense";
  categories: { name: string; type: string }[];
}

Deno.serve(async (req) => {
  const cors = handleCors(req); if (cors) return cors;
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = getServiceClient();
    if (!authHeader) return json({ error: "Não autenticado" }, { status: 401 });

    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return json({ error: "Não autenticado" }, { status: 401 });

    const body: Body = await req.json().catch((e) => { throw new SyntaxError("Invalid JSON body: " + e.message) });
    if (!GEMINI_API_KEY) return json({ error: "GEMINI_API_KEY não configurada" }, { status: 500 });

    const sys = `Você categoriza transações financeiras. Escolha a melhor categoria da lista. Responda APENAS JSON: {"category":"...","reason":"..."}`;
    const prompt = `Descrição: ${body.description}\nTipo: ${body.type}\nCategorias: ${JSON.stringify(body.categories)}`;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: sys }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
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