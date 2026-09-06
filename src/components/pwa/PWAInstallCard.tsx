import { Download, Smartphone, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export function PWAInstallCard() {
  const { isInstallable, isInstalled, isIOS, prompt, dismiss } = usePWAInstall();

  if (isInstalled || (!isInstallable && !isIOS)) return null;

  return (
    <Card className="border-primary/30 bg-card/95 backdrop-blur-lg shadow-xl">
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            {isIOS ? <Smartphone className="h-5 w-5 text-primary" /> : <Download className="h-5 w-5 text-primary" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Instale o Fintax</p>
            <p className="text-xs text-muted-foreground mt-1">
              {isIOS
                ? 'Toque em Compartilhar e depois em "Adicionar à Tela de Início"'
                : 'Adicione à tela inicial para acesso rápido e offline'}
            </p>
            {isInstallable && (
              <div className="flex gap-2 mt-3">
                <Button size="sm" className="h-8 text-xs" onClick={prompt}>
                  Instalar
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={dismiss}>
                  Agora não
                </Button>
              </div>
            )}
          </div>
          <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={dismiss}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
