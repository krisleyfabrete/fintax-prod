import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface FamilyGroup {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface FamilyMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string | null;
  profile?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface PendingInvite {
  id: string;
  group_id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  profile?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export function useFamily() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's family groups
  const { data: groups, isLoading: isLoadingGroups } = useQuery({
    queryKey: ['family-groups', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('family_groups')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as FamilyGroup[];
    },
    enabled: !!user,
  });

  // Fetch user's pending invites
  const { data: userPendingInvites } = useQuery({
    queryKey: ['user-pending-invites', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('family_pending_invites')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'pending');

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch members for a specific group
  const useGroupMembers = (groupId: string | null) => {
    return useQuery({
      queryKey: ['family-members', groupId],
      queryFn: async () => {
        if (!groupId) return [];
        
        const { data: membersData, error: membersError } = await supabase
          .rpc('get_group_members_with_profiles', { _group_id: groupId });

        if (membersError) throw membersError;

        const membersWithProfiles = (membersData || []).map((member) => ({
          id: member.id,
          group_id: member.group_id,
          user_id: member.user_id,
          role: member.role as 'admin' | 'member',
          joined_at: member.joined_at,
          profile: member.profile_id
            ? {
                id: member.profile_id,
                full_name: member.full_name,
                avatar_url: member.avatar_url,
              }
            : null,
        }));

        return membersWithProfiles as FamilyMember[];
      },
      enabled: !!groupId && !!user,
    });
  };

  // Fetch pending invites for a specific group (admin only)
  const useGroupPendingInvites = (groupId: string | null) => {
    return useQuery({
      queryKey: ['group-pending-invites', groupId],
      queryFn: async () => {
        if (!groupId) return [];
        
        const { data: invitesData, error: invitesError } = await supabase
          .from('family_pending_invites')
          .select('*')
          .eq('group_id', groupId)
          .eq('status', 'pending')
          .order('created_at', { ascending: true });

        if (invitesError) throw invitesError;

        if (invitesData.length === 0) return [];

        // Get profiles for each invite
        const userIds = invitesData.map(i => i.user_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);

        if (profilesError) throw profilesError;

        // Merge invites with profiles
        const invitesWithProfiles = invitesData.map(invite => ({
          ...invite,
          status: invite.status as 'pending' | 'approved' | 'rejected',
          profile: profilesData?.find(p => p.id === invite.user_id) || null,
        }));

        return invitesWithProfiles as PendingInvite[];
      },
      enabled: !!groupId && !!user,
    });
  };

  // Create a new family group
  const createGroup = useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('family_groups')
        .insert({
          name,
          description,
          owner_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from('family_members')
        .insert({
          group_id: data.id,
          user_id: user.id,
          role: 'admin',
        });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-groups'] });
      queryClient.invalidateQueries({ queryKey: ['family-members'] });
      toast({
        title: 'Grupo criado!',
        description: 'Seu grupo familiar foi criado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar grupo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Request to join a group by invite code (creates pending invite)
  const joinGroup = useMutation({
    mutationFn: async (inviteCode: string) => {
      if (!user) throw new Error('Usuário não autenticado');

      // Find group by invite code
      const { data: groupData, error: groupError } = await supabase
        .rpc('get_group_by_invite_code', { code: inviteCode });

      if (groupError) throw groupError;
      if (!groupData || groupData.length === 0) {
        throw new Error('Código de convite inválido');
      }

      const group = groupData[0];

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('family_members')
        .select('id')
        .eq('group_id', group.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingMember) {
        throw new Error('Você já é membro deste grupo');
      }

      // Check if already has pending invite
      const { data: existingInvite } = await supabase
        .from('family_pending_invites')
        .select('id, status')
        .eq('group_id', group.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingInvite) {
        if (existingInvite.status === 'pending') {
          throw new Error('Você já tem uma solicitação pendente para este grupo');
        }
        if (existingInvite.status === 'rejected') {
          throw new Error('Sua solicitação foi rejeitada anteriormente');
        }
      }

      // Create pending invite request
      const { error: inviteError } = await supabase
        .from('family_pending_invites')
        .insert({
          group_id: group.id,
          user_id: user.id,
          email: user.email || '',
          status: 'pending',
        });

      if (inviteError) throw inviteError;
      return group;
    },
    onSuccess: (group) => {
      queryClient.invalidateQueries({ queryKey: ['user-pending-invites'] });
      toast({
        title: 'Solicitação enviada!',
        description: `Sua solicitação para entrar no grupo "${group.name}" foi enviada. Aguarde a aprovação de um administrador.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao solicitar entrada',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Join group instantly via admin password verification (via Edge Function)
  const joinGroupByPassword = useMutation({
    mutationFn: async ({ inviteCode, adminPassword }: { inviteCode: string; adminPassword: string }) => {
      const functionsUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-family-password`;
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const resp = await fetch(functionsUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inviteCode, adminPassword }),
      });

      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || 'Erro ao entrar no grupo');

      return result;
    },
    onSuccess: (result: { ok: boolean; groupId: string; groupName: string }) => {
      queryClient.invalidateQueries({ queryKey: ['family-groups'] });
      queryClient.invalidateQueries({ queryKey: ['family-members'] });
      queryClient.invalidateQueries({ queryKey: ['user-pending-invites'] });
      toast({
        title: 'Entrada aprovada!',
        description: `Você entrou no grupo "${result.groupName}" com sucesso.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao entrar no grupo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Approve a pending invite (admin only)
  const approveInvite = useMutation({
    mutationFn: async ({ inviteId, groupId, userId }: { inviteId: string; groupId: string; userId: string }) => {
      if (!user) throw new Error('Usuário não autenticado');

      // Update invite status
      const { error: updateError } = await supabase
        .from('family_pending_invites')
        .update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', inviteId);

      if (updateError) throw updateError;

      // Add user as member
      const { error: memberError } = await supabase
        .from('family_members')
        .insert({
          group_id: groupId,
          user_id: userId,
          role: 'member',
        });

      if (memberError) throw memberError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-pending-invites'] });
      queryClient.invalidateQueries({ queryKey: ['family-members'] });
      toast({
        title: 'Solicitação aprovada!',
        description: 'O usuário foi adicionado ao grupo.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao aprovar solicitação',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Reject a pending invite (admin only)
  const rejectInvite = useMutation({
    mutationFn: async ({ inviteId }: { inviteId: string }) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('family_pending_invites')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', inviteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-pending-invites'] });
      toast({
        title: 'Solicitação rejeitada',
        description: 'A solicitação foi rejeitada.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao rejeitar solicitação',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Cancel own pending invite
  const cancelPendingInvite = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .from('family_pending_invites')
        .delete()
        .eq('id', inviteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-pending-invites'] });
      toast({
        title: 'Solicitação cancelada',
        description: 'Sua solicitação foi cancelada.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao cancelar solicitação',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Leave a group
  const leaveGroup = useMutation({
    mutationFn: async (groupId: string) => {
      if (!user) throw new Error('Usuário não autenticado');

      // Remove user from group members
      const { error } = await supabase
        .from('family_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Also delete any pending invites for this group from this user
      await supabase
        .from('family_pending_invites')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id);

      return groupId;
    },
    onSuccess: () => {
      // Invalidate all family-related queries to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ['family-groups'] });
      queryClient.invalidateQueries({ queryKey: ['family-members'] });
      queryClient.invalidateQueries({ queryKey: ['user-pending-invites'] });
      queryClient.invalidateQueries({ queryKey: ['group-pending-invites'] });
      toast({
        title: 'Você saiu do grupo',
        description: 'O grupo foi removido da sua lista.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao sair do grupo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Remove a member (admin only)
  const removeMember = useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) => {
      const { error } = await supabase
        .from('family_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-members'] });
      toast({
        title: 'Membro removido',
        description: 'O membro foi removido do grupo.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao remover membro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update member role (admin only)
  const updateMemberRole = useMutation({
    mutationFn: async ({ groupId, userId, role }: { groupId: string; userId: string; role: 'admin' | 'member' }) => {
      const { error } = await supabase
        .from('family_members')
        .update({ role })
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['family-members'] });
      const roleLabel = variables.role === 'admin' ? 'administrador' : 'membro';
      toast({
        title: 'Cargo atualizado',
        description: `O usuário agora é ${roleLabel} do grupo.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar cargo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete a group (owner only)
  const deleteGroup = useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase
        .from('family_groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-groups'] });
      toast({
        title: 'Grupo excluído',
        description: 'O grupo foi excluído com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao excluir grupo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Regenerate invite code
  const regenerateInviteCode = useMutation({
    mutationFn: async (groupId: string) => {
      const newCode = Array.from(crypto.getRandomValues(new Uint8Array(6)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const { data, error } = await supabase
        .from('family_groups')
        .update({ invite_code: newCode })
        .eq('id', groupId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-groups'] });
      toast({
        title: 'Código regenerado',
        description: 'Um novo código de convite foi gerado.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao regenerar código',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Get user's role in a group
  const getUserRole = (groupId: string): 'admin' | 'member' | null => {
    const group = groups?.find(g => g.id === groupId);
    if (group?.owner_id === user?.id) return 'admin';
    return null; // Will be determined by members query
  };

  return {
    groups: groups || [],
    isLoadingGroups,
    userPendingInvites: userPendingInvites || [],
    useGroupMembers,
    useGroupPendingInvites,
    createGroup,
    joinGroup,
    approveInvite,
    rejectInvite,
    cancelPendingInvite,
    leaveGroup,
    removeMember,
    updateMemberRole,
    deleteGroup,
    regenerateInviteCode,
    getUserRole,
    isCreating: createGroup.isPending,
    isJoining: joinGroup.isPending,
    joinGroupByPassword,
    isJoiningByPassword: joinGroupByPassword.isPending,
  };
}

export function useHasFamily() {
  const { data: groups } = useFamily();
  return !!groups && groups.length > 0;
}
