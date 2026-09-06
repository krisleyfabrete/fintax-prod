import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Menu, Mic, Paperclip, X, Send } from "lucide-react";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";
import { useUpgradeModal } from "@/components/subscription/UpgradeModal";
import { clientTools } from "@/lib/ai/client-actions";
import { processAiTurn, processAiTurnViaEdgeFunction } from "@/lib/ai/processor";
import { getAiConfig, trackAiUsage, getActiveLLMProvider } from "@/lib/ai/config";
import { checkModeration } from "@/lib/ai/moderation";
import { saveMessage, loadHistory } from "@/lib/ai/history";
import { logAiAction } from "@/lib/ai/audit";
import { recordViolation, checkIpBlocked, getClientIp } from "@/lib/ai/ip-blocker";
import { useAuth } from "@/contexts/AuthContext";
import fintaxLogo from "@/assets/fintax-logo-principal.png";
import {
  LayoutDashboard,
  Wallet,
  Sparkles,
  Target,
  FileText,
  Users,
  Settings,
  LogOut,
} from "lucide-react";

interface MobileMessage {
  id?: string;
  role: "user" | "assistant";
  content?: string;
  toolCall?: {
    name: string;
    arguments: Record<string, unknown>;
    result?: string;
  };
  attachments?: Array<{ mimeType: string; data: string }>;
}

const MORE_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { id: "accounts", label: "Contas", icon: Wallet, path: "/accounts" },
  { id: "investments", label: "Investimentos", icon: Sparkles, path: "/investments" },
  { id: "goals", label: "Metas", icon: Target, path: "/goals" },
  { id: "budgets", label: "Orçamentos", icon: Target, path: "/budgets" },
  { id: "family", label: "Família", icon: Users, path: "/family" },
  { id: "import", label: "Importação", icon: FileText, path: "/import" },
  { id: "support", label: "Suporte", icon: Menu, path: "/support" },
  { id: "settings", label: "Configurações", icon: Settings, path: "/settings" },
];

