import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-react';
import { z } from 'zod';
import fintaxLogo from '@/assets/fintax-logo-principal.png';
import { getCurrentAal } from '@/lib/mfa';

const emailSchema = z.string().email('Email inválido');
const passwordSchema = z.string().min(6, 'A senha deve ter pelo menos 6 caracteres');
const nameSchema = z.string().min(2, 'O nome deve ter pelo menos 2 caracteres');

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register state
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      emailSchema.parse(loginEmail);
      passwordSchema.parse(loginPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        setIsLoading(false);
        return;
      }
    }

    const { error } = await signIn(loginEmail, loginPassword);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Email ou senha incorretos');
      } else {
        toast.error('Erro ao fazer login. Tente novamente.');
      }
    } else {
      toast.success('Login realizado com sucesso!');
      
      // Check if user is admin and redirect accordingly
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: isAdmin } = await supabase.rpc('has_role', { 
          _user_id: user.id, 
          _role: 'admin' 
        });
        
        if (isAdmin) {
          const aal = await getCurrentAal();
          if (aal === 'aal2') {
            navigate('/admin');
          } else {
            navigate('/admin/login?mfa=1');
          }
        } else {
          navigate('/dashboard');
        }
      } else {
        navigate('/dashboard');
      }
    }

    setIsLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      nameSchema.parse(registerName);
      emailSchema.parse(registerEmail);
      passwordSchema.parse(registerPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        setIsLoading(false);
        return;
      }
    }

    if (registerPassword !== registerConfirmPassword) {
      toast.error('As senhas não coincidem');
      setIsLoading(false);
      return;
    }

    const { error } = await signUp(registerEmail, registerPassword, registerName);

    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('Este email já está cadastrado');
      } else {
        toast.error('Erro ao criar conta. Tente novamente.');
      }
    } else {
      toast.success('Conta criada com sucesso!');
      navigate('/dashboard');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Solid dark green background with gradient overlay for better contrast */}
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(220,40%,7%)] via-[hsl(230,50%,10%)] to-[hsl(240,60%,12%)]" />
        
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />
        
        {/* Soft glow accents - positioned to not interfere with text */}
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-20 w-96 h-96 bg-primary/15 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12">
          {/* Logo container with subtle backdrop */}
          <div className="mb-10 p-4 rounded-2xl bg-white/5 backdrop-blur-sm">
            <img 
              src={fintaxLogo} 
              alt="Fintax Finanças" 
              className="h-20 object-contain drop-shadow-lg"
            />
          </div>
          
          <div className="max-w-md text-center">
            <h2 className="text-3xl font-bold mb-4 text-white drop-shadow-md">
              Controle suas finanças de forma simples e inteligente
            </h2>
            <p className="text-lg text-white/90 mb-8 leading-relaxed drop-shadow-sm">
              Gerencie gastos, defina metas e acompanhe seu progresso financeiro com uma interface moderna e fácil de usar.
            </p>

            <div className="grid grid-cols-2 gap-4 text-left bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-white/10">
              {[
                'Dashboard intuitivo',
                'Metas e orçamentos',
                'Relatórios detalhados',
                'Contas familiares',
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/30 flex items-center justify-center">
                    <Sparkles className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-white">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Auth forms */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 bg-background">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8">
          <img 
            src={fintaxLogo} 
            alt="Fintax Finanças" 
            className="h-16 object-contain"
          />
        </div>

        <Card className="w-full max-w-md shadow-card border-0">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-bold">Bem-vindo!</CardTitle>
            <CardDescription>
              Entre ou crie sua conta para começar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="register">Criar conta</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        className="h-12 pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 gradient-primary text-white font-semibold"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Entrando...' : 'Entrar'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-name">Nome completo</Label>
                    <Input
                      id="register-name"
                      type="text"
                      placeholder="Seu nome"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      required
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      required
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password">Senha</Label>
                    <div className="relative">
                      <Input
                        id="register-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        required
                        className="h-12 pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-confirm-password">Confirmar senha</Label>
                    <Input
                      id="register-confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={registerConfirmPassword}
                      onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                      required
                      className="h-12"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 gradient-primary text-white font-semibold"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Criando conta...' : 'Criar conta'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="mt-8 text-sm text-muted-foreground text-center">
          Ao continuar, você concorda com nossos{' '}
          <a href="#" className="text-primary hover:underline">Termos de Uso</a>
          {' '}e{' '}
          <a href="#" className="text-primary hover:underline">Política de Privacidade</a>
        </p>
      </div>
    </div>
  );
}