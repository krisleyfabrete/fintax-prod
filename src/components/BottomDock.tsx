import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Home,
  ArrowLeftRight,
  Brain,
  PieChart,
  Menu,
  LayoutDashboard,
  Wallet,
  Sparkles,
  Target,
  FileText,
  Users,
  Settings,
  LogOut,
  DollarSign,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface DockItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
}

const LEFT_ITEMS: DockItem[] = [
  { id: "home", label: "Home", icon: Home, path: "/" },
  {
    id: "transactions",
    label: "Transações",
    icon: ArrowLeftRight,
    path: "/transactions",
  },
];

const RIGHT_ITEMS: DockItem[] = [
  { id: "reports", label: "Relatórios", icon: PieChart, path: "/reports" },
];

const MORE_ITEMS: DockItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/dashboard",
  },
  { id: "accounts", label: "Contas", icon: Wallet, path: "/accounts" },
  {
    id: "debts",
    label: "Dívidas",
    icon: DollarSign,
    path: "/debts",
  },
  {
    id: "investments",
    label: "Investimentos",
    icon: Sparkles,
    path: "/investments",
  },
  { id: "goals", label: "Metas", icon: Target, path: "/goals" },
  { id: "budgets", label: "Orçamentos", icon: Target, path: "/budgets" },
  { id: "family", label: "Família", icon: Users, path: "/family" },
  { id: "import", label: "Importação", icon: FileText, path: "/import" },
  { id: "support", label: "Suporte", icon: Menu, path: "/support" },
  { id: "settings", label: "Configurações", icon: Settings, path: "/settings" },
];

interface BottomDockProps {
  onCentralPress?: () => void;
  showHomeIndicator?: boolean;
}

