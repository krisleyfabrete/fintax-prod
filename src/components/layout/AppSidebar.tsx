import { 
  LayoutDashboard, 
  Wallet, 
  ArrowUpDown, 
  PieChart, 
  Target, 
  Users, 
  Settings, 
  LogOut,
  FileText,
  Sparkles,
  Crown,
  Code2,
  HelpCircle,
  TrendingUp,
  LucideIcon
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useSupportNotifications } from '@/hooks/useSupportNotifications';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { NavLink } from '@/components/NavLink';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import fintaxLogo from '@/assets/fintax-logo-principal.png';

interface MenuItem {
  title: string;
  url: string;
  icon: LucideIcon;
  color: string;
  badgeKey?: string;
}

const mainMenuItems: MenuItem[] = [
  { title: 'Workspace', url: '/', icon: LayoutDashboard, color: 'text-primary' },
  { title: 'Contas', url: '/accounts', icon: Wallet, color: 'text-secondary' },
  { title: 'Transações', url: '/transactions', icon: ArrowUpDown, color: 'text-info' },
  { title: 'Relatórios', url: '/reports', icon: PieChart, color: 'text-accent' },
];

const planningMenuItems: MenuItem[] = [
  { title: 'Orçamentos', url: '/budgets', icon: Target, color: 'text-warning' },
  { title: 'Metas', url: '/goals', icon: Sparkles, color: 'text-income' },
  { title: 'Investimentos', url: '/investments', icon: TrendingUp, color: 'text-secondary' },
];

const otherMenuItems: MenuItem[] = [
  { title: 'Família', url: '/family', icon: Users, color: 'text-primary' },
  { title: 'Importação', url: '/import', icon: FileText, color: 'text-muted-foreground' },
  { title: 'Planos', url: '/plans', icon: Crown, color: 'text-warning' },
  { title: 'Suporte', url: '/support', icon: HelpCircle, color: 'text-info', badgeKey: 'support' },
  { title: 'Configurações', url: '/settings', icon: Settings, color: 'text-muted-foreground' },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { plan, getPlanLabel } = useSubscription();
  const { unreadCount: supportUnread } = useSupportNotifications(false);

  const getBadgeCount = (badgeKey?: string) => {
    if (badgeKey === 'support') return supportUnread;
    return 0;
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname.includes('preview');

  const getPlanBadgeVariant = () => {
    if (isDevelopment) return 'default';
    switch (plan) {
      case 'pro':
        return 'default';
      case 'family':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getPlanBadgeClass = () => {
    if (isDevelopment) {
      return 'bg-gradient-to-r from-violet-500 to-purple-500 text-white border-0';
    }
    switch (plan) {
      case 'pro':
        return 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0';
      case 'family':
        return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0';
      default:
        return '';
    }
  };

  const getBadgeContent = (): { Icon: LucideIcon; label: string; iconClass: string } => {
    if (isDevelopment) {
      return { Icon: Code2, label: 'DEV', iconClass: '' };
    }
    switch (plan) {
      case 'pro':
        return { Icon: Crown, label: getPlanLabel(plan), iconClass: 'text-amber-200' };
      case 'family':
        return { Icon: Users, label: getPlanLabel(plan), iconClass: '' };
      default:
        return { Icon: Crown, label: getPlanLabel(plan), iconClass: 'text-gray-400' };
    }
  };

  const { Icon: BadgeIcon, label: badgeLabel, iconClass: badgeIconClass } = getBadgeContent();

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-center">
          <img 
            src={fintaxLogo} 
            alt="Fintax Finanças" 
            className={cn(
              "object-contain transition-all duration-200",
              collapsed ? "h-12" : "h-14"
            )}
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70">
            Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location.pathname === item.url}
                    tooltip={item.title}
                  >
                    <NavLink 
                      to={item.url} 
                      end 
                      className="flex items-center gap-3 text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-foreground font-medium"
                    >
                      <item.icon className={cn("h-5 w-5", item.color)} />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70">
            Planejamento
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {planningMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location.pathname === item.url}
                    tooltip={item.title}
                  >
                    <NavLink 
                      to={item.url} 
                      end 
                      className="flex items-center gap-3 text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-foreground font-medium"
                    >
                      <item.icon className={cn("h-5 w-5", item.color)} />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70">
            Outros
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {otherMenuItems.map((item) => {
                const badgeCount = getBadgeCount(item.badgeKey);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={location.pathname === item.url}
                      tooltip={badgeCount > 0 ? `${item.title} (${badgeCount})` : item.title}
                    >
                      <NavLink 
                        to={item.url} 
                        end 
                        className="flex items-center gap-3 text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                        activeClassName="bg-sidebar-accent text-sidebar-foreground font-medium"
                      >
                        <div className="relative">
                          <item.icon className={cn("h-5 w-5", item.color)} />
                          {badgeCount > 0 && collapsed && (
                            <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] font-bold bg-sidebar-primary text-sidebar-primary-foreground rounded-full flex items-center justify-center">
                              {badgeCount}
                            </span>
                          )}
                        </div>
                        <span className="flex-1">{item.title}</span>
                <span>{item.title}</span>
                        {badgeCount > 0 && !collapsed && (
                          <span className="h-5 min-w-5 px-1.5 text-xs font-bold bg-sidebar-primary text-sidebar-primary-foreground rounded-full flex items-center justify-center">
                            {badgeCount}
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-10 w-10 border-2 border-sidebar-primary/30">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground text-sm font-semibold">
                {getInitials(user?.user_metadata?.full_name)}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div 
                className={cn(
                  "absolute -bottom-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center border-2 border-sidebar-background",
                  plan === 'pro' ? 'bg-gradient-to-br from-amber-400 to-orange-500' :
                  plan === 'family' ? 'bg-gradient-to-br from-purple-500 to-pink-500' :
                  'bg-gray-500'
                )}
              >
                <BadgeIcon className="h-3 w-3 text-white" />
              </div>
            )}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user?.user_metadata?.full_name || 'Usuário'}
              </p>
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  "text-xs font-medium",
                  plan === 'pro' ? 'text-amber-400' :
                  plan === 'family' ? 'text-purple-400' :
                  'text-muted-foreground'
                )}>
                  {badgeLabel}
                </span>
              </div>
            </div>
          )}
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
