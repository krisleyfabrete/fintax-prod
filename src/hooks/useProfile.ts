import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  currency: string | null;
  date_format: string | null;
  cpf: string | null;
  rg: string | null;
  phone: string | null;
  brapi_api_key: string | null;
  created_at: string;
  updated_at: string;
}

interface UpdateProfileData {
  full_name?: string;
  avatar_url?: string;
  currency?: string;
  date_format?: string;
  cpf?: string;
  rg?: string;
  phone?: string;
  brapi_api_key?: string;
}

export function useProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async (): Promise<Profile | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const updateProfile = useMutation({
    mutationFn: async (data: UpdateProfileData) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      toast.success('Perfil atualizado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao atualizar perfil');
    },
  });

  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      return publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      toast.success('Foto atualizada com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao atualizar foto');
    },
  });

  return {
    profile,
    isLoading,
    error,
    updateProfile: updateProfile.mutate,
    isUpdating: updateProfile.isPending,
    uploadAvatar: uploadAvatar.mutate,
    isUploadingAvatar: uploadAvatar.isPending,
  };
}