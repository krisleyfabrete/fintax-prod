// supabase/functions/setup-admin/index.ts
// Bootstrap: transforma o email configurado em ADMIN_EMAIL em admin.
// Protegido: aceita apenas chamadas com x-cron-secret válido OU do próprio dono
// do ADMIN_EMAIL autenticado. O header x-admin-email foi removido (escalada de privilégio).
import { getServiceClient, getAuthenticatedUser, isCronAuthorized } from "../_shared/admin.ts";
import { handleCors, json } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req); if (cors) return cors;
  try {
    const supabase = getServiceClient();
    const adminEmail = Deno.env.get("ADMIN_EMAIL");
    if (!adminEmail) return json({ error: "ADMIN_EMAIL não configurado" }, { status: 400 });

    const user = await getAuthenticatedUser(req.headers.get("Authorization") ?? "");
    const isOwner = !!user?.email && user.email.toLowerCase() === adminEmail.toLowerCase();
    const cronOk = await isCronAuthorized(req);
    if (!cronOk && !isOwner) return json({ error: "Não autorizado" }, { status: 401 });

    const { data: users } = await supabase.auth.admin.listUsers();
    const target = users.users.find((u) => u.email?.toLowerCase() === adminEmail.toLowerCase());
    if (!target) return json({ error: "Usuário não encontrado" }, { status: 404 });

    await supabase.from("user_roles").delete().eq("user_id", target.id);
    await supabase.from("user_roles").insert({ user_id: target.id, role: "admin" });
    await supabase.rpc("log_admin_action", { p_action: "setup_admin", p_target_type: "user", p_target_id: target.id, p_details: { email: adminEmail } });
    return json({ ok: true, user_id: target.id });
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 500 });
  }
});