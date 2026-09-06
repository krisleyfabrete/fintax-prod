import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2, Check, X, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface LLMProvider {
  id: string;
  name: string;
  apiKey: string;
  provider: 'openai' | 'google' | 'anthropic' | 'cohere' | 'mistral' | 'groq' | 'custom';
  model: string;
  status: 'active' | 'inactive' | 'error';
  lastTested?: string;
  createdAt: string;
}

const PROVIDER_CONFIGS = {
  openai: {
    name: 'OpenAI',
    patterns: ['sk-'],
    recommendedModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    url: 'https://platform.openai.com/api-keys',
  },
  google: {
    name: 'Google Gemini',
    patterns: ['AIza'],
    recommendedModels: ['gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'],
    url: 'https://aistudio.google.com/app/apikey',
  },
  anthropic: {
    name: 'Anthropic Claude',
    patterns: ['sk-ant-'],
    recommendedModels: ['claude-3-5-sonnet-20240620', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229'],
    url: 'https://console.anthropic.com/settings/keys',
  },
  cohere: {
    name: 'Cohere',
    patterns: [],
    recommendedModels: ['command', 'command-light'],
    url: 'https://dashboard.cohere.ai/api-keys',
  },
  mistral: {
    name: 'Mistral AI',
    patterns: [],
    recommendedModels: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest'],
    url: 'https://console.mistral.ai/api-keys',
  },
  groq: {
    name: 'Groq',
    patterns: ['gsk_'],
    recommendedModels: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
    url: 'https://console.groq.com/keys',
  },
  custom: {
    name: 'Custom',
    patterns: [],
    recommendedModels: [],
    url: '',
  },
};

export default function AdminLLMConfig() {
  const navigate = useNavigate();
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [newApiKey, setNewApiKey] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider['provider']>('custom');
  const [selectedModel, setSelectedModel] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = () => {
    try {
      const raw = localStorage.getItem('fintax_llm_providers');
      if (raw) {
        setProviders(JSON.parse(raw));
      }
    } catch {
      // ignore
    }
  };

  const saveProviders = (newProviders: LLMProvider[]) => {
    setProviders(newProviders);
    try {
      localStorage.setItem('fintax_llm_providers', JSON.stringify(newProviders));
    } catch {
      // ignore
    }
  };

  const detectProvider = (apiKey: string): LLMProvider['provider'] => {
    for (const [provider, config] of Object.entries(PROVIDER_CONFIGS)) {
      if (provider === 'custom') continue;
      if (config.patterns.some(pattern => apiKey.startsWith(pattern))) {
        return provider as LLMProvider['provider'];
      }
    }
    return 'custom';
  };

  const handleApiKeyChange = (value: string) => {
    setNewApiKey(value);
    const detected = detectProvider(value);
    setSelectedProvider(detected);
    if (detected !== 'custom' && PROVIDER_CONFIGS[detected].recommendedModels.length > 0) {
      setSelectedModel(PROVIDER_CONFIGS[detected].recommendedModels[0]);
    } else {
      setSelectedModel('');
    }
  };

  const addProvider = () => {
    if (!newApiKey.trim()) {
      toast.error('Insira uma API key válida');
      return;
    }

    const config = PROVIDER_CONFIGS[selectedProvider];
    const newProvider: LLMProvider = {
      id: crypto.randomUUID(),
      name: config.name,
      apiKey: newApiKey.trim(),
      provider: selectedProvider,
      model: selectedModel || config.recommendedModels[0] || '',
      status: 'inactive',
      createdAt: new Date().toISOString(),
    };

    saveProviders([...providers, newProvider]);
    setNewApiKey('');
    setSelectedProvider('custom');
    setSelectedModel('');
    setIsAdding(false);
    toast.success('API adicionada com sucesso');
  };

  const removeProvider = (id: string) => {
    saveProviders(providers.filter(p => p.id !== id));
    toast.success('API removida');
  };

  const testConnection = async (provider: LLMProvider) => {
    setTestingId(provider.id);
    try {
      let endpoint = '';
      let body: Record<string, unknown> = {};

      switch (provider.provider) {
        case 'openai':
        case 'groq':
          endpoint = provider.provider === 'groq'
            ? 'https://api.groq.com/openai/v1/chat/completions'
            : 'https://api.openai.com/v1/chat/completions';
          body = {
            model: provider.model,
            messages: [{ role: 'user', content: 'Hi' }],
            max_tokens: 1,
          };
          break;
        case 'google':
          endpoint = `https://generativelanguage.googleapis.com/v1/models/${provider.model}:generateContent?key=${provider.apiKey}`;
          body = {
            contents: [{ parts: [{ text: 'Hi' }] }],
            generationConfig: { maxOutputTokens: 1 },
          };
          break;
        case 'anthropic':
          endpoint = 'https://api.anthropic.com/v1/messages';
          body = {
            model: provider.model,
            max_tokens: 1,
            messages: [{ role: 'user', content: 'Hi' }],
          };
          break;
        default:
          throw new Error('Provedor não suportado para teste');
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(provider.provider === 'openai' && { Authorization: `Bearer ${provider.apiKey}` }),
          ...(provider.provider === 'groq' && { Authorization: `Bearer ${provider.apiKey}` }),
          ...(provider.provider === 'anthropic' && {
            'x-api-key': provider.apiKey,
            'anthropic-version': '2023-06-01',
          }),
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setProviders(prev =>
          prev.map(p =>
            p.id === provider.id
              ? { ...p, status: 'active' as const, lastTested: new Date().toISOString() }
              : p
          )
        );
        toast.success('Conexão testada com sucesso');
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      setProviders(prev =>
        prev.map(p =>
          p.id === provider.id
            ? { ...p, status: 'error' as const, lastTested: new Date().toISOString() }
            : p
        )
      );
      toast.error(error instanceof Error ? error.message : 'Erro ao testar conexão');
    } finally {
      setTestingId(null);
    }
  };

  const setActive = (id: string) => {
    const active = providers.find(p => p.id === id);
    saveProviders(providers.map(p => ({ ...p, status: p.id === id ? 'active' : 'inactive' as const })));
    
    if (active) {
      try {
        const currentConfig = JSON.parse(localStorage.getItem('fintax_ai_config') || '{}');
        localStorage.setItem('fintax_ai_config', JSON.stringify({
          ...currentConfig,
          model: active.model,
          provider: active.provider,
        }));
      } catch {
        // ignore
      }
    }
    
    toast.success('API ativada');
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/admin/settings')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold">Configurações de LLM</h1>
          <p className="text-xs text-muted-foreground">
            Gerencie APIs de modelos de linguagem
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">APIs Configuradas</h2>
            <Button
              size="sm"
              onClick={() => setIsAdding(!isAdding)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Nova API
            </Button>
          </div>

          {isAdding && (
            <div className="mb-4 p-4 rounded-lg border border-white/10 bg-white/5 space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Cole sua API key
                </label>
                <Input
                  value={newApiKey}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  placeholder="sk-... ou AIza..."
                  type="password"
                />
                {selectedProvider !== 'custom' && (
                  <p className="text-xs text-green-400 mt-1">
                    Detectado: {PROVIDER_CONFIGS[selectedProvider].name}
                  </p>
                )}
              </div>

              {(selectedProvider === 'custom' || PROVIDER_CONFIGS[selectedProvider].recommendedModels.length > 0) && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Modelo
                  </label>
                  <Input
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    placeholder="Nome do modelo"
                  />
                </div>
              )}

              {selectedProvider !== 'custom' && PROVIDER_CONFIGS[selectedProvider].recommendedModels.length > 0 && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Modelos recomendados
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PROVIDER_CONFIGS[selectedProvider].recommendedModels.map(model => (
                      <Button
                        key={model}
                        size="sm"
                        variant={selectedModel === model ? "default" : "outline"}
                        onClick={() => setSelectedModel(model)}
                        className="text-xs"
                      >
                        {model}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={addProvider} size="sm" className="flex-1">
                  <Check className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
                <Button
                  onClick={() => {
                    setIsAdding(false);
                    setNewApiKey('');
                    setSelectedProvider('custom');
                    setSelectedModel('');
                  }}
                  size="sm"
                  variant="ghost"
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {providers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma API configurada. Clique em "Nova API" para adicionar.
              </p>
            ) : (
              providers.map(provider => (
                <div
                  key={provider.id}
                  className={`p-3 rounded-lg border ${
                    provider.status === 'active'
                      ? 'border-green-500/30 bg-green-500/5'
                      : provider.status === 'error'
                      ? 'border-red-500/30 bg-red-500/5'
                      : 'border-white/10 bg-white/5'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium">{provider.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          provider.status === 'active'
                            ? 'bg-green-500/20 text-green-400'
                            : provider.status === 'error'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-white/10 text-white/60'
                        }`}>
                          {provider.status === 'active' ? 'Ativo' : provider.status === 'error' ? 'Erro' : 'Inativo'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Modelo: {provider.model}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Key: {provider.apiKey.slice(0, 8)}...{provider.apiKey.slice(-4)}
                      </p>
                      {provider.lastTested && (
                        <p className="text-xs text-muted-foreground">
                          Testado: {new Date(provider.lastTested).toLocaleString('pt-BR')}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => testConnection(provider)}
                        disabled={testingId === provider.id}
                        className="h-8 w-8"
                      >
                        {testingId === provider.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <ExternalLink className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setActive(provider.id)}
                        className="h-8 w-8"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeProvider(provider.id)}
                        className="h-8 w-8 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
