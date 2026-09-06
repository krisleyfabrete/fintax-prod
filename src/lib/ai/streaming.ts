import type { AiTool, GeminiFunctionCall } from './tools';

export interface AiProcessorOptions {
  apiKey: string;
  tools: AiTool[];
  systemPrompt: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export async function processAiTurnStream(
   messages: { role: 'user' | 'assistant' | 'function'; content?: string; functionCall?: GeminiFunctionCall; functionResponse?: unknown }[],
  options: AiProcessorOptions,
  onChunk: (chunk: string) => void
) {
  const {
    apiKey,
    tools,
    systemPrompt,
    temperature = 0.7,
    maxTokens = 1024,
    model = 'gemini-3.6-flash',
  } = options;

  const contents = messages.map((m) => {
    if (m.role === 'function' && m.functionResponse) {
      return {
        role: 'function',
        parts: [
          {
            functionResponse: {
              name: m.functionCall?.name ?? 'unknown',
              response: m.functionResponse,
            },
          },
        ],
      };
    }
    if (m.role === 'assistant' && m.functionCall) {
      return {
        role: 'model',
        parts: [
          {
            functionCall: {
              name: m.functionCall.name,
              args: m.functionCall.arguments,
            },
          },
        ],
      };
    }
    return {
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content ?? '' }],
    };
  });

  const body: Record<string, unknown> = {
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
    },
  };

  const functionDeclarations = tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: {
      type: 'object',
      properties: Object.fromEntries(
        Object.entries(tool.parameters).map(([key, value]) => [
          key,
          { type: value.type, description: value.description },
        ])
      ),
      required: Object.entries(tool.parameters)
        .filter(([, value]) => value.required)
        .map(([key]) => key),
    },
  }));

  body.tools = [{ functionDeclarations }];

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Erro ao processar IA');
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Stream não disponível');
  }

  const decoder = new TextDecoder();
  let fullText = '';
  let functionCallPart: GeminiFunctionCall | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n').filter(line => line.trim().startsWith('data:'));

    for (const line of lines) {
      const data = line.replace('data:', '').trim();
      if (data === '[DONE]') continue;

      try {
        const parsed = JSON.parse(data);
        const parts = parsed.candidates?.[0]?.content?.parts ?? [];

        const textPart = parts.find((part: { text?: string }) => part.text);
        const fcPart = parts.find((part: { functionCall?: { name: string; args: Record<string, unknown> } }) => part.functionCall);

        if (textPart) {
          fullText += textPart.text;
          onChunk(textPart.text);
        }

        if (fcPart) {
          functionCallPart = fcPart.functionCall;
        }
      } catch {
        // ignore parse errors
      }
    }
  }

  if (functionCallPart) {
    const tool = tools.find((t) => t.name === functionCallPart.name);
    if (tool) {
      try {
        const result = await tool.execute(functionCallPart.args || {});
        return {
          text: fullText || 'Operação executada.',
          functionCall: {
            name: functionCallPart.name,
            arguments: functionCallPart.args || {},
            response: result,
          },
        };
      } catch (error) {
        return {
          text: fullText || 'Erro na operação.',
          functionCall: {
            name: functionCallPart.name,
            arguments: functionCallPart.args || {},
            response: { error: error instanceof Error ? error.message : 'Erro desconhecido' },
          },
        };
      }
    }
  }

  return {
    text: fullText || 'Sem resposta.',
    functionCall: null,
  };
}
