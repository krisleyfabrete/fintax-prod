import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Building2 } from 'lucide-react';
import { Broker } from '@/hooks/useBrokers';
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

interface BrokerCardProps {
  broker: Broker;
  portfolioCount: number;
  totalValue: number;
  onEdit: () => void;
  onDelete: () => void;
}

export function BrokerCard({ broker, portfolioCount, totalValue, onEdit, onDelete }: BrokerCardProps) {
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
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: broker.color || '#8B5CF6' }}
            >
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">{broker.name}</CardTitle>
              {!broker.is_active && (
                <Badge variant="secondary" className="text-xs">Inativa</Badge>
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
                  <AlertDialogTitle>Excluir corretora?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir {broker.name}? Todas as carteiras e investimentos vinculados também serão excluídos.
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
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {portfolioCount} {portfolioCount === 1 ? 'carteira' : 'carteiras'}
          </span>
          <span className="font-medium">{formatCurrency(totalValue)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
