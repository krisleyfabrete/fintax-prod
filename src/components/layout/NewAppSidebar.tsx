import {
  LayoutDashboard,
  Wallet,
  ArrowUpDown,
  PieChart,
  Target,
  Sparkles,
  TrendingUp,
  Layers,
  Users,
  FileText,
  HelpCircle,
  Settings,
  LogOut,
  DollarSign,
  PiggyBank,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import {
  NewSidebar,
  NEW_SIDEBAR_EXPANDED_WIDTH,
  NEW_SIDEBAR_COLLAPSED_WIDTH,
  NewSidebarItem,
} from './NewSidebar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import fintaxLogo from '@/assets/fintax-logo-principal.png';

interface NewAppSidebarProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  className?: string;
}

export function NewAppSidebar({ collapsed, onCollapsedChange, className }: NewAppSidebarProps) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const mainItems: NewSidebarItem[] = [
    { label: 'Dashboard', url: '/', icon: LayoutDashboard, end: true },
    { label: 'Contas', url: '/accounts', icon: Wallet },
    { label: 'Transações', url: '/transactions', icon: ArrowUpDown },
    { label: 'Relatórios', url: '/reports', icon: PieChart },
      {
        label: 'Planejamento',
        url: '/budgets',
        icon: Layers,
        children: [
          { label: 'Orçamentos', url: '/budgets', icon: Target },
          { label: 'Metas', url: '/goals', icon: Sparkles },
          { label: 'Investimentos', url: '/investments', icon: TrendingUp },
          { label: 'Dívidas', url: '/debts', icon: DollarSign },
          { label: 'Caixinhas', url: '/savings-boxes', icon: PiggyBank },
        ],
      },
    { label: 'Família', url: '/family', icon: Users },
    { label: 'Importação', url: '/import', icon: FileText },
    { label: 'Assistente IA', url: '/ai', icon: Sparkles },
    { label: 'Suporte', url: '/support', icon: HelpCircle },
  ];

  const footerItems: NewSidebarItem[] = [
    { label: 'Configurações', url: '/settings', icon: Settings },
  ];

  const brand = (
    <div className="flex min-w-0 flex-1 items-center">
      <img src={fintaxLogo} alt="Fintax Finanças" className="h-10 w-auto object-contain" />
    </div>
  );

  const footerBrand = !collapsed ? (
    <div className="flex items-center gap-3">
      <Button
        variant="ghost"
        className="flex w-full flex-1 items-center justify-start gap-3 rounded-xl px-2 text-white/70 hover:bg-white/5 hover:text-white"
        onClick={handleSignOut}
      >
        <LogOut className="h-5 w-5 shrink-0" />
        <span className="truncate">Sair</span>
      </Button>
    </div>
  ) : (
    <Button
      variant="ghost"
      className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl text-white/70 hover:bg-white/5 hover:text-white"
      onClick={handleSignOut}
      title="Sair"
    >
      <LogOut className="h-5 w-5" />
    </Button>
  );

  return (
    <NewSidebar
      className={className}
      brand={brand}
      items={mainItems}
      footerItems={footerItems}
      footerBrand={footerBrand}
      collapsed={collapsed}
      onCollapsedChange={onCollapsedChange}
    />
  );
}