export function BottomDock({
  onCentralPress,
  showHomeIndicator = true,
}: BottomDockProps) {
  const [activeId, setActiveId] = useState("home");
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleCentralPress = () => {
    console.log('[BottomDock] central press', location.pathname);
    if (onCentralPress) {
      onCentralPress();
    } else {
      navigate("/ai");
    }
  };

  const isActivePath = (path: string) => location.pathname === path;

  const handleNavigate = (path: string) => {
    const item = [...LEFT_ITEMS, ...RIGHT_ITEMS, ...MORE_ITEMS].find(
      (i) => i.path === path
    );
    if (item) setActiveId(item.id);
    navigate(path);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col items-center pb-[max(1rem,env(safe-area-inset-bottom))]">
      {/* Dropdown "Mais" — lista suspensa rolável no mesmo design da dock */}
      {moreOpen && (
        <div
          className="relative z-50 w-72 mb-2.5 rounded-3xl border border-white/10 p-1.5
            bg-gradient-to-b from-white/[0.06] to-black/40 backdrop-blur-2xl
            ring-1 ring-white/10"
          style={{
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.15), 0 8px 32px rgba(0,0,0,0.55)",
          }}
        >
          <p className="px-4 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-widest text-white/50">
            Todas as páginas
          </p>
          <div className="max-h-[14.75rem] overflow-y-auto pb-2 overscroll-contain scrollbar-hide">
            <nav className="space-y-1 px-1">
              {MORE_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isActivePath(item.path);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      handleNavigate(item.path);
                      setMoreOpen(false);
                    }}
                    className={cn(
                      "flex h-14 w-full items-center gap-3 rounded-2xl px-3",
                      "transition-colors duration-200",
                      active
                        ? "text-indigo-400"
                        : "text-white/85 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    <span
                      className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5"
                      style={
                        active
                          ? { boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10)" }
                          : undefined
                      }
                    >
                      <Icon
                        size={20}
                        strokeWidth={1.8}
                        className={active ? "text-indigo-400" : "text-white/85"}
                        style={
                          active
                            ? {
                                filter:
                                  "drop-shadow(0 0 6px rgba(124,54,192,0.75))",
                              }
                            : undefined
                        }
                      />
                    </span>
                    <span className="flex-1 truncate text-left text-sm font-medium">
                      {item.label}
                    </span>
                    {active && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-400" />
                    )}
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
                className="flex h-14 w-full items-center gap-3 rounded-2xl px-3
                  text-red-400 transition-colors duration-200 hover:bg-red-500/10 hover:text-red-300"
              >
                <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/10 ring-1 ring-red-500/20">
                  <LogOut
                    size={20}
                    strokeWidth={1.8}
                    className="text-red-400"
                  />
                </span>
                <span className="flex-1 truncate text-left text-sm font-medium">
                  Sair da conta
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative">
        {/* Glow roxo difuso abaixo da dock */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 -bottom-4 h-12 w-56 -translate-x-1/2
            rounded-full bg-purple-600/40 blur-2xl"
        />

        {/* Dock (liquid glass) — fileira central com ícones + IA centralizada */}
        <div
          className="relative flex items-center justify-center gap-2 rounded-full px-3 py-2.5
            bg-gradient-to-b from-white/[0.06] to-black/40 backdrop-blur-2xl
            shadow-[0_8px_32px_rgba(0,0,0,0.55)] ring-1 ring-white/10"
          style={{
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.15), 0 8px 32px rgba(0,0,0,0.55)",
          }}
        >
          {/* Itens da esquerda */}
          <div className="flex items-center gap-1">
            {LEFT_ITEMS.map((item) => (
              <DockButton
                key={item.id}
                item={item}
                active={isActivePath(item.path)}
                onClick={() => handleNavigate(item.path)}
              />
            ))}
          </div>

          {/* Botão central IA — agora alinhado com a fileira, não flutuante */}
          <button
            type="button"
            aria-label="IA"
            onClick={handleCentralPress}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full
              bg-gradient-to-br from-indigo-500 to-purple-600 ring-2 ring-white/60
              transition-transform duration-150 active:scale-95"
            style={{
              boxShadow:
                "0 0 0 4px rgba(10,10,12,0.9), 0 0 28px rgba(124,54,192,0.65), inset 0 1px 1px rgba(255,255,255,0.3)",
            }}
          >
            <Brain size={26} strokeWidth={2.75} className="text-white" />
          </button>

          {/* Itens da direita */}
          <div className="flex items-center gap-1">
            {RIGHT_ITEMS.map((item) => (
              <DockButton
                key={item.id}
                item={item}
                active={isActivePath(item.path)}
                onClick={() => handleNavigate(item.path)}
              />
            ))}
          </div>

          {/* Mais (hamburguer) */}
          <button
            type="button"
            aria-label="Mais"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen(!moreOpen)}
            className="flex h-14 w-14 flex-col items-center justify-center gap-1
              text-white/85 hover:text-white transition-colors"
          >
            <Menu size={24} strokeWidth={1.8} />
            <span className="text-[11px] font-medium">Mais</span>
          </button>
        </div>
      </div>

      {/* Blur roxo na base do dock */}
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-60 h-10 rounded-full bg-purple-600/20 blur-2xl" />

      {showHomeIndicator && (
        <div className="mt-2 h-1 w-32 rounded-full bg-white/70" />
      )}

      {/* Backdrop — fecha o dropdown ao tocar fora */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setMoreOpen(false)}
        />
      )}
    </div>
  );
}

function DockButton({
  item,
  active,
  onClick,
}: {
  item: DockItem;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={cn(
        "flex h-14 w-14 flex-col items-center justify-center gap-1",
        "transition-colors duration-200",
      )}
    >
      <span className="relative">
        <Icon
          size={22}
          strokeWidth={1.8}
          className={active ? "text-indigo-400" : "text-white/85"}
          style={
            active
              ? { filter: "drop-shadow(0 0 6px rgba(124,54,192,0.75))" }
              : undefined
          }
        />
      </span>
      <span
        className={cn(
          "text-[11px] font-medium",
          active ? "text-indigo-400" : "text-white/70",
        )}
      >
        {item.label}
      </span>
    </button>
  );
}
