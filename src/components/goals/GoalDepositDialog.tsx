import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Goal } from '@/hooks/useGoals';
import { useAccounts } from '@/hooks/useAccounts';
import { ArrowRight, Wallet, Target, Loader2 } from 'lucide-react';

// Formata valor para moeda brasileira
const formatCurrency = (value: string): string => {
  const numericValue = value.replace(/\D/g, '');
  if (!numericValue) return '';
  
  const number = parseInt(numericValue, 10) / 100;
  return number.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Converte string formatada para número
const parseCurrency = (value: string): number => {
  if (!value) return 0;
  const numericValue = value.replace(/\./g, '').replace(',', '.');
  return parseFloat(numericValue) || 0;
};

const formSchema = z.object({
  amount: z.string().min(1, 'Informe o valor'),
  account_id: z.string().min(1, 'Selecione uma conta'),
});

type FormData = z.infer<typeof formSchema>;

interface GoalDepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: Goal;
  onDeposit: (goalId: string, amount: number, accountId: string) => void;
  isLoading?: boolean;
}

export function GoalDepositDialog({
  open,
  onOpenChange,
  goal,
  onDeposit,
  isLoading,
}: GoalDepositDialogProps) {
  const { accounts } = useAccounts();
  const activeAccounts = accounts.filter(a => a.is_active);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: '',
      account_id: '',
    },
  });

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrency(e.target.value);
    form.setValue('amount', formatted);
  };

  const handleSubmit = (data: FormData) => {
    const amount = parseCurrency(data.amount);
    if (amount <= 0) return;
    
    onDeposit(goal.id, amount, data.account_id);
  };

  const selectedAccountId = form.watch('account_id');
  const selectedAccount = activeAccounts.find(a => a.id === selectedAccountId);
  const depositAmount = parseCurrency(form.watch('amount'));
  
  const remaining = goal.target_amount - goal.current_amount;
  const progressAfterDeposit = ((goal.current_amount + depositAmount) / goal.target_amount) * 100;

  const formatCurrencyDisplay = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Depositar na Meta
          </DialogTitle>
          <DialogDescription>
            Transfira um valor de uma conta para a meta "{goal.name}"
          </DialogDescription>
        </DialogHeader>

        {/* Goal Progress Card */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progresso atual:</span>
            <span className="font-medium">
              {formatCurrencyDisplay(goal.current_amount)} / {formatCurrencyDisplay(goal.target_amount)}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${Math.min((goal.current_amount / goal.target_amount) * 100, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Faltam: {formatCurrencyDisplay(remaining > 0 ? remaining : 0)}</span>
            <span>{((goal.current_amount / goal.target_amount) * 100).toFixed(1)}%</span>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Source Account */}
            <FormField
              control={form.control}
              name="account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conta de Origem</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma conta" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activeAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: account.color || '#8B5CF6' }}
                            />
                            <span>{account.name}</span>
                            <span className="text-muted-foreground text-xs">
                              ({formatCurrencyDisplay(account.balance)})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Deposit Amount */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor do Depósito</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        R$
                      </span>
                      <Input
                        value={field.value}
                        onChange={handleCurrencyChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        type="text"
                        inputMode="numeric"
                        placeholder="0,00"
                        className="pl-10"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Quick Amounts */}
            {remaining > 0 && (
              <div className="flex flex-wrap gap-2">
                {[50, 100, 200, 500].map((quickAmount) => (
                  <Button
                    key={quickAmount}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => form.setValue('amount', formatCurrency(String(quickAmount * 100)))}
                  >
                    R$ {quickAmount}
                  </Button>
                ))}
                {remaining <= 1000 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => form.setValue('amount', formatCurrency(String(Math.round(remaining * 100))))}
                    className="text-primary"
                  >
                    Completar ({formatCurrencyDisplay(remaining)})
                  </Button>
                )}
              </div>
            )}

            {/* Transfer Preview */}
            {selectedAccount && depositAmount > 0 && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-center gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedAccount.name}</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-primary" />
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    <span>{goal.name}</span>
                  </div>
                </div>
                <div className="text-center">
                  <span className="text-lg font-bold text-primary">
                    {formatCurrencyDisplay(depositAmount)}
                  </span>
                </div>
                {depositAmount > 0 && (
                  <div className="text-center text-xs text-muted-foreground">
                    Novo progresso: {Math.min(progressAfterDeposit, 100).toFixed(1)}%
                    {progressAfterDeposit >= 100 && (
                      <span className="text-green-500 ml-1">✓ Meta atingida!</span>
                    )}
                  </div>
                )}
                {selectedAccount.balance < depositAmount && (
                  <p className="text-xs text-destructive text-center">
                    Saldo insuficiente na conta selecionada
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || (selectedAccount && selectedAccount.balance < depositAmount)}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Transferindo...
                  </>
                ) : (
                  'Confirmar Depósito'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
