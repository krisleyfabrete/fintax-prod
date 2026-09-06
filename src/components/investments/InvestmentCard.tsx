import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { Investment, INVESTMENT_TYPES } from '@/hooks/useInvestments';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface InvestmentCardProps {
  investment: Investment;
  onEdit: () => void;
  onDelete: () => void;
}

export function InvestmentCard({ investment, onEdit, onDelete }: InvestmentCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const totalValue = investment.quantity * investment.current_price;
  const totalCost = investment.quantity * investment.purchase_price;
  const profit = totalValue - totalCost;
  const profitPercent = totalCost > 0 ? ((profit / totalCost) * 100) : 0;
  const isPositive = profit >= 0;

  const typeLabel = INVESTMENT_TYPES.find(t => t.value === investment.type)?.label || investment.type;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-lg">{investment.ticker}</span>
              <Badge variant="secondary" className="text-xs">
                {typeLabel}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{investment.name}</p>
            
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div>
                <span className="text-muted-foreground">Qtd:</span>{' '}
                <span className="font-medium">{investment.quantity}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Preço Atual:</span>{' '}
                <span className="font-medium">{formatCurrency(investment.current_price)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">PM:</span>{' '}
                <span className="font-medium">{formatCurrency(investment.purchase_price)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total:</span>{' '}
                <span className="font-medium">{formatCurrency(totalValue)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={onEdit}>
                <Pencil className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir investimento?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir {investment.ticker}? Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete}>
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <div className={cn(
              "flex items-center gap-1 text-sm font-medium",
              isPositive ? "text-green-500" : "text-red-500"
            )}>
              {isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>{isPositive ? '+' : ''}{profitPercent.toFixed(2)}%</span>
            </div>
            <div className={cn(
              "text-sm",
              isPositive ? "text-green-500" : "text-red-500"
            )}>
              {isPositive ? '+' : ''}{formatCurrency(profit)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
