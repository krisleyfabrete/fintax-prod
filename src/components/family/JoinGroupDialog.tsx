import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Users, CheckCircle, AlertCircle, Lock } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

const formSchema = z.object({
  inviteCode: z.string().min(1, 'Código é obrigatório').length(12, 'Código deve ter 12 caracteres'),
  adminPassword: z.string().min(1, 'Senha é obrigatória'),
});

type FormData = z.infer<typeof formSchema>;

interface GroupInfo {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
}

interface JoinGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: { inviteCode: string; adminPassword: string }) => void;
  isLoading?: boolean;
}

export function JoinGroupDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: JoinGroupDialogProps) {
  const [validatedGroup, setValidatedGroup] = useState<GroupInfo | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
      defaultValues: {
        inviteCode: '',
        adminPassword: '',
      },
    });

  const handleValidateCode = async () => {
    const isValid = await form.trigger('inviteCode');
    if (!isValid) return;

    const inviteCode = form.getValues('inviteCode');
    setIsValidating(true);
    setValidationError(null);

    try {
      const { data, error } = await supabase
        .rpc('get_group_by_invite_code', { code: inviteCode });

      if (error) throw error;
      
      if (!data || data.length === 0) {
        setValidationError('Código de convite inválido ou grupo não encontrado.');
        setValidatedGroup(null);
        return;
      }

      setValidatedGroup(data[0] as GroupInfo);
    } catch (error) {
      setValidationError('Erro ao validar código. Tente novamente.');
      setValidatedGroup(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleConfirmJoin = () => {
    if (!validatedGroup) return;
    const isValid = form.trigger('adminPassword');
    if (!isValid) return;
    onSubmit({
      inviteCode: form.getValues('inviteCode'),
      adminPassword: form.getValues('adminPassword'),
    });
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset();
      setValidatedGroup(null);
      setValidationError(null);
    }
    onOpenChange(isOpen);
  };

  const handleReset = () => {
    form.reset();
    setValidatedGroup(null);
    setValidationError(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Solicitar Entrada em Grupo</DialogTitle>
          <DialogDescription>
            Digite o código de convite para solicitar entrada em um grupo familiar. 
            Um administrador precisará aprovar sua solicitação.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4">
            <FormField
              control={form.control}
              name="inviteCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código de Convite</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: a1b2c3d4e5f6" 
                      {...field}
                      className="font-mono tracking-wider"
                      disabled={!!validatedGroup}
                      onChange={(e) => {
                        field.onChange(e);
                        // Reset validation when code changes
                        if (validatedGroup) {
                          setValidatedGroup(null);
                        }
                        if (validationError) {
                          setValidationError(null);
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Validation Error */}
            {validationError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Group Preview */}
            {validatedGroup && (
              <div className="p-4 rounded-lg border bg-muted/50 space-y-2">
                <div className="flex items-center gap-2 text-primary">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Grupo encontrado!</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{validatedGroup.name}</p>
                    {validatedGroup.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {validatedGroup.description}
                      </p>
                    )}
                  </div>
                </div>
               </div>
             )}

             {/* Admin Password Field (after group validation) */}
             {validatedGroup && (
               <FormField
                 control={form.control}
                 name="adminPassword"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel className="flex items-center gap-2">
                       <Lock className="h-4 w-4" />
                       Senha do Administrador
                     </FormLabel>
                     <FormControl>
                       <Input
                         type="password"
                         placeholder="Senha do administrador do grupo"
                         {...field}
                       />
                     </FormControl>
                     <p className="text-xs text-muted-foreground">
                       Digite a senha do administrador que criou este grupo para acessá-lo.
                     </p>
                     <FormMessage />
                   </FormItem>
                 )}
               />
             )}

             <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
              >
                Cancelar
              </Button>
              
              {validatedGroup ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleReset}
                  >
                    Alterar código
                  </Button>
                  <Button 
                    type="button" 
                    onClick={handleConfirmJoin}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Enviando...' : 'Enviar solicitação'}
                  </Button>
                </>
              ) : (
                <Button 
                  type="button" 
                  onClick={handleValidateCode}
                  disabled={isValidating}
                >
                  {isValidating ? 'Validando...' : 'Validar código'}
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
