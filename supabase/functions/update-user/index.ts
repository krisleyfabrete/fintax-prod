// supabase/functions/update-user/index.ts
import { getServiceClient, getAuthenticatedUser } from "../_shared/admin.ts";
import { handleCors, json } from "../_shared/cors.ts";

interface Body {
  user_id: string;
  full_name?: string;
  role?: "user" | "premium" | "admin";
  plan?: "free" | "pro" | "family";
}

Deno.serve(async (req) => {
  const cors = handleCors(req); if (cors) return cors;
  try {
    const supabase = getServiceClient();
    const user = await getAuthenticatedUser(req.headers.get("Authorization") ?? "");
    if (!user) return json({ error: "Não autenticado" }, { status: 401 });
    const { data: hasAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!hasAdmin) return json({ error: "Sem permissão" }, { status: 403 });

    const body: Body = await req.json();
    if (body.full_name) await supabase.from("profiles").update({ full_name: body.full_name }).eq("id", body.user_id);
    if (body.role) await supabase.from("user_roles").update({ role: body.role }).eq("user_id", body.user_id);
    if (body.plan) await supabase.from("subscriptions").update({ plan: body.plan, status: "active" }).eq("user_id", body.user_id);
    await supabase.rpc("log_admin_action", { p_action: "update_user", p_target_type: "user", p_target_id: body.user_id, p_details: body });
    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 500 });
  }
});