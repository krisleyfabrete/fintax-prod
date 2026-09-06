import AIOrb from "./AIOrb";
import AskInputBar from "./AskInputBar";
import { ArrowLeft, Menu } from "lucide-react";
import fintaxLogo from "@/assets/fintax-logo-principal.png";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard, Wallet, Sparkles, Target, FileText, Users, Settings, LogOut } from "lucide-react";

interface AIChatScreenProps {
  userName?: string;
  onSubmitMessage?: (message: string, file?: File) => void;
  onMicPress?: () => void;
  onBack?: () => void;
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

export default function AIChatScreen({
  userName = "Robin",
  onSubmitMessage,
  onMicPress,
  onBack,
}: AIChatScreenProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined' || !('visualViewport' in window)) return;
    
    const viewport = window.visualViewport as VisualViewport;
    
    const handleResize = () => {
      const windowHeight = window.innerHeight;
      const visualHeight = viewport.height;
      const offsetTop = viewport.offsetTop;
      const kbHeight = windowHeight - visualHeight - offsetTop;
      setKeyboardHeight(Math.max(0, kbHeight));
    };
    
    viewport.addEventListener('resize', handleResize);
    viewport.addEventListener('scroll', handleResize);
    handleResize();
    
    return () => {
      viewport.removeEventListener('resize', handleResize);
      viewport.removeEventListener('scroll', handleResize);
    };
  }, []);

  const handleNavigate = (path: string) => {
    setMoreOpen(false);
    navigate(path);
  };

  const handleSignOut = () => {
    setMoreOpen(false);
    signOut();
    navigate("/auth");
  };
  return (
    <div
      className="relative flex min-h-screen flex-col items-center overflow-hidden bg-black"
    >
      {/* Header */}
      <div className="relative z-20 flex w-full items-center justify-between px-4 pt-[max(2.7rem,env(safe-area-inset-top))] pb-2">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
        </div>
        <div className="flex flex-1 justify-center">
          <img
            src={fintaxLogo}
            alt="Fintax Finanças"
            className="h-10 w-auto object-contain"
          />
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

      {/* Dropdown "Mais" */}
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
                      onClick={() => handleNavigate(item.path)}
                      className={cn(
                        "flex h-14 w-full items-center gap-3 rounded-2xl px-3",
                        "transition-colors duration-200",
                        "text-white/85 hover:bg-white/5 hover:text-white",
                      )}
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
                  onClick={handleSignOut}
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

      {/* Orb + textos */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 text-center px-6">
        <AIOrb size={170} />

        <div className="flex flex-col gap-2">
          <p className="text-sm text-white/50">Olá {userName}</p>
          <h1 className="text-3xl font-bold leading-tight text-white">
            Como posso ajudar
            <br />
            você hoje?
          </h1>
        </div>
      </div>

      {/* Barra de entrada */}
      <div 
        className="relative z-10 w-full px-6"
        style={{ paddingBottom: keyboardHeight > 0 ? `${keyboardHeight}px` : undefined }}
      >
        <div className={keyboardHeight > 0 ? "" : "pb-[max(2.7rem,env(safe-area-inset-bottom))]"}>
          <AskInputBar
            onSubmit={onSubmitMessage}
            onMicPress={onMicPress}
            onAttach={(file) => {
              console.log("Arquivo anexado:", file);
              toast.info(`Arquivo anexado: ${file.name}`);
            }}
          />
        </div>
      </div>
    </div>
  );
}
