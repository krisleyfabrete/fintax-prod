// supabase/functions/_shared/admin.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

export function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export function getUserClient(authHeader: string) {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function getAuthenticatedUser(authHeader: string) {
  const supabase = getServiceClient();
  const token = authHeader.replace("Bearer ", "").replace("Bearer", "").trim();
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  return user;
}

export async function isCronAuthorized(req: Request): Promise<boolean> {
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret) return false;
  const received = req.headers.get("x-cron-secret");
  return received !== null && received === secret;
}

export async function isAdminUser(userId: string): Promise<boolean> {
  const supabase = getServiceClient();
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  return data === true;
}

export async function getPlanPrices(): Promise<Record<string, { monthly: number; yearly: number }>> {
  const supabase = getServiceClient();
  const { data } = await supabase.from("admin_settings").select("value").eq("key", "plan_prices").maybeSingle();
  const v = (data?.value as Record<string, { monthly: number; yearly: number }>) ?? {};
  return {
    free: v.free ?? { monthly: 0, yearly: 0 },
    pro: v.pro ?? { monthly: 2990, yearly: 29990 },
    family: v.family ?? { monthly: 4990, yearly: 49990 },
  };
}

export async function getTrialDays(): Promise<number> {
  const supabase = getServiceClient();
  const { data } = await supabase.from("admin_settings").select("value").eq("key", "trial_days").maybeSingle();
  return Number((data?.value as number) ?? 30);
}