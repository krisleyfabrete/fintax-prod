import { useState, useEffect } from 'react';
import { Bell, BellOff, Calendar } from 'lucide-react';
import { Goal } from '@/hooks/useGoals';
import { useGoalReminders, GoalReminder } from '@/hooks/useGoalReminders';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface GoalReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: Goal;
}

const weekDays = [
  { value: '0', label: 'Domingo' },
  { value: '1', label: 'Segunda-feira' },
  { value: '2', label: 'Terça-feira' },
  { value: '3', label: 'Quarta-feira' },
  { value: '4', label: 'Quinta-feira' },
  { value: '5', label: 'Sexta-feira' },
  { value: '6', label: 'Sábado' },
];

const monthDays = Array.from({ length: 28 }, (_, i) => ({
  value: String(i + 1),
  label: `Dia ${i + 1}`,
}));

export function GoalReminderDialog({ open, onOpenChange, goal }: GoalReminderDialogProps) {
  const { getReminderForGoal, createReminder, updateReminder, deleteReminder } = useGoalReminders();
  const existingReminder = getReminderForGoal(goal.id);

  const [frequency, setFrequency] = useState<'weekly' | 'biweekly' | 'monthly'>('monthly');
  const [dayOfWeek, setDayOfWeek] = useState<string>('1');
  const [dayOfMonth, setDayOfMonth] = useState<string>('1');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (existingReminder) {
      setFrequency(existingReminder.frequency);
      setDayOfWeek(String(existingReminder.day_of_week ?? 1));
      setDayOfMonth(String(existingReminder.day_of_month ?? 1));
      setIsActive(existingReminder.is_active);
    } else {
      setFrequency('monthly');
      setDayOfWeek('1');
      setDayOfMonth('1');
      setIsActive(true);
    }
  }, [existingReminder, open]);

  const handleSave = () => {
    const data = {
      goal_id: goal.id,
      frequency,
      day_of_week: frequency !== 'monthly' ? parseInt(dayOfWeek) : null,
      day_of_month: frequency === 'monthly' ? parseInt(dayOfMonth) : null,
      active: isActive,
    };

    if (existingReminder) {
      updateReminder.mutate({ id: existingReminder.id, ...data }, {
        onSuccess: () => onOpenChange(false),
      });
    } else {
      createReminder.mutate(data, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  const handleDelete = () => {
    if (existingReminder) {
      deleteReminder.mutate(existingReminder.id, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  const isLoading = createReminder.isPending || updateReminder.isPending || deleteReminder.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Lembrete para {goal.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Ativar lembrete</Label>
              <p className="text-sm text-muted-foreground">
                Receba notificações para contribuir com esta meta
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <div className="space-y-2">
            <Label>Frequência</Label>
            <Select value={frequency} onValueChange={(v) => setFrequency(v as 'weekly' | 'biweekly' | 'monthly')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="biweekly">Quinzenal</SelectItem>
                <SelectItem value="monthly">Mensal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {frequency !== 'monthly' ? (
            <div className="space-y-2">
              <Label>Dia da semana</Label>
              <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {weekDays.map((day) => (
                    <SelectItem key={day.value} value={day.value}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Dia do mês</Label>
              <Select value={dayOfMonth} onValueChange={setDayOfMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthDays.map((day) => (
                    <SelectItem key={day.value} value={day.value}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {existingReminder?.next_reminder_at && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <Calendar className="h-4 w-4" />
              <span>
                Próximo lembrete:{' '}
                {format(new Date(existingReminder.next_reminder_at), "dd 'de' MMMM 'às' HH:mm", {
                  locale: ptBR,
                })}
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {existingReminder && (
            <Button
              variant="outline"
              onClick={handleDelete}
              disabled={isLoading}
              className="text-destructive hover:text-destructive"
            >
              <BellOff className="h-4 w-4 mr-2" />
              Remover lembrete
            </Button>
          )}
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Salvando...' : existingReminder ? 'Atualizar' : 'Criar lembrete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
