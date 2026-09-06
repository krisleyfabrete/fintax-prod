import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Database } from '@/integrations/supabase/types';
type AuditLog = Database['public']['Tables']['admin_audit_logs']['Row'];

export default function AdminLogs() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-logs'],
    queryFn: async () => {
      const { data } = await supabase.from('admin_audit_logs').select('*').order('created_at', { ascending: false }).limit(100);
      return data || [];
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-4 lg:space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Logs de Auditoria</h1>
          <p className="text-sm lg:text-base text-muted-foreground">Histórico de ações administrativas</p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              Últimas 100 ações
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-64 w-full" /> : (
              <>
                {/* Mobile Cards */}
                <div className="lg:hidden space-y-3">
                  {data?.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">Nenhum log encontrado</p>
                  ) : (
                    data?.map((log: AuditLog) => (
                      <div key={log.id} className="p-4 border rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">{log.action}</Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(log.created_at), "dd/MM HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">Tipo: </span>
                          <span>{log.target_type}</span>
                        </div>
                        {log.details && (
                          <div className="text-xs text-muted-foreground bg-muted p-2 rounded overflow-x-auto">
                            <pre className="whitespace-pre-wrap break-all">{JSON.stringify(log.details, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Desktop Table */}
                <div className="hidden lg:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ação</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Detalhes</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum log encontrado</TableCell>
                        </TableRow>
                      ) : (
                        data?.map((log: AuditLog) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-medium">{log.action}</TableCell>
                            <TableCell>{log.target_type}</TableCell>
                            <TableCell className="max-w-xs truncate text-muted-foreground">{JSON.stringify(log.details)}</TableCell>
                            <TableCell className="text-muted-foreground">{format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                          </TableRow>
                        ))
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
