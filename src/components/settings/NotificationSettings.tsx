import { Bell, BellOff, BellRing, Target, Calendar, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useNotifications } from '@/hooks/useNotifications';
import { useGoalReminders } from '@/hooks/useGoalReminders';
import { useGoals } from '@/hooks/useGoals';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const frequencyLabels: Record<string, string> = {
  weekly: 'Semanal',
  biweekly: 'Quinzenal',
  monthly: 'Mensal',
};

const weekDays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function NotificationSettings() {
  const { permission, settings, requestPermission, updateSettings } = useNotifications();
  const { reminders, deleteReminder } = useGoalReminders();
  const { goals } = useGoals();

  const handleBrowserNotifications = async () => {
    if (permission !== 'granted') {
      await requestPermission();
    } else {
      updateSettings({ browserNotifications: !settings.browserNotifications });
    }
  };

  const getGoalName = (goalId: string) => {
    const goal = goals.find((g) => g.id === goalId);
    return goal?.name || 'Meta removida';
  };

interface ReminderSchedule {
  frequency: string;
  day_of_month?: number;
  day_of_week?: number | null;
}

const getReminderSchedule = (reminder: ReminderSchedule) => {
    if (reminder.frequency === 'monthly' && reminder.day_of_month) {
      return `Todo dia ${reminder.day_of_month}`;
    }
    if (reminder.day_of_week !== null) {
      return `Toda ${weekDays[reminder.day_of_week]}`;
    }
    return frequencyLabels[reminder.frequency];
  };

  const activeReminders = reminders.filter((r) => r.is_active);

  return (
    <div className="space-y-6">
      <Card className="shadow-card border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Preferências de Notificação
          </CardTitle>
          <CardDescription>Configure como deseja receber alertas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Browser Notifications Status */}
          <div className="p-4 rounded-xl bg-muted/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {permission === 'granted' ? (
                  <BellRing className="h-5 w-5 text-green-500" />
                ) : (
                  <BellOff className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-semibold">Notificações do Navegador</p>
                  <p className="text-sm text-muted-foreground">
                    Receba alertas mesmo quando não estiver na página
                  </p>
                </div>
              </div>
              <Badge variant={permission === 'granted' ? 'default' : 'secondary'}>
                {permission === 'granted' ? 'Ativado' : permission === 'denied' ? 'Bloqueado' : 'Desativado'}
              </Badge>
            </div>
            {permission !== 'granted' && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleBrowserNotifications}
                disabled={permission === 'denied'}
              >
                {permission === 'denied' 
                  ? 'Ative nas configurações do navegador' 
                  : 'Ativar notificações'
                }
              </Button>
            )}
            {permission === 'granted' && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm">Ativar notificações push</span>
                <Switch 
                  checked={settings.browserNotifications}
                  onCheckedChange={(checked) => updateSettings({ browserNotifications: checked })}
                />
              </div>
            )}
          </div>

          {/* Notification Types */}
          <div className="space-y-4">
            <h4 className="font-medium">Tipos de Alerta</h4>
            
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex-1">
                <Label htmlFor="budget-alerts" className="font-medium cursor-pointer">
                  Alertas de Orçamento
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Receba avisos quando seus gastos estiverem próximos do limite do orçamento
                </p>
              </div>
              <Switch 
                id="budget-alerts"
                checked={settings.budgetAlerts}
                onCheckedChange={(checked) => updateSettings({ budgetAlerts: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex-1">
                <Label htmlFor="goal-alerts" className="font-medium cursor-pointer">
                  Alertas de Metas
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Receba notificações sobre o progresso das suas metas financeiras
                </p>
              </div>
              <Switch 
                id="goal-alerts"
                checked={settings.goalAlerts}
                onCheckedChange={(checked) => updateSettings({ goalAlerts: checked })}
              />
            </div>
          </div>

          {/* Info */}
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm">
              <span className="font-medium">💡 Dica:</span> Os alertas serão exibidos quando você acessar o dashboard ou gerar insights com IA.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Goal Reminders Section */}
      <Card className="shadow-card border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Lembretes de Metas
          </CardTitle>
          <CardDescription>
            Gerencie os lembretes periódicos configurados para suas metas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeReminders.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum lembrete configurado</p>
              <p className="text-sm text-muted-foreground mt-1">
                Configure lembretes na página de Metas para receber notificações periódicas
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeReminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-muted/30"
                >
                  <div className="flex-1">
                    <p className="font-medium">{getGoalName(reminder.goal_id)}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {frequencyLabels[reminder.frequency]}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {getReminderSchedule(reminder)}
                      </span>
                    </div>
                    {reminder.next_reminder_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Próximo: {format(new Date(reminder.next_reminder_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteReminder.mutate(reminder.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
