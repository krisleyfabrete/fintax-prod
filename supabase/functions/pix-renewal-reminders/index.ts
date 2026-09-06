// supabase/functions/pix-renewal-reminders/index.ts
// Cron: lembretes de renovação e expira assinaturas Asaas com current_period_end < now.
import { getServiceClient, isCronAuthorized } from "../_shared/admin.ts";
import { handleCors, json } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req); if (cors) return cors;
  try {
    if (!(await isCronAuthorized(req))) return json({ error: "Não autorizado" }, { status: 401 });
    const supabase = getServiceClient();
    const now = new Date().toISOString();
    // Expira
    const { data: expired } = await supabase.from("subscriptions")
      .select("id,user_id").lt("current_period_end", now).neq("plan", "free").in("status", ["active","overdue"]);
    for (const s of expired ?? []) {
      await supabase.from("subscriptions").update({ status: "expired", plan: "free" }).eq("id", s.id);
      await supabase.from("notifications").insert({
        user_id: s.user_id, title: "Assinatura expirada", type: "subscription",
        body: "Sua assinatura expirou. Renove para continuar com os benefícios Pro/Family.",
      });
    }
    // Lembretes 3 dias antes
    const soon = new Date(Date.now() + 3 * 86400000).toISOString();
    const { data: about } = await supabase.from("subscriptions")
      .select("id,user_id,current_period_end").gt("current_period_end", now).lt("current_period_end", soon).neq("plan", "free").eq("status", "active");
    for (const s of about ?? []) {
      await supabase.from("notifications").insert({
        user_id: s.user_id, title: "Renovação próxima", type: "subscription",
        body: "Sua assinatura será renovada automaticamente em poucos dias.",
      });
    }
    return json({ ok: true, expired: expired?.length ?? 0, reminded: about?.length ?? 0 });
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 500 });
  }
});