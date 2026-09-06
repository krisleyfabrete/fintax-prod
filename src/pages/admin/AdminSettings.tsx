import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AppFooter } from '@/components/shared/AppFooter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Settings,
  Bell,
  Clock,
  QrCode,
  Save,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Users,
  Wallet,
  Target,
  PiggyBank,
  DollarSign,
  Crown,
  Sparkles,
  Smartphone
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PWAInstallCard } from '@/components/pwa/PWAInstallCard';
import { DEFAULT_PLAN_PRICES_REAIS, normalizePlanPrices, pricesReaisToCents } from '@/lib/planPrices';

interface AdminSetting {
  id: string;
  key: string;
  value: Record<string, unknown>;
  description: string | null;
  updated_at: string;
  updated_by: string | null;
}

interface PlanLimits {
  transactions: number;
  accounts: number;
  budgets: number;
  goals: number;
  members?: number;
}

interface PlanPrices {
  pro_monthly: number;
  pro_yearly: number;
  family_monthly: number;
  family_yearly: number;
}

export default function AdminSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [isSaving, setIsSaving] = useState(false);

  // Local state for PIX alerts
  const [pixAlertHours, setPixAlertHours] = useState<number>(24);
  const [pixAlertCooldownHours, setPixAlertCooldownHours] = useState<number>(6);
  const [pixAlertsEnabled, setPixAlertsEnabled] = useState<boolean>(true);
  
  // Local state for plan limits
  const [freeLimits, setFreeLimits] = useState<PlanLimits>({ transactions: 50, accounts: 2, budgets: 3, goals: 2 });
  const [proLimits, setProLimits] = useState<PlanLimits>({ transactions: -1, accounts: 10, budgets: 20, goals: 10 });
  const [familyLimits, setFamilyLimits] = useState<PlanLimits>({ transactions: -1, accounts: 20, budgets: 50, goals: 20, members: 6 });
  
  // Local state for prices
  const [prices, setPrices] = useState<PlanPrices>({
    pro_monthly: DEFAULT_PLAN_PRICES_REAIS.pro_monthly,
    pro_yearly: DEFAULT_PLAN_PRICES_REAIS.pro_yearly,
    family_monthly: DEFAULT_PLAN_PRICES_REAIS.family_monthly,
    family_yearly: DEFAULT_PLAN_PRICES_REAIS.family_yearly
  });
   
  // Local state for AI prompts
  const [aiPromptClient, setAiPromptClient] = useState("");
  const [aiPromptAdmin, setAiPromptAdmin] = useState("");
  
  // Local state for AI model config
  const [aiModel, setAiModel] = useState("gemini-pro");
  const [aiFallbackModel, setAiFallbackModel] = useState("gemini-1.5-flash");
  const [aiTemperature, setAiTemperature] = useState(0.7);
  const [aiMaxTokens, setAiMaxTokens] = useState(1024);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiProvider, setAiProvider] = useState("google");
  
  // Local state for moderation
  const [moderationEnabled, setModerationEnabled] = useState(true);
  const [maxWarnings, setMaxWarnings] = useState(3);
  const [blockDuration1h, setBlockDuration1h] = useState(1);
  const [blockDuration6h, setBlockDuration6h] = useState(6);
  const [blockDuration24h, setBlockDuration24h] = useState(24);
  const [ipBlockEnabled, setIpBlockEnabled] = useState(true);
    
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch settings
  const { data: settings, isLoading, refetch } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('*')
        .order('key');

      if (error) throw error;
      
      const settingsMap = new Map((data as AdminSetting[]).map(s => [s.key, s]));
      
      // PIX settings
      const alertHours = settingsMap.get('pix_alert_hours');
      if (alertHours) {
        setPixAlertHours((alertHours.value as { hours?: number }).hours || 24);
      }
      
      const cooldownHours = settingsMap.get('pix_alert_cooldown_hours');
      if (cooldownHours) {
        setPixAlertCooldownHours((cooldownHours.value as { hours?: number }).hours || 6);
      }
      
      const alertsEnabled = settingsMap.get('pix_alerts_enabled');
      if (alertsEnabled) {
        setPixAlertsEnabled((alertsEnabled.value as { enabled?: boolean }).enabled !== false);
      }
      
      // Plan limits
      const freeLimitsData = settingsMap.get('plan_limits_free');
      if (freeLimitsData) {
        setFreeLimits(freeLimitsData.value as PlanLimits);
      }
      
      const proLimitsData = settingsMap.get('plan_limits_pro');
      if (proLimitsData) {
        setProLimits(proLimitsData.value as PlanLimits);
      }
      
      const familyLimitsData = settingsMap.get('plan_limits_family');
      if (familyLimitsData) {
        setFamilyLimits(familyLimitsData.value as PlanLimits);
      }
      
      // Prices
      const pricesData = settingsMap.get('plan_prices');
      if (pricesData) {
        setPrices(normalizePlanPrices(pricesData.value));
      }
      
      // AI Prompts
      const aiPromptClientData = settingsMap.get('ai_prompt_client');
      if (aiPromptClientData) {
        setAiPromptClient((aiPromptClientData.value as { prompt?: string })?.prompt || '');
      }
      
      const aiPromptAdminData = settingsMap.get('ai_prompt_admin');
      if (aiPromptAdminData) {
        setAiPromptAdmin((aiPromptAdminData.value as { prompt?: string })?.prompt || '');
      }
      
      // AI model config
      const aiModelData = settingsMap.get('ai_model_config');
      if (aiModelData) {
        const cfg = (aiModelData.value as { model?: string; temperature?: number; max_tokens?: number; enabled?: boolean }) || {};
        setAiModel(cfg.model || 'gemini-pro');
        setAiTemperature(typeof cfg.temperature === 'number' ? cfg.temperature : 0.7);
        setAiMaxTokens(typeof cfg.max_tokens === 'number' ? cfg.max_tokens : 1024);
        setAiEnabled(cfg.enabled !== false);
      }
      
      // Moderation config
      const moderationData = settingsMap.get('ai_moderation_config');
      if (moderationData) {
        const cfg = (moderationData.value as { enabled?: boolean; max_warnings?: number; block_duration_1h?: number; block_duration_6h?: number; block_duration_24h?: number; ip_block_enabled?: boolean }) || {};
        setModerationEnabled(cfg.enabled !== false);
        setMaxWarnings(typeof cfg.max_warnings === 'number' ? cfg.max_warnings : 3);
        setBlockDuration1h(typeof cfg.block_duration_1h === 'number' ? cfg.block_duration_1h : 1);
        setBlockDuration6h(typeof cfg.block_duration_6h === 'number' ? cfg.block_duration_6h : 6);
        setBlockDuration24h(typeof cfg.block_duration_24h === 'number' ? cfg.block_duration_24h : 24);
        setIpBlockEnabled(cfg.ip_block_enabled !== false);
      }
      
      // Sync AI config to localStorage for client/admin chat pages
      try {
        localStorage.setItem('fintax_ai_config', JSON.stringify({
          model: aiModel,
          fallbackModel: aiFallbackModel,
          temperature: aiTemperature,
          max_tokens: aiMaxTokens,
          enabled: aiEnabled,
          provider: aiProvider,
          prompt_client: aiPromptClient,
          prompt_admin: aiPromptAdmin,
          moderation: {
            enabled: moderationEnabled,
            max_warnings: maxWarnings,
            block_duration_1h: blockDuration1h,
            block_duration_6h: blockDuration6h,
            block_duration_24h: blockDuration24h,
            ip_block_enabled: ipBlockEnabled,
          }
        }));
      } catch {
        // ignore storage errors
      }
      
      setHasChanges(false);
      
      return data as AdminSetting[];
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async () => {
      const updates = [
        { key: 'pix_alert_hours', value: { hours: pixAlertHours } },
        { key: 'pix_alert_cooldown_hours', value: { hours: pixAlertCooldownHours } },
        { key: 'pix_alerts_enabled', value: { enabled: pixAlertsEnabled } },
        { key: 'plan_limits_free', value: { ...freeLimits } },
        { key: 'plan_limits_pro', value: { ...proLimits } },
        { key: 'plan_limits_family', value: { ...familyLimits } },
        { key: 'plan_prices', value: pricesReaisToCents(prices) as unknown as Json },
        { key: 'ai_prompt_client', value: { prompt: aiPromptClient } },
        { key: 'ai_prompt_admin', value: { prompt: aiPromptAdmin } },
        { key: 'ai_model_config', value: { model: aiModel, fallbackModel: aiFallbackModel, temperature: aiTemperature, max_tokens: aiMaxTokens, enabled: aiEnabled, provider: aiProvider } },
        { key: 'ai_moderation_config', value: { enabled: moderationEnabled, max_warnings: maxWarnings, block_duration_1h: blockDuration1h, block_duration_6h: blockDuration6h, block_duration_24h: blockDuration24h, ip_block_enabled: ipBlockEnabled } },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('admin_settings')
          .update({ 
            value: update.value,
            updated_at: new Date().toISOString(),
          })
          .eq('key', update.key);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: 'Configurações salvas!',
        description: 'As alterações foram aplicadas com sucesso.',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      setHasChanges(false);
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao salvar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });

  const handleSave = async () => {
    setIsSaving(true);
    await updateSettingsMutation.mutateAsync();
    setIsSaving(false);
  };

  const handleValueChange = () => {
    setHasChanges(true);
  };

  const getSettingByKey = (key: string) => {
    return settings?.find(s => s.key === key);
  };

  const formatLastUpdate = (setting: AdminSetting | undefined) => {
    if (!setting) return null;
    return format(new Date(setting.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Test the check-pending-pix function
  const testAlertMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('check-pending-pix');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Verificação executada!',
        description: data.message || `${data.pendingPayments || 0} pagamentos pendentes encontrados.`,
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro na verificação',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });

  const LimitInput = ({ 
    label, 
    value, 
    onChange, 
    icon: Icon,
    allowUnlimited = true 
  }: { 
    label: string; 
    value: number; 
    onChange: (val: number) => void;
    icon: React.ElementType;
    allowUnlimited?: boolean;
  }) => (
    <div className="flex items-center justify-between p-2 md:p-3 border rounded-lg gap-2">
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        <Icon className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground shrink-0" />
        <span className="text-xs md:text-sm truncate">{label}</span>
      </div>
      <div className="flex items-center gap-1 md:gap-2 shrink-0">
        <Input
          type="number"
          min={-1}
          value={value}
          onChange={(e) => {
            onChange(parseInt(e.target.value) || 0);
            handleValueChange();
          }}
          className="w-14 md:w-20 text-center h-8 md:h-9 text-xs md:text-sm"
        />
        {allowUnlimited && (
          <Button
            variant={value === -1 ? "default" : "outline"}
            size="sm"
            className="h-8 md:h-9 w-8 md:w-auto px-2"
            onClick={() => {
              onChange(value === -1 ? 10 : -1);
              handleValueChange();
            }}
          >
            ∞
          </Button>
        )}
      </div>
    </div>
  );

  const PriceInput = ({ 
    label, 
    value, 
    onChange,
    period
  }: { 
    label: string; 
    value: number; 
    onChange: (val: number) => void;
    period: string;
  }) => (
    <div className="flex items-center justify-between p-2 md:p-3 border rounded-lg gap-2">
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground shrink-0" />
        <div className="min-w-0">
          <span className="text-xs md:text-sm font-medium block truncate">{label}</span>
          <span className="text-xs text-muted-foreground hidden sm:block">({period})</span>
        </div>
      </div>
      <div className="flex items-center gap-1 md:gap-2 shrink-0">
        <span className="text-xs md:text-sm text-muted-foreground">R$</span>
        <Input
          type="number"
          step="0.01"
          min={0}
          value={value}
          onChange={(e) => {
            onChange(parseFloat(e.target.value) || 0);
            handleValueChange();
          }}
          className="w-16 md:w-24 text-right h-8 md:h-9 text-xs md:text-sm"
        />
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-3xl font-bold flex items-center gap-2 md:gap-3">
              <Settings className="h-5 w-5 md:h-8 md:w-8 text-primary" />
              Configurações
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">
              Gerencie as configurações do painel administrativo
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size={isMobile ? "sm" : "default"}
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isMobile ? "" : "mr-2"} ${isLoading ? 'animate-spin' : ''}`} />
              {!isMobile && "Atualizar"}
            </Button>
            <Button 
              size={isMobile ? "sm" : "default"}
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
            >
              {isSaving ? (
                <Loader2 className={`h-4 w-4 ${isMobile ? "" : "mr-2"} animate-spin`} />
              ) : (
                <Save className={`h-4 w-4 ${isMobile ? "" : "mr-2"}`} />
              )}
              {!isMobile && "Salvar Alterações"}
            </Button>
          </div>
        </div>

        {hasChanges && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center gap-2 md:gap-3">
            <AlertCircle className="h-4 w-4 md:h-5 md:w-5 text-amber-500 shrink-0" />
            <p className="text-xs md:text-sm text-amber-500">
              Você tem alterações não salvas
            </p>
          </div>
        )}

        <Tabs defaultValue="plans" className="space-y-4 md:space-y-6">
          <TabsList className="w-full grid grid-cols-4 md:grid-cols-5">
            <TabsTrigger value="plans" className="text-xs md:text-sm flex items-center gap-1 md:gap-2">
              <Crown className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Planos e </span>Limites
            </TabsTrigger>
            <TabsTrigger value="prices" className="text-xs md:text-sm flex items-center gap-1 md:gap-2">
              <CreditCard className="h-3 w-3 md:h-4 md:w-4" />
              Preços
            </TabsTrigger>
            <TabsTrigger value="pix" className="text-xs md:text-sm flex items-center gap-1 md:gap-2">
              <QrCode className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Alertas </span>PIX
            </TabsTrigger>
            <TabsTrigger value="ia" className="text-xs md:text-sm flex items-center gap-1 md:gap-2">
              <Sparkles className="h-3 w-3 md:h-4 md:w-4" />
              IA
            </TabsTrigger>
            <TabsTrigger value="app" className="text-xs md:text-sm flex items-center gap-1 md:gap-2">
              <Smartphone className="h-3 w-3 md:h-4 md:w-4" />
              App
            </TabsTrigger>
          </TabsList>

          {/* Plans and Limits Tab */}
          <TabsContent value="plans" className="space-y-4 md:space-y-6">
            {isLoading ? (
              <div className="grid gap-4 md:gap-6 md:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-72 md:h-80" />
                ))}
              </div>
            ) : (
              <div className="grid gap-4 md:gap-6 md:grid-cols-3">
                {/* Free Plan */}
                <Card>
                  <CardHeader className="p-3 md:p-6 pb-2 md:pb-4">
                    <div className="flex items-center gap-2 md:gap-3">
                      <div className="p-1.5 md:p-2 rounded-lg bg-muted">
                        <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-sm md:text-lg">Plano Gratuito</CardTitle>
                        <CardDescription className="text-xs md:text-sm">Limites básicos</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 md:p-6 pt-0 space-y-2 md:space-y-3">
                    <LimitInput
                      label="Transações"
                      value={freeLimits.transactions}
                      onChange={(val) => setFreeLimits({ ...freeLimits, transactions: val })}
                      icon={Wallet}
                      allowUnlimited={false}
                    />
                    <LimitInput
                      label="Contas"
                      value={freeLimits.accounts}
                      onChange={(val) => setFreeLimits({ ...freeLimits, accounts: val })}
                      icon={CreditCard}
                      allowUnlimited={false}
                    />
                    <LimitInput
                      label="Orçamentos"
                      value={freeLimits.budgets}
                      onChange={(val) => setFreeLimits({ ...freeLimits, budgets: val })}
                      icon={PiggyBank}
                      allowUnlimited={false}
                    />
                    <LimitInput
                      label="Metas"
                      value={freeLimits.goals}
                      onChange={(val) => setFreeLimits({ ...freeLimits, goals: val })}
                      icon={Target}
                      allowUnlimited={false}
                    />
                    {getSettingByKey('plan_limits_free') && (
                      <p className="text-xs text-muted-foreground pt-2">
                        Atualizado: {formatLastUpdate(getSettingByKey('plan_limits_free'))}
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Pro Plan */}
                <Card className="border-primary/50">
                  <CardHeader className="p-3 md:p-6 pb-2 md:pb-4">
                    <div className="flex items-center gap-2 md:gap-3">
                      <div className="p-1.5 md:p-2 rounded-lg bg-primary/10">
                        <Crown className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-sm md:text-lg">Plano Pro</CardTitle>
                        <CardDescription className="text-xs md:text-sm">Para uso individual</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 md:p-6 pt-0 space-y-2 md:space-y-3">
                    <LimitInput
                      label="Transações"
                      value={proLimits.transactions}
                      onChange={(val) => setProLimits({ ...proLimits, transactions: val })}
                      icon={Wallet}
                    />
                    <LimitInput
                      label="Contas"
                      value={proLimits.accounts}
                      onChange={(val) => setProLimits({ ...proLimits, accounts: val })}
                      icon={CreditCard}
                    />
                    <LimitInput
                      label="Orçamentos"
                      value={proLimits.budgets}
                      onChange={(val) => setProLimits({ ...proLimits, budgets: val })}
                      icon={PiggyBank}
                    />
                    <LimitInput
                      label="Metas"
                      value={proLimits.goals}
                      onChange={(val) => setProLimits({ ...proLimits, goals: val })}
                      icon={Target}
                    />
                    {getSettingByKey('plan_limits_pro') && (
                      <p className="text-xs text-muted-foreground pt-2">
                        Atualizado: {formatLastUpdate(getSettingByKey('plan_limits_pro'))}
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Family Plan */}
                <Card className="border-purple-500/50">
                  <CardHeader className="p-3 md:p-6 pb-2 md:pb-4">
                    <div className="flex items-center gap-2 md:gap-3">
                      <div className="p-1.5 md:p-2 rounded-lg bg-purple-500/10">
                        <Users className="h-4 w-4 md:h-5 md:w-5 text-purple-500" />
                      </div>
                      <div>
                        <CardTitle className="text-sm md:text-lg">Plano Família</CardTitle>
                        <CardDescription className="text-xs md:text-sm">Para grupos familiares</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 md:p-6 pt-0 space-y-2 md:space-y-3">
                    <LimitInput
                      label="Transações"
                      value={familyLimits.transactions}
                      onChange={(val) => setFamilyLimits({ ...familyLimits, transactions: val })}
                      icon={Wallet}
                    />
                    <LimitInput
                      label="Contas"
                      value={familyLimits.accounts}
                      onChange={(val) => setFamilyLimits({ ...familyLimits, accounts: val })}
                      icon={CreditCard}
                    />
                    <LimitInput
                      label="Orçamentos"
                      value={familyLimits.budgets}
                      onChange={(val) => setFamilyLimits({ ...familyLimits, budgets: val })}
                      icon={PiggyBank}
                    />
                    <LimitInput
                      label="Metas"
                      value={familyLimits.goals}
                      onChange={(val) => setFamilyLimits({ ...familyLimits, goals: val })}
                      icon={Target}
                    />
                    <LimitInput
                      label="Membros"
                      value={familyLimits.members || 6}
                      onChange={(val) => setFamilyLimits({ ...familyLimits, members: val })}
                      icon={Users}
                      allowUnlimited={false}
                    />
                    {getSettingByKey('plan_limits_family') && (
                      <p className="text-xs text-muted-foreground pt-2">
                        Atualizado: {formatLastUpdate(getSettingByKey('plan_limits_family'))}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            <Card className="bg-muted/50">
              <CardContent className="p-3 md:p-6">
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="p-1.5 md:p-2 rounded-lg bg-primary/10 shrink-0">
                    <AlertCircle className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm md:text-base font-medium">Sobre os limites</h3>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Use <strong>-1</strong> para indicar recursos ilimitados (∞). 
                      Os limites afetam a criação de novos recursos para usuários de cada plano. 
                      Alterações entram em vigor imediatamente após salvar.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Prices Tab */}
          <TabsContent value="prices" className="space-y-4 md:space-y-6">
            {isLoading ? (
              <Skeleton className="h-80" />
            ) : (
              <div className="grid gap-4 md:gap-6 md:grid-cols-2">
                {/* Pro Prices */}
                <Card className="border-primary/50">
                  <CardHeader className="p-3 md:p-6 pb-2 md:pb-4">
                    <div className="flex items-center gap-2 md:gap-3">
                      <div className="p-1.5 md:p-2 rounded-lg bg-primary/10">
                        <Crown className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-sm md:text-lg">Preços Plano Pro</CardTitle>
                        <CardDescription className="text-xs md:text-sm">Defina os valores do plano individual</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 md:p-6 pt-0 space-y-2 md:space-y-3">
                    <PriceInput
                      label="Mensal"
                      value={prices.pro_monthly}
                      onChange={(val) => setPrices({ ...prices, pro_monthly: val })}
                      period="por mês"
                    />
                    <PriceInput
                      label="Anual"
                      value={prices.pro_yearly}
                      onChange={(val) => setPrices({ ...prices, pro_yearly: val })}
                      period="por ano"
                    />
                    <div className="pt-2 md:pt-3 border-t">
                      <div className="flex justify-between text-xs md:text-sm">
                        <span className="text-muted-foreground">Economia anual:</span>
                        <span className="text-green-500 font-medium">
                          {formatCurrency((prices.pro_monthly * 12) - prices.pro_yearly)} 
                          <span className="hidden sm:inline"> ({Math.round(((prices.pro_monthly * 12 - prices.pro_yearly) / (prices.pro_monthly * 12)) * 100)}%)</span>
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Family Prices */}
                <Card className="border-purple-500/50">
                  <CardHeader className="p-3 md:p-6 pb-2 md:pb-4">
                    <div className="flex items-center gap-2 md:gap-3">
                      <div className="p-1.5 md:p-2 rounded-lg bg-purple-500/10">
                        <Users className="h-4 w-4 md:h-5 md:w-5 text-purple-500" />
                      </div>
                      <div>
                        <CardTitle className="text-sm md:text-lg">Preços Plano Família</CardTitle>
                        <CardDescription className="text-xs md:text-sm">Defina os valores do plano familiar</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 md:p-6 pt-0 space-y-2 md:space-y-3">
                    <PriceInput
                      label="Mensal"
                      value={prices.family_monthly}
                      onChange={(val) => setPrices({ ...prices, family_monthly: val })}
                      period="por mês"
                    />
                    <PriceInput
                      label="Anual"
                      value={prices.family_yearly}
                      onChange={(val) => setPrices({ ...prices, family_yearly: val })}
                      period="por ano"
                    />
                    <div className="pt-2 md:pt-3 border-t">
                      <div className="flex justify-between text-xs md:text-sm">
                        <span className="text-muted-foreground">Economia anual:</span>
                        <span className="text-green-500 font-medium">
                          {formatCurrency((prices.family_monthly * 12) - prices.family_yearly)} 
                          <span className="hidden sm:inline"> ({Math.round(((prices.family_monthly * 12 - prices.family_yearly) / (prices.family_monthly * 12)) * 100)}%)</span>
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {getSettingByKey('plan_prices') && (
              <p className="text-xs text-muted-foreground">
                Última atualização de preços: {formatLastUpdate(getSettingByKey('plan_prices'))}
              </p>
            )}

            <Card className="bg-muted/50">
              <CardContent className="p-3 md:p-6">
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="p-1.5 md:p-2 rounded-lg bg-primary/10 shrink-0">
                    <CreditCard className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm md:text-base font-medium">Sobre os preços</h3>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Os preços configurados aqui são usados para exibição na página de planos. 
                      Para atualizar os preços no Stripe, acesse o painel de produtos no Stripe diretamente.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PIX Alerts Tab */}
          <TabsContent value="pix" className="space-y-4 md:space-y-6">
            <Card>
              <CardHeader className="p-3 md:p-6 pb-2 md:pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="p-1.5 md:p-2 rounded-lg bg-primary/10 shrink-0">
                      <QrCode className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-sm md:text-base">Alertas de Pagamentos PIX</CardTitle>
                      <CardDescription className="text-xs md:text-sm hidden sm:block">
                        Configure quando os administradores devem ser notificados
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testAlertMutation.mutate()}
                    disabled={testAlertMutation.isPending}
                  >
                    {testAlertMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-1 md:mr-2 animate-spin" />
                    ) : (
                      <Bell className="h-4 w-4 mr-1 md:mr-2" />
                    )}
                    <span className="hidden sm:inline">Testar </span>Agora
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0 space-y-4 md:space-y-6">
                {isLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : (
                  <>
                    {/* Enable/Disable Alerts */}
                    <div className="flex items-center justify-between p-3 md:p-4 border rounded-lg gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Label htmlFor="pix-alerts-enabled" className="text-xs md:text-sm font-medium">
                            Alertas Ativos
                          </Label>
                          {pixAlertsEnabled ? (
                            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30 text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Ativo
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-muted text-muted-foreground text-xs">
                              Desativado
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground hidden sm:block">
                          Ativar ou desativar o envio automático de alertas
                        </p>
                      </div>
                      <Switch
                        id="pix-alerts-enabled"
                        checked={pixAlertsEnabled}
                        onCheckedChange={(checked) => {
                          setPixAlertsEnabled(checked);
                          handleValueChange();
                        }}
                      />
                    </div>

                    <Separator />

                    {/* Alert Hours Threshold */}
                    <div className="space-y-2 md:space-y-3">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                        <Label htmlFor="pix-alert-hours" className="text-xs md:text-sm font-medium">
                          Tempo para Alerta
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Tempo em horas que um pagamento pode ficar pendente antes do alerta
                      </p>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 md:gap-3">
                        <div className="flex items-center gap-2">
                          <Input
                            id="pix-alert-hours"
                            type="number"
                            min={1}
                            max={168}
                            value={pixAlertHours}
                            onChange={(e) => {
                              setPixAlertHours(parseInt(e.target.value) || 24);
                              handleValueChange();
                            }}
                            className="w-20 h-8 md:h-9 text-sm"
                            disabled={!pixAlertsEnabled}
                          />
                          <span className="text-xs md:text-sm text-muted-foreground">horas</span>
                        </div>
                        <div className="flex gap-1 md:gap-2 flex-wrap">
                          {[12, 24, 48, 72].map((hours) => (
                            <Button
                              key={hours}
                              variant={pixAlertHours === hours ? "default" : "outline"}
                              size="sm"
                              className="h-7 md:h-8 text-xs"
                              onClick={() => {
                                setPixAlertHours(hours);
                                handleValueChange();
                              }}
                              disabled={!pixAlertsEnabled}
                            >
                              {hours}h
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Cooldown Hours */}
                    <div className="space-y-2 md:space-y-3">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                        <Label htmlFor="pix-cooldown-hours" className="text-xs md:text-sm font-medium">
                          Intervalo entre Alertas
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Intervalo mínimo entre alertas para evitar notificações excessivas
                      </p>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 md:gap-3">
                        <div className="flex items-center gap-2">
                          <Input
                            id="pix-cooldown-hours"
                            type="number"
                            min={1}
                            max={48}
                            value={pixAlertCooldownHours}
                            onChange={(e) => {
                              setPixAlertCooldownHours(parseInt(e.target.value) || 6);
                              handleValueChange();
                            }}
                            className="w-20 h-8 md:h-9 text-sm"
                            disabled={!pixAlertsEnabled}
                          />
                          <span className="text-xs md:text-sm text-muted-foreground">horas</span>
                        </div>
                        <div className="flex gap-1 md:gap-2 flex-wrap">
                          {[3, 6, 12, 24].map((hours) => (
                            <Button
                              key={hours}
                              variant={pixAlertCooldownHours === hours ? "default" : "outline"}
                              size="sm"
                              className="h-7 md:h-8 text-xs"
                              onClick={() => {
                                setPixAlertCooldownHours(hours);
                                handleValueChange();
                              }}
                              disabled={!pixAlertsEnabled}
                            >
                              {hours}h
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="bg-muted/50">
              <CardContent className="p-3 md:p-6">
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="p-1.5 md:p-2 rounded-lg bg-primary/10 shrink-0">
                    <Bell className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm md:text-base font-medium">Como funcionam os alertas</h3>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      O sistema verifica automaticamente a cada hora se existem pagamentos PIX pendentes 
                      há mais tempo do que o configurado. O intervalo entre alertas evita notificações excessivas.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Prompts Tab */}
          <TabsContent value="ia" className="space-y-4 md:space-y-6">
            <Card>
              <CardHeader className="p-3 md:p-6 pb-2 md:pb-4">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="p-1.5 md:p-2 rounded-lg bg-primary/10">
                    <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-sm md:text-base">Prompts de Inteligência Artificial</CardTitle>
                    <CardDescription className="text-xs md:text-sm">
                      Configure os prompts usados nas conversas de IA do cliente e do painel admin.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0 space-y-4 md:space-y-6">
                {isLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-40 w-full" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="ai-prompt-client" className="text-xs md:text-sm font-medium">
                        Prompt do Assistente do Cliente
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Usado na página de IA acessível pelo FAB central e menu do cliente.
                      </p>
                      <textarea
                        id="ai-prompt-client"
                        value={aiPromptClient}
                        onChange={(e) => {
                          setAiPromptClient(e.target.value);
                          handleValueChange();
                        }}
                        className="w-full h-40 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        placeholder="Defina o comportamento do assistente do cliente..."
                      />
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label htmlFor="ai-prompt-admin" className="text-xs md:text-sm font-medium">
                        Prompt do Assistente do Admin
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Usado na página de IA do painel administrativo.
                      </p>
                      <textarea
                        id="ai-prompt-admin"
                        value={aiPromptAdmin}
                        onChange={(e) => {
                          setAiPromptAdmin(e.target.value);
                          handleValueChange();
                        }}
                        className="w-full h-40 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        placeholder="Defina o comportamento do assistente do admin..."
                      />
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label className="text-xs md:text-sm font-medium">Modelo de IA</Label>
                          <p className="text-xs text-muted-foreground">
                            Modelo usado pelas páginas de IA do cliente e do admin.
                          </p>
                        </div>
                        <Switch
                          checked={aiEnabled}
                          onCheckedChange={(checked) => {
                            setAiEnabled(checked);
                            handleValueChange();
                          }}
                        />
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label htmlFor="ai-model" className="text-xs md:text-sm font-medium">Modelo</Label>
                          <Input
                            id="ai-model"
                            value={aiModel}
                            onChange={(e) => {
                              setAiModel(e.target.value);
                              handleValueChange();
                            }}
                            disabled={!aiEnabled}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="ai-fallback-model" className="text-xs md:text-sm font-medium">Fallback</Label>
                          <Input
                            id="ai-fallback-model"
                            value={aiFallbackModel}
                            onChange={(e) => {
                              setAiFallbackModel(e.target.value);
                              handleValueChange();
                            }}
                            disabled={!aiEnabled}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="ai-provider" className="text-xs md:text-sm font-medium">Provedor</Label>
                          <select
                            id="ai-provider"
                            value={aiProvider}
                            onChange={(e) => {
                              setAiProvider(e.target.value);
                              handleValueChange();
                            }}
                            disabled={!aiEnabled}
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="google">Google Gemini</option>
                            <option value="openai">OpenAI</option>
                            <option value="anthropic">Anthropic Claude</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="ai-temperature" className="text-xs md:text-sm font-medium">Temperatura</Label>
                          <span className="text-xs text-muted-foreground">{aiTemperature.toFixed(1)}</span>
                        </div>
                        <Input
                          id="ai-temperature"
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={aiTemperature}
                          onChange={(e) => {
                            setAiTemperature(parseFloat(e.target.value));
                            handleValueChange();
                          }}
                          disabled={!aiEnabled}
                        />
                         <p className="text-xs text-muted-foreground">
                           0 = mais determinístico, 1 = mais criativo.
                         </p>
                       </div>
                     </div>

                     <Separator />

                     <div className="space-y-3">
                       <div className="flex items-center justify-between">
                         <div className="space-y-1">
                           <Label className="text-xs md:text-sm font-medium">Moderação de Conteúdo</Label>
                           <p className="text-xs text-muted-foreground">
                             Ativa detecção de conteúdo ofensivo e malicioso.
                           </p>
                         </div>
                         <Switch
                           checked={moderationEnabled}
                           onCheckedChange={(checked) => {
                             setModerationEnabled(checked);
                             handleValueChange();
                           }}
                         />
                       </div>

                       <div className="grid gap-3 sm:grid-cols-2">
                         <div className="space-y-1">
                           <Label htmlFor="ai-max-warnings" className="text-xs md:text-sm font-medium">Max Advertências</Label>
                           <Input
                             id="ai-max-warnings"
                             type="number"
                             min="1"
                             max="10"
                             value={maxWarnings}
                             onChange={(e) => {
                               setMaxWarnings(parseInt(e.target.value || '3') || 3);
                               handleValueChange();
                             }}
                             disabled={!moderationEnabled}
                           />
                         </div>
                         <div className="space-y-1">
                           <Label htmlFor="ai-ip-block" className="text-xs md:text-sm font-medium">Bloqueio por IP</Label>
                           <div className="flex items-center gap-2">
                             <Switch
                               checked={ipBlockEnabled}
                               onCheckedChange={(checked) => {
                                 setIpBlockEnabled(checked);
                                 handleValueChange();
                               }}
                               disabled={!moderationEnabled}
                             />
                             <span className="text-xs text-muted-foreground">
                               {ipBlockEnabled ? 'Ativo' : 'Inativo'}
                             </span>
                           </div>
                         </div>
                       </div>

                       <div className="space-y-1">
                         <Label className="text-xs md:text-sm font-medium">Duração de Bloqueio</Label>
                         <p className="text-xs text-muted-foreground">
                           Tempo de bloqueio por reincidência (1ª, 2ª, 3ª+ ocorrências).
                         </p>
                         <div className="grid gap-2 sm:grid-cols-3">
                           <div className="flex items-center gap-2">
                             <Input
                               id="ai-block-1h"
                               type="number"
                               min="1"
                               value={blockDuration1h}
                               onChange={(e) => {
                                 setBlockDuration1h(parseInt(e.target.value || '1') || 1);
                                 handleValueChange();
                               }}
                               disabled={!moderationEnabled || !ipBlockEnabled}
                               className="w-16"
                             />
                             <span className="text-xs text-muted-foreground">h (1ª)</span>
                           </div>
                           <div className="flex items-center gap-2">
                             <Input
                               id="ai-block-6h"
                               type="number"
                               min="1"
                               value={blockDuration6h}
                               onChange={(e) => {
                                 setBlockDuration6h(parseInt(e.target.value || '6') || 6);
                                 handleValueChange();
                               }}
                               disabled={!moderationEnabled || !ipBlockEnabled}
                               className="w-16"
                             />
                             <span className="text-xs text-muted-foreground">h (2ª)</span>
                           </div>
                           <div className="flex items-center gap-2">
                             <Input
                               id="ai-block-24h"
                               type="number"
                               min="1"
                               value={blockDuration24h}
                               onChange={(e) => {
                                 setBlockDuration24h(parseInt(e.target.value || '24') || 24);
                                 handleValueChange();
                               }}
                               disabled={!moderationEnabled || !ipBlockEnabled}
                               className="w-16"
                             />
                             <span className="text-xs text-muted-foreground">h (3ª+)</span>
                           </div>
                         </div>
                       </div>
                     </div>
                   </>
                )}
              </CardContent>
            </Card>

            <Card className="bg-muted/50">
              <CardContent className="p-3 md:p-6">
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="p-1.5 md:p-2 rounded-lg bg-primary/10 shrink-0">
                    <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm md:text-base font-medium">Sobre os prompts</h3>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      Os prompts definem o comportamento das IAs. Eles devem ser claros, objetivos e alinhados
                      com as políticas do produto. Alterações entram em vigor imediatamente após salvar.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="app" className="space-y-4 md:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Aplicativo</CardTitle>
                <CardDescription>Instale o app e gerencie preferências do cliente</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <PWAInstallCard />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <AppFooter className="mt-8" />
      </div>
    </AdminLayout>
  );
}
