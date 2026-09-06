// supabase/functions/ai-chat/index.ts
import { getServiceClient } from "../_shared/admin.ts";
import { handleCors, json } from "../_shared/cors.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.0-flash";

interface ToolDeclaration {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
}

interface AiChatBody {
  messages: {
    role: "user" | "assistant" | "function";
    content?: string;
    functionCall?: { name: string; args: Record<string, unknown> };
    functionResponse?: unknown;
    attachments?: Array<{ mimeType: string; data: string }>;
  }[];
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  model: string;
  tools?: ToolDeclaration[];
  fallbackModel?: string;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Não autenticado" }, { status: 401 });

    const supabase = getServiceClient();
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return json({ error: "Não autenticado" }, { status: 401 });

    if (!GEMINI_API_KEY) return json({ error: "GEMINI_API_KEY não configurada" }, { status: 500 });

    const body: AiChatBody = await req.json();
    const { messages, systemPrompt, temperature, maxTokens, model, tools, fallbackModel } = body;

    const functionDeclarations = (tools ?? []).map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));

    const contents = messages.map((m) => {
      if (m.role === "function" && m.functionResponse) {
        return {
          role: "function",
          parts: [
            {
              functionResponse: {
                name: m.functionCall?.name ?? "unknown",
                response: m.functionResponse,
              },
            },
          ],
        };
      }
      if (m.role === "assistant" && m.functionCall) {
        return {
          role: "model",
          parts: [
            {
              functionCall: {
                name: m.functionCall.name,
                args: m.functionCall.args,
              },
            },
          ],
        };
      }
      return {
        role: m.role === "assistant" ? "model" : "user",
        parts: [
          ...(m.content ? [{ text: m.content ?? "" }] : []),
          ...(m.attachments?.flatMap((attachment) => [
            { inlineData: { mimeType: attachment.mimeType, data: attachment.data } },
          ]) ?? []),
        ],
      };
    });

    const requestBody: Record<string, unknown> = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
    };

    if ((tools ?? []).length > 0) {
      requestBody.tools = [{ functionDeclarations }];
    }

    const targetModel = model || MODEL;
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${targetModel}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      }
    );

    if (!res.ok) {
      const errorData = await res.json();
      return json({ error: "Gemini falhou", details: errorData }, { status: 500 });
    }

    const data = await res.json();
    const candidate = data?.candidates?.[0];
    const parts = candidate?.content?.parts ?? [];

    const textPart = parts.find((part: { text?: string }) => part.text);
    const functionCallPart = parts.find((part: { functionCall?: { name: string } }) => part.functionCall);

    if (functionCallPart) {
      return json({
        text: null,
        functionCall: {
          name: functionCallPart.functionCall.name,
          arguments: functionCallPart.functionCall.args ?? {},
          response: null,
        },
      });
    }

    return json({ text: textPart?.text ?? "Sem resposta.", functionCall: null });
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 400 });
  }
});
