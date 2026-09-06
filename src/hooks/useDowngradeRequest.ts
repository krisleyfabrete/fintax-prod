import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface DowngradeRequest {
  id: string;
  user_id: string;
  user_email: string | null;
  current_plan: string | null;
  requested_plan: string | null;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_at: string | null;
  reviewed_by: string | null;
  admin_notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export function useDowngradeRequest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check if user has a pending downgrade request
  const { data: pendingRequest, isLoading } = useQuery({
    queryKey: ['downgrade-request', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('downgrade_requests')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching downgrade request:', error);
        return null;
      }

      return data as unknown as DowngradeRequest | null;
    },
    enabled: !!user?.id,
  });

  // Request a downgrade
  const requestDowngradeMutation = useMutation({
    mutationFn: async ({ currentPlan, reason }: { currentPlan: string; reason?: string }) => {
      if (!user?.id || !user?.email) throw new Error('Usuário não autenticado');

      // Check for existing pending request
      const { data: existing } = await supabase
        .from('downgrade_requests')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .limit(1)
        .maybeSingle();

      if (existing) {
        throw new Error('Você já tem uma solicitação de downgrade pendente');
      }

      const { data, error } = await supabase
        .from('downgrade_requests')
        .insert({
          user_id: user.id,
          user_email: user.email,
          current_plan: currentPlan,
          requested_plan: 'free',
          reason: reason || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Create notification for admins
      const { data: admins } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (admins && admins.length > 0) {
        const notifications = admins.map((admin) => ({
          user_id: admin.user_id,
          title: 'Nova solicitação de downgrade',
          message: `O usuário ${user.email} solicitou downgrade do plano ${currentPlan} para o plano gratuito.`,
          type: 'downgrade_request',
          link: '/admin/subscriptions',
        }));

        await supabase.from('notifications').insert(notifications);
      }

      return data;
    },
    onSuccess: () => {
      toast.success('Solicitação de downgrade enviada!', {
        description: 'Você será notificado quando um administrador analisar sua solicitação.',
      });
      queryClient.invalidateQueries({ queryKey: ['downgrade-request', user?.id] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao solicitar downgrade', {
        description: error.message,
      });
    },
  });

  // Cancel pending request
  const cancelRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('downgrade_requests')
        .delete()
        .eq('id', requestId)
        .eq('user_id', user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Solicitação cancelada');
      queryClient.invalidateQueries({ queryKey: ['downgrade-request', user?.id] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao cancelar solicitação', {
        description: error.message,
      });
    },
  });

  return {
    pendingRequest,
    isLoading,
    hasPendingRequest: !!pendingRequest,
    requestDowngrade: requestDowngradeMutation.mutate,
    isRequesting: requestDowngradeMutation.isPending,
    cancelRequest: cancelRequestMutation.mutate,
    isCancelling: cancelRequestMutation.isPending,
  };
}
