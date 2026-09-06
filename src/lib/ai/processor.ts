import { supabase } from '@/integrations/supabase/client';
import type { AiTool, GeminiFunctionCall } from './tools';

export interface AiProcessorOptions {
  apiKey: string;
  tools: AiTool[];
  systemPrompt: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
  fallbackModel?: string;
  provider?: 'google' | 'openai' | 'anthropic';
}

interface GeminiContent {
  role: 'user' | 'model' | 'function';
  parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string }; functionCall?: { name: string; args: Record<string, unknown> }; functionResponse?: { name: string; response: unknown } }>;
}

interface GeminiBody {
  system_instruction?: { parts: Array<{ text: string }> };
  contents: GeminiContent[];
  generationConfig?: { temperature: number; maxOutputTokens: number };
  tools?: Array<{ functionDeclarations: Array<{ name: string; description: string; parameters: { type: string; properties: Record<string, { type: string; description: string }>; required: string[] } }> }>;
}

function detectProvider(apiKey: string): AiProcessorOptions['provider'] {
  if (apiKey.startsWith('AIza')) return 'google';
  if (apiKey.startsWith('sk-') && !apiKey.startsWith('sk-ant-')) return 'openai';
  if (apiKey.startsWith('sk-ant-')) return 'anthropic';
  return 'google';
}

async function callGoogleGemini(
  apiKey: string,
  model: string,
  contents: GeminiContent[],
  systemPrompt: string,
  temperature: number,
  maxTokens: number,
  tools: AiTool[]
) {
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
      ) as Record<string, { type: string; description: string }>,
      required: Object.entries(tool.parameters)
        .filter(([, value]) => value.required)
        .map(([key]) => key),
    },
  }));

  const body: GeminiBody = {
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
    },
  };

  if (tools.length > 0) {
    body.tools = [{ functionDeclarations }];
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Gemini API error:', errorData);
    throw new Error(errorData.error?.message || 'Erro ao processar IA');
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];

  const textPart = parts.find((part: { text?: string; functionCall?: { name: string; args: Record<string, unknown> } }) => part.text);
  const functionCallPart = parts.find((part: { text?: string; functionCall?: { name: string; args: Record<string, unknown> } }) => part.functionCall);

  if (functionCallPart) {
    const tool = tools.find((t) => t.name === functionCallPart.functionCall.name);
    if (!tool) {
      return {
        text: 'Ferramenta não encontrada.',
        functionCall: null,
      };
    }

    try {
      const result = await tool.execute(functionCallPart.functionCall.args || {});
      return {
        text: null,
        functionCall: {
          name: functionCallPart.functionCall.name,
          arguments: functionCallPart.functionCall.args || {},
          response: result,
        },
      };
    } catch (error) {
      return {
        text: null,
        functionCall: {
          name: functionCallPart.functionCall.name,
          arguments: functionCallPart.functionCall.args || {},
          response: { error: error instanceof Error ? error.message : 'Erro desconhecido' },
        },
      };
    }
  }

  return {
    text: textPart?.text ?? 'Sem resposta.',
    functionCall: null,
  };
}

async function callOpenAI(
  apiKey: string,
  model: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  systemPrompt: string,
  temperature: number,
  maxTokens: number,
  tools: AiTool[],
  endpoint = 'https://api.openai.com/v1/chat/completions'
) {
  const functionDeclarations = tools.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));

  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    temperature,
    max_tokens: maxTokens,
  };

  if (tools.length > 0) {
    body.tools = functionDeclarations;
    body.tool_choice = 'auto';
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('OpenAI API error:', errorData);
    throw new Error(errorData.error?.message || 'Erro ao processar IA');
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  const message = choice?.message;

  if (message?.tool_calls?.length > 0) {
    const toolCall = message.tool_calls[0];
    const tool = tools.find((t) => t.name === toolCall.function.name);
    if (!tool) {
      return {
        text: 'Ferramenta não encontrada.',
        functionCall: null,
      };
    }

    try {
      const args = JSON.parse(toolCall.function.arguments || '{}');
      const result = await tool.execute(args);
      return {
        text: null,
        functionCall: {
          name: toolCall.function.name,
          arguments: args,
          response: result,
        },
      };
    } catch (error) {
      return {
        text: null,
        functionCall: {
          name: toolCall.function.name,
          arguments: {},
          response: { error: error instanceof Error ? error.message : 'Erro desconhecido' },
        },
      };
    }
  }

  return {
    text: message?.content ?? 'Sem resposta.',
    functionCall: null,
  };
}

