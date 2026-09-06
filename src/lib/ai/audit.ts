import { supabase } from '@/integrations/supabase/client';
import type { AiAuditLog } from './types';

export async function logAiAction(params: {
  userId: string;
  action: string;
  parameters?: Record<string, unknown>;
  result?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  context: 'client' | 'admin';
  severity?: 'info' | 'warning' | 'error' | 'critical';
}): Promise<void> {
  const { error } = await supabase.from('ai_audit_logs').insert({
    user_id: params.userId,
    action: params.action,
    parameters: params.parameters || {},
    result: params.result || {},
    ip_address: params.ipAddress,
    user_agent: params.userAgent,
    context: params.context,
    severity: params.severity || 'info',
  });

  if (error) {
    console.error('Error logging AI action:', error);
  }
}

export async function getRecentAuditLogs(limit = 100): Promise<AiAuditLog[]> {
  const { data, error } = await supabase
    .from('ai_audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error loading audit logs:', error);
    return [];
  }

  return data || [];
}
