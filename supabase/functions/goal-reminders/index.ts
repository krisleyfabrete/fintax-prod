// supabase/functions/goal-reminders/index.ts
// Cron: processa goal_reminders ativos e dispara notificações.
import { getServiceClient, isCronAuthorized } from "../_shared/admin.ts";
import { handleCors, json } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req); if (cors) return cors;
  try {
    if (!(await isCronAuthorized(req))) return json({ error: "Não autorizado" }, { status: 401 });
    const supabase = getServiceClient();
    const now = new Date();
    const { data: due } = await supabase.from("goal_reminders")
      .select("*").eq("active", true).lte("next_reminder_at", now.toISOString());
    let count = 0;
    for (const r of due ?? []) {
      await supabase.from("notifications").insert({
        user_id: r.user_id, title: "Lembrete de meta", type: "goal_reminder",
        body: "Você tem um lembrete de meta ativo.",
      });
      const next = new Date(now);
      if (r.frequency === "daily") next.setDate(next.getDate() + 1);
      else if (r.frequency === "weekly") next.setDate(next.getDate() + 7);
      else if (r.frequency === "monthly") next.setMonth(next.getMonth() + 1);
      else next.setDate(next.getDate() + 1);
      await supabase.from("goal_reminders").update({ next_reminder_at: next.toISOString() }).eq("id", r.id);
      count++;
    }
    return json({ ok: true, count });
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 500 });
  }
});