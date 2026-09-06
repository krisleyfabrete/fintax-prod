import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CloudOff, CheckCircle } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export function OfflineIndicator() {
  const { isOnline } = useOnlineStatus();
  const { isSyncing, pendingCount, syncPendingItems } = useOfflineSync();
  const [showBanner, setShowBanner] = useState(false);
  const [justSynced, setJustSynced] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShowBanner(true);
    } else if (pendingCount === 0 && showBanner) {
      // Show success briefly then hide
      setJustSynced(true);
      const timer = setTimeout(() => {
        setShowBanner(false);
        setJustSynced(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, pendingCount, showBanner]);

  // Always show if offline or has pending items
  const shouldShow = !isOnline || pendingCount > 0 || showBanner;

  if (!shouldShow) return null;

  return (
    <>
      {/* Top Banner */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-950 px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2 safe-top">
          <WifiOff className="h-4 w-4" />
          <span>Você está offline. Os dados serão salvos localmente.</span>
        </div>
      )}

      {/* Floating Indicator */}
      <div
        className={cn(
          'fixed bottom-20 right-4 z-50 transition-all duration-300 safe-bottom',
          !isOnline ? 'bottom-24' : ''
        )}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className={cn(
                'h-12 w-12 rounded-full shadow-lg border-2 transition-all',
                !isOnline && 'bg-amber-100 border-amber-500 text-amber-700 hover:bg-amber-200',
                isOnline && pendingCount > 0 && 'bg-blue-100 border-blue-500 text-blue-700 hover:bg-blue-200',
                isOnline && pendingCount === 0 && justSynced && 'bg-green-100 border-green-500 text-green-700',
                isSyncing && 'animate-pulse'
              )}
              onClick={isOnline && pendingCount > 0 ? syncPendingItems : undefined}
              disabled={!isOnline || isSyncing || pendingCount === 0}
            >
              {!isOnline ? (
                <CloudOff className="h-5 w-5" />
              ) : isSyncing ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : pendingCount > 0 ? (
                <div className="relative">
                  <RefreshCw className="h-5 w-5" />
                  <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {pendingCount}
                  </span>
                </div>
              ) : justSynced ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <Wifi className="h-5 w-5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-xs">
            {!isOnline ? (
              <p>Modo offline ativo. Os dados serão sincronizados quando a conexão voltar.</p>
            ) : isSyncing ? (
              <p>Sincronizando dados...</p>
            ) : pendingCount > 0 ? (
              <p>
                {pendingCount} item(s) pendente(s) para sincronizar. Clique para sincronizar agora.
              </p>
            ) : justSynced ? (
              <p>Todos os dados foram sincronizados!</p>
            ) : (
              <p>Conectado</p>
            )}
          </TooltipContent>
        </Tooltip>
      </div>
    </>
  );
}
