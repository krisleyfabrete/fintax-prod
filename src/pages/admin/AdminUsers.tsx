import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Users, Eye, ChevronLeft, ChevronRight, Crown, UserPlus, Trash2, Pencil, RefreshCcw, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { CreateUserDialog } from '@/components/admin/CreateUserDialog';
import { DeleteUserDialog } from '@/components/admin/DeleteUserDialog';
import { EditUserDialog } from '@/components/admin/EditUserDialog';

const ITEMS_PER_PAGE = 10;

interface UserWithSubscription {
  id: string;
  full_name: string | null;
  cpf: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  subscription?: {
    plan: string;
  };
  isAdmin?: boolean;
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; full_name: string | null; phone: string | null; cpf: string | null; plan?: string; isAdmin?: boolean } | null>(null);

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  };

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, planFilter, page],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('id, full_name, cpf, phone, avatar_url, created_at', { count: 'exact' });

      if (search) {
        query = query.or(`full_name.ilike.%${search}%,cpf.ilike.%${search}%,phone.ilike.%${search}%`);
      }

      const { data: profiles, count } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE - 1);

      if (!profiles) return { users: [], total: 0 };

      // Buscar assinaturas dos usuários
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('user_id, plan')
        .in('user_id', profiles.map((p) => p.id));

      // Buscar admins
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin')
        .in('user_id', profiles.map((p) => p.id));

      const adminUserIds = new Set(adminRoles?.map((r) => r.user_id) || []);

      const usersWithSubs: UserWithSubscription[] = profiles.map((profile) => ({
        ...profile,
        subscription: subscriptions?.find((s) => s.user_id === profile.id),
        isAdmin: adminUserIds.has(profile.id),
      }));

      // Filtrar por plano se necessário
      let filteredUsers = usersWithSubs;
      if (planFilter !== 'all') {
        filteredUsers = usersWithSubs.filter(
          (u) => u.subscription?.plan === planFilter
        );
      }

      return {
        users: filteredUsers,
        total: count || 0,
      };
    },
  });

  const totalPages = Math.ceil((data?.total || 0) / ITEMS_PER_PAGE);

  const getPlanBadge = (plan?: string, isAdmin?: boolean) => {
    if (isAdmin) {
      return <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/50"><Shield className="h-3 w-3 mr-1" />ROOT</Badge>;
    }
    switch (plan) {
      case 'pro':
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30"><Crown className="h-3 w-3 mr-1 text-yellow-500" />Pro</Badge>;
      case 'family':
        return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/30"><Users className="h-3 w-3 mr-1" />Family</Badge>;
      default:
        return <Badge variant="secondary"><Crown className="h-3 w-3 mr-1 text-muted-foreground" />Free</Badge>;
    }
  };

  const content = (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Usuários</h1>
          <p className="text-sm lg:text-base text-muted-foreground">
            Gerencie todos os usuários cadastrados
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Novo Usuário
          </Button>
        </div>
      </div>

      {/* Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.total || 0}</div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3 lg:pb-6">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Lista de Usuários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 mb-4 lg:mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, CPF ou telefone..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>
              <Select
                value={planFilter}
                onValueChange={(value) => {
                  setPlanFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full lg:w-[180px]">
                  <SelectValue placeholder="Filtrar por plano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os planos</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="family">Family</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <>
                {/* Mobile Cards */}
                <div className="lg:hidden space-y-3">
                  {data?.users.map((user) => (
                    <div
                      key={user.id}
                      className="p-4 border rounded-lg space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {user.avatar_url ? (
                              <img
                                src={user.avatar_url}
                                alt={user.full_name || 'User'}
                                className="h-10 w-10 object-cover"
                              />
                            ) : (
                              <Users className="h-5 w-5 text-primary" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">
                              {user.full_name || 'Sem nome'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(user.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        {getPlanBadge(user.subscription?.plan, user.isAdmin)}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">CPF</p>
                          <p className="truncate">{user.cpf || '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Telefone</p>
                          <p className="truncate">{user.phone || '-'}</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => navigate(`/admin/users/${user.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Detalhes
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUser({ 
                              id: user.id, 
                              full_name: user.full_name, 
                              phone: user.phone, 
                              cpf: user.cpf, 
                              plan: user.subscription?.plan,
                              isAdmin: user.isAdmin,
                            });
                            setEditDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          disabled={user.isAdmin}
                          onClick={() => {
                            setSelectedUser({ 
                              id: user.id, 
                              full_name: user.full_name, 
                              phone: user.phone, 
                              cpf: user.cpf, 
                              plan: user.subscription?.plan 
                            });
                            setDeleteDialogOpen(true);
                          }}
                          title={user.isAdmin ? 'Não é possível excluir um admin' : 'Excluir usuário'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {data?.users.length === 0 && (
                    <p className="text-center py-8 text-muted-foreground">
                      Nenhum usuário encontrado
                    </p>
                  )}
                </div>

                {/* Desktop Table */}
                <div className="hidden lg:block rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>CPF</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Plano</TableHead>
                        <TableHead>Cadastro</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                                {user.avatar_url ? (
                                  <img
                                    src={user.avatar_url}
                                    alt={user.full_name || 'User'}
                                    className="h-8 w-8 object-cover"
                                  />
                                ) : (
                                  <Users className="h-4 w-4 text-primary" />
                                )}
                              </div>
                              <span className="font-medium">
                                {user.full_name || 'Sem nome'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {user.cpf || '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {user.phone || '-'}
                          </TableCell>
                          <TableCell>{getPlanBadge(user.subscription?.plan, user.isAdmin)}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(user.created_at), 'dd/MM/yyyy', {
                              locale: ptBR,
                            })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/admin/users/${user.id}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                   setSelectedUser({ 
                                     id: user.id, 
                                     full_name: user.full_name, 
                                     phone: user.phone, 
                                     cpf: user.cpf, 
                                     plan: user.subscription?.plan,
                                     isAdmin: user.isAdmin,
                                   });
                                  setEditDialogOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                disabled={user.isAdmin}
                                onClick={() => {
                                  setSelectedUser({ 
                                    id: user.id, 
                                    full_name: user.full_name, 
                                    phone: user.phone, 
                                    cpf: user.cpf, 
                                    plan: user.subscription?.plan 
                                  });
                                  setDeleteDialogOpen(true);
                                }}
                                title={user.isAdmin ? 'Não é possível excluir um admin' : 'Excluir usuário'}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {data?.users.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            <p className="text-muted-foreground">
                              Nenhum usuário encontrado
                            </p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Página {page} de {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
  );

  return (
    <AdminLayout>
      {isMobile ? (
        <PullToRefresh onRefresh={handleRefresh} className="min-h-[calc(100vh-4rem)]">
          {content}
        </PullToRefresh>
      ) : (
        content
      )}

      <CreateUserDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleRefresh}
      />

      <DeleteUserDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        user={selectedUser}
        onSuccess={handleRefresh}
      />

      <EditUserDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        user={selectedUser}
        onSuccess={handleRefresh}
      />
    </AdminLayout>
  );
}
