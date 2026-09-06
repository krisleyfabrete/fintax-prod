import { useState } from 'react';
import { UserMinus, Crown, User, Shield, ShieldOff, MoreVertical } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { FamilyMember, FamilyGroup } from '@/hooks/useFamily';
import { useAuth } from '@/contexts/AuthContext';

interface GroupMembersListProps {
  group: FamilyGroup;
  members: FamilyMember[];
  isLoading: boolean;
  onRemoveMember: (userId: string) => void;
  onUpdateMemberRole?: (userId: string, role: 'admin' | 'member') => void;
}

export function GroupMembersList({
  group,
  members,
  isLoading,
  onRemoveMember,
  onUpdateMemberRole,
}: GroupMembersListProps) {
  const { user } = useAuth();
  const isOwner = group.owner_id === user?.id;
  const currentUserMember = members.find(m => m.user_id === user?.id);
  const isAdmin = isOwner || currentUserMember?.role === 'admin';

  const [memberToRemove, setMemberToRemove] = useState<FamilyMember | null>(null);
  const [memberToPromote, setMemberToPromote] = useState<FamilyMember | null>(null);
  const [memberToDemote, setMemberToDemote] = useState<FamilyMember | null>(null);

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleConfirmRemove = () => {
    if (memberToRemove) {
      onRemoveMember(memberToRemove.user_id);
      setMemberToRemove(null);
    }
  };

  const handleConfirmPromote = () => {
    if (memberToPromote && onUpdateMemberRole) {
      onUpdateMemberRole(memberToPromote.user_id, 'admin');
      setMemberToPromote(null);
    }
  };

  const handleConfirmDemote = () => {
    if (memberToDemote && onUpdateMemberRole) {
      onUpdateMemberRole(memberToDemote.user_id, 'member');
      setMemberToDemote(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Membros do Grupo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            Membros do Grupo ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members.map((member) => {
              const isCurrentUser = member.user_id === user?.id;
              const isMemberOwner = member.user_id === group.owner_id;
              const isMemberAdmin = member.role === 'admin';
              const canManageMember = isAdmin && !isMemberOwner && !isCurrentUser;

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.profile?.avatar_url || undefined} />
                      <AvatarFallback>
                        {getInitials(member.profile?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        {member.profile?.full_name || 'Usuário'}
                        {isCurrentUser && (
                          <span className="text-xs text-muted-foreground">(você)</span>
                        )}
                      </p>
                      <div className="flex items-center gap-2">
                        {isMemberOwner ? (
                          <Badge variant="default" className="text-xs">
                            <Crown className="h-3 w-3 mr-1" />
                            Dono
                          </Badge>
                        ) : isMemberAdmin ? (
                          <Badge variant="secondary" className="text-xs bg-primary/20 text-primary">
                            <Shield className="h-3 w-3 mr-1" />
                            Admin
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Membro
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {canManageMember && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {isMemberAdmin ? (
                          <DropdownMenuItem onClick={() => setMemberToDemote(member)}>
                            <ShieldOff className="mr-2 h-4 w-4" />
                            Rebaixar a membro
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => setMemberToPromote(member)}>
                            <Shield className="mr-2 h-4 w-4" />
                            Promover a admin
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => setMemberToRemove(member)}
                          className="text-destructive focus:text-destructive"
                        >
                          <UserMinus className="mr-2 h-4 w-4" />
                          Remover do grupo
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Remove Member Confirmation */}
      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Membro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{memberToRemove?.profile?.full_name || 'este usuário'}</strong> do grupo? 
              Ele precisará de um novo convite para entrar novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Promote Member Confirmation */}
      <AlertDialog open={!!memberToPromote} onOpenChange={() => setMemberToPromote(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Promover a Administrador</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja promover <strong>{memberToPromote?.profile?.full_name || 'este usuário'}</strong> a administrador? 
              Administradores podem gerenciar membros do grupo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPromote}>
              Promover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Demote Member Confirmation */}
      <AlertDialog open={!!memberToDemote} onOpenChange={() => setMemberToDemote(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rebaixar a Membro</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja rebaixar <strong>{memberToDemote?.profile?.full_name || 'este usuário'}</strong> a membro comum? 
              Ele não poderá mais gerenciar outros membros.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDemote}>
              Rebaixar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
