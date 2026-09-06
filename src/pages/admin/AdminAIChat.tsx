import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Send, Shield, ShieldCheck, ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { adminTools } from "@/lib/ai/admin-actions";
import { processAiTurn, processAiTurnViaEdgeFunction } from "@/lib/ai/processor";
import { getAiConfig, trackAiUsage, getActiveLLMProvider } from "@/lib/ai/config";
import { checkModeration } from "@/lib/ai/moderation";
import { saveMessage, loadHistory } from "@/lib/ai/history";
import { logAiAction } from "@/lib/ai/audit";
import { recordViolation, checkIpBlocked, getClientIp } from "@/lib/ai/ip-blocker";
import { submitFeedback } from "@/lib/ai/observability";
import { useAuth } from "@/contexts/AuthContext";

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
}

const ADMIN_SYSTEM_PROMPT = `Você é o assistente operacional do Fintax Finanças para administradores.
Você tem permissão para executar ações administrativas como gerenciar assinaturas, usuários, configurações, PIX, tickets e analíticos.
Use as ferramentas disponíveis para operar o sistema de forma autônoma e eficiente.
Seja direto, técnico quando necessário e sempre alinhado com as políticas do sistema.
Não exponha dados sensíveis de usuários em respostas públicas.`;

export default function AdminAIChat() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [isCheckingIp, setIsCheckingIp] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
        navigate('/admin');
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
        setMessages([{
          role: "assistant",
          content: "Olá, admin! Sou seu assistente operacional. Posso ajudar com assinaturas, usuários, PIX, tickets e configurações. Como posso ajudar?",
        }]);
      }
    };

    initChat();
  }, [user?.id, navigate]);

  const sendMessage = async () => {
    if (!input.trim() || loading || !user?.id) return;

    const userMessage = input.trim();
    setInput("");

    const moderation = checkModeration(userMessage);
    if (moderation.level === 'blocked') {
      const ip = await getClientIp();
      await recordViolation(ip, user.id, moderation.reason || 'Conteúdo ofensivo');
      
      await logAiAction({
        userId: user.id,
        action: 'message_blocked',
        parameters: { message: userMessage, reason: moderation.reason },
        context: 'admin',
        severity: 'critical',
      });

      setMessages((prev) => [...prev, {
        role: "assistant",
        content: `⚠️ ${moderation.reason}`,
      }]);
      toast.error(moderation.reason || 'Acesso à IA bloqueado temporariamente.');
      return;
    }

    if (moderation.level === 'warning') {
      const ip = await getClientIp();
      await recordViolation(ip, user.id, moderation.reason || 'Linguagem inapropriada');

      await logAiAction({
        userId: user.id,
        action: 'message_warning',
        parameters: { message: userMessage, reason: moderation.reason },
        context: 'admin',
        severity: 'warning',
      });

      setMessages((prev) => [...prev, {
        role: "assistant",
        content: `⚠️ ${moderation.reason}`,
      }]);
      toast.warning(moderation.reason || 'Advertência recebida.');
      return;
    }

    const userMsg: Message = { role: "user", content: userMessage };
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
      const systemPrompt = config.prompt_admin || ADMIN_SYSTEM_PROMPT;
      const model = activeProvider?.model || config.model || 'gemini-1.5-flash';
      const provider = activeProvider?.provider || config.provider || 'google';

      const history = messages.map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content || '',
        toolCall: m.toolCall,
      }));

      let processedMessages = [...history, { role: "user", content: userMessage }];
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
            tools: adminTools,
            systemPrompt,
            temperature: config.temperature ?? 0.7,
            maxTokens: config.max_tokens ?? 1024,
            model,
            fallbackModel: config.fallbackModel,
          });
        }
        return processAiTurn(msgs, {
          apiKey,
          tools: adminTools,
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
            context: 'admin',
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

      trackAiUsage('admin');
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
      context: 'admin',
    });
  };

  if (isCheckingIp) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-purple-400" />
          <div>
            <h1 className="text-lg font-semibold">Assistente Admin</h1>
            <p className="text-xs text-muted-foreground">
              IA operacional para suporte e regras do painel
            </p>
          </div>
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
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Digite sua pergunta operacional..."
            disabled={loading}
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
