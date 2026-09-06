import { Edit2, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BudgetWithProgress } from '@/hooks/useBudgets';
import { cn } from '@/lib/utils';

interface BudgetCardProps {
  budget: BudgetWithProgress;
  onEdit: (budget: BudgetWithProgress) => void;
  onDelete: (id: string) => void;
}

export function BudgetCard({ budget, onEdit, onDelete }: BudgetCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const statusConfig = {
    ok: {
      label: 'OK',
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      progressColor: 'bg-green-500',
    },
    warning: {
      label: 'Atenção',
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
      progressColor: 'bg-yellow-500',
    },
    exceeded: {
      label: 'Excedido',
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      progressColor: 'bg-red-500',
    },
  };

  const config = statusConfig[budget.status];
  const categoryName = budget.category?.name || 'Sem categoria';
  const categoryIcon = budget.category?.icon || '📦';
  const categoryColor = budget.category?.color || '#8B5CF6';

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
              style={{ backgroundColor: `${categoryColor}20` }}
            >
              {categoryIcon}
            </div>
            <div>
              <h3 className="font-medium text-foreground">{categoryName}</h3>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(budget.spent)} / {formatCurrency(budget.amount)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit(budget)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => onDelete(budget.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="relative">
            <Progress 
              value={budget.percentage} 
              className={cn("h-3", budget.status === 'exceeded' && "bg-red-200 dark:bg-red-900/50")}
            />
            <div 
              className={cn(
                "absolute inset-0 h-3 rounded-full transition-all",
                config.progressColor
              )}
              style={{ width: `${Math.min(budget.percentage, 100)}%` }}
            />
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className={cn("font-medium px-2 py-0.5 rounded-full", config.bgColor, config.color)}>
              {budget.percentage.toFixed(0)}% • {config.label}
            </span>
            <span className="text-muted-foreground">
              Restam {formatCurrency(budget.remaining)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
