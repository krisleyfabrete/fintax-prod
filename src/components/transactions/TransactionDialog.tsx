import { useEffect, useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { suggestCategory, findCategoryIdByName } from '@/lib/categorySuggestion';
import { toast } from 'sonner';
import { Plus, Loader2, Upload, FileText, X, Eye } from 'lucide-react';
import { FamilySharingToggle } from '@/components/family/FamilySharingToggle';
import { useSubcategories } from '@/hooks/useSubcategories';
import { useDebts } from '@/hooks/useDebts';
import { supabase } from '@/integrations/supabase/client';
import { DatePicker } from '@/components/ui/date-picker';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Category } from '@/hooks/useCategories';
import { Account } from '@/hooks/useAccounts';
import { Transaction } from '@/hooks/useTransactions';

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
  type: z.enum(['income', 'expense']),
  amount: z.string().min(1, 'Informe o valor'),
  description: z.string().optional(),
  date: z.string().min(1, 'Informe a data'),
  category_id: z.string().optional(),
  subcategory_id: z.string().optional(),
  account_id: z.string().min(1, 'Selecione uma conta'),
  status: z.enum(['pending', 'confirmed']),
  recurrence: z.enum(['none', 'daily', 'weekly', 'monthly', 'yearly']),
  is_shared_with_family: z.boolean().optional(),
  receipt_url: z.string().optional(),
  debt_id: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction | null;
  categories: Category[];
  accounts: Account[];
  onSave: (data: FormData) => void;
  isLoading?: boolean;
  hasFamily?: boolean;
}

