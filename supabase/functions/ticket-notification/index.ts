// supabase/functions/ticket-notification/index.ts
import { getServiceClient } from "../_shared/admin.ts";
import { handleCors, json } from "../_shared/cors.ts";

interface Body { ticket_id: string; message: string }

Deno.serve(async (req) => {
  const cors = handleCors(req); if (cors) return cors;
  try {
    const supabase = getServiceClient();
    const { data: { user } } = await supabase.auth.getUser(req.headers.get("Authorization")?.replace("Bearer ", "") ?? "");
    if (!user) return json({ error: "Não autenticado" }, { status: 401 });
    const { data: hasAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!hasAdmin) return json({ error: "Sem permissão" }, { status: 403 });

    const body: Body = await req.json();
    const { data: ticket } = await supabase.from("support_tickets").select("user_id,subject").eq("id", body.ticket_id).single();
    if (!ticket) return json({ error: "ticket não encontrado" }, { status: 404 });
    await supabase.from("notifications").insert({
      user_id: ticket.user_id, title: `Suporte: ${ticket.subject}`, body: body.message, type: "support",
    });
    await supabase.from("ticket_messages").insert({ ticket_id: body.ticket_id, user_id: user.id, message: body.message, is_admin: true });
    await supabase.from("analytics_events").insert({ user_id: user.id, event_name: "ticket_admin_reply", event_data: { ticket_id: body.ticket_id } });
    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 500 });
  }
});