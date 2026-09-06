import { useState, useEffect } from 'react';
import { useProfile } from '@/hooks/useProfile';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { GlowingShadow } from '@/components/ui/glowing-shadow';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, User, Loader2, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { validateCPF, validatePhone } from '@/lib/validation';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Formatação
const formatCPF = (value: string) => {
  const numbers = value.replace(/\D/g, '').slice(0, 11);
  return numbers
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

const formatPhone = (value: string) => {
  const numbers = value.replace(/\D/g, '').slice(0, 11);
  if (numbers.length <= 10) {
    return numbers
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return numbers
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
};

export function CompleteProfileModal() {
  const { user } = useAuth();
  const { profile, updateProfile, isUpdating } = useProfile();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cpfChecking, setCpfChecking] = useState(false);
  const [cpfExists, setCpfExists] = useState(false);

  // Verifica se perfil está incompleto
  useEffect(() => {
    if (profile && !dismissed) {
      const isIncomplete = !profile.full_name || !profile.cpf || !profile.phone;
      if (isIncomplete) {
        // Aguarda um pouco antes de mostrar o modal
        const timer = setTimeout(() => {
          setOpen(true);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [profile, dismissed]);

  // Preenche dados existentes
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setCpf(profile.cpf ? formatCPF(profile.cpf) : '');
      setPhone(profile.phone ? formatPhone(profile.phone) : '');
    }
  }, [profile]);

  // Verifica se CPF já existe
  const checkCpfExists = async (cpfValue: string) => {
    const cleanCpf = cpfValue.replace(/\D/g, '');
    if (cleanCpf.length !== 11 || !user?.id) return;
    
    setCpfChecking(true);
    try {
      const { data, error } = await supabase.rpc('check_cpf_exists', {
        p_cpf: cleanCpf,
        p_user_id: user.id,
      });
      
      if (error) throw error;
      setCpfExists(data);
      
      if (data) {
        setErrors(prev => ({ ...prev, cpf: 'Este CPF já está cadastrado em outra conta' }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          if (newErrors.cpf === 'Este CPF já está cadastrado em outra conta') {
            delete newErrors.cpf;
          }
          return newErrors;
        });
      }
    } catch (error) {
      console.error('Erro ao verificar CPF:', error);
    } finally {
      setCpfChecking(false);
    }
  };

  const handleCpfChange = (value: string) => {
    const formatted = formatCPF(value);
    setCpf(formatted);
    
    const cleanCpf = value.replace(/\D/g, '');
    if (cleanCpf.length === 11) {
      if (!validateCPF(cleanCpf)) {
        setErrors(prev => ({ ...prev, cpf: 'CPF inválido' }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.cpf;
          return newErrors;
        });
        checkCpfExists(cleanCpf);
      }
    }
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhone(value);
    setPhone(formatted);
    
    const cleanPhone = value.replace(/\D/g, '');
    if (cleanPhone.length >= 10) {
      if (!validatePhone(cleanPhone)) {
        setErrors(prev => ({ ...prev, phone: 'Telefone inválido' }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.phone;
          return newErrors;
        });
      }
    }
  };

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {};
    
    if (!fullName.trim() || fullName.length < 2) {
      newErrors.fullName = 'Nome deve ter pelo menos 2 caracteres';
    }
    
    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length > 0 && !validateCPF(cleanCpf)) {
      newErrors.cpf = 'CPF inválido';
    }
    
    if (cpfExists) {
      newErrors.cpf = 'Este CPF já está cadastrado em outra conta';
    }
    
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length > 0 && !validatePhone(cleanPhone)) {
      newErrors.phone = 'Telefone inválido';
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      toast.error('Por favor, corrija os erros antes de salvar');
      return;
    }
    
    updateProfile({
      full_name: fullName,
      cpf: cleanCpf || undefined,
      phone: cleanPhone || undefined,
    });
    
    setOpen(false);
    toast.success('Perfil atualizado com sucesso!');
  };

  const handleDismiss = () => {
    setDismissed(true);
    setOpen(false);
  };

  const isComplete = profile?.full_name && profile?.cpf && profile?.phone;

  if (isComplete || dismissed) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md gap-0 p-0">
        <GlowingShadow borderRadius={16} className="desktop-only-glow">
        <div className="p-6">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <User className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Complete seu cadastro</DialogTitle>
          <DialogDescription className="text-center">
            Para aproveitar todos os recursos, complete suas informações pessoais.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              O CPF é necessário para acessar planos pagos e garante apenas 1 conta por pessoa.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="modal-fullName">Nome completo *</Label>
            <Input
              id="modal-fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Seu nome completo"
              className={errors.fullName ? 'border-destructive' : ''}
            />
            {errors.fullName && (
              <p className="text-sm text-destructive">{errors.fullName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="modal-cpf">CPF</Label>
            <div className="relative">
              <Input
                id="modal-cpf"
                value={cpf}
                onChange={(e) => handleCpfChange(e.target.value)}
                placeholder="000.000.000-00"
                maxLength={14}
                className={errors.cpf ? 'border-destructive pr-10' : 'pr-10'}
              />
              {cpfChecking && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {!cpfChecking && cpf.replace(/\D/g, '').length === 11 && !errors.cpf && (
                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
              )}
            </div>
            {errors.cpf && (
              <p className="text-sm text-destructive">{errors.cpf}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="modal-phone">Telefone</Label>
            <Input
              id="modal-phone"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="(00) 00000-0000"
              maxLength={15}
              className={errors.phone ? 'border-destructive' : ''}
            />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone}</p>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={handleDismiss} className="flex-1">
            Depois
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isUpdating || cpfChecking || cpfExists}
            className="flex-1 gradient-primary text-white"
          >
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar'
            )}
          </Button>
        </div>
        </div>
        </GlowingShadow>
      </DialogContent>
    </Dialog>
  );
}
