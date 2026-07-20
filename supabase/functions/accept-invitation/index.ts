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
    const { token, password, fullName, action } = body;

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Missing invitation token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const headers = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    };

    // Fetch the invitation with service role key
    const invRes = await fetch(
      `${supabaseUrl}/rest/v1/admin_invitations?id=eq.${token}&status=eq.INVITED`,
      { headers },
    );
    const invitations = await invRes.json();

    if (!invitations || invitations.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired invitation" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const invitation = invitations[0];

    // Check expiry
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "This invitation has expired" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Action: lookup — return invitation details for the form
    if (action === "lookup") {
      return new Response(
        JSON.stringify({ email: invitation.email, role: invitation.role }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Action: accept — create the account
    if (!password || !fullName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Create the auth user via the Supabase Admin API
    const userRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: invitation.email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      }),
    });

    if (!userRes.ok) {
      const errBody = await userRes.json();
      return new Response(
        JSON.stringify({ error: errBody.msg || errBody.message || "Failed to create account" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const user = await userRes.json();

    // 4. Upsert the profile with the invitation's role
    await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}`, {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        id: user.id,
        email: invitation.email,
        full_name: fullName,
        role: invitation.role,
        account_status: "ACTIVE",
      }),
    });

    // 5. If partner role, add to organization_members
    if (invitation.role.startsWith("PARTNER") && invitation.organization_id) {
      const memberRole = invitation.role === "PARTNER_OWNER"
        ? "OWNER"
        : invitation.role === "PARTNER_ADMIN"
        ? "ADMIN"
        : "TEAM_MEMBER";

      await fetch(`${supabaseUrl}/rest/v1/organization_members`, {
        method: "POST",
        headers: { ...headers, Prefer: "return=minimal" },
        body: JSON.stringify({
          organization_id: invitation.organization_id,
          user_id: user.id,
          role: memberRole,
          status: "ACTIVE",
        }),
      });
    }

    // 6. If business admin, add to business_admins
    if (invitation.role === "BUSINESS_ADMIN" && invitation.business_id) {
      await fetch(`${supabaseUrl}/rest/v1/business_admins`, {
        method: "POST",
        headers: { ...headers, Prefer: "return=minimal" },
        body: JSON.stringify({
          business_id: invitation.business_id,
          user_id: user.id,
        }),
      });
    }

    // 7. Mark invitation as accepted
    await fetch(`${supabaseUrl}/rest/v1/admin_invitations?id=eq.${token}`, {
      method: "PATCH",
      headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify({
        status: "ACCEPTED",
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });

    // 8. Try to sign in the user to get a session
    const signInRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: invitation.email,
        password,
      }),
    });

    const session = signInRes.ok ? await signInRes.json() : null;

    return new Response(
      JSON.stringify({
        success: true,
        session: session?.access_token ? session : null,
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
