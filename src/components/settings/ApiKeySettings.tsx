import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Key, ExternalLink, CheckCircle2, Loader2 } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';

export function ApiKeySettings() {
  const { profile, updateProfile, isUpdating } = useProfile();
  const [brapiKey, setBrapiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (profile?.brapi_api_key) {
      setBrapiKey(profile.brapi_api_key);
    }
  }, [profile?.brapi_api_key]);

  const handleSave = () => {
    updateProfile({
      brapi_api_key: brapiKey || undefined,
    });
    setHasChanges(false);
  };

  const handleRemove = () => {
    setBrapiKey('');
    updateProfile({
      brapi_api_key: undefined,
    });
    setHasChanges(false);
    toast.success('Chave API removida');
  };

  const handleKeyChange = (value: string) => {
    setBrapiKey(value);
    setHasChanges(value !== (profile?.brapi_api_key || ''));
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return key;
    return key.slice(0, 4) + '••••••••' + key.slice(-4);
  };

  return (
    <Card className="shadow-card border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Chaves de API
        </CardTitle>
        <CardDescription>
          Configure suas chaves de API para integração com serviços externos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">BRAPI - Cotações de Ações</h4>
              <p className="text-sm text-muted-foreground">
                API gratuita para cotações de ações, FIIs, BDRs e ETFs brasileiros
              </p>
            </div>
            <a 
              href="https://brapi.dev" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline text-sm flex items-center gap-1"
            >
              Obter chave <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="brapiKey">Chave API BRAPI</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="brapiKey"
                  type={showKey ? 'text' : 'password'}
                  value={brapiKey}
                  onChange={(e) => handleKeyChange(e.target.value)}
                  placeholder="Cole sua chave API aqui"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {brapiKey && (
                <Button variant="outline" onClick={handleRemove}>
                  Remover
                </Button>
              )}
            </div>
            {profile?.brapi_api_key && !hasChanges && (
              <p className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Chave configurada
              </p>
            )}
          </div>

          {hasChanges && (
            <Button onClick={handleSave} disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Chave'
              )}
            </Button>
          )}

          <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
            <p className="font-medium">Por que configurar uma chave API?</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Acesso ilimitado às cotações em tempo real</li>
              <li>Sem limitações de requisições por minuto</li>
              <li>Suporte a mais ativos e funcionalidades</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              A BRAPI oferece um plano gratuito com limites generosos. 
              <a 
                href="https://brapi.dev/dashboard" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline ml-1"
              >
                Crie sua conta gratuitamente
              </a>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}