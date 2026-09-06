import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface GoalReminder {
  id: string;
  goal_id: string;
  user_id: string;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  day_of_week: number | null;
  day_of_month: number | null;
  is_active: boolean;
  next_reminder_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoalReminderInsert {
  goal_id: string;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  day_of_week?: number | null;
  day_of_month?: number | null;
  is_active?: boolean;
}

export function useGoalReminders() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ['goal-reminders', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('goal_reminders')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data as GoalReminder[];
    },
    enabled: !!user?.id,
  });

  const createReminder = useMutation({
    mutationFn: async (data: GoalReminderInsert) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const nextReminderAt = calculateNextReminder(data.frequency, data.day_of_week, data.day_of_month);

      const { data: reminder, error } = await supabase
        .from('goal_reminders')
        .insert({
          ...data,
          active: data.is_active,
          user_id: user.id,
          next_reminder_at: nextReminderAt,
        })
        .select()
        .single();

      if (error) throw error;
      return reminder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goal-reminders'] });
      toast({
        title: 'Lembrete criado',
        description: 'Você receberá notificações sobre esta meta.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar lembrete',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateReminder = useMutation({
    mutationFn: async ({ id, ...data }: Partial<GoalReminder> & { id: string }) => {
      const { is_active, ...rest } = data;
      const nextReminderAt = rest.frequency 
        ? calculateNextReminder(rest.frequency, rest.day_of_week, rest.day_of_month)
        : undefined;

      const { data: reminder, error } = await supabase
        .from('goal_reminders')
        .update({
          ...rest,
          ...(is_active !== undefined && { active: is_active }),
          ...(nextReminderAt && { next_reminder_at: nextReminderAt }),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return reminder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goal-reminders'] });
      toast({
        title: 'Lembrete atualizado',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar lembrete',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteReminder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('goal_reminders')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goal-reminders'] });
      toast({
        title: 'Lembrete removido',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao remover lembrete',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const getReminderForGoal = (goalId: string) => {
    return reminders.find((r) => r.goal_id === goalId);
  };

  return {
    reminders,
    isLoading,
    createReminder,
    updateReminder,
    deleteReminder,
    getReminderForGoal,
  };
}

function calculateNextReminder(
  frequency: string,
  dayOfWeek?: number | null,
  dayOfMonth?: number | null
): string {
  const now = new Date();
  const next = new Date();

  if (frequency === 'weekly' && dayOfWeek !== null && dayOfWeek !== undefined) {
    const currentDay = now.getDay();
    let daysUntilNext = dayOfWeek - currentDay;
    if (daysUntilNext <= 0) daysUntilNext += 7;
    next.setDate(now.getDate() + daysUntilNext);
  } else if (frequency === 'biweekly' && dayOfWeek !== null && dayOfWeek !== undefined) {
    const currentDay = now.getDay();
    let daysUntilNext = dayOfWeek - currentDay;
    if (daysUntilNext <= 0) daysUntilNext += 14;
    next.setDate(now.getDate() + daysUntilNext);
  } else if (frequency === 'monthly' && dayOfMonth !== null && dayOfMonth !== undefined) {
    next.setDate(dayOfMonth);
    if (next <= now) {
      next.setMonth(next.getMonth() + 1);
    }
  } else {
    // Default to next month
    next.setMonth(now.getMonth() + 1);
  }

  next.setHours(9, 0, 0, 0);
  return next.toISOString();
}
