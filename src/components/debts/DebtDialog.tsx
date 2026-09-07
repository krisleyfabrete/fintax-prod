import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Debt, DebtPriority, DebtVisibility, DebtInterestType } from '@/hooks/useDebts';
import { Category } from '@/hooks/useCategories';
import { FamilySharingToggle } from '@/components/family/FamilySharingToggle';
import { useAccounts } from '@/hooks/useAccounts';
import { DatePicker } from '@/components/ui/date-picker';

// Formata valor para moeda brasileira (input)
const formatCurrency = (value: string): string => {
  const numericValue = value.replace(/\D/g, '');
  if (!numericValue) return '';

  const number = parseInt(numericValue, 10) / 100;
  return number.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Formata número para exibição (com R$)
const formatCurrencyDisplay = (value: number): string => {
  return value.toLocaleString('pt-BR', {
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
  name: z.string().min(1, 'Informe o nome da dívida'),
  creditor: z.string().min(1, 'Informe o credor'),
  description: z.string().optional(),
  responsible_user_id: z.string().optional(),
  visibility: z.enum(['private', 'shared', 'household']),
  category_id: z.string().optional(),
  original_amount: z.string().min(1, 'Informe o valor original'),
  lump_sum_settlement_amount: z.string().optional(),
  has_interest: z.boolean().default(false),
  interest_rate: z.coerce.number().optional(),
  interest_type: z.enum(['monthly', 'annual', 'fixed', 'unknown']).optional(),
  has_penalty: z.boolean().default(false),
  penalty_rate: z.coerce.number().optional(),
  installment_enabled: z.boolean().default(false),
  installment_count: z.coerce.number().int().optional(),
  installment_amount: z.string().optional(),
  start_date: z.string().optional(),
  due_date: z.string().min(1, 'Informe a data de vencimento'),
  allows_early_payment: z.boolean().default(false),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface DebtDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debt?: Debt | null;
  categories: Category[];
  onSubmit: (data: FormData) => void;
}

export function DebtDialog({ open, onOpenChange, debt, categories, onSubmit }: DebtDialogProps) {
  const { accounts } = useAccounts();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      creditor: '',
      description: '',
      responsible_user_id: '',
      visibility: 'private',
      category_id: '',
      original_amount: '',
      lump_sum_settlement_amount: '',
      has_interest: false,
      interest_rate: undefined,
      interest_type: undefined,
      has_penalty: false,
      penalty_rate: undefined,
      installment_enabled: false,
      installment_count: undefined,
      installment_amount: '',
      start_date: '',
      due_date: '',
      allows_early_payment: false,
      priority: 'medium',
      notes: '',
    },
  });

  useEffect(() => {
    if (debt) {
      form.reset({
        name: debt.name,
        creditor: debt.creditor,
        description: debt.description || '',
        responsible_user_id: debt.responsible_user_id || '',
        visibility: debt.visibility || 'private',
        category_id: debt.category_id || '',
        original_amount: debt.original_amount ? formatCurrencyDisplay(debt.original_amount) : '',
        lump_sum_settlement_amount: debt.lump_sum_settlement_amount ? formatCurrencyDisplay(debt.lump_sum_settlement_amount) : '',
        has_interest: debt.has_interest || false,
        interest_rate: debt.interest_rate ? Number(debt.interest_rate) : undefined,
        interest_type: debt.interest_type || undefined,
        has_penalty: debt.has_penalty || false,
        penalty_rate: debt.penalty_rate ? Number(debt.penalty_rate) : undefined,
        installment_enabled: debt.installment_enabled || false,
        installment_count: debt.installment_count || undefined,
        installment_amount: debt.installment_amount ? formatCurrencyDisplay(debt.installment_amount) : '',
        start_date: debt.start_date || '',
        due_date: debt.due_date || '',
        allows_early_payment: debt.allows_early_payment || false,
        priority: debt.priority || 'medium',
        notes: debt.notes || '',
      });
    } else {
      form.reset({
        name: '',
        creditor: '',
        description: '',
        responsible_user_id: '',
        visibility: 'private',
        category_id: '',
        original_amount: '',
        lump_sum_settlement_amount: '',
        has_interest: false,
        interest_rate: undefined,
        interest_type: undefined,
        has_penalty: false,
        penalty_rate: undefined,
        installment_enabled: false,
        installment_count: undefined,
        installment_amount: '',
        start_date: '',
        due_date: '',
        allows_early_payment: false,
        priority: 'medium',
        notes: '',
      });
    }
  }, [debt, form]);

  const watchHasInterest = form.watch('has_interest');
  const watchHasPenalty = form.watch('has_penalty');
  const watchInstallmentEnabled = form.watch('installment_enabled');
  const watchOriginalAmount = form.watch('original_amount');
  const watchLumpSum = form.watch('lump_sum_settlement_amount');

  const potentialSavings = useMemo(() => {
    const original = parseCurrency(watchOriginalAmount);
    const lumpSum = parseCurrency(watchLumpSum);
    if (original && lumpSum && lumpSum < original) {
      return original - lumpSum;
    }
    return null;
  }, [watchOriginalAmount, watchLumpSum]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{debt ? 'Editar Dívida' : 'Nova Dívida'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">Geral</TabsTrigger>
                <TabsTrigger value="conditions">Condições</TabsTrigger>
                <TabsTrigger value="organization">Organização</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da dívida</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Financiamento do carro" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="creditor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Credor</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Banco X" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoria</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma categoria" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories
                              .filter(c => c.type === 'expense')
                              .map(category => (
                                <SelectItem key={category.id} value={category.id}>
                                  {category.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Detalhes adicionais..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="original_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor original</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="R$ 0,00"
                            {...field}
                            onChange={(e) => {
                              const value = formatCurrency(e.target.value);
                              field.onChange(value);
                            }}
                            value={formatCurrency(String(field.value || 0))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lump_sum_settlement_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quitação à vista</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="R$ 0,00"
                            {...field}
                            onChange={(e) => {
                              const value = formatCurrency(e.target.value);
                              field.onChange(value);
                            }}
                            value={field.value ? formatCurrency(String(field.value)) : ''}
                          />
                        </FormControl>
                        {potentialSavings && (
                          <p className="text-xs text-green-600">
                            Economia potencial: R$ {potentialSavings.toFixed(2)}
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="conditions" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="start_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de origem</FormLabel>
                        <FormControl>
                          <DatePicker
                            value={field.value || ''}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="due_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de vencimento</FormLabel>
                        <FormControl>
                          <DatePicker
                            value={field.value || ''}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4 border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel>Possui juros?</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Marque se a dívida possui juros
                      </p>
                    </div>
                    <FormField
                      control={form.control}
                      name="has_interest"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {watchHasInterest && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="interest_rate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Taxa de juros (%)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="Ex: 2.5"
                                {...field}
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="interest_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de juros</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="monthly">Mensal</SelectItem>
                                <SelectItem value="annual">Anual</SelectItem>
                                <SelectItem value="fixed">Fixo</SelectItem>
                                <SelectItem value="unknown">Desconhecido</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-4 border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel>Possui multa?</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Marque se a dívida possui multa por atraso
                      </p>
                    </div>
                    <FormField
                      control={form.control}
                      name="has_penalty"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {watchHasPenalty && (
                    <FormField
                      control={form.control}
                      name="penalty_rate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor/taxa da multa (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Ex: 2.0"
                              {...field}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <div className="space-y-4 border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel>Permite parcelamento?</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Marque se a dívida foi parcelada
                      </p>
                    </div>
                    <FormField
                      control={form.control}
                      name="installment_enabled"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {watchInstallmentEnabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="installment_count"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantidade de parcelas</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="Ex: 10"
                                {...field}
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="installment_amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valor estimado da parcela</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="R$ 0,00"
                                {...field}
                                onChange={(e) => {
                                  const value = formatCurrency(e.target.value);
                                  field.onChange(value);
                                }}
                                value={field.value ? formatCurrency(String(field.value)) : ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between border rounded-lg p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Permite antecipação?</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Marque se é possível quitar à vista com desconto
                    </p>
                  </div>
                  <FormField
                    control={form.control}
                    name="allows_early_payment"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="organization" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="responsible_user_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Responsável</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="me">Eu</SelectItem>
                            <SelectItem value="spouse">Esposa</SelectItem>
                            <SelectItem value="household">Nossa Casa</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prioridade</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Baixa</SelectItem>
                            <SelectItem value="medium">Média</SelectItem>
                            <SelectItem value="high">Alta</SelectItem>
                            <SelectItem value="critical">Crítica</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="visibility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Visibilidade</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="private">Privada</SelectItem>
                          <SelectItem value="shared">Compartilhada</SelectItem>
                          <SelectItem value="household">Casa</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Observações adicionais..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">{debt ? 'Salvar' : 'Criar'}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
