// supabase/functions/process-auto-deposits/index.ts
// Cron: processa goal_auto_deposits vencidos.
import { getServiceClient, isCronAuthorized } from "../_shared/admin.ts";
import { handleCors, json } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req); if (cors) return cors;
  try {
    if (!(await isCronAuthorized(req))) return json({ error: "Não autorizado" }, { status: 401 });
    const supabase = getServiceClient();
    const now = new Date().toISOString();
    const { data: due } = await supabase.from("goal_auto_deposits")
      .select("*, goals(*), accounts(*)")
      .eq("active", true).lte("next_run_at", now);

    let count = 0;
    for (const d of due ?? []) {
      const goal = d.goals as { id: string; current_amount?: number | null; target_amount?: number | null } | null;
      const account = d.accounts as { id: string } | null;
      if (!goal?.id) continue;
      const amount = Number(d.amount);
      if (!amount || amount <= 0) continue;
      // Cria transação expense na conta
      const { data: tx } = await supabase.from("transactions").insert({
        user_id: d.user_id,
        account_id: account?.id ?? null,
        description: `Depósito automático: meta`,
        amount,
        type: "expense",
        status: "confirmed",
        date: new Date().toISOString().slice(0, 10),
      }).select().single();
      if (tx) {
        const target = Number(goal.target_amount);
        const current = Number(goal.current_amount ?? 0);
        const nextBalance = Number.isFinite(target) && target > 0 ? Math.min(current + amount, target) : current + amount;
        await supabase.from("goals").update({ current_amount: nextBalance }).eq("id", goal.id);
        // Agenda a próxima execução conforme a frequência
        const next = new Date();
        if (d.frequency === "daily") next.setDate(next.getDate() + 1);
        else if (d.frequency === "weekly") next.setDate(next.getDate() + 7);
        else if (d.frequency === "monthly") next.setMonth(next.getMonth() + 1);
        else next.setDate(next.getDate() + 1);
        await supabase.from("goal_auto_deposits").update({ last_run_at: now, next_run_at: next.toISOString() }).eq("id", d.id);
        count++;
      }
    }
    return json({ ok: true, processed: count });
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 500 });
  }
});