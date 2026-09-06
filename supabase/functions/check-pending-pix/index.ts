// supabase/functions/check-pending-pix/index.ts
// Notifica admins sobre PIX pendentes há mais de 2h.
// Aceita x-cron-secret (agenda pg_cron) OU admin autenticado (chamada manual do painel).
import { getServiceClient, getAuthenticatedUser, isCronAuthorized, isAdminUser } from "../_shared/admin.ts";
import { handleCors, json } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req); if (cors) return cors;
  try {
    if (!(await isCronAuthorized(req))) {
      const user = await getAuthenticatedUser(req.headers.get("Authorization") ?? "");
      if (!user || !(await isAdminUser(user.id))) return json({ error: "Não autorizado" }, { status: 401 });
    }
    const supabase = getServiceClient();
    const { data: pendentes } = await supabase
      .from("pix_payments")
      .select("id, user_id, amount, created_at")
      .eq("status", "pending")
      .lt("created_at", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString());
    if (!pendentes || pendentes.length === 0) return json({ ok: true, count: 0 });

    const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
    const notifications = (admins ?? []).map((a) => ({
      user_id: a.user_id,
      title: "PIX pendente",
      body: `${pendentes.length} pagamento(s) PIX aguardando há mais de 2h`,
      type: "admin_alert",
    }));
    if (notifications.length > 0) await supabase.from("notifications").insert(notifications);
    return json({ ok: true, count: pendentes.length });
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 500 });
  }
});