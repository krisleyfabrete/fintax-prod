import { useState } from 'react';
import { Plus, UserPlus, Users, ArrowLeft } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { useFamily, FamilyGroup, PendingInvite } from '@/hooks/useFamily';
import { useSubscription } from '@/hooks/useSubscription';
import { GroupCard } from '@/components/family/GroupCard';
import { GroupMembersList } from '@/components/family/GroupMembersList';
import { PendingInvitesList } from '@/components/family/PendingInvitesList';
import { CreateGroupDialog } from '@/components/family/CreateGroupDialog';
import { JoinGroupDialog } from '@/components/family/JoinGroupDialog';
import { FamilySharedData } from '@/components/family/FamilySharedData';
import { UpgradePrompt } from '@/components/subscription/UpgradePrompt';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function Family() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<FamilyGroup | null>(null);
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);
  const [leaveGroupId, setLeaveGroupId] = useState<string | null>(null);

  const { user } = useAuth();
  const { canAccess } = useSubscription();
  const canUseFamily = canAccess('canUseFamily');

  const {
    groups,
    isLoadingGroups,
    useGroupMembers,
    useGroupPendingInvites,
    createGroup,
    joinGroup,
    approveInvite,
    rejectInvite,
    leaveGroup,
    removeMember,
    updateMemberRole,
    deleteGroup,
    regenerateInviteCode,
    isCreating,
     isJoining,
     joinGroupByPassword,
     isJoiningByPassword,
   } = useFamily();

  const { data: members = [], isLoading: isLoadingMembers } = useGroupMembers(
    selectedGroup?.id || null
  );

  const { data: pendingInvites = [], isLoading: isLoadingPendingInvites } = useGroupPendingInvites(
    selectedGroup?.id || null
  );

  // Check if current user is admin of selected group
  const isGroupAdmin = selectedGroup && (
    selectedGroup.owner_id === user?.id ||
    members.find(m => m.user_id === user?.id)?.role === 'admin'
  );

  const handleCreateGroup = (data: { name: string; description?: string }) => {
    createGroup.mutate(data);
  };

  const handleJoinGroup = (values: { inviteCode: string; adminPassword: string }) => {
    joinGroupByPassword.mutate(values);
  };

  const confirmDeleteGroup = () => {
    if (deleteGroupId) {
      deleteGroup.mutate(deleteGroupId);
      setDeleteGroupId(null);
      if (selectedGroup?.id === deleteGroupId) {
        setSelectedGroup(null);
      }
    }
  };

  const confirmLeaveGroup = () => {
    if (leaveGroupId) {
      leaveGroup.mutate(leaveGroupId);
      setLeaveGroupId(null);
      if (selectedGroup?.id === leaveGroupId) {
        setSelectedGroup(null);
      }
    }
  };

  const handleRemoveMember = (userId: string) => {
    if (selectedGroup) {
      removeMember.mutate({ groupId: selectedGroup.id, userId });
    }
  };

  const handleUpdateMemberRole = (userId: string, role: 'admin' | 'member') => {
    if (selectedGroup) {
      updateMemberRole.mutate({ groupId: selectedGroup.id, userId, role });
    }
  };

  const handleApproveInvite = (invite: PendingInvite) => {
    approveInvite.mutate({
      inviteId: invite.id,
      groupId: invite.group_id,
      userId: invite.user_id,
    });
  };

  const handleRejectInvite = (invite: PendingInvite) => {
    rejectInvite.mutate({ inviteId: invite.id });
  };

  // Group details view
  if (selectedGroup) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedGroup(null)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{selectedGroup.name}</h1>
              {selectedGroup.description && (
                <p className="text-muted-foreground">{selectedGroup.description}</p>
              )}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <FamilySharedData group={selectedGroup} />
            </div>
            <div className="space-y-6">
              {/* Pending Invites - Only shown to admins */}
              {isGroupAdmin && (
                <PendingInvitesList
                  invites={pendingInvites}
                  isLoading={isLoadingPendingInvites}
                  onApprove={handleApproveInvite}
                  onReject={handleRejectInvite}
                />
              )}
              
              <GroupMembersList
                group={selectedGroup}
                members={members}
                isLoading={isLoadingMembers}
                onRemoveMember={handleRemoveMember}
                onUpdateMemberRole={handleUpdateMemberRole}
              />
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Groups list view
  if (!canUseFamily) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Família</h1>
            <p className="text-muted-foreground">
              Compartilhe finanças com sua família
            </p>
          </div>
          <UpgradePrompt
            feature="Compartilhamento Familiar"
            description="Crie grupos familiares, compartilhe contas, orçamentos e metas com até 5 membros da sua família."
            requiredPlan="family"
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Família</h1>
            <p className="text-muted-foreground">
              Compartilhe finanças com sua família
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Criar Grupo
          </Button>
          <Button variant="outline" onClick={() => setJoinDialogOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Solicitar Entrada
          </Button>
        </div>

        {/* Groups List */}
        {isLoadingGroups ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-32 rounded-lg bg-muted animate-pulse"
              />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Nenhum grupo familiar</h3>
            <p className="text-muted-foreground max-w-sm mt-1">
              Crie um grupo para compartilhar finanças com sua família ou solicite entrada em um grupo existente.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {groups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                onSelect={setSelectedGroup}
                onLeave={setLeaveGroupId}
                onDelete={setDeleteGroupId}
                onRegenerateCode={(id) => regenerateInviteCode.mutate(id)}
              />
            ))}
          </div>
        )}

        {/* Dialogs */}
        <CreateGroupDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSubmit={handleCreateGroup}
          isLoading={isCreating}
        />

        <JoinGroupDialog
          open={joinDialogOpen}
          onOpenChange={setJoinDialogOpen}
          onSubmit={handleJoinGroup}
           isLoading={isJoiningByPassword || isJoining}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteGroupId} onOpenChange={() => setDeleteGroupId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Grupo</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este grupo? Todos os membros serão removidos e esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteGroup}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Leave Confirmation */}
        <AlertDialog open={!!leaveGroupId} onOpenChange={() => setLeaveGroupId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sair do Grupo</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja sair deste grupo? Você precisará de um novo convite para entrar novamente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmLeaveGroup}>
                Sair
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
