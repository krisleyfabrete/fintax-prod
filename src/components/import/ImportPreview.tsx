import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, X, AlertTriangle, Sparkles, Copy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MappedTransaction } from '@/hooks/useImport';

interface Category {
  id: string;
  name: string;
  icon: string;
  type: 'income' | 'expense';
}

interface ImportPreviewProps {
  transactions: MappedTransaction[];
  categories: Category[];
  onToggle: (index: number) => void;
  onToggleAll: (selected: boolean) => void;
  onCategoryChange: (index: number, categoryId: string) => void;
  isProcessing?: boolean;
}

export function ImportPreview({
  transactions,
  categories,
  onToggle,
  onToggleAll,
  onCategoryChange,
  isProcessing = false,
}: ImportPreviewProps) {
  const selectedCount = transactions.filter(t => t.selected).length;
  const duplicateCount = transactions.filter(t => t.isDuplicate).length;
  const suggestedCount = transactions.filter(t => t.suggestedCategory).length;
  const allSelected = selectedCount === transactions.filter(t => !t.isDuplicate).length;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const totalIncome = transactions
    .filter(t => t.selected && t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.selected && t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg">
            Transações Encontradas ({transactions.length})
          </CardTitle>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-green-600">+{formatCurrency(totalIncome)}</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-red-600">-{formatCurrency(totalExpense)}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onToggleAll(!allSelected)}
              disabled={isProcessing}
            >
              {allSelected ? (
                <>
                  <X className="h-4 w-4 mr-1" />
                  Desmarcar Todos
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Selecionar Todos
                </>
              )}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="text-muted-foreground">
            {selectedCount} de {transactions.length} selecionadas
          </span>
          {duplicateCount > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Copy className="h-3 w-3" />
              {duplicateCount} duplicadas
            </Badge>
          )}
          {suggestedCount > 0 && (
            <Badge variant="outline" className="gap-1 text-primary border-primary/30">
              <Sparkles className="h-3 w-3" />
              {suggestedCount} categorizadas automaticamente
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {transactions.map((transaction, index) => (
              <TooltipProvider key={index}>
                <div
                  className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
                    transaction.isDuplicate
                      ? 'bg-yellow-500/10 border-yellow-500/30'
                      : transaction.selected 
                        ? 'bg-muted/50 border-primary/20' 
                        : 'bg-muted/20 border-transparent opacity-60'
                  }`}
                >
                  <Checkbox
                    checked={transaction.selected}
                    onCheckedChange={() => onToggle(index)}
                    disabled={isProcessing}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{transaction.description}</p>
                      {transaction.isDuplicate && (
                        <Tooltip>
                          <TooltipTrigger>
                            <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Possível transação duplicada</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {transaction.suggestedCategory && transaction.categoryId && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Categoria sugerida: {transaction.suggestedCategory}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(transaction.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>

                  <Select
                    value={transaction.categoryId || ''}
                    onValueChange={(value) => onCategoryChange(index, value)}
                    disabled={isProcessing}
                  >
                    <SelectTrigger className={`w-[180px] ${
                      transaction.suggestedCategory && transaction.categoryId 
                        ? 'border-primary/50' 
                        : ''
                    }`}>
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories
                        .filter(c => c.type === transaction.type)
                        .map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            <span className="flex items-center gap-2">
                              <span>{category.icon}</span>
                              <span>{category.name}</span>
                            </span>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>

                  <div className="text-right min-w-[100px]">
                    <p className={`font-semibold ${
                      transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </p>
                    <Badge 
                      variant={transaction.type === 'income' ? 'default' : 'destructive'} 
                      className="text-xs"
                    >
                      {transaction.type === 'income' ? 'Receita' : 'Despesa'}
                    </Badge>
                  </div>
                </div>
              </TooltipProvider>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
