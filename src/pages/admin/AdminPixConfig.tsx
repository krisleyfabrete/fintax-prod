import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  QrCode,
  Save,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  User,
  MapPin,
  Key,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';
import { QRCodeSVG } from 'qrcode.react';
import { generatePixCode } from '@/lib/pixGenerator';

interface PixSettings {
  pixKey: string;
  pixName: string;
  pixCity: string;
}

export default function AdminPixConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [isSaving, setIsSaving] = useState(false);
  
  const [pixSettings, setPixSettings] = useState<PixSettings>({
    pixKey: '',
    pixName: '',
    pixCity: ''
  });
  
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch current PIX settings
  const { data: settings, isLoading, refetch } = useQuery({
    queryKey: ['admin-pix-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('*')
        .in('key', ['pix_key', 'pix_name', 'pix_city']);

      if (error) throw error;
      
      const settingsMap = new Map(data?.map(s => [s.key, s]));
      
      const pixKey = settingsMap.get('pix_key');
      const pixName = settingsMap.get('pix_name');
      const pixCity = settingsMap.get('pix_city');
      
      const newSettings = {
        pixKey: pixKey?.value ? String(pixKey.value).replace(/^"|"$/g, '') : '',
        pixName: pixName?.value ? String(pixName.value).replace(/^"|"$/g, '') : '',
        pixCity: pixCity?.value ? String(pixCity.value).replace(/^"|"$/g, '') : '',
      };
      
      setPixSettings(newSettings);
      setHasChanges(false);
      
      return {
        settings: newSettings,
        lastUpdated: pixKey?.updated_at || pixName?.updated_at || pixCity?.updated_at,
      };
    },
  });

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates = [
        { key: 'pix_key', value: pixSettings.pixKey },
        { key: 'pix_name', value: pixSettings.pixName },
        { key: 'pix_city', value: pixSettings.pixCity },
      ];

      for (const update of updates) {
        // Try to update first
        const { error: updateError, data: updateData } = await supabase
          .from('admin_settings')
          .update({ 
            value: update.value,
            updated_at: new Date().toISOString(),
          })
          .eq('key', update.key)
          .select();

        // If no rows updated, insert new
        if (!updateData || updateData.length === 0) {
          const { error: insertError } = await supabase
            .from('admin_settings')
            .insert({ 
              key: update.key,
              value: update.value,
              description: `PIX ${update.key.replace('pix_', '')}`,
            });

          if (insertError) throw insertError;
        } else if (updateError) {
          throw updateError;
        }
      }
    },
    onSuccess: () => {
      toast({
        title: 'Configurações PIX salvas!',
        description: 'As alterações serão refletidas em todo o sistema.',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-pix-settings'] });
      queryClient.invalidateQueries({ queryKey: ['pix-config'] });
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
    if (!pixSettings.pixKey || !pixSettings.pixName || !pixSettings.pixCity) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos para salvar.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSaving(true);
    await saveMutation.mutateAsync();
    setIsSaving(false);
  };

  const handleChange = (field: keyof PixSettings, value: string) => {
    setPixSettings(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const formatLastUpdate = (date: string | undefined) => {
    if (!date) return null;
    return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  // Generate preview PIX code
  const previewPixCode = pixSettings.pixKey && pixSettings.pixName && pixSettings.pixCity
    ? generatePixCode(
        { pixKey: pixSettings.pixKey, pixName: pixSettings.pixName, pixCity: pixSettings.pixCity },
        { amount: 19.90, description: 'Teste PIX', txId: 'TESTE123' }
      )
    : '';

  const isConfigured = pixSettings.pixKey && pixSettings.pixName && pixSettings.pixCity;

  return (
    <AdminLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-3xl font-bold flex items-center gap-2 md:gap-3">
              <QrCode className="h-5 w-5 md:h-8 md:w-8 text-primary" />
              Configuração PIX
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">
              Configure as chaves PIX para pagamentos em todo o sistema
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
              {!isMobile && "Salvar"}
            </Button>
          </div>
        </div>

        {hasChanges && (
          <Alert className="bg-amber-500/10 border-amber-500/30">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-amber-500">
              Você tem alterações não salvas
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
          {/* Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                Dados do PIX
              </CardTitle>
              <CardDescription>
                Configure os dados que aparecerão nos QR Codes de pagamento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="pixKey" className="flex items-center gap-2">
                      <Key className="h-3.5 w-3.5 text-muted-foreground" />
                      Chave PIX
                    </Label>
                    <Input
                      id="pixKey"
                      placeholder="CPF, CNPJ, Email, Telefone ou Chave Aleatória"
                      value={pixSettings.pixKey}
                      onChange={(e) => handleChange('pixKey', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      A chave PIX que receberá os pagamentos
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pixName" className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      Nome do Beneficiário
                    </Label>
                    <Input
                      id="pixName"
                      placeholder="Nome completo ou Razão Social"
                      value={pixSettings.pixName}
                      onChange={(e) => handleChange('pixName', e.target.value.toUpperCase())}
                      maxLength={25}
                    />
                    <p className="text-xs text-muted-foreground">
                      Máximo 25 caracteres. Será exibido no comprovante.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pixCity" className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      Cidade
                    </Label>
                    <Input
                      id="pixCity"
                      placeholder="Cidade do beneficiário"
                      value={pixSettings.pixCity}
                      onChange={(e) => handleChange('pixCity', e.target.value.toUpperCase())}
                      maxLength={15}
                    />
                    <p className="text-xs text-muted-foreground">
                      Máximo 15 caracteres. Cidade do recebedor.
                    </p>
                  </div>

                  {settings?.lastUpdated && (
                    <p className="text-xs text-muted-foreground pt-2 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      Última atualização: {formatLastUpdate(settings.lastUpdated)}
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Preview Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-primary" />
                Pré-visualização
              </CardTitle>
              <CardDescription>
                Como o QR Code aparecerá para os usuários
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center gap-4">
              {isConfigured ? (
                <>
                  <div className="bg-white p-4 rounded-xl shadow-lg">
                    <QRCodeSVG 
                      value={previewPixCode}
                      size={160}
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="font-medium">{pixSettings.pixName}</p>
                    <p className="text-sm text-muted-foreground">{pixSettings.pixCity}</p>
                    <p className="text-xs text-muted-foreground break-all max-w-[200px]">
                      {pixSettings.pixKey}
                    </p>
                  </div>
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-500">PIX configurado</span>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 space-y-4">
                  <div className="w-40 h-40 bg-muted rounded-xl flex items-center justify-center">
                    <QrCode className="h-16 w-16 text-muted-foreground/30" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Preencha todos os campos para ver a pré-visualização
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Info Alert */}
        <Alert className="border-primary/30 bg-primary/5">
          <Info className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm">
            <strong>Importante:</strong> As configurações de PIX são usadas em todo o sistema para gerar
            QR Codes de pagamento na página de planos, renovação de assinatura e checkout. Certifique-se
            de que os dados estejam corretos antes de salvar.
          </AlertDescription>
        </Alert>
      </div>
    </AdminLayout>
  );
}
