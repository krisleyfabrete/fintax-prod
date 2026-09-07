import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PiggyBank } from 'lucide-react';
import { SavingsBox } from '@/hooks/useSavingsBoxes';
import { FamilySharingToggle } from '@/components/family/FamilySharingToggle';
import { useFamily } from '@/hooks/useFamily';
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

const formatCurrencyInput = (value: string): string => {
  const numericValue = value.replace(/\D/g, '');
  if (!numericValue) return '';
  const number = parseInt(numericValue, 10) / 100;
  return number.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const parseCurrency = (value: string): number => {
  if (!value) return 0;
  const numericValue = value.replace(/\./g, '').replace(',', '.');
  return parseFloat(numericValue) || 0;
};

const formatCurrencyDisplay = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#84CC16',
  '#10B981', '#06B6D4', '#3B82F6', '#6366F1',
  '#8B5CF6', '#EC4899', '#F43F5E', '#64748B',
];

const ICONS = [
  '🏦', '🏠', '🚗', '✈️', '💻', '📱',
  '🎓', '💍', '🏥', '🎮', '🛒', '🎁',
];

const formSchema = z.object({
  name: z.string().min(1, 'Informe o nome da caixinha'),
  description: z.string().optional(),
  target_amount: z.string().min(1, 'Informe o valor alvo'),
  current_amount: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  is_shared_with_family: z.boolean().optional(),
  household_id: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface SavingsBoxDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  savingsBox?: SavingsBox | null;
  onSave: (data: FormData) => void;
  isLoading?: boolean;
  hasFamily?: boolean;
}

export function SavingsBoxDialog({
  open,
  onOpenChange,
  savingsBox,
  onSave,
  isLoading,
  hasFamily = false,
}: SavingsBoxDialogProps) {
  const { groups } = useFamily();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      target_amount: '',
      current_amount: '',
      color: COLORS[0],
      icon: '🏦',
      is_shared_with_family: false,
      household_id: '',
    },
  });

  useEffect(() => {
    if (savingsBox) {
      form.reset({
        name: savingsBox.name,
        description: savingsBox.description || '',
        target_amount: formatCurrencyDisplay(savingsBox.target_amount),
        current_amount: formatCurrencyDisplay(savingsBox.current_amount),
        color: savingsBox.color || COLORS[0],
        icon: savingsBox.icon || '🏦',
        is_shared_with_family: savingsBox.is_shared_with_family || false,
        household_id: savingsBox.household_id || '',
      });
    } else {
      form.reset({
        name: '',
        description: '',
        target_amount: '',
        current_amount: '',
        color: COLORS[0],
        icon: '🏦',
        is_shared_with_family: false,
        household_id: '',
      });
    }
  }, [savingsBox, form]);

  const watchIsShared = form.watch('is_shared_with_family');

  const handleSubmit = (data: FormData) => {
    onSave(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{savingsBox ? 'Editar Caixinha' : 'Nova Caixinha'}</DialogTitle>
          <DialogDescription>
            {savingsBox ? 'Altere os dados da caixinha.' : 'Crie uma nova caixinha para organizar suas economias.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Viagem, Carro novo..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Descrição da caixinha..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="target_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Alvo</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="R$ 0,00" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="current_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Inicial</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="R$ 0,00" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cor</FormLabel>
                  <FormControl>
                    <div className="flex gap-2 flex-wrap">
                      {COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`w-8 h-8 rounded-full border-2 transition-all ${
                            field.value === color ? 'border-white scale-110' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => field.onChange(color)}
                        />
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ícone</FormLabel>
                  <FormControl>
                    <div className="flex gap-2 flex-wrap">
                      {ICONS.map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          className={`text-2xl p-2 rounded-lg border-2 transition-all ${
                            field.value === icon ? 'border-white bg-white/10 scale-110' : 'border-transparent'
                          }`}
                          onClick={() => field.onChange(icon)}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {hasFamily && (
              <div className="space-y-3">
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

                {watchIsShared && groups && groups.length > 0 && (
                  <FormField
                    control={form.control}
                    name="household_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Grupo familiar</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um grupo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {groups.map((group) => (
                              <SelectItem key={group.id} value={group.id}>
                                {group.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {savingsBox ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
