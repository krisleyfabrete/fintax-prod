import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  QrCode,
  MoreHorizontal,
  DollarSign,
  BarChart3,
  MessageSquare,
  Settings,
  FileText,
  UsersRound,
  Ticket,
} from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { useState } from 'react';

const mainNavItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true, badgeKey: null },
  { to: '/admin/users', icon: Users, label: 'Usuários', badgeKey: null },
  { to: '/admin/pix-payments', icon: QrCode, label: 'PIX', badgeKey: 'pix' },
  { to: '/admin/subscriptions', icon: CreditCard, label: 'Assinaturas', badgeKey: null },
];

const moreNavItems = [
  { to: '/admin/financial', icon: DollarSign, label: 'Financeiro', badgeKey: null },
  { to: '/admin/analytics', icon: BarChart3, label: 'Analytics', badgeKey: null },
  { to: '/admin/tickets', icon: MessageSquare, label: 'Tickets', badgeKey: 'tickets' },
  { to: '/admin/coupons', icon: Ticket, label: 'Cupons', badgeKey: null },
  { to: '/admin/families', icon: UsersRound, label: 'Famílias', badgeKey: null },
  { to: '/admin/logs', icon: FileText, label: 'Logs', badgeKey: null },
  { to: '/admin/settings', icon: Settings, label: 'Configurações', badgeKey: null },
];

function NotificationBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  
  return (
    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full px-1 animate-scale-in">
      {count > 99 ? '99+' : count}
    </span>
  );
}

export function AdminBottomNav() {
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Fetch pending counts for badges
  const { data: badgeCounts } = useQuery({
    queryKey: ['admin-nav-badges'],
    queryFn: async () => {
      const [pixResult, ticketsResult] = await Promise.all([
        supabase
          .from('pix_payments')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase
          .from('support_tickets')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'open'),
      ]);

      return {
        pix: pixResult.count || 0,
        tickets: ticketsResult.count || 0,
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const getBadgeCount = (key: string | null): number => {
    if (!key || !badgeCounts) return 0;
    return badgeCounts[key as keyof typeof badgeCounts] || 0;
  };

  const isActive = (path: string, end?: boolean) => {
    if (end) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const isMoreActive = moreNavItems.some(item => isActive(item.to));
  const moreBadgeCount = moreNavItems.reduce((sum, item) => sum + getBadgeCount(item.badgeKey), 0);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-background border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {mainNavItems.map((item, index) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive: active }) => cn(
              "relative flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all min-w-[60px]",
              "animate-fade-in",
              active 
                ? "text-primary bg-primary/10" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="relative">
              <item.icon className="h-5 w-5" />
              <NotificationBadge count={getBadgeCount(item.badgeKey)} />
            </div>
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}

        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerTrigger asChild>
            <button
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all min-w-[60px]",
                "animate-fade-in",
                isMoreActive 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              style={{ animationDelay: `${mainNavItems.length * 50}ms` }}
            >
              <div className="relative">
                <MoreHorizontal className="h-5 w-5" />
                <NotificationBadge count={moreBadgeCount} />
              </div>
              <span className="text-[10px] font-medium">Mais</span>
            </button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader className="pb-2">
              <DrawerTitle>Mais opções</DrawerTitle>
            </DrawerHeader>
            <div className="grid grid-cols-3 gap-3 p-4 pb-8">
              {moreNavItems.map((item, index) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setDrawerOpen(false)}
                  className={({ isActive: active }) => cn(
                    "relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl transition-all",
                    "animate-scale-in",
                    active 
                      ? "bg-primary/10 text-primary border border-primary/20" 
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className="relative">
                    <item.icon className="h-6 w-6" />
                    <NotificationBadge count={getBadgeCount(item.badgeKey)} />
                  </div>
                  <span className="text-xs font-medium text-center">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </nav>
  );
}
