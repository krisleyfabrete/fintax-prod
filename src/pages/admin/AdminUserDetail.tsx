import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  User,
  CreditCard,
  Wallet,
  TrendingUp,
  TrendingDown,
  Target,
  UsersRound,
  Save,
  Trash2,
  Loader2,
  Crown,
  Users,
  Mail,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Transaction } from '@/hooks/useTransactions';

interface FamilyMembership {
  group_id: string | null;
  role: string | null;
  family_groups?: { name: string | null }[];
}

export default function AdminUserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<string>('');

  const { data: user, isLoading } = useQuery({
    queryKey: ['admin-user-detail', id],
    queryFn: async () => {
      if (!id) return null;

      // Perfil
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      // Assinatura
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', id)
        .single();

      // Contas
      const { data: accounts, count: accountsCount } = await supabase
        .from('accounts')
        .select('*', { count: 'exact' })
        .eq('user_id', id);

      // Transações
      const { count: transactionsCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', id);

      // Metas
      const { count: goalsCount } = await supabase
        .from('goals')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', id);

      // Famílias
      const { data: familyMemberships } = await supabase
        .from('family_members')
        .select('group_id, role, family_groups(name)')
        .eq('user_id', id);

      // Transações recentes
      const { data: recentTransactions } = await supabase
        .from('transactions')
        .select('id, description, amount, type, date, category_id')
        .eq('user_id', id)
        .order('date', { ascending: false })
        .limit(10);

      // Buscar email via edge function
      let userEmail = null;
      let lastSignIn = null;
      try {
        const { data: emailData } = await supabase.functions.invoke('get-user-email', {
          body: { userId: id },
        });
        userEmail = emailData?.email || null;
        lastSignIn = emailData?.last_sign_in_at || null;
      } catch (error) {
        console.error('Error fetching user email:', error);
      }

      // Saldo total
      const totalBalance = accounts?.reduce((sum, acc) => sum + acc.balance, 0) || 0;

      return {
        profile,
        subscription,
        accounts,
        accountsCount: accountsCount || 0,
        transactionsCount: transactionsCount || 0,
        goalsCount: goalsCount || 0,
        familyMemberships,
        recentTransactions,
        totalBalance,
        email: userEmail,
        lastSignIn,
      };
    },
    enabled: !!id,
  });

  const updatePlanMutation = useMutation({
    mutationFn: async (newPlan: string) => {
      if (!id) throw new Error('User ID not found');

      const { error } = await supabase
        .from('subscriptions')
        .update({ plan: newPlan as 'free' | 'pro' | 'family' })
        .eq('user_id', id);

      if (error) throw error;

      // Log da ação
      await supabase.rpc('log_admin_action', {
        p_action: 'update_subscription',
        p_target_type: 'user',
        p_target_id: id,
        p_details: { old_plan: user?.subscription?.plan, new_plan: newPlan },
      });
    },
    onSuccess: () => {
      toast.success('Plano atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['admin-user-detail', id] });
    },
    onError: (error) => {
      toast.error('Erro ao atualizar plano');
      console.error(error);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('User ID not found');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('delete-user', {
        body: { userId: id },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to delete user');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: () => {
      toast.success('Usuário excluído com sucesso!');
      navigate('/admin/users');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao excluir usuário');
      console.error(error);
    },
  });

  const getPlanBadge = (plan?: string) => {
    switch (plan) {
      case 'pro':
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30"><Crown className="h-3 w-3 mr-1 text-yellow-500" />Pro</Badge>;
      case 'family':
        return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/30"><Users className="h-3 w-3 mr-1" />Family</Badge>;
      default:
        return <Badge variant="secondary"><Crown className="h-3 w-3 mr-1 text-muted-foreground" />Free</Badge>;
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-6 lg:grid-cols-3">
            <Skeleton className="h-64" />
            <Skeleton className="h-64 lg:col-span-2" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!user?.profile) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Usuário não encontrado</p>
          <Button variant="outline" onClick={() => navigate('/admin/users')} className="mt-4">
            Voltar
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
        <div className="flex items-center gap-4 flex-1">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/users')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {user.profile.full_name || 'Sem nome'}
            </h1>
            <p className="text-muted-foreground">
              Cadastrado em{' '}
              {format(new Date(user.profile.created_at), "dd 'de' MMMM 'de' yyyy", {
                locale: ptBR,
              })}
            </p>
          </div>
        </div>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir Usuário
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
              <AlertDialogDescription>
                Você está prestes a excluir permanentemente o usuário{' '}
                <strong>{user.profile.full_name || 'Sem nome'}</strong>.
                <br /><br />
                Esta ação irá:
                <ul className="list-disc ml-4 mt-2 space-y-1">
                  <li>Remover a conta de autenticação</li>
                  <li>Excluir todos os dados do perfil</li>
                  <li>Remover transações, contas e metas</li>
                </ul>
                <br />
                <strong className="text-destructive">Esta ação não pode ser desfeita!</strong>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteUserMutation.mutate()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteUserMutation.isPending}
              >
                {deleteUserMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir Permanentemente
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Perfil e Plano */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Dados do Perfil
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                    {user.profile.avatar_url ? (
                      <img
                        src={user.profile.avatar_url}
                        alt={user.profile.full_name || 'User'}
                        className="h-16 w-16 object-cover"
                      />
                    ) : (
                      <User className="h-8 w-8 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{user.profile.full_name || 'Sem nome'}</p>
                    {getPlanBadge(user.subscription?.plan)}
                  </div>
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      Email:
                    </span>
                    <span className="text-right truncate max-w-[180px]" title={user.email || '-'}>
                      {user.email || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CPF:</span>
                    <span>{user.profile.cpf || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Telefone:</span>
                    <span>{user.profile.phone || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Moeda:</span>
                    <span>{user.profile.currency || 'BRL'}</span>
                  </div>
                  {user.lastSignIn && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Último login:</span>
                      <span>
                        {format(new Date(user.lastSignIn), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Assinatura
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plano atual:</span>
                    {getPlanBadge(user.subscription?.plan)}
                  </div>
                  {user.subscription?.current_period_end && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expira em:</span>
                      <span>
                        {format(
                          new Date(user.subscription.current_period_end),
                          'dd/MM/yyyy',
                          { locale: ptBR }
                        )}
                      </span>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <label className="text-sm font-medium">Alterar plano:</label>
                  <Select
                    value={selectedPlan || user.subscription?.plan}
                    onValueChange={setSelectedPlan}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="family">Family</SelectItem>
                    </SelectContent>
                  </Select>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        className="w-full"
                        disabled={
                          !selectedPlan || selectedPlan === user.subscription?.plan
                        }
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Salvar Alteração
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar alteração</AlertDialogTitle>
                        <AlertDialogDescription>
                          Você está prestes a alterar o plano de{' '}
                          <strong>{user.subscription?.plan}</strong> para{' '}
                          <strong>{selectedPlan}</strong>. Esta ação será registrada
                          nos logs de auditoria.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => updatePlanMutation.mutate(selectedPlan)}
                        >
                          Confirmar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Estatísticas e Transações */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Saldo Total
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(user.totalBalance)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Contas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">{user.accountsCount}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Transações
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">{user.transactionsCount}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Metas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">{user.goalsCount}</div>
                </CardContent>
              </Card>
            </div>

            {/* Famílias */}
            {user.familyMemberships && user.familyMemberships.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UsersRound className="h-5 w-5" />
                    Grupos Familiares
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {user.familyMemberships.map((membership: FamilyMembership) => (
                      <div
                        key={membership.group_id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <span className="font-medium">
                          {membership.family_groups?.name}
                        </span>
                        <Badge variant="outline">{membership.role}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Transações Recentes */}
            <Card>
              <CardHeader>
                <CardTitle>Transações Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {user.recentTransactions?.map((tx: Transaction) => (
                      <TableRow key={tx.id}>
                        <TableCell className="flex items-center gap-2">
                          {tx.type === 'income' ? (
                            <TrendingUp className="h-4 w-4 text-green-500" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-500" />
                          )}
                          {tx.description || 'Sem descrição'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(tx.date), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell
                          className={`text-right font-medium ${
                            tx.type === 'income' ? 'text-green-500' : 'text-red-500'
                          }`}
                        >
                          {tx.type === 'income' ? '+' : '-'}
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(tx.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!user.recentTransactions ||
                      user.recentTransactions.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8">
                          <p className="text-muted-foreground">
                            Nenhuma transação encontrada
                          </p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
