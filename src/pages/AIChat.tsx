import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Send, Sparkles, ShieldCheck, ThumbsUp, ThumbsDown, Loader2, Menu, LogOut, LayoutDashboard, Wallet, Target, FileText, Users, Settings, HelpCircle, Paperclip, Mic } from "lucide-react";
import fintaxLogo from "@/assets/fintax-logo-principal.png";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";
import { useUpgradeModal } from "@/components/subscription/UpgradeModal";
import { clientTools } from "@/lib/ai/client-actions";
import { processAiTurn, processAiTurnViaEdgeFunction } from "@/lib/ai/processor";
import { getAiConfig, trackAiUsage, getActiveLLMProvider } from "@/lib/ai/config";
import { checkModeration } from "@/lib/ai/moderation";
import { saveMessage, loadHistory, getLocalHistory } from "@/lib/ai/history";
import { logAiAction } from "@/lib/ai/audit";
import { recordViolation, checkIpBlocked, getClientIp } from "@/lib/ai/ip-blocker";
import { submitFeedback } from "@/lib/ai/observability";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import AIChatScreen from "@/components/ai-chat/AIChatScreen";
import MobileAIChat from "@/pages/MobileAIChat";

interface Message {
  id?: string;
  role: "user" | "assistant";
  content?: string;
  toolCall?: {
    name: string;
    arguments: Record<string, unknown>;
    result?: string;
  };
  feedback?: 'up' | 'down';
  attachments?: Array<{ mimeType: string; data: string }>;
}

const CLIENT_SYSTEM_PROMPT = `Você é o assistente financeiro pessoal do Fintax Finanças.
Você tem permissão para executar ações financeiras do usuário, como criar transações, metas, orçamentos e contas.
Use as ferramentas disponíveis para ajudar o usuário de forma prática e autônoma.
Seja claro, amigável e prático. Não dê conselhos de investimento arriscados sem ressalvas.
Mantenha respostas objetivas e focadas em finanças pessoais.
IMPORTANTE: Você NÃO tem permissão para executar ações administrativas como alterar planos, gerenciar usuários ou modificar configurações do sistema.`;

const MORE_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { id: "accounts", label: "Contas", icon: Wallet, path: "/accounts" },
  { id: "investments", label: "Investimentos", icon: Sparkles, path: "/investments" },
  { id: "goals", label: "Metas", icon: Target, path: "/goals" },
  { id: "budgets", label: "Orçamentos", icon: Target, path: "/budgets" },
  { id: "family", label: "Família", icon: Users, path: "/family" },
  { id: "import", label: "Importação", icon: FileText, path: "/import" },
  { id: "support", label: "Suporte", icon: HelpCircle, path: "/support" },
  { id: "settings", label: "Configurações", icon: Settings, path: "/settings" },
];

