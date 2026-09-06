import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SupportNotificationCounts {
  unreadUserMessages: number; // For users: unread admin messages
  pendingTickets: number; // For admins: open tickets count
  unreadAdminMessages: number; // For admins: unread user messages
}

export function useSupportNotifications(isAdmin: boolean = false) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [counts, setCounts] = useState<SupportNotificationCounts>({
    unreadUserMessages: 0,
    pendingTickets: 0,
    unreadAdminMessages: 0,
  });

  // Fetch counts
  const { data } = useQuery({
    queryKey: ['support-notifications', user?.id, isAdmin],
    queryFn: async () => {
      if (!user?.id) return { unreadUserMessages: 0, pendingTickets: 0, unreadAdminMessages: 0 };

      if (isAdmin) {
        // Admin: count open/in_progress tickets and unread user messages
        const [ticketsRes, messagesRes] = await Promise.all([
          supabase
            .from('support_tickets')
            .select('id', { count: 'exact', head: true })
            .in('status', ['open', 'in_progress']),
          supabase
            .from('ticket_messages')
            .select('id, ticket_id, is_admin', { count: 'exact' })
            .eq('is_admin', false)
            .order('created_at', { ascending: false }),
        ]);

        // For admin, we want to count tickets that have recent user messages
        // Simple approach: count open tickets as the badge
        return {
          unreadUserMessages: 0,
          pendingTickets: ticketsRes.count || 0,
          unreadAdminMessages: 0,
        };
      } else {
        // User: count admin messages on their tickets that they haven't seen
        // We'll use a simpler approach - count admin messages on user's tickets
        const { data: userTickets } = await supabase
          .from('support_tickets')
          .select('id, status')
          .eq('user_id', user.id)
          .in('status', ['open', 'in_progress', 'waiting_user']);

        if (!userTickets || userTickets.length === 0) {
          return { unreadUserMessages: 0, pendingTickets: 0, unreadAdminMessages: 0 };
        }

        // Count tickets with status 'waiting_user' or those with recent admin responses
        const waitingUserCount = userTickets.filter(t => t.status === 'waiting_user').length;

        return {
          unreadUserMessages: waitingUserCount,
          pendingTickets: 0,
          unreadAdminMessages: 0,
        };
      }
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Update state when data changes
  useEffect(() => {
    if (data) {
      setCounts(data);
    }
  }, [data]);

  // Set up realtime subscription for ticket updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('support-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets',
        },
        () => {
          // Invalidate query to refetch counts
          queryClient.invalidateQueries({ queryKey: ['support-notifications'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_messages',
        },
        () => {
          // Invalidate query to refetch counts
          queryClient.invalidateQueries({ queryKey: ['support-notifications'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return {
    unreadCount: isAdmin ? counts.pendingTickets : counts.unreadUserMessages,
    counts,
  };
}
