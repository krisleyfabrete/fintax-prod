import { useState } from 'react';
import { Clock, UserCheck, UserX, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { PendingInvite } from '@/hooks/useFamily';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PendingInvitesListProps {
  invites: PendingInvite[];
  isLoading: boolean;
  onApprove: (invite: PendingInvite) => void;
  onReject: (invite: PendingInvite) => void;
}

export function PendingInvitesList({
  invites,
  isLoading,
  onApprove,
  onReject,
}: PendingInvitesListProps) {
  const [inviteToApprove, setInviteToApprove] = useState<PendingInvite | null>(null);
  const [inviteToReject, setInviteToReject] = useState<PendingInvite | null>(null);

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleConfirmApprove = () => {
    if (inviteToApprove) {
      onApprove(inviteToApprove);
      setInviteToApprove(null);
    }
  };

  const handleConfirmReject = () => {
    if (inviteToReject) {
      onReject(inviteToReject);
      setInviteToReject(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Solicitações Pendentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (invites.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-amber-600">
            <Clock className="h-5 w-5" />
            Solicitações Pendentes ({invites.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between p-3 rounded-lg bg-background border"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={invite.profile?.avatar_url || undefined} />
                    <AvatarFallback>
                      {getInitials(invite.profile?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {invite.profile?.full_name || 'Usuário'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Solicitou {formatDistanceToNow(new Date(invite.created_at), { 
                        addSuffix: true, 
                        locale: ptBR 
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setInviteToReject(invite)}
                  >
                    <UserX className="h-4 w-4 mr-1" />
                    Rejeitar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setInviteToApprove(invite)}
                  >
                    <UserCheck className="h-4 w-4 mr-1" />
                    Aprovar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Approve Confirmation */}
      <AlertDialog open={!!inviteToApprove} onOpenChange={() => setInviteToApprove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aprovar Solicitação</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja aprovar a solicitação de <strong>{inviteToApprove?.profile?.full_name || 'este usuário'}</strong>? 
              Ele será adicionado ao grupo como membro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmApprove}>
              Aprovar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Confirmation */}
      <AlertDialog open={!!inviteToReject} onOpenChange={() => setInviteToReject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar Solicitação</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja rejeitar a solicitação de <strong>{inviteToReject?.profile?.full_name || 'este usuário'}</strong>? 
              Ele não poderá solicitar entrada novamente com o mesmo código.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Rejeitar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
