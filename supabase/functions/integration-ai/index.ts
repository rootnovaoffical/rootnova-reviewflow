import { createClient } from "npm:@supabase/supabase-js@2.45.0";

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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const { business_id, action, context } = body;

    if (!business_id) {
      return new Response(JSON.stringify({ error: "business_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch integration data for AI analysis
    const [installedRes, syncJobsRes, webhookEventsRes, apiUsageRes] = await Promise.all([
      supabase.from("installed_integrations").select("*, provider:integration_providers(*)").eq("business_id", business_id),
      supabase.from("sync_jobs").select("*").eq("business_id", business_id).order("created_at", { ascending: false }).limit(20),
      supabase.from("webhook_events").select("*").eq("business_id", business_id).order("created_at", { ascending: false }).limit(50),
      supabase.from("api_usage").select("*").eq("business_id", business_id).order("created_at", { ascending: false }).limit(100),
    ]);

    const integrations = installedRes.data || [];
    const syncJobs = syncJobsRes.data || [];
    const webhookEvents = webhookEventsRes.data || [];
    const apiUsage = apiUsageRes.data || [];

    // AI analysis: detect issues and recommend improvements
    const insights: Array<{ type: string; severity: string; title: string; description: string; recommendation: string; confidence: number }> = [];

    // 1. Detect broken integrations
    const brokenIntegrations = integrations.filter((i: any) => i.status === "error");
    for (const inst of brokenIntegrations) {
      insights.push({
        type: "broken_integration",
        severity: "critical",
        title: `${inst.provider?.name || "Integration"} has errors`,
        description: inst.last_error || "This integration is in an error state.",
        recommendation: "Check credentials and re-authenticate. If the issue persists, contact the provider.",
        confidence: 0.95,
      });
    }

    // 2. Detect failed syncs
    const failedSyncs = syncJobs.filter((s: any) => s.status === "failed");
    if (failedSyncs.length > 0) {
      insights.push({
        type: "sync_failures",
        severity: "high",
        title: `${failedSyncs.length} recent sync failure${failedSyncs.length > 1 ? "s" : ""}`,
        description: `${failedSyncs[0]?.error_message || "Unknown error"}`,
        recommendation: "Review sync logs for details. Consider switching to manual sync until the issue is resolved.",
        confidence: 0.88,
      });
    }

    // 3. Detect low health scores
    const lowHealth = integrations.filter((i: any) => i.health_score < 70 && i.status === "active");
    for (const inst of lowHealth) {
      insights.push({
        type: "degraded_health",
        severity: "medium",
        title: `${inst.provider?.name || "Integration"} health is degraded (${inst.health_score}%)`,
        description: `Health score: ${inst.health_score}%. Last sync: ${inst.last_sync_at || "never"}.`,
        recommendation: "Monitor this integration closely. Consider increasing sync frequency or re-authenticating.",
        confidence: 0.82,
      });
    }

    // 4. Detect webhook failures
    const failedWebhooks = webhookEvents.filter((e: any) => e.status === "failed" || e.status === "dead_letter");
    if (failedWebhooks.length > 0) {
      insights.push({
        type: "webhook_failures",
        severity: "high",
        title: `${failedWebhooks.length} webhook delivery failure${failedWebhooks.length > 1 ? "s" : ""}`,
        description: `${failedWebhooks[0]?.event_type || "Unknown event"} — ${failedWebhooks[0]?.response_status || "no response"}`,
        recommendation: "Check the webhook endpoint URL and ensure it's accessible. Replay failed events after fixing.",
        confidence: 0.9,
      });
    }

    // 5. Detect unused integrations
    const unusedIntegrations = integrations.filter((i: any) => {
      const lastSync = i.last_sync_at ? new Date(i.last_sync_at).getTime() : 0;
      const daysSinceSync = (Date.now() - lastSync) / (1000 * 60 * 60 * 24);
      return i.status === "active" && daysSinceSync > 7;
    });
    for (const inst of unusedIntegrations) {
      insights.push({
        type: "unused_integration",
        severity: "low",
        title: `${inst.provider?.name || "Integration"} hasn't synced recently`,
        description: `Last sync was ${inst.last_sync_at ? "over 7 days ago" : "never"}.`,
        recommendation: "Consider disabling this integration if no longer needed, or increase sync frequency.",
        confidence: 0.75,
      });
    }

    // 6. Detect high API error rates
    const apiErrors = apiUsage.filter((u: any) => u.status_code >= 400);
    if (apiUsage.length > 0 && apiErrors.length / apiUsage.length > 0.1) {
      insights.push({
        type: "api_error_rate",
        severity: "medium",
        title: `API error rate is ${(apiErrors.length / apiUsage.length * 100).toFixed(0)}%`,
        description: `${apiErrors.length} out of ${apiUsage.length} recent API calls returned errors.`,
        recommendation: "Review API key scopes and rate limits. Check for deprecated endpoints.",
        confidence: 0.85,
      });
    }

    // 7. Recommend missing integrations
    const installedCategories = new Set(integrations.map((i: any) => i.provider?.category));
    const recommendedCategories = ["reviews", "sms", "email", "payments", "crm"];
    const missingCategories = recommendedCategories.filter((c) => !installedCategories.has(c));
    if (missingCategories.length > 0) {
      insights.push({
        type: "missing_integration",
        severity: "low",
        title: `Missing ${missingCategories.length} key integration${missingCategories.length > 1 ? "s" : ""}`,
        description: `No ${missingCategories.join(", ")} integration connected.`,
        recommendation: `Connect a ${missingCategories[0]} provider to unlock more automation and insights.`,
        confidence: 0.7,
      });
    }

    // 8. Recommend automation opportunities
    if (integrations.length >= 2 && syncJobs.filter((s: any) => s.status === "completed").length > 0) {
      insights.push({
        type: "automation_opportunity",
        severity: "info",
        title: "Workflow automation opportunity",
        description: `You have ${integrations.length} active integrations with successful syncs. Consider creating workflows that trigger on sync events.`,
        recommendation: "Create a workflow that triggers when a new review is synced from an integration.",
        confidence: 0.78,
      });
    }

    // Summary
    const summary = {
      total_integrations: integrations.length,
      active: integrations.filter((i: any) => i.status === "active").length,
      errors: brokenIntegrations.length,
      avg_health: integrations.length > 0
        ? Math.round(integrations.reduce((sum: number, i: any) => sum + (i.health_score || 100), 0) / integrations.length)
        : 100,
      total_syncs: syncJobs.length,
      failed_syncs: failedSyncs.length,
      total_webhook_events: webhookEvents.length,
      failed_webhooks: failedWebhooks.length,
      total_api_calls: apiUsage.length,
      api_error_rate: apiUsage.length > 0 ? Math.round((apiErrors.length / apiUsage.length) * 100) : 0,
    };

    return new Response(JSON.stringify({
      insights,
      summary,
      generated_at: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
