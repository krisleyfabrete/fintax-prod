import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useSubscription } from '@/hooks/useSubscription';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, CreditCard, Bell, Shield, Loader2, Upload, Crown, Settings2, CheckCircle2, AlertCircle, QrCode, Tag, Key } from 'lucide-react';
import { toast } from 'sonner';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { PushNotificationSettings } from '@/components/settings/PushNotificationSettings';
import { PixPaymentHistory } from '@/components/settings/PixPaymentHistory';
import { validateCPF, validatePhone } from '@/lib/validation';
import { supabase } from '@/integrations/supabase/client';
import { CategoryManager } from '@/components/settings/CategoryManager';
import { ApiKeySettings } from '@/components/settings/ApiKeySettings';
import { ChangePasswordDialog } from '@/components/settings/ChangePasswordDialog';
import { AppFooter } from '@/components/shared/AppFooter';

const formatCPF = (value: string) => {
  const numbers = value.replace(/\D/g, '').slice(0, 11);
  return numbers
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

const formatRG = (value: string) => {
  const numbers = value.replace(/\D/g, '').slice(0, 9);
  return numbers
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1})$/, '$1-$2');
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

export default function Settings() {
  const { user } = useAuth();
  const { profile, isLoading, updateProfile, isUpdating, uploadAvatar, isUploadingAvatar } = useProfile();
  const { plan, getPlanLabel, limits } = useSubscription();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const [fullName, setFullName] = useState('');
  const [currency, setCurrency] = useState('BRL');
  const [dateFormat, setDateFormat] = useState('dd/MM/yyyy');
  const [cpf, setCpf] = useState('');
  const [rg, setRg] = useState('');
  const [phone, setPhone] = useState('');
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cpfChecking, setCpfChecking] = useState(false);
  const [cpfExists, setCpfExists] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setCurrency(profile.currency || 'BRL');
      setDateFormat(profile.date_format || 'dd/MM/yyyy');
      setCpf(profile.cpf ? formatCPF(profile.cpf) : '');
      setRg(profile.rg ? formatRG(profile.rg) : '');
      setPhone(profile.phone ? formatPhone(profile.phone) : '');
    }
  }, [profile]);

  const checkCpfExists = async (cpfValue: string) => {
    const cleanCpf = cpfValue.replace(/\D/g, '');
    if (cleanCpf.length !== 11 || !user?.id) return;
    
    if (cleanCpf === profile?.cpf) {
      setCpfExists(false);
      return;
    }
    
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
        setCpfExists(false);
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.cpf;
          return newErrors;
        });
        checkCpfExists(cleanCpf);
      }
    } else if (cleanCpf.length > 0) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.cpf;
        return newErrors;
      });
      setCpfExists(false);
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
    } else if (cleanPhone.length > 0) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.phone;
        return newErrors;
      });
    }
  };

  const handleSaveProfile = () => {
    const newErrors: Record<string, string> = {};
    
    if (fullName.trim().length < 2) {
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
      currency,
      date_format: dateFormat,
      cpf: cleanCpf || undefined,
      rg: rg.replace(/\D/g, '') || undefined,
      phone: cleanPhone || undefined,
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 10MB');
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Formato não suportado. Use JPG, PNG ou WebP');
      return;
    }

    uploadAvatar(file);
  };

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">Gerencie suas preferências e dados pessoais</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 lg:w-auto lg:inline-flex">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Perfil</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              <span className="hidden sm:inline">Categorias</span>
            </TabsTrigger>
            <TabsTrigger value="api" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              <span className="hidden sm:inline">APIs</span>
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Assinatura</span>
            </TabsTrigger>
            <TabsTrigger value="pix" className="flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              <span className="hidden sm:inline">PIX</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notificações</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Segurança</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card className="shadow-card border-0">
              <CardHeader>
                <CardTitle>Foto de Perfil</CardTitle>
                <CardDescription>Atualize sua foto de perfil</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <Avatar className="h-24 w-24 border-4 border-primary/20">
                      <AvatarImage src={profile?.avatar_url || ''} />
                      <AvatarFallback className="text-2xl font-bold gradient-primary text-white">
                        {getInitials(profile?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    {isUploadingAvatar && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-full">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Formatos aceitos: JPG, PNG, WebP. Tamanho máximo: 2MB
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {isUploadingAvatar ? 'Enviando...' : 'Alterar foto'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card border-0">
              <CardHeader>
                <CardTitle>Informações Pessoais</CardTitle>
                <CardDescription>Atualize seus dados pessoais</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nome completo</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Seu nome"
                      className={errors.fullName ? 'border-destructive' : ''}
                    />
                    {errors.fullName && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.fullName}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={user?.email || ''}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <div className="relative">
                      <Input
                        id="cpf"
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
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.cpf}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rg">RG</Label>
                    <Input
                      id="rg"
                      value={rg}
                      onChange={(e) => setRg(formatRG(e.target.value))}
                      placeholder="00.000.000-0"
                      maxLength={12}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <div className="relative">
                      <Input
                        id="phone"
                        value={phone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        placeholder="(00) 00000-0000"
                        maxLength={15}
                        className={errors.phone ? 'border-destructive pr-10' : 'pr-10'}
                      />
                      {phone.replace(/\D/g, '').length >= 10 && !errors.phone && (
                        <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                      )}
                    </div>
                    {errors.phone && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.phone}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="currency">Moeda padrão</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BRL">R$ - Real Brasileiro</SelectItem>
                        <SelectItem value="USD">$ - Dólar Americano</SelectItem>
                        <SelectItem value="EUR">€ - Euro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateFormat">Formato de data</Label>
                    <Select value={dateFormat} onValueChange={setDateFormat}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dd/MM/yyyy">DD/MM/AAAA</SelectItem>
                        <SelectItem value="MM/dd/yyyy">MM/DD/AAAA</SelectItem>
                        <SelectItem value="yyyy-MM-dd">AAAA-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={handleSaveProfile} 
                    disabled={isUpdating || cpfChecking || cpfExists}
                    className="gradient-primary text-white"
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      'Salvar alterações'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories">
            <CategoryManager />
          </TabsContent>

          <TabsContent value="api">
            <ApiKeySettings />
          </TabsContent>

          <TabsContent value="subscription">
            <Card className="shadow-card border-0">
              <CardHeader>
                <CardTitle>Seu Plano</CardTitle>
                <CardDescription>Informações do plano da sua conta</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                  <div className="flex items-center gap-3">
                    {plan !== 'free' && (
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <Crown className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">Plano {getPlanLabel(plan)}</p>
                        <Badge variant={plan !== 'free' ? 'default' : 'secondary'}>
                          {getPlanLabel(plan)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {plan === 'free' && '1 conta, 50 transações/mês, relatórios básicos'}
                        {plan === 'pro' && 'Contas ilimitadas, importação, IA e lembretes'}
                        {plan === 'family' && 'Tudo do Pro + compartilhamento familiar'}
                      </p>
                    </div>
                  </div>
                </div>

                {plan === 'free' && (
                  <div className="p-4 rounded-lg border bg-muted/30">
                    <p className="text-sm font-medium mb-2">Limites do seu plano:</p>
                    <div className="grid gap-2 text-sm text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Contas</span>
                        <span>{limits.maxAccounts}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Transações/mês</span>
                        <span>{limits.maxTransactionsPerMonth}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Metas</span>
                        <span>{limits.maxGoals}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Orçamentos</span>
                        <span>{limits.maxBudgets}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-4 rounded-lg border bg-muted/30">
                  <p className="text-sm text-muted-foreground">
                    A alteração, renovação ou cancelamento do plano é gerenciada pela administração.
                    Entre em contato para qualquer ajuste na sua assinatura.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pix">
            <PixPaymentHistory />
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <PushNotificationSettings />
            <NotificationSettings />
          </TabsContent>

          <TabsContent value="security">
            <Card className="shadow-card border-0">
              <CardHeader>
                <CardTitle>Segurança</CardTitle>
                <CardDescription>Gerencie a segurança da sua conta</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                  <div>
                    <p className="font-semibold">Alterar senha</p>
                    <p className="text-sm text-muted-foreground">
                      Atualize sua senha de acesso
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => setIsChangePasswordOpen(true)}>Alterar</Button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-destructive/10">
                  <div>
                    <p className="font-semibold text-destructive">Excluir conta</p>
                    <p className="text-sm text-muted-foreground">
                      Esta ação é irreversível
                    </p>
                  </div>
                  <Button variant="destructive">Excluir</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <ChangePasswordDialog
          open={isChangePasswordOpen}
          onOpenChange={setIsChangePasswordOpen}
        />

        <AppFooter className="mt-8" />
      </div>
    </AppLayout>
  );
}
