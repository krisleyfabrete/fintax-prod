import { supabase } from '@/integrations/supabase/client';

export interface TotpEnrollment {
  factorId: string;
  secret: string;
  uri: string;
  qrCode: string;
}

export type AalLevel = 'aal1' | 'aal2' | undefined;

const TOTP_COOLDOWN_KEY = 'admin_totp_cooldown';
const TOTP_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

export function getTotpCooldown(): number | null {
  try {
    const raw = localStorage.getItem(TOTP_COOLDOWN_KEY);
    if (!raw) return null;
    const timestamp = Number(raw);
    if (Number.isNaN(timestamp)) return null;
    return timestamp;
  } catch {
    return null;
  }
}

export function isTotpCooldownActive(): boolean {
  const cooldown = getTotpCooldown();
  if (!cooldown) return false;
  return Date.now() - cooldown < TOTP_COOLDOWN_MS;
}

export function setTotpCooldown(now = Date.now()): void {
  try {
    localStorage.setItem(TOTP_COOLDOWN_KEY, String(now));
  } catch {
    // ignore storage errors
  }
}

export function clearTotpCooldown(): void {
  try {
    localStorage.removeItem(TOTP_COOLDOWN_KEY);
  } catch {
    // ignore storage errors
  }
}

export async function getCurrentAal(): Promise<AalLevel> {
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return data?.currentLevel;
}

export async function getVerifiedTotpFactorId(): Promise<string | null> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error || !data) return null;
  const verified = data.all.find((f) => f.factor_type === 'totp' && f.status === 'verified');
  return verified?.id ?? null;
}

export async function challengeAndVerifyTotp(
  factorId: string,
  code: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) return { error: error.message };
  const level = await getCurrentAal();
  if (level !== 'aal2') {
    return { error: 'Falha ao confirmar o código. Tente novamente.' };
  }
  return { error: null };
}

export async function startTotpEnrollment(): Promise<{ data: TotpEnrollment | null; error: string | null }> {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'Aplicativo autenticador',
  });
  if (error || !data) {
    return { data: null, error: error?.message ?? 'Erro ao iniciar a configuração do 2FA' };
  }
  return {
    data: {
      factorId: data.id,
      secret: data.totp.secret,
      uri: data.totp.uri,
      qrCode: data.totp.qr_code,
    },
    error: null,
  };
}

export async function unenrollFactor(factorId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  return { error: error?.message ?? null };
}