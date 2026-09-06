import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  UsersRound,
  BarChart3,
  FileText,
  ChevronLeft,
  ChevronRight,
  Shield,
  LogOut,
  Ticket,
  MessageSquare,
  DollarSign,
  Settings,
  ArrowDownCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useNavigate } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin', badgeKey: null },
  { icon: Users, label: 'Usuários', path: '/admin/users', badgeKey: null },
  { icon: CreditCard, label: 'Assinaturas', path: '/admin/subscriptions', badgeKey: null },
  { icon: ArrowDownCircle, label: 'Downgrades', path: '/admin/downgrade-requests', badgeKey: 'pendingDowngrades' },
  { icon: DollarSign, label: 'Financeiro', path: '/admin/financial', badgeKey: null },
  { icon: Settings, label: 'Planos', path: '/admin/plans', badgeKey: null },
  { icon: Ticket, label: 'Cupons', path: '/admin/coupons', badgeKey: null },
  { icon: UsersRound, label: 'Famílias', path: '/admin/families', badgeKey: null },
  { icon: MessageSquare, label: 'Tickets', path: '/admin/tickets', badgeKey: 'pendingTickets' },
  { icon: BarChart3, label: 'Analytics', path: '/admin/analytics', badgeKey: null },
  { icon: FileText, label: 'Logs', path: '/admin/logs', badgeKey: null },
  { icon: CreditCard, label: 'PIX Pendentes', path: '/admin/pix-payments', badgeKey: 'pendingPix' },
  { icon: CreditCard, label: 'Config. PIX', path: '/admin/pix-config', badgeKey: null },
  { icon: Settings, label: 'Configurações', path: '/admin/settings', badgeKey: null },
  { icon: Sparkles, label: 'Config. LLM', path: '/admin/llm-config', badgeKey: null },
];

interface AdminSidebarProps {
  isMobile?: boolean;
  onNavigate?: () => void;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function AdminSidebar({ isMobile, onNavigate, onCollapsedChange }: AdminSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch pending counts for badges
  const { data: badgeCounts } = useQuery({
    queryKey: ['admin-sidebar-badges'],
    queryFn: async () => {
      const [downgradeRes, pixRes, ticketsRes] = await Promise.all([
        supabase
          .from('downgrade_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase
          .from('pix_payments')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
        // Count unseen tickets (admin_seen_at is null) with open or in_progress status
        supabase
          .from('support_tickets')
          .select('id', { count: 'exact', head: true })
          .in('status', ['open', 'in_progress'])
          .is('admin_seen_at', null),
      ]);

      return {
        pendingDowngrades: downgradeRes.count || 0,
        pendingPix: pixRes.count || 0,
        pendingTickets: ticketsRes.count || 0,
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Subscribe to realtime updates for badges
  useEffect(() => {
    const invalidateBadges = () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sidebar-badges'] });
    };

    const channel = supabase
      .channel('admin-sidebar-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_tickets' },
        invalidateBadges
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'downgrade_requests' },
        invalidateBadges
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pix_payments' },
        invalidateBadges
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  useEffect(() => {
    onCollapsedChange?.(collapsed);
  }, [collapsed, onCollapsedChange]);

  const handleNavigate = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  const getBadgeCount = (badgeKey: string | null) => {
    if (!badgeKey || !badgeCounts) return 0;
    return badgeCounts[badgeKey as keyof typeof badgeCounts] || 0;
  };

  // Mobile version - full width, no collapse
  if (isMobile) {
    return (
        <div className="flex flex-col h-full bg-sidebar-background">
        {/* Header */}
        <div className="flex items-center gap-2 p-4 border-b border-sidebar-border">
          <Shield className="h-6 w-6 text-sidebar-primary" />
          <span className="font-bold text-sidebar-foreground">Super Admin</span>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1">
          <nav className="p-2 space-y-1">
            {menuItems.map((item) => {
              const count = getBadgeCount(item.badgeKey);
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/admin'}
                  onClick={() => onNavigate?.()}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                      'hover:bg-muted',
                      isActive
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground'
                    )
                  }
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {count > 0 && (
                    <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                      {count}
                    </Badge>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </ScrollArea>

        <Separator />

        {/* Footer */}
        <div className="p-2">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
            onClick={() => handleNavigate('/dashboard')}
          >
            <LogOut className="h-5 w-5" />
            <span>Voltar ao App</span>
          </Button>
        </div>
      </div>
    );
  }

  // Desktop version - collapsible
  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-50 h-screen bg-card border-r border-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border bg-sidebar-background">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-sidebar-primary" />
            <span className="font-bold text-sidebar-foreground">Super Admin</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn("h-8 w-8", collapsed && "mx-auto")}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 text-sidebar-foreground" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-sidebar-foreground" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="h-[calc(100vh-140px)]">
        <nav className="p-2 space-y-1">
          {menuItems.map((item) => {
            const count = getBadgeCount(item.badgeKey);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/admin'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors relative',
                    'hover:bg-sidebar-accent',
                    isActive
                      ? 'text-sidebar-primary font-medium'
                      : 'text-sidebar-foreground/80',
                    'group',
                    collapsed && 'justify-center px-2'
                  )
                }
                title={collapsed ? `${item.label}${count > 0 ? ` (${count})` : ''}` : undefined}>
                {({ isActive }) => (
                  <>
                    <div className="relative">
                      <item.icon
                        className={cn(
                          'h-5 w-5 shrink-0',
                          isActive
                            ? 'text-sidebar-primary'
                            : collapsed
                              ? 'text-sidebar-foreground/80'
                              : 'text-sidebar-foreground/80 group-hover:text-sidebar-foreground'
                        )}
                      />
                      {collapsed && count > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] font-bold bg-sidebar-primary text-sidebar-primary-foreground rounded-full flex items-center justify-center">
                          {count}
                        </span>
                      )}
                    </div>
                    {!collapsed && (
                      <>
                        <span className="flex-1">{item.label}</span>
                        {count > 0 && (
                          <span className="h-5 min-w-5 px-1.5 text-xs font-bold bg-sidebar-primary text-sidebar-primary-foreground rounded-full flex items-center justify-center">
                            {count}
                          </span>
                        )}
                      </>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </ScrollArea>

      <Separator className="my-2 bg-sidebar-border" />

      {/* Footer */}
      <div className="absolute bottom-4 left-0 right-0 px-2">
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent',
            collapsed && 'justify-center'
          )}
          onClick={() => navigate('/dashboard')}
          title={collapsed ? 'Voltar ao App' : undefined}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span>Voltar ao App</span>}
        </Button>
      </div>
    </aside>
  );
}