async function callAnthropic(
  apiKey: string,
  model: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  systemPrompt: string,
  temperature: number,
  maxTokens: number,
  tools: AiTool[]
) {
  const functionDeclarations = tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters,
  }));

  const body: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
  };

  if (tools.length > 0) {
    body.tools = functionDeclarations;
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Anthropic API error:', errorData);
    throw new Error(errorData.error?.message || 'Erro ao processar IA');
  }

  const data = await response.json();
  const content = data.content?.[0];

  if (content?.type === 'tool_use') {
    const tool = tools.find((t) => t.name === content.name);
    if (!tool) {
      return {
        text: 'Ferramenta não encontrada.',
        functionCall: null,
      };
    }

    try {
      const result = await tool.execute(content.input || {});
      return {
        text: null,
        functionCall: {
          name: content.name,
          arguments: content.input || {},
          response: result,
        },
      };
    } catch (error) {
      return {
        text: null,
        functionCall: {
          name: content.name,
          arguments: content.input || {},
          response: { error: error instanceof Error ? error.message : 'Erro desconhecido' },
        },
      };
    }
  }

  return {
    text: content?.text ?? 'Sem resposta.',
    functionCall: null,
  };
}

export async function processAiTurn(
  messages: { 
    role: 'user' | 'assistant' | 'function'; 
    content?: string; 
    functionCall?: GeminiFunctionCall; 
    functionResponse?: unknown;
    attachments?: Array<{ mimeType: string; data: string }>;
  }[],
  options: AiProcessorOptions
) {
  const {
    apiKey,
    tools,
    systemPrompt,
    temperature = 0.7,
    maxTokens = 1024,
    model = 'gemini-pro',
    fallbackModel,
    fallbackProvider,
    provider = detectProvider(apiKey),
  } = options;

  if (provider === 'openai') {
    const openAIMessages = messages
      .filter(m => m.role !== 'function')
      .map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content || '',
      }));

    return callOpenAI(apiKey, model, openAIMessages, systemPrompt, temperature, maxTokens, tools);
  }

  if (provider === 'anthropic') {
    const anthropicMessages = messages
      .filter(m => m.role !== 'function')
      .map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content || '',
      }));

    return callAnthropic(apiKey, model, anthropicMessages, systemPrompt, temperature, maxTokens, tools);
  }

  const callWithModel = async (targetModel: string) => {
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
        parts: [
          ...(m.content ? [{ text: m.content ?? '' }] : []),
          ...(m.attachments?.flatMap((attachment) => [
            { inlineData: { mimeType: attachment.mimeType, data: attachment.data } },
          ]) ?? []),
        ],
      };
    });

    return callGoogleGemini(apiKey, targetModel, contents, systemPrompt, temperature, maxTokens, tools);
  };

  try {
    return await callWithModel(model);
  } catch (error) {
    if (fallbackModel && fallbackModel !== model) {
      console.warn(`Modelo principal ${model} falhou, usando fallback ${fallbackModel}`);
      try {
        return await callWithModel(fallbackModel);
      } catch (fallbackError) {
        console.warn(`Fallback ${fallbackModel} também falhou:`, fallbackError);
      }
    }

    throw error;
  }
}

export async function processAiTurnViaEdgeFunction(
  messages: {
    role: 'user' | 'assistant' | 'function';
    content?: string;
    functionCall?: { name: string; args: Record<string, unknown> };
    functionResponse?: unknown;
    attachments?: Array<{ mimeType: string; data: string }>;
  }[],
  options: Omit<AiProcessorOptions, 'apiKey' | 'provider'> & { provider?: 'google' }
) {
  const { tools, systemPrompt, temperature = 0.7, maxTokens = 1024, model = 'gemini-1.5-flash', fallbackModel } = options;

  const { data, error } = await supabase.functions.invoke('ai-chat', {
    body: {
      messages,
      systemPrompt,
      temperature,
      maxTokens,
      model,
      tools: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object',
          properties: Object.fromEntries(
            Object.entries(tool.parameters).map(([key, value]) => [
              key,
              { type: value.type, description: value.description },
            ])
          ) as Record<string, { type: string; description: string }>,
          required: Object.entries(tool.parameters)
            .filter(([, value]) => value.required)
            .map(([key]) => key),
        },
      })),
      fallbackModel,
    },
  });

  if (error) {
    throw new Error(error.message || 'Erro ao processar IA via edge function');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  if (data?.functionCall) {
    return {
      text: null,
      functionCall: {
        name: data.functionCall.name,
        arguments: data.functionCall.arguments ?? {},
        response: null,
      },
    };
  }

  return {
    text: data?.text ?? 'Sem resposta.',
    functionCall: null,
  };
}
