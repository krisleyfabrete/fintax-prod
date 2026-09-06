import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Check, Database } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Investment } from '@/hooks/useInvestments';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface QuoteUpdaterProps {
  investments: Investment[];
}

export function QuoteUpdater({ investments }: QuoteUpdaterProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [updateCount, setUpdateCount] = useState(0);
  const [cacheInfo, setCacheInfo] = useState<{ cached: number; fresh: number } | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useProfile();

  const updateQuotes = async (forceRefresh = false) => {
    if (investments.length === 0) {
      toast({ title: 'Nenhum investimento para atualizar' });
      return;
    }

    setIsLoading(true);
    let updated = 0;
    let totalCached = 0;
    let totalFresh = 0;

    try {
      // Agrupar por tipo para otimizar chamadas
      const stockTickers = investments
        .filter(i => ['stock', 'fii', 'etf', 'bdr'].includes(i.type))
        .map(i => i.ticker);

      const cryptoTickers = investments
        .filter(i => i.type === 'crypto')
        .map(i => i.ticker);

      // Buscar cotações de ações
      if (stockTickers.length > 0) {
        const { data, error } = await supabase.functions.invoke('fetch-quotes', {
          body: { 
            tickers: stockTickers, 
            type: 'stock',
            apiKey: profile?.brapi_api_key || undefined,
            forceRefresh,
          },
        });

        if (data?.quotes) {
          if (data.meta) {
            totalCached += data.meta.cached || 0;
            totalFresh += data.meta.fresh || 0;
          }

          for (const inv of investments.filter(i => ['stock', 'fii', 'etf', 'bdr'].includes(i.type))) {
            const quote = data.quotes[inv.ticker] || data.quotes[inv.ticker.toUpperCase()];
            if (quote && quote.price > 0) {
              await supabase
                .from('investments')
                .update({ current_price: quote.price })
                .eq('id', inv.id);
              updated++;
            }
          }
        }
      }

      // Buscar cotações de crypto
      if (cryptoTickers.length > 0) {
        const { data, error } = await supabase.functions.invoke('fetch-quotes', {
          body: { 
            tickers: cryptoTickers, 
            type: 'crypto',
            forceRefresh,
          },
        });

        if (data?.quotes) {
          if (data.meta) {
            totalCached += data.meta.cached || 0;
            totalFresh += data.meta.fresh || 0;
          }

          for (const inv of investments.filter(i => i.type === 'crypto')) {
            const quote = data.quotes[inv.ticker] || data.quotes[inv.ticker.toUpperCase()];
            if (quote && quote.price > 0) {
              await supabase
                .from('investments')
                .update({ current_price: quote.price })
                .eq('id', inv.id);
              updated++;
            }
          }
        }
      }

      setUpdateCount(updated);
      setLastUpdate(new Date());
      setCacheInfo({ cached: totalCached, fresh: totalFresh });
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      
      const cacheMessage = totalCached > 0 
        ? ` (${totalCached} do cache, ${totalFresh} da API)`
        : '';
      
      toast({
        title: 'Cotações atualizadas!',
        description: `${updated} de ${investments.length} ativos atualizados${cacheMessage}.`,
      });
    } catch (error) {
      console.error('Error updating quotes:', error);
      toast({
        title: 'Erro ao atualizar cotações',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <TooltipProvider>
        <div className="flex gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateQuotes(false)}
                disabled={isLoading || investments.length === 0}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Atualizando...' : 'Atualizar Cotações'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Usa cache de 15 min para economizar chamadas à API</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateQuotes(true)}
                disabled={isLoading || investments.length === 0}
                className="px-2"
              >
                <Database className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Forçar atualização (ignorar cache)</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
      
      {lastUpdate && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Check className="h-3 w-3 text-green-500" />
          <span>
            {updateCount} atualizados às {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            {cacheInfo && cacheInfo.cached > 0 && (
              <span className="ml-1 text-primary">({cacheInfo.cached} cache)</span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
