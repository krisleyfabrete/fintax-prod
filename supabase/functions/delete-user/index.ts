// supabase/functions/delete-user/index.ts
import { getServiceClient, getAuthenticatedUser } from "../_shared/admin.ts";
import { handleCors, json } from "../_shared/cors.ts";

interface Body { user_id: string }

Deno.serve(async (req) => {
  const cors = handleCors(req); if (cors) return cors;
  try {
    const supabase = getServiceClient();
    const user = await getAuthenticatedUser(req.headers.get("Authorization") ?? "");
    if (!user) return json({ error: "Não autenticado" }, { status: 401 });
    const { data: hasAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!hasAdmin) return json({ error: "Sem permissão" }, { status: 403 });

    const body: Body = await req.json();
    const { error } = await supabase.auth.admin.deleteUser(body.user_id);
    if (error) return json({ error: error.message }, { status: 400 });
    await supabase.rpc("log_admin_action", { p_action: "delete_user", p_target_type: "user", p_target_id: body.user_id, p_details: {} });
    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 500 });
  }
});