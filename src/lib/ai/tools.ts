export interface AiTool {
  name: string;
  description: string;
  parameters: Record<string, {
    type: string;
    description: string;
    required?: boolean;
    enum?: string[];
  }>;
  execute: (args: Record<string, unknown>) => Promise<string>;
}

export interface GeminiFunctionCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface GeminiToolResponse {
  functionResponse: {
    name: string;
    response: unknown;
  };
}
