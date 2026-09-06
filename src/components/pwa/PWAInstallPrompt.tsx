import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, X, Smartphone, Info } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showManualInstructions, setShowManualInstructions] = useState(false);

  useEffect(() => {
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(isInStandaloneMode);

    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    const dismissed = localStorage.getItem('pwa-install-dismissed');

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      if (!dismissed) {
        setTimeout(() => setShowPrompt(true), 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowManualInstructions(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (isStandalone) return null;

  if (!showPrompt && !showManualInstructions) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          className="gap-2 shadow-lg"
          onClick={() => setShowManualInstructions(true)}
        >
          <Info className="h-4 w-4" />
          Instalar app
        </Button>
      </div>
    );
  }

  if (showManualInstructions && !isIOS) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300 sm:left-auto sm:right-4 sm:w-80">
        <Card className="border-primary/30 bg-card/95 backdrop-blur-lg shadow-xl">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <Download className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Instale o Fintax</p>
                <p className="text-xs text-muted-foreground mt-1">
                  No Chrome/Edge: toque no menu (⋮) e depois em <span className="font-medium">"Instalar app"</span> ou <span className="font-medium">"Adicionar à tela inicial"</span>.
                </p>
                {deferredPrompt && (
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" className="h-8 text-xs" onClick={handleInstall}>
                      Instalar agora
                    </Button>
                  </div>
                )}
              </div>
              <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={handleDismiss}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showManualInstructions && isIOS) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300 sm:left-auto sm:right-4 sm:w-80">
        <Card className="border-primary/30 bg-card/95 backdrop-blur-lg shadow-xl">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Instale o Fintax</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Toque em <span className="font-medium">Compartilhar</span> e depois em <span className="font-medium">"Adicionar à Tela de Início"</span>.
                </p>
              </div>
              <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={handleDismiss}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isIOS) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300 sm:left-auto sm:right-4 sm:w-80">
        <Card className="border-primary/30 bg-card/95 backdrop-blur-lg shadow-xl">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Instale o Fintax</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Toque em <span className="font-medium">Compartilhar</span> e depois em <span className="font-medium">"Adicionar à Tela de Início"</span>.
                </p>
              </div>
              <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={handleDismiss}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!deferredPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300 sm:left-auto sm:right-4 sm:w-80">
      <Card className="border-primary/30 bg-card/95 backdrop-blur-lg shadow-xl">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <Download className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Instale o Fintax</p>
              <p className="text-xs text-muted-foreground mt-1">
                Adicione à tela inicial para acesso rápido e offline
              </p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" className="h-8 text-xs" onClick={handleInstall}>
                  Instalar
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={handleDismiss}>
                  Agora não
                </Button>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={handleDismiss}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
