// supabase/functions/_shared/cors.ts
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

export function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
}

export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  return null;
}