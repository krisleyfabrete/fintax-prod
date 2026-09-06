import { useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BudgetWithProgress } from '@/hooks/useBudgets';
import { Category } from '@/hooks/useCategories';
import { FamilySharingToggle } from '@/components/family/FamilySharingToggle';

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
  category_id: z.string().min(1, 'Selecione uma categoria'),
  amount: z.string().min(1, 'Informe o valor'),
  is_shared_with_family: z.boolean().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface BudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget?: BudgetWithProgress | null;
  categories: Category[];
  existingCategoryIds: string[];
  onSave: (data: { category_id: string; amount: number; is_shared_with_family?: boolean }) => void;
  isLoading?: boolean;
  hasFamily?: boolean;
}

export function BudgetDialog({
  open,
  onOpenChange,
  budget,
  categories,
  existingCategoryIds,
  onSave,
  isLoading,
  hasFamily = false,
}: BudgetDialogProps) {
  const isEditing = !!budget;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category_id: '',
      amount: '',
      is_shared_with_family: false,
    },
  });

  // Handler para formatação de moeda
  const handleCurrencyChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrency(e.target.value);
    form.setValue('amount', formatted);
  }, [form]);

  useEffect(() => {
    if (budget) {
      form.reset({
        category_id: budget.category_id || '',
        amount: formatCurrency(String(Math.round(budget.amount * 100))),
        is_shared_with_family: (budget as { is_shared_with_family?: boolean }).is_shared_with_family || false,
      });
    } else {
      form.reset({
        category_id: '',
        amount: '',
        is_shared_with_family: false,
      });
    }
  }, [budget, form]);

  const handleSubmit = (data: FormData) => {
    const parsedData = {
      category_id: data.category_id,
      amount: parseCurrency(data.amount),
      is_shared_with_family: data.is_shared_with_family,
    };
    onSave(parsedData);
    onOpenChange(false);
  };

  // Filter and sort categories alphabetically
  const availableCategories = categories
    .filter(
      (cat) =>
        cat.type === 'expense' &&
        (!existingCategoryIds.includes(cat.id) || budget?.category_id === cat.id)
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const hasNoCategories = availableCategories.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Orçamento' : 'Novo Orçamento'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Altere os dados do orçamento.'
              : 'Defina um limite de gastos para uma categoria.'}
          </DialogDescription>
        </DialogHeader>

        {hasNoCategories && !isEditing ? (
          <div className="py-6 text-center text-muted-foreground">
            <p>Todas as categorias de despesa já possuem orçamento definido.</p>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isEditing}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            <span className="flex items-center gap-2">
                              <span>{category.icon}</span>
                              <span>{category.name}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor do Orçamento</FormLabel>
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
                    <p className="text-xs text-muted-foreground">
                      Valor mínimo: R$ 0,01
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

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

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Salvando...' : 'Salvar'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
