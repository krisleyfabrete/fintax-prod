import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  ArrowDownCircle,
  DollarSign,
  Settings,
  UsersRound,
  MessageSquare,
  BarChart3,
  FileText,
  Shield,
  LogOut,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  NewSidebar,
  NewSidebarItem,
} from '@/components/layout/NewSidebar';
import { Button } from '@/components/ui/button';

interface NewAdminSidebarProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onNavigate?: () => void;
}

export function NewAdminSidebar({ collapsed, onCollapsedChange, onNavigate }: NewAdminSidebarProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
    refetchInterval: 30000,
  });

  useEffect(() => {
    const invalidateBadges = () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sidebar-badges'] });
    };
    const channel = supabase
      .channel('admin-sidebar-badges')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, invalidateBadges)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'downgrade_requests' }, invalidateBadges)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pix_payments' }, invalidateBadges)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const mainItems: NewSidebarItem[] = [
    { label: 'Dashboard', url: '/admin', icon: LayoutDashboard, end: true },
    { label: 'Usuários', url: '/admin/users', icon: Users },
    { label: 'Assinaturas', url: '/admin/subscriptions', icon: CreditCard },
    { label: 'Downgrades', url: '/admin/downgrade-requests', icon: ArrowDownCircle },
    {
      label: 'Financeiro',
      url: '/admin/financial',
      icon: Layers,
      children: [
        { label: 'Visão Geral', url: '/admin/financial', icon: DollarSign },
        { label: 'PIX Pendentes', url: '/admin/pix-payments', icon: CreditCard },
        { label: 'Config. PIX', url: '/admin/pix-config', icon: Settings },
      ],
    },
    { label: 'Famílias', url: '/admin/families', icon: UsersRound },
    { label: 'Tickets', url: '/admin/tickets', icon: MessageSquare },
    { label: 'Analytics', url: '/admin/analytics', icon: BarChart3 },
    { label: 'Logs', url: '/admin/logs', icon: FileText },
    { label: 'Inteligência Artificial', url: '/admin/ai', icon: Sparkles },
    { label: 'Config. LLM', url: '/admin/llm-config', icon: Settings },
  ];

  const footerItems: NewSidebarItem[] = [
    { label: 'Configurações', url: '/admin/settings', icon: Settings },
  ];

  const brand = (
    <div className="flex min-w-0 items-center gap-2">
      <Shield className="h-5 w-5 shrink-0 text-[#7C6FF0]" />
      <span className="whitespace-nowrap text-sm font-bold uppercase tracking-wider text-white">Super Admin</span>
    </div>
  );

  const footerBrand = !collapsed ? (
    <Button
      variant="ghost"
      className="flex w-full items-center justify-start gap-3 rounded-xl px-2 text-white/70 hover:bg-white/5 hover:text-white"
      onClick={() => { navigate('/dashboard'); onNavigate?.(); }}
    >
      <LogOut className="h-5 w-5 shrink-0" />
      <span className="truncate">Voltar ao App</span>
    </Button>
  ) : (
    <Button
      variant="ghost"
      className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl text-white/70 hover:bg-white/5 hover:text-white"
      onClick={() => { navigate('/dashboard'); onNavigate?.(); }}
      title="Voltar ao App"
    >
      <LogOut className="h-5 w-5" />
    </Button>
  );

  return (
    <NewSidebar
      brand={brand}
      items={mainItems}
      footerItems={footerItems}
      footerBrand={footerBrand}
      collapsed={collapsed}
      onCollapsedChange={onCollapsedChange}
    />
  );
}