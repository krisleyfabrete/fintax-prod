import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Loader2, UserCog, Shield } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

const editUserSchema = z.object({
  full_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100, 'Nome muito longo'),
  phone: z.string().max(20, 'Telefone muito longo').optional().or(z.literal('')),
  cpf: z.string().max(14, 'CPF inválido').optional().or(z.literal('')),
  plan: z.enum(['free', 'pro', 'family']),
  isAdmin: z.boolean(),
});

type EditUserForm = z.infer<typeof editUserSchema>;

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    full_name: string | null;
    phone: string | null;
    cpf: string | null;
    plan?: string;
    isAdmin?: boolean;
  } | null;
  onSuccess: () => void;
}

export function EditUserDialog({ open, onOpenChange, user, onSuccess }: EditUserDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<EditUserForm>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      full_name: '',
      phone: '',
      cpf: '',
      plan: 'free',
      isAdmin: false,
    },
  });

  useEffect(() => {
    if (user && open) {
      form.reset({
        full_name: user.full_name || '',
        phone: user.phone || '',
        cpf: user.cpf || '',
        plan: (user.plan as 'free' | 'pro' | 'family') || 'free',
        isAdmin: user.isAdmin || false,
      });
    }
  }, [user, open, form]);

  const onSubmit = async (data: EditUserForm) => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('update-user', {
        body: {
          userId: user.id,
          full_name: data.full_name,
          phone: data.phone || null,
          cpf: data.cpf || null,
          plan: data.plan,
          isAdmin: data.isAdmin,
        },
      });

      if (error) throw error;
      if (result?.error) throw new Error(result.error);

      toast.success('Usuário atualizado com sucesso!');
      onOpenChange(false);
      onSuccess();
    } catch (error: unknown) {
      console.error('Erro ao atualizar usuário:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar usuário');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Editar Usuário
          </DialogTitle>
          <DialogDescription>
            Altere os dados do usuário conforme necessário.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl>
                    <Input placeholder="João Silva" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input placeholder="(11) 99999-9999" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cpf"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CPF</FormLabel>
                  <FormControl>
                    <Input placeholder="000.000.000-00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="plan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plano</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o plano" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="family">Family</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isAdmin"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="flex items-center gap-2 text-sm font-medium">
                      <Shield className="h-4 w-4 text-yellow-600" />
                      Administrador (ROOT)
                    </FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Concede acesso total ao painel administrativo
                    </p>
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

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
