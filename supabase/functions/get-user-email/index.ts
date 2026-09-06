// supabase/functions/get-user-email/index.ts
import { getServiceClient, getAuthenticatedUser } from "../_shared/admin.ts";
import { handleCors, json } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req); if (cors) return cors;
  try {
    const supabase = getServiceClient();
    const user = await getAuthenticatedUser(req.headers.get("Authorization") ?? "");
    if (!user) return json({ error: "Não autenticado" }, { status: 401 });
    const { data: hasAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!hasAdmin) return json({ error: "Sem permissão" }, { status: 403 });

    const { user_id } = await req.json();
    const { data } = await supabase.auth.admin.getUserById(user_id);
    return json({ email: data.user?.email });
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 500 });
  }
});