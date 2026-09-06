import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, Loader2, LogOut, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const COUNTDOWN_START = 5;

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_START);

  const hasRedirected = useRef(false);

  useEffect(() => {
    if (open) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswords(false);
      setError('');
      setIsSubmitting(false);
      setSuccess(false);
      setCountdown(COUNTDOWN_START);
      hasRedirected.current = false;
    }
  }, [open]);

  useEffect(() => {
    if (!success) return;

    if (countdown <= 0) {
      if (hasRedirected.current) return;
      hasRedirected.current = true;
      (async () => {
        await signOut();
        navigate('/auth');
      })();
      return;
    }

    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [success, countdown, signOut, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Preencha todos os campos.');
      return;
    }

    if (newPassword.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('A confirmação não coincide com a nova senha.');
      return;
    }

    if (newPassword === currentPassword) {
      setError('A nova senha deve ser diferente da senha atual.');
      return;
    }

    if (!user?.email) {
      setError('Não foi possível identificar o usuário. Tente novamente.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        setError('Senha atual incorreta.');
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message || 'Não foi possível alterar a senha. Tente novamente.');
        return;
      }

      onOpenChange(false);
      setSuccess(true);
    } catch {
      setError('Ocorreu um erro ao alterar a senha. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const progress = countdown / COUNTDOWN_START;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="sm:max-w-md"
          onInteractOutside={(e) => {
            if (isSubmitting) e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>Alterar senha</DialogTitle>
            <DialogDescription>
              Informe sua senha atual e a nova senha de acesso.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Senha atual</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showPasswords ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  className="h-11 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords((s) => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPasswords ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">Nova senha</Label>
              <Input
                id="new-password"
                type={showPasswords ? 'text' : 'password'}
                placeholder="Mínimo de 6 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar nova senha</Label>
              <Input
                id="confirm-password"
                type={showPasswords ? 'text' : 'password'}
                placeholder="Repita a nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className="h-11"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="gradient-primary text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Alterando...
                  </>
                ) : (
                  'Salvar senha'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {success && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
          role="alertdialog"
          aria-modal="true"
          aria-label="Senha alterada"
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-black/40 p-8 text-center backdrop-blur-2xl ring-1 ring-white/10 animate-scale-in"
            style={{
              boxShadow:
                'inset 0 1px 0 rgba(255,255,255,0.15), 0 8px 32px rgba(0,0,0,0.55)',
            }}
          >
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15 ring-1 ring-green-400/20">
              <ShieldCheck className="h-8 w-8 text-green-400" />
            </div>

            <h2 className="text-xl font-semibold">Senha alterada com sucesso</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Por segurança, você será desconectado e deverá entrar novamente com as novas credenciais.
            </p>

            <div className="relative mx-auto my-6 h-32 w-32">
              <svg className="h-32 w-32 -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke="rgba(255,255,255,0.10)"
                  strokeWidth="6"
                />
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke="hsl(237 85% 62%)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - progress)}
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold tabular-nums">{countdown}</span>
                <span className="text-xs text-muted-foreground">segundos</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <LogOut className="h-4 w-4" />
              Encerrando sessão...
            </div>
          </div>
        </div>
      )}
    </>
  );
}