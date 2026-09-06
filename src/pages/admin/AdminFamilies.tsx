import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UsersRound, Users, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface FamilyGroupWithMembers {
  id: string;
  name: string;
  description: string | null;
  invite_code: string | null;
  owner_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  family_members?: { count: number }[];
}

export default function AdminFamilies() {
  const { data, isLoading } = useQuery<FamilyGroupWithMembers[]>({
    queryKey: ['admin-families'],
    queryFn: async () => {
      const { data: groups } = await supabase.from('family_groups').select('*, family_members(count)').order('created_at', { ascending: false });
      return groups || [];
    },
  });

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Código copiado!');
  };

  return (
    <AdminLayout>
      <div className="space-y-4 lg:space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Famílias</h1>
          <p className="text-sm lg:text-base text-muted-foreground">Gerencie os grupos familiares</p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UsersRound className="h-5 w-5" />
              Total: {data?.length || 0} grupos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-64 w-full" /> : (
              <>
                {/* Mobile Cards */}
                <div className="lg:hidden space-y-3">
                   {data?.map((group: FamilyGroupWithMembers) => (
                     <div key={group.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">{group.name}</h3>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>{group.family_members?.[0]?.count || 0}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm bg-muted px-2 py-1 rounded">{group.invite_code}</span>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyCode(group.invite_code)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(group.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  ))}
                  {data?.length === 0 && (
                    <p className="text-center py-8 text-muted-foreground">Nenhum grupo encontrado</p>
                  )}
                </div>

                {/* Desktop Table */}
                <div className="hidden lg:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Membros</TableHead>
                        <TableHead>Código</TableHead>
                        <TableHead>Criado em</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.map((group: FamilyGroupWithMembers) => (
                         <TableRow key={group.id}>
                          <TableCell className="font-medium">{group.name}</TableCell>
                          <TableCell>{group.family_members?.[0]?.count || 0}</TableCell>
                          <TableCell className="font-mono text-sm">{group.invite_code}</TableCell>
                          <TableCell className="text-muted-foreground">{format(new Date(group.created_at), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                        </TableRow>
                      ))}
                      {data?.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum grupo encontrado</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
