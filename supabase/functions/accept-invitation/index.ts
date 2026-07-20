import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { token, action } = body;

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Missing invitation token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Require a valid authenticated user
    const authHeader = req.headers.get("Authorization") || "";
    const userToken = authHeader.replace("Bearer ", "");

    if (!userToken || userToken === "") {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Verify the user's session
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${userToken}`, apikey: anonKey },
    });
    const authUser = await userRes.json();

    if (!authUser || !authUser.id) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch the invitation with service role key
    const serviceHeaders = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    };

    const invRes = await fetch(
      `${supabaseUrl}/rest/v1/admin_invitations?id=eq.${token}&select=*&limit=1`,
      { headers: serviceHeaders },
    );
    const invitations = await invRes.json();

    if (!invitations || invitations.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired invitation" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const invitation = invitations[0];

    // Check that the invitation is still pending
    if (invitation.status !== "INVITED") {
      return new Response(
        JSON.stringify({ error: "This invitation has already been used or revoked" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Check expiry (if expires_at is set)
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "This invitation has expired" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Verify that the authenticated user's email matches the invitation email
    if (authUser.email !== invitation.email) {
      return new Response(
        JSON.stringify({ error: "This invitation is not for your account" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Action: lookup — return invitation details for the form
    if (action === "lookup") {
      return new Response(
        JSON.stringify({ email: invitation.email, role: invitation.role }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Action: accept — assign the role to the existing authenticated user
    const { fullName } = body;

    if (!fullName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Upsert the profile with the invitation's role
    await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${authUser.id}`, {
      method: "POST",
      headers: { ...serviceHeaders, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        id: authUser.id,
        email: invitation.email,
        full_name: fullName,
        role: invitation.role,
        account_status: "ACTIVE",
      }),
    });

    // If partner role, add to organization_members
    if (invitation.role.startsWith("PARTNER") && invitation.organization_id) {
      const memberRole = invitation.role === "PARTNER_OWNER"
        ? "OWNER"
        : invitation.role === "PARTNER_ADMIN"
        ? "ADMIN"
        : "TEAM_MEMBER";

      await fetch(`${supabaseUrl}/rest/v1/organization_members`, {
        method: "POST",
        headers: { ...serviceHeaders, Prefer: "return=minimal" },
        body: JSON.stringify({
          organization_id: invitation.organization_id,
          user_id: authUser.id,
          role: memberRole,
          status: "ACTIVE",
        }),
      });
    }

    // If business admin, add to business_admins
    if (invitation.role === "BUSINESS_ADMIN" && invitation.business_id) {
      await fetch(`${supabaseUrl}/rest/v1/business_admins`, {
        method: "POST",
        headers: { ...serviceHeaders, Prefer: "return=minimal" },
        body: JSON.stringify({
          business_id: invitation.business_id,
          user_id: authUser.id,
        }),
      });
    }

    // Mark invitation as accepted
    await fetch(`${supabaseUrl}/rest/v1/admin_invitations?id=eq.${token}`, {
      method: "PATCH",
      headers: { ...serviceHeaders, Prefer: "return=minimal" },
      body: JSON.stringify({
        status: "ACCEPTED",
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });

    // Log the acceptance in audit_logs
    await fetch(`${supabaseUrl}/rest/v1/audit_logs`, {
      method: "POST",
      headers: { ...serviceHeaders, Prefer: "return=minimal" },
      body: JSON.stringify({
        actor_id: authUser.id,
        actor_email: invitation.email,
        action: "invitation_accepted",
        target_type: "admin_invitation",
        target_id: token,
        metadata: { role: invitation.role },
      }),
    });

    return new Response(
      JSON.stringify({
        success: true,
        role: invitation.role,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
