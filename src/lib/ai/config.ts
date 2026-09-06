const AI_USAGE_KEY = 'fintax_ai_usage';
const AI_CONFIG_KEY = 'fintax_ai_config';
const LLM_PROVIDERS_KEY = 'fintax_llm_providers';

export interface LLMProvider {
  id: string;
  name: string;
  apiKey: string;
  provider: string;
  model: string;
  status: string;
  lastTested?: string;
  createdAt: string;
}

export interface AiConfig {
  model: string;
  fallbackModel?: string;
  temperature: number;
  max_tokens: number;
  enabled: boolean;
  prompt_client: string;
  prompt_admin: string;
  provider: string;
}

export function getActiveLLMProvider(): LLMProvider | null {
  try {
    const raw = localStorage.getItem(LLM_PROVIDERS_KEY);
    if (raw) {
      const providers = JSON.parse(raw) as LLMProvider[];
      const active = providers.find((p) => p.status === 'active');
      if (active) {
        return active;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export function trackAiUsage(context: 'client' | 'admin') {
  try {
    const raw = localStorage.getItem(AI_USAGE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    const today = new Date().toISOString().split('T')[0];
    const key = `${context}_${today}`;
    data[key] = (data[key] || 0) + 1;
    data.updated_at = new Date().toISOString();
    localStorage.setItem(AI_USAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore storage errors
  }
}

export function getAiConfig(): AiConfig {
  try {
    const raw = localStorage.getItem(AI_CONFIG_KEY);
    if (raw) {
      return JSON.parse(raw) as AiConfig;
    }
  } catch {
    // ignore
  }
  return {
    model: 'gemini-pro',
    fallbackModel: 'gemini-1.5-flash',
    temperature: 0.7,
    max_tokens: 1024,
    enabled: true,
    prompt_client: '',
    prompt_admin: '',
    provider: 'google',
  };
}

export function setAiConfig(config: AiConfig) {
  try {
    localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
}
