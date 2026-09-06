import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Briefcase, Users } from 'lucide-react';
import { Portfolio } from '@/hooks/usePortfolios';
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

interface PortfolioCardProps {
  portfolio: Portfolio;
  investmentCount: number;
  totalValue: number;
  onEdit: () => void;
  onDelete: () => void;
}

export function PortfolioCard({ portfolio, investmentCount, totalValue, onEdit, onDelete }: PortfolioCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{portfolio.name}</CardTitle>
                {portfolio.is_shared_with_family && (
                  <Users className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              {portfolio.brokers && (
                <Badge variant="outline" className="text-xs">
                  {portfolio.brokers.name}
                </Badge>
              )}
            </div>
          </div>
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
                  <AlertDialogTitle>Excluir carteira?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir {portfolio.name}? Todos os investimentos vinculados também serão excluídos.
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
        </div>
      </CardHeader>
      <CardContent>
        {portfolio.description && (
          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
            {portfolio.description}
          </p>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {investmentCount} {investmentCount === 1 ? 'ativo' : 'ativos'}
          </span>
          <span className="font-medium">{formatCurrency(totalValue)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
