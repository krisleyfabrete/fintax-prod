// supabase/functions/create-user/index.ts
// Admin cria usuário.
import { getServiceClient, getAuthenticatedUser } from "../_shared/admin.ts";
import { handleCors, json } from "../_shared/cors.ts";

interface Body {
  email: string;
  password: string;
  full_name?: string;
  role?: "user" | "premium" | "admin";
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
    const { data: created, error } = await supabase.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: { full_name: body.full_name },
    });
    if (error) return json({ error: error.message }, { status: 400 });

    if (body.role && body.role !== "user" && created.user) {
      await supabase.from("user_roles").update({ role: body.role }).eq("user_id", created.user.id);
    }
    await supabase.rpc("log_admin_action", { p_action: "create_user", p_target_type: "user", p_target_id: created.user?.id, p_details: { email: body.email } });
    return json({ user: created.user });
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 500 });
  }
});