import { useEffect, useRef } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { Goal } from '@/hooks/useGoals';

interface GoalNotificationsProps {
  goals: Goal[];
  transactions: unknown[];
}

export function GoalNotifications({ goals, transactions }: GoalNotificationsProps) {
  const { checkGoalUpdates, settings } = useNotifications();
  const hasChecked = useRef(false);

  useEffect(() => {
    if (hasChecked.current || !settings.goalAlerts || goals.length === 0) return;

    const updates = goals
      .filter((goal) => goal.is_active && goal.goal_type === 'target')
      .map((goal) => {
        const relevantTransactions = transactions.filter(
          (t) => t.category_id === goal.category_id && t.status === 'confirmed'
        );
        const currentAmount = relevantTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
        const progress = goal.target_amount > 0 ? (currentAmount / goal.target_amount) * 100 : 0;

        let message = '';
        if (progress >= 100) {
          message = `Parabéns! Você alcançou sua meta de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(goal.target_amount)}!`;
        } else if (progress >= 75) {
          message = `Faltam apenas ${(100 - progress).toFixed(0)}% para alcançar sua meta!`;
        }

        return {
          name: goal.name,
          progress,
          message,
        };
      })
      .filter((update) => update.progress >= 75);

    if (updates.length > 0) {
      checkGoalUpdates(updates);
      hasChecked.current = true;
    }
  }, [goals, transactions, checkGoalUpdates, settings.goalAlerts]);

  return null;
}
