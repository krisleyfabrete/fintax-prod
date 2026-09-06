import { Bell, BellOff, BellRing, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export function PushNotificationSettings() {
  const { 
    isSupported, 
    permission, 
    isSubscribed, 
    isLoading, 
    requestPermission,
    sendBudgetAlert,
    sendGoalReminder,
  } = usePushNotifications();

  const handleTestBudgetNotification = () => {
    sendBudgetAlert('Alimentação', 85);
  };

  const handleTestGoalNotification = () => {
    sendGoalReminder('Viagem de férias', 65);
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Notificações Push
          </CardTitle>
          <CardDescription>
            Seu navegador não suporta notificações push.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notificações Push
          {isSubscribed && (
            <Badge variant="default" className="ml-2">Ativo</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Receba alertas de orçamento e lembretes de metas em tempo real.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {permission === 'denied' ? (
          <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/30">
            <div className="flex items-center gap-2 text-destructive">
              <BellOff className="h-5 w-5" />
              <span className="font-medium">Notificações bloqueadas</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Você bloqueou as notificações. Para ativá-las, clique no ícone de cadeado na barra de endereço do navegador e permita notificações.
            </p>
          </div>
        ) : !isSubscribed ? (
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Ative as notificações para receber:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                <li>Alertas quando seu orçamento estiver próximo do limite</li>
                <li>Lembretes para contribuir com suas metas</li>
                <li>Notificações quando atingir uma meta</li>
              </ul>
            </div>
            <Button 
              onClick={requestPermission} 
              disabled={isLoading}
              className="w-full gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BellRing className="h-4 w-4" />
              )}
              Ativar notificações
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Alertas de orçamento</Label>
                <p className="text-sm text-muted-foreground">
                  Notificar quando gastar mais de 75% do orçamento
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Lembretes de metas</Label>
                <p className="text-sm text-muted-foreground">
                  Receber lembretes para contribuir com metas
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Metas alcançadas</Label>
                <p className="text-sm text-muted-foreground">
                  Celebrar quando atingir uma meta
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-3">Testar notificações</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleTestBudgetNotification}>
                  Teste de orçamento
                </Button>
                <Button variant="outline" size="sm" onClick={handleTestGoalNotification}>
                  Teste de meta
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