export default function AIChat() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { canAccess, plan } = useSubscription();
  const { showUpgradeModal } = useUpgradeModal();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [isCheckingIp, setIsCheckingIp] = useState(true);
  const [moreOpen, setMoreOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!canAccess("canUseAIInsights")) {
      showUpgradeModal("ai-insights", "pro");
    }
  }, [canAccess, showUpgradeModal]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const initChat = async () => {
      if (!user?.id) return;

      const ip = await getClientIp();
      const block = await checkIpBlocked(ip);
      if (block) {
        toast.error(`Acesso bloqueado: ${block.reason}`);
        navigate('/');
        return;
      }

      setIsCheckingIp(false);

      const history = await loadHistory(user.id, 50);
      if (history.length > 0) {
        setMessages(history.map(h => ({
          id: h.id,
          role: h.role as "user" | "assistant",
          content: h.content || undefined,
          toolCall: h.tool_call || undefined,
        })));
      } else {
        const local = getLocalHistory();
        if (local.length > 0) {
          setMessages(local.map(h => ({
            id: h.id,
            role: h.role as "user" | "assistant",
            content: h.content || undefined,
            toolCall: h.tool_call || undefined,
          })));
        } else {
          setMessages([{
            role: "assistant",
            content: "Olá! Sou seu assistente financeiro pessoal. Posso criar transações, metas e contas para você. Como posso ajudar?",
          }]);
        }
      }
    };

    initChat();
  }, [user?.id, navigate]);

  const sendMessage = async () => {
    if ((!input.trim() && !pendingFile) || loading || !user?.id) return;

    const userMessage = input.trim();
    setInput("");
    const file = pendingFile;
    setPendingFile(null);
    if (document.getElementById('ai-attach-desktop')) {
      (document.getElementById('ai-attach-desktop') as HTMLInputElement).value = '';
    }

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

      setMessages((prev) => [...prev, {
        role: "assistant",
        content: `⚠️ ${moderation.reason}`,
      }]);
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

      setMessages((prev) => [...prev, {
        role: "assistant",
        content: `⚠️ ${moderation.reason}`,
      }]);
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

    const userMsg: Message = { role: "user", content: userMessage, attachments };
    setMessages((prev) => [...prev, userMsg]);
    await saveMessage(user.id, {
      role: 'user',
      content: userMessage,
    });

    setLoading(true);
    setStreaming(true);

    try {
      const activeProvider = getActiveLLMProvider();
      const apiKey = activeProvider?.apiKey;
      if (!apiKey) {
        throw new Error("API key não configurada");
      }

      const config = getAiConfig();
      const systemPrompt = config.prompt_client || CLIENT_SYSTEM_PROMPT;
      const model = activeProvider?.model || config.model || 'gemini-1.5-flash';
      const provider = activeProvider?.provider || config.provider || 'google';

      const history = messages.map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content || '',
        toolCall: m.toolCall,
        attachments: m.attachments,
      }));

      let processedMessages = [...history, { role: "user" as const, content: userMessage, attachments }];
      let finalResponse: string | null = null;
      let iterations = 0;
      const maxIterations = 5;

      const streamingMsgId = crypto.randomUUID();
      setMessages((prev) => [...prev, {
        id: streamingMsgId,
        role: "assistant",
        content: "",
      }]);

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
          model,
          fallbackModel: config.fallbackModel,
          provider,
        });
      };

      while (iterations < maxIterations) {
        iterations++;

        const streamedText = '';
        const result = await callAi(processedMessages);

        if (result.functionCall) {
          const toolResult = typeof result.functionCall.response === 'string'
            ? result.functionCall.response
            : JSON.stringify(result.functionCall.response);

          processedMessages = [
            ...processedMessages,
            {
              role: "assistant",
              content: result.text || undefined,
              toolCall: {
                name: result.functionCall.name,
                arguments: result.functionCall.arguments,
                result: toolResult,
              },
            },
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
              {
                role: "assistant",
                content: followUp.text || undefined,
                toolCall: {
                  name: followUp.functionCall.name,
                  arguments: followUp.functionCall.arguments,
                  result: typeof followUp.functionCall.response === 'string'
                    ? followUp.functionCall.response
                    : JSON.stringify(followUp.functionCall.response),
                },
              },
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

      setMessages((prev) => prev.map(m => 
        m.id === streamingMsgId ? { ...m, content: finalResponse, toolCall: lastToolCall } : m
      ));
      
      await saveMessage(user.id, {
        role: 'assistant',
        content: finalResponse,
        tool_call: lastToolCall,
      });

      trackAiUsage('client');
    } catch (error) {
      console.error('AI error:', error);
      toast.error(error instanceof Error ? error.message : "Erro ao enviar mensagem");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Desculpe, ocorreu um erro. Tente novamente.",
        },
      ]);
    } finally {
      setLoading(false);
      setStreaming(false);
      inputRef.current?.focus();
    }
  };

  const handleFeedback = async (messageId: string | undefined, rating: 'up' | 'down') => {
    if (!user?.id) return;
    
    await submitFeedback({
      userId: user.id,
      messageId: messageId || undefined,
      rating: rating === 'up' ? 5 : 1,
    });

    setMessages(prev => prev.map(m => 
      m.id === messageId ? { ...m, feedback: rating } : m
    ));

    await logAiAction({
      userId: user.id,
      action: 'feedback',
      parameters: { messageId, rating },
      context: 'client',
    });
  };

  if (isCheckingIp) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isMobile) {
    return <MobileAIChatWrapper />;
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-[max(2.7rem,env(safe-area-inset-top))]">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <img
          src={fintaxLogo}
          alt="Fintax Finanças"
          className="h-10 w-auto object-contain"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMoreOpen(!moreOpen)}
          aria-label="Mais"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Dropdown "Mais" desktop */}
      {moreOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute left-4 top-[max(5.5rem,calc(2.7rem+env(safe-area-inset-top)+1rem))] z-50 w-72 rounded-3xl border border-white/10 p-1.5 bg-gradient-to-b from-white/[0.06] to-black/40 backdrop-blur-2xl ring-1 ring-white/10"
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
                      className="flex h-14 w-full items-center gap-3 rounded-2xl px-3 transition-colors duration-200 text-white/85 hover:bg-white/5 hover:text-white"
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
                  className="flex h-14 w-full items-center gap-3 rounded-2xl px-3 text-red-400 transition-colors duration-200 hover:bg-red-500/10 hover:text-red-300"
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

      <div className="bg-purple-500/10 border-b border-purple-500/20 px-4 py-2.5">
        <div className="flex items-start gap-2">
          <ShieldCheck className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
          <p className="text-xs text-purple-200 leading-relaxed">
            <strong>Política de uso:</strong> Esta IA é uma ferramenta para sua educação financeira, organização e bem-estar.
            Conteúdo ofensivo, malicioso ou com intenção de prejudicar resultará em advertências.
            Após advertências recorrentes, o acesso será bloqueado temporariamente.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id || `${message.role}-${messages.indexOf(message)}`}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <Card
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                message.role === "user"
                  ? "bg-purple-600 text-white"
                  : "bg-white/5 border-white/10"
              }`}
            >
              {message.toolCall && (
                <div className="mb-2 rounded-lg border border-white/10 bg-white/5 p-2 text-xs">
                  <p className="font-medium mb-1">Ferramenta: {message.toolCall.name}</p>
                  <pre className="text-muted-foreground whitespace-pre-wrap">
                    {JSON.stringify(message.toolCall.arguments, null, 2)}
                  </pre>
                  {message.toolCall.result && (
                    <p className="mt-1 text-green-400">
                      Resultado: {message.toolCall.result.slice(0, 120)}...
                    </p>
                  )}
                </div>
              )}
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
              <p className="text-sm whitespace-pre-wrap">
                {message.content}
              </p>
              {message.role === "assistant" && message.id && !loading && (
                <div className="mt-2 flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFeedback(message.id, 'up')}
                    className={message.feedback === 'up' ? 'text-green-400' : 'text-muted-foreground'}
                  >
                    <ThumbsUp className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFeedback(message.id, 'down')}
                    className={message.feedback === 'down' ? 'text-red-400' : 'text-muted-foreground'}
                  >
                    <ThumbsDown className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </Card>
          </div>
        ))}
        {(loading || streaming) && (
          <div className="flex justify-start">
            <Card className="bg-white/5 border-white/10 rounded-2xl px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                <p className="text-sm text-muted-foreground">
                  {streaming ? "Processando..." : "Pensando..."}
                </p>
              </div>
            </Card>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-white/10 p-4">
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => document.getElementById('ai-attach-desktop')?.click()}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Digite sua pergunta..."
            disabled={loading}
            className="flex-1"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => toast.info('Entrada de voz em breve')}
          >
            <Mic className="h-4 w-4" />
          </Button>
          <Button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <input
          id="ai-attach-desktop"
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              setPendingFile(file);
              toast.info(`Arquivo anexado: ${file.name}`);
              console.log('Arquivo anexado desktop:', file);
            }
          }}
        />
      </div>
    </div>
  );
}

function MobileAIChatWrapper() {
  return <MobileAIChat />;
}

function UpgradeModalWrapper() {
  const { canAccess, plan } = useSubscription();
  const { showUpgradeModal } = useUpgradeModal();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!canAccess("canUseAIInsights")) {
      setOpen(true);
      showUpgradeModal("ai-insights", "pro");
    }
  }, [canAccess, showUpgradeModal]);

  return null;
}


