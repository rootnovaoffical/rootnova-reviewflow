import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { action, email, role, organization_id, business_id } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: Deno.env.get("SUPABASE_ANON_KEY")! },
    });
    const user = await userRes.json();
    if (!user.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const profileRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}&select=role,account_status,email,full_name`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
    });
    const profiles = await profileRes.json();
    const profile = profiles[0];
    if (!profile || profile.account_status === "SUSPENDED") {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "invite") {
      const canInvite = canInviteRole(profile.role, role, organization_id);
      if (!canInvite) {
        return new Response(JSON.stringify({ error: "Not authorized to invite this role" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Set expiry to 7 days from now
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const inviteRes = await fetch(`${supabaseUrl}/rest/v1/admin_invitations`, {
        method: "POST",
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify({
          email,
          role,
          business_id: business_id || null,
          organization_id: organization_id || null,
          status: "INVITED",
          invited_by: user.id,
          expires_at: expiresAt,
        }),
      });
      const inviteData = await inviteRes.json();
      const invitation = inviteData[0];

      await fetch(`${supabaseUrl}/rest/v1/audit_logs`, {
        method: "POST",
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ actor_id: user.id, actor_email: profile.email, action: "admin_invited", target_type: "admin_invitation", target_id: invitation.id, organization_id: organization_id || null, metadata: { email, role } }),
      });

      return new Response(JSON.stringify({ ok: true, invitation }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

function canInviteRole(inviterRole: string, targetRole: string, _orgId?: string): boolean {
  if (targetRole === "ROOTNOVA_SUPER_ADMIN") return inviterRole === "ROOTNOVA_SUPER_ADMIN";
  if (targetRole === "ROOTNOVA_ADMIN") return inviterRole === "ROOTNOVA_SUPER_ADMIN" || inviterRole === "ROOTNOVA_ADMIN";
  if (targetRole === "PARTNER_OWNER" || targetRole === "PARTNER_ADMIN") return inviterRole === "ROOTNOVA_SUPER_ADMIN" || inviterRole === "ROOTNOVA_ADMIN" || inviterRole === "PARTNER_OWNER";
  if (targetRole === "PARTNER_TEAM_MEMBER") return inviterRole === "PARTNER_OWNER" || inviterRole === "PARTNER_ADMIN";
  if (targetRole === "BUSINESS_ADMIN") return true;
  return false;
}
