import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, ShieldCheck, Eye, EyeOff, Loader2, AlertCircle, Smartphone, KeyRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  getCurrentAal,
  getVerifiedTotpFactorId,
  challengeAndVerifyTotp,
  startTotpEnrollment,
  TotpEnrollment,
} from '@/lib/mfa';
import { useAuth } from '@/contexts/AuthContext';

type Phase = 'credentials' | 'challenge' | 'enroll';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signOut } = useAuth();

  const [phase, setPhase] = useState<Phase>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [factorId, setFactorId] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);

  const isMfaRequested = searchParams.get('mfa') === '1';

  useEffect(() => {
    if (!isMfaRequested) return;

    let cancelled = false;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;

      const { data: isAdmin } = await supabase.rpc('has_role', {
        _user_id: sessionData.session.user.id,
        _role: 'admin',
      });
      if (cancelled || !isAdmin) return;

      const aal = await getCurrentAal();
      if (cancelled) return;
      if (aal === 'aal2') {
        navigate('/admin', { replace: true });
        return;
      }

      const verifiedId = await getVerifiedTotpFactorId();
      if (cancelled) return;
      if (verifiedId) {
        setFactorId(verifiedId);
        setPhase('challenge');
      } else {
        const { data, error } = await startTotpEnrollment();
        if (cancelled) return;
        if (error) {
          setError(error);
          return;
        }
        if (data) {
          setEnrollment(data);
          setFactorId(data.factorId);
          setPhase('enroll');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMfaRequested]);

  const enterMfa = async (userId: string) => {
    setIsLoading(true);
    try {
      const aal = await getCurrentAal();
      if (aal === 'aal2') {
        navigate('/admin', { replace: true });
        return;
      }
      const verifiedId = await getVerifiedTotpFactorId();
      if (verifiedId) {
        setFactorId(verifiedId);
        setPhase('challenge');
      } else {
        const { data, error } = await startTotpEnrollment();
        if (error) {
          setError(error);
          toast.error(error);
          return;
        }
        if (data) {
          setEnrollment(data);
          setFactorId(data.factorId);
          setPhase('enroll');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError('Credenciais inválidas');
        setIsLoading(false);
        return;
      }

      if (!authData.user) {
        setError('Erro ao autenticar');
        setIsLoading(false);
        return;
      }

      const { data: isAdmin } = await supabase.rpc('has_role', {
        _user_id: authData.user.id,
        _role: 'admin',
      });

      if (!isAdmin) {
        await supabase.auth.signOut();
        setError('Acesso restrito a administradores');
        setIsLoading(false);
        return;
      }

      await enterMfa(authData.user.id);
    } catch (err) {
      console.error('Admin login error:', err);
      setError('Erro interno ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId) return;
    setIsLoading(true);
    setError('');

    const { error: verifyError } = await challengeAndVerifyTotp(factorId, totpCode);
    if (verifyError) {
      setError(verifyError);
      setIsLoading(false);
      return;
    }

    toast.success('Bem-vindo, Administrador!');
    navigate('/admin');
  };

  const handleEnrollVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId) return;
    setIsLoading(true);
    setError('');

    const { error: verifyError } = await challengeAndVerifyTotp(factorId, totpCode);
    if (verifyError) {
      setError(verifyError);
      setIsLoading(false);
      return;
    }

    toast.success('2FA ativado! Bem-vindo, Administrador.');
    navigate('/admin');
  };

  const handleSwitchAccount = async () => {
    setPhase('credentials');
    setError('');
    setTotpCode('');
    setFactorId(null);
    setEnrollment(null);
    await signOut();
  };

  const renderCredentials = () => (
    <form onSubmit={handleLogin} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email" className="text-slate-300">
          Email do Administrador
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="admin@empresa.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-red-500 focus:ring-red-500/20"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-slate-300">
          Senha
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-red-500 focus:ring-red-500/20 pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:text-white hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-semibold py-5"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Verificando...
          </>
        ) : (
          <>
            <Shield className="w-4 h-4 mr-2" />
            Acessar Painel Admin
          </>
        )}
      </Button>
    </form>
  );

  const renderChallenge = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 bg-slate-700/30 border border-slate-600 rounded-lg">
        <Smartphone className="w-6 h-6 text-red-400 flex-shrink-0" />
        <div>
          <p className="text-white text-sm font-medium">Verificação em duas etapas</p>
          <p className="text-slate-400 text-xs mt-0.5">
            Digite o código de 6 dígitos do seu aplicativo autenticador.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleChallenge} className="space-y-4 mt-2">
        <div className="space-y-2">
          <Label htmlFor="totp" className="text-slate-300">
            Código do autenticador
          </Label>
          <Input
            id="totp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            maxLength={6}
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
            required
            className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-red-500 focus:ring-red-500/20 text-center text-xl tracking-[0.5em] font-mono"
          />
        </div>

        <Button
          type="submit"
          className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-semibold py-5"
          disabled={isLoading || totpCode.length !== 6}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verificando...
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4 mr-2" />
              Confirmar e acessar
            </>
          )}
        </Button>
      </form>

      <button
        type="button"
        onClick={handleSwitchAccount}
        className="w-full text-center text-sm text-slate-400 hover:text-white transition-colors"
      >
        Usar outra conta
      </button>
    </div>
  );

  const renderEnroll = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 bg-slate-700/30 border border-slate-600 rounded-lg">
        <KeyRound className="w-6 h-6 text-red-400 flex-shrink-0" />
        <div>
          <p className="text-white text-sm font-medium">Ative a verificação em duas etapas</p>
          <p className="text-slate-400 text-xs mt-0.5">
            Administradores devem ter 2FA. Escaneie o QR Code com seu aplicativo autenticador
            (Google Authenticator, Authy, 1Password).
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {enrollment && (
        <div className="space-y-4">
          <div className="flex items-center justify-center p-4 bg-white rounded-xl">
            <img
              src={enrollment.qrCode}
              alt="QR Code para configuração do autenticador"
              className="w-48 h-48"
            />
          </div>

          <div className="text-center">
            <p className="text-xs text-slate-500 mb-1">
              Ou digite a chave manualmente no aplicativo:
            </p>
            <code className="text-sm text-white bg-slate-900 px-3 py-1.5 rounded-lg tracking-wider">
              {enrollment.secret}
            </code>
          </div>

          <form onSubmit={handleEnrollVerify} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="enroll-totp" className="text-slate-300">
                Código do autenticador
              </Label>
              <Input
                id="enroll-totp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                required
                className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-red-500 focus:ring-red-500/20 text-center text-xl tracking-[0.5em] font-mono"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-semibold py-5"
              disabled={isLoading || totpCode.length !== 6}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Ativando...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Ativar 2FA e acessar
                </>
              )}
            </Button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={handleSwitchAccount}
        className="w-full text-center text-sm text-slate-400 hover:text-white transition-colors"
      >
        Usar outra conta
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <Card className="w-full max-w-md relative z-10 bg-slate-800/90 border-slate-700 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-white">
              {phase === 'challenge' ? 'Verificação em duas etapas' : phase === 'enroll' ? 'Configure a segurança' : 'Painel Administrativo'}
            </CardTitle>
            <CardDescription className="text-slate-400">
              {phase === 'challenge'
                ? 'Confirme sua identidade com o código do seu aplicativo'
                : phase === 'enroll'
                ? 'Ative a autenticação de dois fatores para continuar'
                : 'Acesso restrito a super administradores'}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {phase === 'credentials' && renderCredentials()}
          {phase === 'challenge' && renderChallenge()}
          {phase === 'enroll' && renderEnroll()}
        </CardContent>

        {phase === 'credentials' && (
          <div className="px-6 pb-6">
            <div className="pt-4 border-t border-slate-700">
              <p className="text-xs text-slate-500 text-center">
                Acesso protegido por verificação em duas etapas (2FA). Todas as ações são registradas para fins de auditoria.
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}