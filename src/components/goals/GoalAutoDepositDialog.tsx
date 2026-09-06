import { useEffect } from 'react';
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
  FormDescription,
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
import { Switch } from '@/components/ui/switch';
import { Goal } from '@/hooks/useGoals';
import { useAccounts } from '@/hooks/useAccounts';
import { CalendarClock, Loader2, Wallet } from 'lucide-react';
import { useAutoDeposits, AutoDeposit } from '@/hooks/useAutoDeposits';

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
  day_of_month: z.string().min(1, 'Selecione o dia'),
  frequency: z.string().default('monthly'),
  is_active: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

interface GoalAutoDepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: Goal;
}

export function GoalAutoDepositDialog({
  open,
  onOpenChange,
  goal,
}: GoalAutoDepositDialogProps) {
  const { accounts } = useAccounts();
  const { getAutoDepositForGoal, createAutoDeposit, updateAutoDeposit, deleteAutoDeposit, isCreating, isUpdating, isDeleting } = useAutoDeposits();
  
  const activeAccounts = accounts.filter(a => a.is_active);
  const existingAutoDeposit = getAutoDepositForGoal(goal.id);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: '',
      account_id: '',
      day_of_month: '5',
      frequency: 'monthly',
      is_active: true,
    },
  });

  useEffect(() => {
    if (open && existingAutoDeposit) {
      form.reset({
        amount: formatCurrency(String(Math.round(existingAutoDeposit.amount * 100))),
        account_id: existingAutoDeposit.account_id,
        day_of_month: String(existingAutoDeposit.day_of_month),
        is_active: existingAutoDeposit.is_active,
      });
    } else if (open) {
      form.reset({
        amount: '',
        account_id: '',
        day_of_month: '5',
        frequency: 'monthly',
        is_active: true,
      });
    }
  }, [open, existingAutoDeposit, form]);

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrency(e.target.value);
    form.setValue('amount', formatted);
  };

  const handleSubmit = (data: FormData) => {
    const amount = parseCurrency(data.amount);
    if (amount <= 0) return;

    const payload = {
      goal_id: goal.id,
      account_id: data.account_id,
      amount,
      day_of_month: parseInt(data.day_of_month),
      frequency: data.frequency,
      is_active: data.is_active,
    };

    if (existingAutoDeposit) {
      updateAutoDeposit.mutate(
        { id: existingAutoDeposit.id, ...payload },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createAutoDeposit.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  };

  const handleDelete = () => {
    if (existingAutoDeposit) {
      deleteAutoDeposit.mutate(existingAutoDeposit.id, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  const formatCurrencyDisplay = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const isLoading = isCreating || isUpdating;
  const depositAmount = parseCurrency(form.watch('amount'));

  // Generate day options (1-28 to avoid month-end issues)
  const dayOptions = Array.from({ length: 28 }, (_, i) => i + 1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            Depósito Automático
          </DialogTitle>
          <DialogDescription>
            Configure depósitos mensais automáticos para a meta "{goal.name}"
          </DialogDescription>
        </DialogHeader>

        {/* Goal Info */}
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
          {depositAmount > 0 && (
            <div className="text-xs text-muted-foreground text-center pt-1">
              Com {formatCurrencyDisplay(depositAmount)}/mês, você atinge a meta em{' '}
              <span className="font-medium text-primary">
                {Math.ceil((goal.target_amount - goal.current_amount) / depositAmount)} meses
              </span>
            </div>
          )}
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
                  <FormLabel>Valor Mensal</FormLabel>
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
            <div className="flex flex-wrap gap-2">
              {[100, 200, 500, 1000].map((quickAmount) => (
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
            </div>

            {/* Day of Month */}
            <FormField
              control={form.control}
              name="day_of_month"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dia do Mês</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o dia" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {dayOptions.map((day) => (
                        <SelectItem key={day} value={String(day)}>
                          Dia {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    O depósito será feito automaticamente neste dia todo mês
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Active Toggle */}
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Ativo</FormLabel>
                    <FormDescription>
                      Ativar ou pausar os depósitos automáticos
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-between gap-3 pt-4">
              <div>
                {existingAutoDeposit && (
                  <Button 
                    type="button" 
                    variant="destructive" 
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Excluir'}
                  </Button>
                )}
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : existingAutoDeposit ? (
                    'Atualizar'
                  ) : (
                    'Configurar'
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
