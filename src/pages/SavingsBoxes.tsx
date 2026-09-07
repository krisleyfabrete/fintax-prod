import { useState } from 'react';
import { Plus, Pencil, Trash2, TrendingUp, PiggyBank } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useSavingsBoxes, SavingsBox } from '@/hooks/useSavingsBoxes';
import { useHasFamily } from '@/hooks/useFamily';
import { SavingsBoxDialog, FormData } from '@/components/savings/SavingsBoxDialog';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export default function SavingsBoxes() {
  const hasFamily = useHasFamily();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBox, setEditingBox] = useState<SavingsBox | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [addAmountId, setAddAmountId] = useState<string | null>(null);
  const [withdrawAmountId, setWithdrawAmountId] = useState<string | null>(null);
  const [amountValue, setAmountValue] = useState('');

  const {
    savingsBoxes,
    isLoading,
    createSavingsBox,
    updateSavingsBox,
    deleteSavingsBox,
    addToSavingsBox,
    withdrawFromSavingsBox,
    isCreating,
    isUpdating,
    isDeleting,
  } = useSavingsBoxes();

  const handleOpenDialog = (box?: SavingsBox) => {
    setEditingBox(box || null);
    setDialogOpen(true);
  };

  const handleSave = (data: FormData) => {
    const parseCurrency = (value: string): number => {
      if (!value) return 0;
      const numericValue = value.replace(/\./g, '').replace(',', '.');
      return parseFloat(numericValue) || 0;
    };

    const boxData = {
      name: data.name,
      description: data.description || null,
      target_amount: parseCurrency(data.target_amount),
      current_amount: data.current_amount ? parseCurrency(data.current_amount) : 0,
      color: data.color || '#3B82F6',
      icon: data.icon || '🏦',
      is_shared_with_family: data.is_shared_with_family || false,
      household_id: data.household_id || null,
    };

    if (editingBox) {
      updateSavingsBox.mutate({ id: editingBox.id, ...boxData });
    } else {
      createSavingsBox.mutate(boxData);
    }
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteSavingsBox.mutate(deleteId);
      setDeleteId(null);
    }
  };

  const handleAddAmount = () => {
    if (addAmountId && amountValue) {
      const parseCurrency = (value: string): number => {
        if (!value) return 0;
        const numericValue = value.replace(/\./g, '').replace(',', '.');
        return parseFloat(numericValue) || 0;
      };
      const amount = parseCurrency(amountValue);
      if (amount > 0) {
        addToSavingsBox.mutate({ id: addAmountId, amount });
      }
      setAddAmountId(null);
      setAmountValue('');
    }
  };

  const handleWithdrawAmount = () => {
    if (withdrawAmountId && amountValue) {
      const parseCurrency = (value: string): number => {
        if (!value) return 0;
        const numericValue = value.replace(/\./g, '').replace(',', '.');
        return parseFloat(numericValue) || 0;
      };
      const amount = parseCurrency(amountValue);
      if (amount > 0) {
        withdrawFromSavingsBox.mutate({ id: withdrawAmountId, amount });
      }
      setWithdrawAmountId(null);
      setAmountValue('');
    }
  };

  const totalTarget = savingsBoxes.reduce((sum, box) => sum + box.target_amount, 0);
  const totalCurrent = savingsBoxes.reduce((sum, box) => sum + box.current_amount, 0);
  const overallProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Caixinhas</h1>
            <p className="text-muted-foreground">Organize suas economias por objetivo</p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Caixinha
          </Button>
        </div>

        {/* Summary */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <PiggyBank className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Economizado</p>
                  <p className="text-xl font-bold">{formatCurrency(totalCurrent)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Meta Total</p>
                  <p className="text-xl font-bold">{formatCurrency(totalTarget)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <PiggyBank className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Progresso Geral</p>
                  <p className="text-xl font-bold">{overallProgress.toFixed(1)}%</p>
                </div>
              </div>
              <Progress value={overallProgress} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Savings Boxes Grid */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="h-48 animate-pulse" />
            ))}
          </div>
        ) : savingsBoxes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <PiggyBank className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">Nenhuma caixinha criada ainda</p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Criar primeira caixinha
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {savingsBoxes.map((box) => {
              const progress = box.target_amount > 0 ? (box.current_amount / box.target_amount) * 100 : 0;
              const remaining = box.target_amount - box.current_amount;
              const isCompleted = box.current_amount >= box.target_amount;

              return (
                <Card key={box.id} className="relative overflow-hidden">
                  <div
                    className="absolute top-0 left-0 w-full h-1"
                    style={{ backgroundColor: box.color || '#3B82F6' }}
                  />
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="text-3xl w-12 h-12 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${box.color || '#3B82F6'}20` }}
                        >
                          {box.icon || '🏦'}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{box.name}</CardTitle>
                          {box.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {box.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progresso</span>
                        <span className="font-medium">{progress.toFixed(1)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>

                    <div className="flex justify-between text-sm">
                      <div>
                        <p className="text-muted-foreground">Atual</p>
                        <p className="font-semibold text-lg">{formatCurrency(box.current_amount)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-muted-foreground">Meta</p>
                        <p className="font-semibold text-lg">{formatCurrency(box.target_amount)}</p>
                      </div>
                    </div>

                    {!isCompleted && (
                      <p className="text-sm text-muted-foreground">
                        Faltam {formatCurrency(remaining)}
                      </p>
                    )}

                    {isCompleted && (
                      <p className="text-sm text-green-600 font-medium">
                        🎉 Meta atingida!
                      </p>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleOpenDialog(box)}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      {!isCompleted && (
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => setAddAmountId(box.id)}
                        >
                          <TrendingUp className="h-4 w-4 mr-1" />
                          Adicionar
                        </Button>
                      )}
                      {box.current_amount > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setWithdrawAmountId(box.id)}
                        >
                          <TrendingUp className="h-4 w-4 mr-1 rotate-180" />
                          Resgatar
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteId(box.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <SavingsBoxDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          savingsBox={editingBox}
          onSave={handleSave}
          isLoading={isCreating || isUpdating}
          hasFamily={hasFamily}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir caixinha?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. A caixinha será removida permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? 'Excluindo...' : 'Excluir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Add Amount Dialog */}
        <AlertDialog open={!!addAmountId} onOpenChange={() => setAddAmountId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Adicionar valor</AlertDialogTitle>
              <AlertDialogDescription>
                Informe o valor que deseja adicionar a esta caixinha.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Input
                placeholder="R$ 0,00"
                value={amountValue}
                onChange={(e) => setAmountValue(e.target.value)}
                className="text-center text-lg"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleAddAmount}>Adicionar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Withdraw Amount Dialog */}
        <AlertDialog open={!!withdrawAmountId} onOpenChange={() => setWithdrawAmountId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Resgatar valor</AlertDialogTitle>
              <AlertDialogDescription>
                Informe o valor que deseja resgatar desta caixinha.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Input
                placeholder="R$ 0,00"
                value={amountValue}
                onChange={(e) => setAmountValue(e.target.value)}
                className="text-center text-lg"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleWithdrawAmount}>Resgatar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
