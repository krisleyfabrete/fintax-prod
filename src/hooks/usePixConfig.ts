import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PixConfig } from '@/lib/pixGenerator';

interface PixConfigResult {
  config: PixConfig | null;
  isLoading: boolean;
  isConfigured: boolean;
}

export function usePixConfig(): PixConfigResult {
  const { data, isLoading } = useQuery({
    queryKey: ['pix-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('key, value')
        .in('key', ['pix_key', 'pix_name', 'pix_city']);

      if (error) throw error;

      console.log('[usePixConfig] Raw data from DB:', data);

      const settings: Record<string, string> = {};
      data?.forEach((item) => {
        // Value can be stored as JSON string or plain value
        let value = item.value;
        
        // If it's a string with quotes, remove them
        if (typeof value === 'string') {
          value = value.replace(/^"|"$/g, '');
        }
        
        settings[item.key] = String(value);
      });

      console.log('[usePixConfig] Parsed settings:', settings);

      return {
        pixKey: settings['pix_key'] || '',
        pixName: settings['pix_name'] || '',
        pixCity: settings['pix_city'] || '',
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const isConfigured = Boolean(
    data?.pixKey && 
    data.pixKey !== 'SUA_CHAVE_PIX_AQUI' && 
    data.pixKey.length > 0 &&
    data?.pixName && 
    data.pixName.length > 0 &&
    data?.pixCity &&
    data.pixCity.length > 0
  );

  console.log('[usePixConfig] isConfigured:', isConfigured, 'data:', data);

  return {
    config: data || null,
    isLoading,
    isConfigured,
  };
}