export default function MobileAIChat() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { canAccess } = useSubscription();
  const { showUpgradeModal } = useUpgradeModal();

  const [messages, setMessages] = useState<MobileMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [input, setInput] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  useEffect(() => {
    if (!canAccess("canUseAIInsights")) {
      showUpgradeModal("ai-insights", "pro");
    }
  }, [canAccess, showUpgradeModal]);

  useEffect(() => {
    const initChat = async () => {
      if (!user?.id) return;

      const ip = await getClientIp();
      const block = await checkIpBlocked(ip);
      if (block) {
        toast.error(`Acesso bloqueado: ${block.reason}`);
        return;
      }

      const history = await loadHistory(user.id, 50);
      if (history.length > 0) {
        setMessages(history.map(h => ({
          id: h.id,
          role: h.role as 'user' | 'assistant',
          content: h.content || undefined,
          toolCall: h.tool_call || undefined,
        })));
      } else {
        setMessages([{
          role: 'assistant',
          content: "Olá! Sou seu assistente financeiro pessoal. Posso criar transações, metas e contas para você. Como posso ajudar?",
        }]);
      }
    };

    initChat();
  }, [user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text?: string, file?: File) => {
    const message = (text ?? input).trim();
    if ((!message && !file) || loading || !user?.id) return;

    setInput("");
    setPendingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    const userMessage = message;

    const moderation = checkModeration(userMessage);
    if (moderation.level === 'blocked' && userMessage) {
      const ip = await getClientIp();
      await recordViolation(ip, user.id, moderation.reason || 'Conteúdo ofensivo');
      await logAiAction({
        userId: user.id,
        action: 'message_blocked',
        parameters: { message: userMessage, reason: moderation.reason },
        context: 'client',
        severity: 'critical',
      });
      setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ ${moderation.reason}` }]);
      toast.error(moderation.reason || 'Acesso à IA bloqueado temporariamente.');
      return;
    }

    if (moderation.level === 'warning' && userMessage) {
      const ip = await getClientIp();
      await recordViolation(ip, user.id, moderation.reason || 'Linguagem inapropriada');
      await logAiAction({
        userId: user.id,
        action: 'message_warning',
        parameters: { message: userMessage, reason: moderation.reason },
        context: 'client',
        severity: 'warning',
      });
      setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ ${moderation.reason}` }]);
      toast.warning(moderation.reason || 'Advertência recebida.');
      return;
    }

    let attachments: Array<{ mimeType: string; data: string }> = [];
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        attachments = [{ mimeType: file.type, data: base64 }];
      } catch (error) {
        console.error('Falha ao ler arquivo:', error);
        toast.error('Não foi possível ler o arquivo anexado.');
        return;
      }
    }

    const userMsg: MobileMessage = { role: "user", content: userMessage, attachments };
    setMessages((prev) => [...prev, userMsg]);
    await saveMessage(user.id, { role: 'user', content: userMessage });
    setLoading(true);

    try {
      const activeProvider = getActiveLLMProvider();
      const apiKey = activeProvider?.apiKey;
      if (!apiKey) throw new Error("API key não configurada");

      const config = getAiConfig();
      const systemPrompt = config.prompt_client || "Você é o assistente financeiro pessoal do Fintax Finanças.";
      const model = activeProvider?.model || config.model || 'gemini-1.5-flash';
      const provider = activeProvider?.provider || config.provider || 'google';

      const history = messages.map((m) => ({
        role: (m.role || 'assistant') as 'user' | 'assistant',
        content: m.content || '',
        attachments: m.attachments,
      }));

      let processedMessages = [...history, { role: "user" as const, content: userMessage, attachments }];
      let finalResponse: string | null = null;
      let iterations = 0;
      const maxIterations = 5;

      const useEdgeFunction = provider === 'google' && !activeProvider?.apiKey;

      const callAi = async (msgs: typeof processedMessages) => {
        if (useEdgeFunction) {
          return processAiTurnViaEdgeFunction(msgs, {
            tools: clientTools,
            systemPrompt,
            temperature: config.temperature ?? 0.7,
            maxTokens: config.max_tokens ?? 1024,
            model,
            fallbackModel: config.fallbackModel,
          });
        }
        return processAiTurn(msgs, {
          apiKey,
          tools: clientTools,
          systemPrompt,
          temperature: config.temperature ?? 0.7,
          maxTokens: config.max_tokens ?? 1024,
          model: model,
          fallbackModel: config.fallbackModel,
          provider: provider,
        });
      };

      while (iterations < maxIterations) {
        iterations++;

        const result = await callAi(processedMessages);

        if (result.functionCall) {
          const toolResult = typeof result.functionCall.response === 'string'
            ? result.functionCall.response
            : JSON.stringify(result.functionCall.response);

          processedMessages = [
            ...processedMessages,
            { role: "assistant" as const, content: result.text || undefined, toolCall: { name: result.functionCall.name, arguments: result.functionCall.arguments, result: toolResult } },
          ];

          await logAiAction({
            userId: user.id,
            action: result.functionCall.name,
            parameters: result.functionCall.arguments,
            result: { success: true, data: toolResult },
            context: 'client',
          });

          await new Promise((resolve) => setTimeout(resolve, 300));

          const followUp = await callAi(processedMessages);

          if (followUp.text) {
            finalResponse = followUp.text;
            break;
          }

          if (followUp.functionCall) {
            processedMessages = [
              ...processedMessages,
              { role: "assistant" as const, content: followUp.text || undefined, toolCall: { name: followUp.functionCall.name, arguments: followUp.functionCall.arguments, result: typeof followUp.functionCall.response === 'string' ? followUp.functionCall.response : JSON.stringify(followUp.functionCall.response) } },
            ];
            continue;
          }

          finalResponse = followUp.text || 'Operação concluída.';
          break;
        }

        finalResponse = result.text;
        break;
      }

      if (!finalResponse) {
        finalResponse = 'Não foi possível completar a solicitação. Tente novamente.';
      }

      const lastToolCall = processedMessages[processedMessages.length - 1]?.toolCall;
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), content: finalResponse, toolCall: lastToolCall }]);
      await saveMessage(user.id, { role: 'assistant', content: finalResponse, tool_call: lastToolCall });
      trackAiUsage('client');
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao enviar mensagem";
      console.error('AI error:', error);
      toast.error(message);
      setMessages((prev) => [...prev, { role: "assistant", content: "Desculpe, ocorreu um erro. Tente novamente." }]);
    } finally {
      setLoading(false);
    }
  };

  const userName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'usuário';

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-black text-white">
      {/* Header */}
      <div className="relative z-20 flex w-full items-center justify-between px-4 pt-[max(2.7rem,env(safe-area-inset-top))] pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-1 justify-center">
          <img src={fintaxLogo} alt="Fintax Finanças" className="h-10 w-auto object-contain" />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm"
            aria-label="Mais"
            aria-expanded={moreOpen}
          >
            <Menu size={20} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {/* Dropdown Mais mobile */}
      {moreOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/40"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute left-4 right-4 top-[max(5.5rem,calc(2.7rem+env(safe-area-inset-top)+3rem))] z-40 w-auto rounded-3xl border border-white/10 p-1.5 bg-gradient-to-b from-white/[0.06] to-black/40 backdrop-blur-2xl ring-1 ring-white/10"
            style={{
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15), 0 8px 32px rgba(0,0,0,0.55)",
            }}
          >
            <p className="px-4 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-widest text-white/50">
              Todas as páginas
            </p>
            <div className="max-h-[14.75rem] overflow-y-auto pb-2 overscroll-contain scrollbar-hide">
              <nav className="space-y-1 px-1">
                {MORE_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setMoreOpen(false);
                        navigate(item.path);
                      }}
                      className="flex h-14 w-full items-center gap-3 rounded-2xl px-3 text-white/85 hover:bg-white/5 hover:text-white"
                    >
                      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5">
                        <Icon size={20} strokeWidth={1.8} className="text-white/85" />
                      </span>
                      <span className="flex-1 truncate text-left text-sm font-medium">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </nav>
              <div className="mt-1 border-t border-white/10 px-1 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen(false);
                    signOut();
                    navigate("/auth");
                  }}
                  className="flex h-14 w-full items-center gap-3 rounded-2xl px-3 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                >
                  <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/10 ring-1 ring-red-500/20">
                    <LogOut size={20} strokeWidth={1.8} className="text-red-400" />
                  </span>
                  <span className="flex-1 truncate text-left text-sm font-medium">
                    Sair da conta
                  </span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Fundo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, #000000 0%, #000000 55%, #1a0533 88%, #3b0764 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")",
          backgroundRepeat: 'repeat',
          backgroundSize: '256px 256px',
        }}
      />

      {/* Área de mensagens */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 py-4">
        {messages.map((message) => (
          <div
            key={message.id || `${message.role}-${messages.indexOf(message)}`}
            className={`mb-3 flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                message.role === "user"
                  ? "bg-purple-600 text-white"
                  : "bg-white/5 border border-white/10"
              }`}
            >
              {message.attachments && message.attachments.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {message.attachments.map((attachment, index) => {
                    const isImage = attachment.mimeType?.startsWith('image/');
                    return (
                      <div
                        key={index}
                        className={`rounded-lg border border-white/10 overflow-hidden ${
                          isImage ? '' : 'bg-white/5 px-3 py-2'
                        }`}
                      >
                        {isImage ? (
                          <img
                            src={attachment.data}
                            alt={attachment.mimeType}
                            className="max-h-40 max-w-[200px] object-contain"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <svg className="h-5 w-5 shrink-0 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h11.25c.621 0 1.125-.504 1.125-1.125V12m-11.25 0h11.25" />
                            </svg>
                            <span className="text-xs text-white/90 truncate max-w-[120px]">
                              {attachment.mimeType?.split('/')[1]?.toUpperCase() || 'Arquivo'}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}
        {(loading) && (
          <div className="mb-3 flex justify-start">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 animate-bounce rounded-full bg-purple-400" />
                <div className="h-2 w-2 animate-bounce rounded-full bg-purple-400" style={{ animationDelay: '0.2s' }} />
                <div className="h-2 w-2 animate-bounce rounded-full bg-purple-400" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input mobile */}
      <div className="relative z-10 w-full px-4 pb-[max(2.7rem,env(safe-area-inset-bottom))]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input, pendingFile ?? undefined);
          }}
          className="relative mx-auto w-full max-w-md"
        >
          {/* Borda animada */}
          {!pendingFile && (
            <div
              aria-hidden
              className="absolute -inset-1 rounded-full animate-border-spin"
              style={{
                willChange: 'transform',
                background:
                  "conic-gradient(from 0deg, rgba(255,255,255,0.95), rgba(168,100,255,0.6), rgba(255,255,255,0.95), rgba(168,100,255,0.6), rgba(255,255,255,0.95))",
              }}
            />
          )}

          <div
            className="relative flex items-center gap-2 rounded-full px-4 py-3.5 backdrop-blur-2xl ring-1 ring-white/15"
            style={{
              background:
                "linear-gradient(to bottom, rgba(26,5,51,0.55), rgba(59,7,100,0.55))",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.15), 0 8px 24px rgba(59,7,100,0.35)",
            }}
          >
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Anexar arquivo"
              className="flex shrink-0 items-center justify-center rounded-full p-1 text-white/85 hover:text-white"
            >
              <Paperclip size={20} strokeWidth={1.8} />
            </button>

            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua pergunta..."
              className="flex-1 bg-transparent text-[15px] font-medium text-white placeholder-white/60 outline-none"
            />

            <button
              type="button"
              onClick={() => toast.info('Entrada de voz em breve')}
              aria-label="Falar com o assistente"
              className="flex shrink-0 items-center justify-center rounded-full p-1"
            >
              <Mic size={20} strokeWidth={1.8} className="text-white/85" />
            </button>

            <button
              type="submit"
              disabled={loading || (!input.trim() && !pendingFile)}
              className="flex shrink-0 items-center justify-center rounded-full bg-purple-600 p-2 text-white disabled:opacity-50"
            >
              <Send size={18} />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setPendingFile(file);
                  toast.info(`Arquivo anexado: ${file.name}`);
                }
              }}
            />
          </div>

          {pendingFile && (
            <div className="mt-2 flex items-center gap-2 rounded-full bg-white/5 px-3 py-2 text-xs text-white/90">
              <Paperclip size={14} className="shrink-0" />
              <span className="flex-1 truncate">{pendingFile.name}</span>
              <button
                type="button"
                onClick={() => {
                  setPendingFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-white"
              >
                <X size={12} />
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
