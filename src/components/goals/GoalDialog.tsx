import { useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addMonths, addWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarCheck, Info, TrendingDown, PiggyBank, AlertCircle } from 'lucide-react';

// Formata valor para moeda brasileira
const formatCurrencyInput = (value: string): string => {
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

const formatCurrencyDisplay = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Goal } from '@/hooks/useGoals';
import { FamilySharingToggle } from '@/components/family/FamilySharingToggle';
import { useAccounts } from '@/hooks/useAccounts';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Category {
  id: string;
  name: string;
  color: string;
  type: string;
}

const formSchema = z.object({
  name: z.string().min(1, 'Informe o nome da meta'),
  goal_type: z.enum(['limit', 'target']),
  target_amount: z.string().min(1, 'Informe o valor'),
  monthly_amount: z.string().optional(),
  period_type: z.enum(['weekly', 'monthly', 'yearly']),
  category_id: z.string().optional(),
  start_date: z.string().min(1, 'Informe a data de início'),
  is_shared_with_family: z.boolean().optional(),
  auto_deposit_account_id: z.string().optional(),
  auto_deposit_day: z.number().optional(),
}).refine((data) => {
  // Monthly amount is required for savings goals (target)
  if (data.goal_type === 'target') {
    const value = data.monthly_amount?.replace(/\./g, '').replace(',', '.');
    const numericValue = parseFloat(value || '0');
    return numericValue > 0;
  }
  return true;
}, {
  message: 'Informe o valor por mês para metas de economia',
  path: ['monthly_amount'],
});

export type FormData = z.infer<typeof formSchema>;

interface GoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: Goal | null;
  categories: Category[];
  onSave: (data: FormData) => void;
  isLoading?: boolean;
  hasFamily?: boolean;
  initialGoalType?: 'limit' | 'target';
}

