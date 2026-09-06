import { supabase } from '@/integrations/supabase/client';
import type { AiBlockedIp } from './types';

const BLOCK_CACHE_KEY = 'fintax_ai_blocked_ips';
const BLOCK_THRESHOLD = 3; // bloqueia após 3 violações em 24h

export async function getClientIp(): Promise<string | null> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return null;
  }
}

export async function recordViolation(
  ip: string | null,
  userId: string,
  reason: string
): Promise<{ blocked: boolean; blockedUntil?: number }> {
  if (!ip) return { blocked: false };

  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: existingBlocks } = await supabase
      .from('ai_blocked_ips')
      .select('*')
      .eq('ip_address', ip)
      .gte('blocked_at', oneDayAgo)
      .order('blocked_at', { ascending: false });

    const recentViolations = existingBlocks?.filter(b => b.reason === reason) || [];

    if (recentViolations.length >= BLOCK_THRESHOLD) {
      const blockDuration = Math.min(
        24 * 60 * 60 * 1000 * (recentViolations.length - BLOCK_THRESHOLD + 2),
        7 * 24 * 60 * 60 * 1000 // max 7 days
      );
      const blockedUntil = Date.now() + blockDuration;

      await supabase.from('ai_blocked_ips').insert({
        ip_address: ip,
        reason,
        blocked_by: 'system',
        expires_at: new Date(blockedUntil).toISOString(),
        metadata: { user_id: userId, violation_count: recentViolations.length + 1 },
      });

      await supabase.from('ai_audit_logs').insert({
        user_id: userId,
        action: 'ip_auto_blocked',
        parameters: { ip, reason, violation_count: recentViolations.length + 1 },
        context: 'client',
        severity: 'critical',
      });

      return { blocked: true, blockedUntil };
    }

    await supabase.from('ai_blocked_ips').insert({
      ip_address: ip,
      reason,
      blocked_by: 'system',
      metadata: { user_id: userId },
    });
  } catch (error) {
    console.warn('recordViolation failed:', error);
  }

  return { blocked: false };
}

export async function checkIpBlocked(ip: string | null): Promise<AiBlockedIp | null> {
  if (!ip) return null;

  try {
    const { data } = await supabase
      .from('ai_blocked_ips')
      .select('*')
      .eq('ip_address', ip)
      .gte('expires_at', new Date().toISOString())
      .order('blocked_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return data || null;
  } catch {
    return null;
  }
}

export async function getAllBlockedIps(): Promise<AiBlockedIp[]> {
  try {
    const { data } = await supabase
      .from('ai_blocked_ips')
      .select('*')
      .gte('expires_at', new Date().toISOString())
      .order('blocked_at', { ascending: false });

    return data || [];
  } catch {
    return [];
  }
}
