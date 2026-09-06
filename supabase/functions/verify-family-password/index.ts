// supabase/functions/verify-family-password/index.ts
import { getServiceClient } from "../_shared/admin.ts";
import { getUserClient, getAuthenticatedUser } from "../_shared/admin.ts";
import { handleCors, json } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req); if (cors) return cors;
  try {
    const user = await getAuthenticatedUser(req.headers.get("Authorization") ?? "");
    if (!user) return json({ error: "Não autenticado" }, { status: 401 });

    const supabase = getServiceClient();
    const { inviteCode, adminPassword }: { inviteCode: string; adminPassword: string } = await req.json();
    void getUserClient;

    // Resolve group + owner_id via RPC (returns group_id and owner_id)
    const { data: ownerData, error: ownerError } = await supabase.rpc("get_group_owner_by_code", { code: inviteCode });
    if (ownerError) throw ownerError;
    if (!ownerData || ownerData.length === 0) {
      return json({ error: "Código de convite inválido" }, { status: 404 });
    }

    const owner = ownerData[0] as { group_id: string; owner_id: string };

    // Get owner auth email via admin API (service role)
    const { data: adminUser, error: adminUserError } = await supabase.auth.admin.getUserById(owner.owner_id);
    if (adminUserError || !adminUser.user?.email) {
      return json({ error: "Administrador não encontrado" }, { status: 404 });
    }

    const ownerEmail = adminUser.user.email;

    // Verify admin password via auth REST API (server-side — does not affect client session)
    const verifyUrl = `${Deno.env.get("SUPABASE_URL")}/auth/v1/token?grant_type=password`;
    const verifyResp = await fetch(verifyUrl, {
      method: "POST",
      headers: {
        "apikey": Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: ownerEmail, password: adminPassword }),
    });

    if (!verifyResp.ok) {
      return json({ error: "Senha do administrador incorreta" }, { status: 403 });
    }

    // Check if requester is already a member
    const { data: existingMember } = await supabase
      .from("family_members")
      .select("id")
      .eq("group_id", owner.group_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (existingMember) {
      return json({ error: "Você já é membro deste grupo" }, { status: 400 });
    }

    // Add user directly as a member (instant approval)
    const { error: memberError } = await supabase
      .from("family_members")
      .insert({
        group_id: owner.group_id,
        user_id: user.id,
        role: "member",
      });
    if (memberError) throw memberError;

    await supabase.rpc("log_admin_action", {
      p_action: "family_join_by_password",
      p_target_type: "family_group",
      p_target_id: owner.group_id,
      p_details: { member_id: user.id, owner_email: ownerEmail },
    });

    const { data: group } = await supabase
      .from("family_groups")
      .select("name")
      .eq("id", owner.group_id)
      .single();

    return json({ ok: true, groupId: owner.group_id, groupName: group?.name || "Grupo" });
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 500 });
  }
});