export function GoalDialog({
  open,
  onOpenChange,
  goal,
  categories,
  onSave,
  isLoading,
  hasFamily = false,
  initialGoalType = 'limit',
}: GoalDialogProps) {
  const isEditing = !!goal;

  const { accounts } = useAccounts();
  const activeAccounts = accounts.filter(a => a.is_active);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      goal_type: 'limit',
      target_amount: '',
      monthly_amount: '',
      period_type: 'monthly',
      category_id: 'all',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      is_shared_with_family: false,
      auto_deposit_account_id: '',
      auto_deposit_day: 5,
    },
  });

  const watchGoalType = form.watch('goal_type');
  const watchTargetAmount = form.watch('target_amount');
  const watchMonthlyAmount = form.watch('monthly_amount');
  const watchAutoDepositAccount = form.watch('auto_deposit_account_id');
  const watchStartDate = form.watch('start_date');
  const watchPeriodType = form.watch('period_type');

  // Filter categories based on goal type
  const filteredCategories = categories.filter((c) =>
    watchGoalType === 'limit' ? c.type === 'expense' : c.type === 'income'
  );

  // Calculate prediction based on amount, period type and start date
  const predictionResult = useMemo(() => {
    try {
      const targetValue = parseCurrency(watchTargetAmount || '');
      const periodValue = parseCurrency(watchMonthlyAmount || '');

      // No values entered yet - no message needed
      if (targetValue <= 0 && periodValue <= 0) {
        return { prediction: null, error: null };
      }

      // Target amount missing
      if (targetValue <= 0) {
        return { prediction: null, error: 'Informe o valor alvo para calcular a previsão' };
      }

      // Period amount missing
      if (periodValue <= 0) {
        return { prediction: null, error: 'Informe o valor por período para calcular a previsão' };
      }

      const periodsNeeded = Math.ceil(targetValue / periodValue);
      
      // Too many periods (over reasonable time)
      const maxPeriods = watchPeriodType === 'weekly' ? 5200 : 1200; // 100 years in weeks or months
      if (!isFinite(periodsNeeded) || periodsNeeded <= 0 || periodsNeeded > maxPeriods) {
        const periodLabel = watchPeriodType === 'weekly' ? 'semanal' : 'mensal';
        return { 
          prediction: null, 
          error: `O valor ${periodLabel} é muito baixo para atingir a meta em um prazo razoável. Considere aumentar o valor.` 
        };
      }
      
      // Use start date if valid, otherwise use current date
      const startDate = watchStartDate ? new Date(watchStartDate) : new Date();
      const baseDate = isNaN(startDate.getTime()) ? new Date() : startDate;
      
      // Calculate completion date based on period type
      let completionDate: Date;
      let periodLabel: string;
      let periodLabelPlural: string;
      
      if (watchPeriodType === 'weekly') {
        completionDate = addWeeks(baseDate, periodsNeeded);
        periodLabel = 'semana';
        periodLabelPlural = 'semanas';
      } else {
        completionDate = addMonths(baseDate, periodsNeeded);
        periodLabel = 'mês';
        periodLabelPlural = 'meses';
      }
      
      // Verify the date is valid before formatting
      if (isNaN(completionDate.getTime())) {
        return { prediction: null, error: 'Não foi possível calcular a previsão. Verifique os valores informados.' };
      }

      return {
        prediction: {
          periodsNeeded,
          periodLabel: periodsNeeded === 1 ? periodLabel : periodLabelPlural,
          completionDate,
          formattedDate: format(completionDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
        },
        error: null,
      };
    } catch {
      return { prediction: null, error: 'Erro ao calcular a previsão. Verifique os valores informados.' };
    }
  }, [watchTargetAmount, watchMonthlyAmount, watchStartDate, watchPeriodType]);

  const { prediction, error: predictionError } = predictionResult;

  // Handler para formatação de moeda
  const handleCurrencyChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, fieldName: 'target_amount' | 'monthly_amount') => {
    const formatted = formatCurrencyInput(e.target.value);
    form.setValue(fieldName, formatted);
  }, [form]);

  useEffect(() => {
    if (!open) return;
    
    if (goal) {
      form.reset({
        name: goal.name,
        goal_type: goal.goal_type as 'limit' | 'target',
        target_amount: formatCurrencyInput(String(Math.round(goal.target_amount * 100))),
        monthly_amount: '',
        period_type: goal.period_type as 'weekly' | 'monthly' | 'yearly',
        category_id: goal.category_id || 'all',
        start_date: goal.start_date,
        is_shared_with_family: goal.is_shared_with_family || false,
        auto_deposit_account_id: '',
        auto_deposit_day: 5,
      });
    } else {
      form.reset({
        name: '',
        goal_type: initialGoalType,
        target_amount: '',
        monthly_amount: '',
        period_type: 'monthly',
        category_id: 'all',
        start_date: format(new Date(), 'yyyy-MM-dd'),
        is_shared_with_family: false,
        auto_deposit_account_id: activeAccounts[0]?.id || '',
        auto_deposit_day: 5,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, goal, initialGoalType]);

  // Reset category when goal type changes
  useEffect(() => {
    if (!goal) {
      form.setValue('category_id', 'all');
    }
  }, [watchGoalType, goal, form]);

  const handleSubmit = (data: FormData) => {
    const submitData = {
      ...data,
      category_id: data.category_id === 'all' ? undefined : data.category_id,
    };
    onSave(submitData as FormData);
  };

  // Common fields component
  const CommonFields = () => (
    <>
      {/* Period Type and Start Date */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="period_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Período</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  {watchGoalType === 'limit' && (
                    <SelectItem value="yearly">Anual</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="start_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data de Início</FormLabel>
              <FormControl>
                <Input {...field} type="date" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Category - Only for spending limits */}
      {watchGoalType === 'limit' && (
        <FormField
          control={form.control}
          name="category_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoria (opcional)</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as categorias" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {filteredCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Family Sharing */}
      {hasFamily && (
        <FormField
          control={form.control}
          name="is_shared_with_family"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <FamilySharingToggle
                  checked={field.value || false}
                  onCheckedChange={field.onChange}
                  hasFamily={hasFamily}
                />
              </FormControl>
            </FormItem>
          )}
        />
      )}
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Meta' : 'Nova Meta'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Goal Type Tabs with Separated Forms */}
            <FormField
              control={form.control}
              name="goal_type"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Tabs value={field.value} onValueChange={field.onChange} className="w-full">
                      <TabsList className="grid w-full grid-cols-2 relative overflow-hidden h-12">
                        {/* Animated background indicator */}
                        <div 
                          className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-md transition-all duration-300 ease-out pointer-events-none ${
                            field.value === 'limit' 
                              ? 'left-1 bg-red-500' 
                              : 'left-[calc(50%+2px)] bg-green-500'
                          }`}
                        />
                        <TabsTrigger
                          type="button"
                          value="limit"
                          className="relative z-10 flex items-center gap-2 transition-all duration-300 ease-out data-[state=active]:text-white data-[state=active]:bg-transparent data-[state=inactive]:text-foreground"
                        >
                          <TrendingDown className="h-4 w-4" />
                          Limite de Gasto
                        </TabsTrigger>
                        <TabsTrigger
                          type="button"
                          value="target"
                          className="relative z-10 flex items-center gap-2 transition-all duration-300 ease-out data-[state=active]:text-white data-[state=active]:bg-transparent data-[state=inactive]:text-foreground"
                        >
                          <PiggyBank className="h-4 w-4" />
                          Meta de Economia
                        </TabsTrigger>
                      </TabsList>

                      {/* Spending Limit Form */}
                      <TabsContent value="limit" className="mt-4 space-y-4 animate-fade-in">
                        <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/5">
                          <p className="text-sm text-muted-foreground">
                            Defina um limite máximo de gastos para controlar suas despesas em uma categoria ou período específico.
                          </p>
                        </div>

                        {/* Name */}
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome do Limite</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Ex: Limite de alimentação" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Limit Amount */}
                        <FormField
                          control={form.control}
                          name="target_amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Valor Limite</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                    R$
                                  </span>
                                  <Input
                                    value={field.value}
                                    onChange={(e) => handleCurrencyChange(e, 'target_amount')}
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

                        <CommonFields />
                      </TabsContent>

                      {/* Savings Goal Form */}
                      <TabsContent value="target" className="mt-4 space-y-4 animate-fade-in">
                        <div className="p-3 rounded-lg border border-green-500/20 bg-green-500/5">
                          <p className="text-sm text-muted-foreground">
                            Defina uma meta de economia para juntar dinheiro para um objetivo específico.
                          </p>
                        </div>

                        {/* Name */}
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome da Meta</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Ex: Viagem de férias" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Target Amount */}
                        <FormField
                          control={form.control}
                          name="target_amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Valor Alvo</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                    R$
                                  </span>
                                  <Input
                                    value={field.value}
                                    onChange={(e) => handleCurrencyChange(e, 'target_amount')}
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

                        {/* Monthly Amount */}
                        <FormField
                          control={form.control}
                          name="monthly_amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Valor por {watchPeriodType === 'weekly' ? 'Semana' : 'Mês'}</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                    R$
                                  </span>
                                  <Input
                                    value={field.value}
                                    onChange={(e) => handleCurrencyChange(e, 'monthly_amount')}
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
                              <p className="text-xs text-muted-foreground">
                                Quanto você pretende guardar por {watchPeriodType === 'weekly' ? 'semana' : 'mês'} para atingir a meta
                              </p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Prediction Alert */}
                        {prediction && (
                          <Alert className="border-green-500/50 bg-green-500/10 animate-fade-in">
                            <CalendarCheck className="h-4 w-4 text-green-500" />
                            <AlertDescription className="text-sm">
                              Com {formatCurrencyDisplay(parseCurrency(watchMonthlyAmount || ''))} por {watchPeriodType === 'weekly' ? 'semana' : 'mês'}, você atingirá a meta em{' '}
                              <strong>{prediction.periodsNeeded} {prediction.periodLabel}</strong>{' '}
                              (previsão: <strong>{prediction.formattedDate}</strong>)
                            </AlertDescription>
                          </Alert>
                        )}

                        {/* Prediction Error Message */}
                        {predictionError && !prediction && (
                          <Alert className="border-amber-500/50 bg-amber-500/10 animate-fade-in">
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                            <AlertDescription className="text-sm text-amber-700 dark:text-amber-300">
                              {predictionError}
                            </AlertDescription>
                          </Alert>
                        )}

                        {/* Auto Deposit Config */}
                        {parseCurrency(watchMonthlyAmount || '') > 0 && !isEditing && (
                          <div className="space-y-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
                            <div className="flex items-center gap-2">
                              <Info className="h-4 w-4 text-primary" />
                              <span className="text-sm font-medium">Configurar depósito automático</span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <FormField
                                control={form.control}
                                name="auto_deposit_account_id"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">Conta de origem</FormLabel>
                                    <Select value={field.value} onValueChange={field.onChange}>
                                      <FormControl>
                                        <SelectTrigger className="h-9">
                                          <SelectValue placeholder="Selecione" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="none">Não configurar</SelectItem>
                                        {activeAccounts.map((account) => (
                                          <SelectItem key={account.id} value={account.id}>
                                            {account.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="auto_deposit_day"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">Dia do mês</FormLabel>
                                    <Select 
                                      value={String(field.value)} 
                                      onValueChange={(v) => field.onChange(parseInt(v))}
                                      disabled={!watchAutoDepositAccount || watchAutoDepositAccount === 'none'}
                                    >
                                      <FormControl>
                                        <SelectTrigger className="h-9">
                                          <SelectValue />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                                          <SelectItem key={day} value={String(day)}>
                                            Dia {day}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </FormItem>
                                )}
                              />
                            </div>

                            {watchAutoDepositAccount && watchAutoDepositAccount !== 'none' && (
                              <p className="text-xs text-muted-foreground">
                                O depósito de {formatCurrencyDisplay(parseCurrency(watchMonthlyAmount || ''))} será feito automaticamente todo dia {form.watch('auto_deposit_day')} de cada mês.
                              </p>
                            )}
                          </div>
                        )}

                        <CommonFields />
                      </TabsContent>
                    </Tabs>
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                className={watchGoalType === 'limit' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}
              >
                {isLoading ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