export function TransactionDialog({
  open,
  onOpenChange,
  transaction,
  categories,
  accounts,
  onSave,
  isLoading,
  hasFamily = false,
}: TransactionDialogProps) {
  const isEditing = !!transaction;
  const { subcategories, getSubcategoriesByCategory, createSubcategory, isCreating } = useSubcategories();
  const { debts } = useDebts();
  const [showNewSubcategory, setShowNewSubcategory] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: 'expense',
      amount: '',
      description: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      category_id: '',
      subcategory_id: '',
      account_id: '',
      status: 'confirmed',
      recurrence: 'none',
      is_shared_with_family: false,
      receipt_url: '',
      debt_id: '',
    },
  });

  const watchType = form.watch('type');
  const watchCategoryId = form.watch('category_id');
  const filteredCategories = categories.filter((c) => c.type === watchType);
  const filteredSubcategories = watchCategoryId ? getSubcategoriesByCategory(watchCategoryId) : [];

  // Handler para formatação de moeda
  const handleCurrencyChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrency(e.target.value);
    form.setValue('amount', formatted);
  }, [form]);

  useEffect(() => {
    if (transaction) {
       const receiptUrl = transaction.receipt_url || '';
       form.reset({
         type: transaction.type as 'income' | 'expense',
          amount: formatCurrency(String(Math.abs(Math.round(transaction.amount * 100)))),
         description: transaction.description || '',
         date: transaction.date,
         category_id: transaction.category_id || '',
         subcategory_id: transaction.subcategory_id || '',
         account_id: transaction.account_id,
         status: transaction.status as 'pending' | 'confirmed',
         recurrence: (transaction.recurrence as FormData['recurrence']) || 'none',
         is_shared_with_family: transaction.is_shared_with_family || false,
         receipt_url: receiptUrl,
         debt_id: transaction.debt_id || '',
       });
       setReceiptPreview(receiptUrl || null);
    } else {
      form.reset({
        type: 'expense',
        amount: '',
        description: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        category_id: '',
        subcategory_id: '',
        account_id: accounts[0]?.id || '',
        status: 'confirmed',
        recurrence: 'none',
        is_shared_with_family: false,
        receipt_url: '',
        debt_id: '',
      });
      setReceiptPreview(null);
    }
  }, [transaction, accounts, form]);

  // Reset category and subcategory when type changes
  useEffect(() => {
    if (!transaction) {
      form.setValue('category_id', '');
      form.setValue('subcategory_id', '');
    }
  }, [watchType, transaction, form]);

  // Reset subcategory when category changes
  useEffect(() => {
    if (!transaction) {
      form.setValue('subcategory_id', '');
    }
  }, [watchCategoryId, transaction, form]);

  // Auto-suggest category based on description
  const handleDescriptionBlur = useCallback(() => {
    const description = form.getValues('description');
    const type = form.getValues('type');
    const currentCategoryId = form.getValues('category_id');

    // Only suggest if no category is selected
    if (currentCategoryId || !description) return;

    const suggestion = suggestCategory(description, type);
    if (suggestion) {
      const categoryId = findCategoryIdByName(suggestion.categoryName, categories, type);
      if (categoryId) {
        form.setValue('category_id', categoryId);
        toast.info(`Categoria sugerida: ${suggestion.categoryName}`, {
          duration: 3000,
        });
      }
    }
  }, [form, categories]);

  const handleReceiptUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error('Formato não suportado. Use JPG, PNG, WebP ou PDF');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('O arquivo deve ter no máximo 5MB');
      return;
    }

    setIsUploadingReceipt(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);

      form.setValue('receipt_url', publicUrl);
      setReceiptPreview(publicUrl);
      toast.success('Comprovante enviado com sucesso!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao enviar comprovante');
    } finally {
      setIsUploadingReceipt(false);
      // Reset input
      e.target.value = '';
    }
  }, [form]);

  const handleRemoveReceipt = useCallback(async () => {
    const currentUrl = form.getValues('receipt_url');
    if (!currentUrl) return;

    try {
      // Extract file path from URL
      const urlParts = currentUrl.split('/receipts/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from('receipts').remove([filePath]);
      }

      form.setValue('receipt_url', '');
      setReceiptPreview(null);
      toast.success('Comprovante removido');
    } catch (error) {
      console.error('Remove error:', error);
      toast.error('Erro ao remover comprovante');
    }
  }, [form]);

  const handleSubmit = (data: FormData) => {
    onSave(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Transação' : 'Nova Transação'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Tipo */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Tabs value={field.value} onValueChange={field.onChange} className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="expense" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">
                          Despesa
                        </TabsTrigger>
                        <TabsTrigger value="income" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
                          Receita
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Valor */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor</FormLabel>
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

            {/* Descrição */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Descreva a transação... (ex: Uber, Mercado, Salário)"
                      rows={2}
                      onBlur={(e) => {
                        field.onBlur();
                        handleDescriptionBlur();
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Data */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Status */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="confirmed">Confirmada</SelectItem>
                        <SelectItem value="pending">Pendente</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Conta */}
              <FormField
                control={form.control}
                name="account_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conta</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Categoria */}
              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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
            </div>

            {/* Subcategoria - show if category is selected */}
            {watchCategoryId && (
              <FormField
                control={form.control}
                name="subcategory_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subcategoria</FormLabel>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Selecione uma subcategoria..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {filteredSubcategories.map((sub) => (
                              <SelectItem key={sub.id} value={sub.id}>
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: sub.color }}
                                  />
                                  {sub.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setShowNewSubcategory(!showNewSubcategory)}
                          title="Criar nova subcategoria"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {showNewSubcategory && (
                        <div className="flex gap-2">
                          <Input
                            placeholder="Nome da nova subcategoria..."
                            value={newSubcategoryName}
                            onChange={(e) => setNewSubcategoryName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (newSubcategoryName.trim() && watchCategoryId) {
                                  const selectedCategory = categories.find(c => c.id === watchCategoryId);
                                  createSubcategory({
                                    category_id: watchCategoryId,
                                    name: newSubcategoryName.trim(),
                                    color: selectedCategory?.color,
                                  }).then((newSub) => {
                                    field.onChange(newSub.id);
                                    setNewSubcategoryName('');
                                    setShowNewSubcategory(false);
                                  });
                                }
                              }
                            }}
                          />
                          <Button
                            type="button"
                            size="sm"
                            disabled={!newSubcategoryName.trim() || isCreating}
                            onClick={() => {
                              if (newSubcategoryName.trim() && watchCategoryId) {
                                const selectedCategory = categories.find(c => c.id === watchCategoryId);
                                createSubcategory({
                                  category_id: watchCategoryId,
                                  name: newSubcategoryName.trim(),
                                  color: selectedCategory?.color,
                                }).then((newSub) => {
                                  field.onChange(newSub.id);
                                  setNewSubcategoryName('');
                                  setShowNewSubcategory(false);
                                });
                              }
                            }}
                          >
                            {isCreating ? 'Criando...' : 'Criar'}
                          </Button>
                        </div>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            

            {watchCategoryId && (() => {
              const selectedCategory = categories.find(c => c.id === watchCategoryId);
              const isDebtCategory = selectedCategory?.name?.toLowerCase() === 'dívidas';
              return isDebtCategory ? (
                <FormField
                  control={form.control}
                  name="debt_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dívida vinculada</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Nenhuma" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Nenhuma</SelectItem>
                          {debts.map((debt) => (
                            <SelectItem key={debt.id} value={debt.id}>
                              {debt.name} - {debt.creditor}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null;
            })()}

            {/* Recorrência */}
            <FormField
              control={form.control}
              name="recurrence"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recorrência</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Sem recorrência</SelectItem>
                      <SelectItem value="daily">Diária</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="yearly">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Comprovante */}
            <div className="space-y-2">
              <FormLabel>Comprovante</FormLabel>
              {receiptPreview ? (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="flex-shrink-0">
                    {receiptPreview.toLowerCase().endsWith('.pdf') ? (
                      <div className="w-12 h-12 bg-red-100 rounded flex items-center justify-center">
                        <FileText className="h-6 w-6 text-red-600" />
                      </div>
                    ) : (
                      <img 
                        src={receiptPreview} 
                        alt="Comprovante" 
                        className="w-12 h-12 object-cover rounded"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">Comprovante anexado</p>
                    <p className="text-xs text-muted-foreground">
                      {receiptPreview.toLowerCase().endsWith('.pdf') ? 'PDF' : 'Imagem'}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => window.open(receiptPreview, '_blank')}
                      title="Visualizar"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={handleRemoveReceipt}
                      title="Remover"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-2 pb-3">
                    {isUploadingReceipt ? (
                      <>
                        <Loader2 className="h-6 w-6 text-muted-foreground animate-spin mb-2" />
                        <p className="text-sm text-muted-foreground">Enviando...</p>
                      </>
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Clique para enviar comprovante
                        </p>
                        <p className="text-xs text-muted-foreground">
                          JPG, PNG, WebP ou PDF (máx. 5MB)
                        </p>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleReceiptUpload}
                    disabled={isUploadingReceipt}
                  />
                </label>
              )}
            </div>

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

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
