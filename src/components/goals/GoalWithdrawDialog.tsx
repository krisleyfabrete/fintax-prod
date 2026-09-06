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
import { ArrowRight, Wallet, Target, Loader2, ArrowUpRight } from 'lucide-react';

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

interface GoalWithdrawDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: Goal;
  onWithdraw: (goalId: string, amount: number, accountId: string) => void;
  isLoading?: boolean;
}

export function GoalWithdrawDialog({
  open,
  onOpenChange,
  goal,
  onWithdraw,
  isLoading,
}: GoalWithdrawDialogProps) {
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
    
    onWithdraw(goal.id, amount, data.account_id);
  };

  const selectedAccountId = form.watch('account_id');
  const selectedAccount = activeAccounts.find(a => a.id === selectedAccountId);
  const withdrawAmount = parseCurrency(form.watch('amount'));
  
  const availableToWithdraw = goal.current_amount;
  const progressAfterWithdraw = ((goal.current_amount - withdrawAmount) / goal.target_amount) * 100;
  const canWithdraw = withdrawAmount > 0 && withdrawAmount <= availableToWithdraw;

  const formatCurrencyDisplay = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5 text-orange-500" />
            Sacar da Meta
          </DialogTitle>
          <DialogDescription>
            Transfira um valor da meta "{goal.name}" de volta para uma conta
          </DialogDescription>
        </DialogHeader>

        {/* Goal Balance Card */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Disponível para saque:</span>
            <span className="font-medium text-green-500">
              {formatCurrencyDisplay(availableToWithdraw)}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${Math.min((goal.current_amount / goal.target_amount) * 100, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progresso: {formatCurrencyDisplay(goal.current_amount)}</span>
            <span>Meta: {formatCurrencyDisplay(goal.target_amount)}</span>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Destination Account */}
            <FormField
              control={form.control}
              name="account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conta de Destino</FormLabel>
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

            {/* Withdraw Amount */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor do Saque</FormLabel>
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
            {availableToWithdraw > 0 && (
              <div className="flex flex-wrap gap-2">
                {[50, 100, 200, 500].filter(amt => amt <= availableToWithdraw).map((quickAmount) => (
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => form.setValue('amount', formatCurrency(String(Math.round(availableToWithdraw * 100))))}
                  className="text-orange-500"
                >
                  Sacar tudo ({formatCurrencyDisplay(availableToWithdraw)})
                </Button>
              </div>
            )}

            {/* Transfer Preview */}
            {selectedAccount && withdrawAmount > 0 && (
              <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-center gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    <span>{goal.name}</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-orange-500" />
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedAccount.name}</span>
                  </div>
                </div>
                <div className="text-center">
                  <span className="text-lg font-bold text-orange-500">
                    {formatCurrencyDisplay(withdrawAmount)}
                  </span>
                </div>
                {canWithdraw && (
                  <div className="text-center text-xs text-muted-foreground">
                    Novo progresso: {Math.max(progressAfterWithdraw, 0).toFixed(1)}%
                  </div>
                )}
                {withdrawAmount > availableToWithdraw && (
                  <p className="text-xs text-destructive text-center">
                    Valor maior que o disponível na meta
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
                disabled={isLoading || !canWithdraw}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Transferindo...
                  </>
                ) : (
                  'Confirmar Saque'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
