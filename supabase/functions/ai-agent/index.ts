import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

interface RequestBody {
  action: string;
  businessId: string;
  [key: string]: unknown;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { action, businessId } = body;

    if (!businessId) {
      return json({ error: "Missing businessId" }, 400);
    }

    switch (action) {
      case "generate_recommendations":
        return await generateRecommendations(businessId, body);
      case "generate_briefing":
        return await generateBriefing(businessId, body);
      case "generate_simulation":
        return await generateSimulation(businessId, body);
      case "generate_goal_strategy":
        return await generateGoalStrategy(businessId, body);
      case "analyze_business_health":
        return await analyzeBusinessHealth(businessId);
      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ============================================================
// Gather real business data from all modules
// ============================================================
async function gatherBusinessContext(businessId: string) {
  const [
    reviews,
    customers,
    messages,
    workflows,
    executions,
    campaigns,
    actionItems,
    loyaltyPrograms,
    customerLoyalty,
    templates,
  ] = await Promise.all([
    supabase.from("review_sessions").select("rating, business_response, created_at, ai_generated_review").eq("business_id", businessId).order("created_at", { ascending: false }).limit(100),
    supabase.from("customers").select("id, segment, total_visits, total_reviews, avg_rating, last_visit_at, created_at").eq("business_id", businessId),
    supabase.from("messages").select("status, channel, created_at").eq("business_id", businessId).order("created_at", { ascending: false }).limit(100),
    supabase.from("workflows").select("id, name, status, execution_count, success_count, failure_count, trigger_type").eq("business_id", businessId),
    supabase.from("workflow_executions").select("status, duration_ms, created_at").eq("business_id", businessId).order("created_at", { ascending: false }).limit(50),
    supabase.from("campaigns").select("id, name, status, reach_count, response_count, conversion_count, campaign_type").eq("business_id", businessId),
    supabase.from("action_items").select("id, title, priority_level, status, confidence").eq("business_id", businessId),
    supabase.from("loyalty_programs").select("id, name, status, redeemed_count, target_count").eq("business_id", businessId),
    supabase.from("customer_loyalty").select("points, visits_counted, reward_unlocked").eq("business_id", businessId),
    supabase.from("message_templates").select("id, name, channel, category, is_active").eq("business_id", businessId),
  ]);

  const completedReviews = (reviews.data ?? []).filter((r) => r.rating !== null);
  const avgRating = completedReviews.length > 0
    ? completedReviews.reduce((s, r) => s + (r.rating ?? 0), 0) / completedReviews.length
    : 0;
  const negativeReviews = completedReviews.filter((r) => (r.rating ?? 0) <= 2);
  const positiveReviews = completedReviews.filter((r) => (r.rating ?? 0) >= 4);
  const respondedReviews = completedReviews.filter((r) => r.business_response);
  const responseRate = completedReviews.length > 0 ? (respondedReviews.length / completedReviews.length) * 100 : 0;

  const customerSegments: Record<string, number> = {};
  for (const c of customers.data ?? []) {
    customerSegments[c.segment] = (customerSegments[c.segment] || 0) + 1;
  }

  const messageStats = {
    total: messages.data?.length ?? 0,
    delivered: messages.data?.filter((m) => ["delivered", "read", "clicked"].includes(m.status)).length ?? 0,
    failed: messages.data?.filter((m) => m.status === "failed").length ?? 0,
    read: messages.data?.filter((m) => ["read", "clicked"].includes(m.status)).length ?? 0,
  };

  const workflowStats = {
    total: workflows.data?.length ?? 0,
    active: workflows.data?.filter((w) => w.status === "active").length ?? 0,
    totalExecutions: workflows.data?.reduce((s, w) => s + (w.execution_count || 0), 0) ?? 0,
    successRate: 0,
  };
  const totalExec = workflowStats.totalExecutions;
  const totalSuccess = workflows.data?.reduce((s, w) => s + (w.success_count || 0), 0) ?? 0;
  workflowStats.successRate = totalExec > 0 ? (totalSuccess / totalExec) * 100 : 0;

  const campaignStats = {
    total: campaigns.data?.length ?? 0,
    active: campaigns.data?.filter((c) => c.status === "active").length ?? 0,
    totalReach: campaigns.data?.reduce((s, c) => s + (c.reach_count || 0), 0) ?? 0,
    totalConversion: campaigns.data?.reduce((s, c) => s + (c.conversion_count || 0), 0) ?? 0,
  };

  return {
    businessId,
    reviews: {
      total: completedReviews.length,
      avgRating: parseFloat(avgRating.toFixed(2)),
      negative: negativeReviews.length,
      positive: positiveReviews.length,
      responseRate: parseFloat(responseRate.toFixed(1)),
      recentNegative: negativeReviews.slice(0, 5).map((r) => ({
        rating: r.rating,
        date: r.created_at,
        hasResponse: !!r.business_response,
      })),
    },
    customers: {
      total: customers.data?.length ?? 0,
      segments: customerSegments,
      atRisk: customerSegments["at_risk"] || 0,
      churned: customerSegments["churned"] || 0,
      inactive: customerSegments["inactive"] || 0,
      vip: customerSegments["vip"] || 0,
      repeat: customerSegments["repeat"] || 0,
    },
    messages: messageStats,
    workflows: workflowStats,
    campaigns: campaignStats,
    actionItems: {
      total: actionItems.data?.length ?? 0,
      open: actionItems.data?.filter((a) => a.status === "open").length ?? 0,
      critical: actionItems.data?.filter((a) => a.priority_level === "critical").length ?? 0,
    },
    loyalty: {
      programs: loyaltyPrograms.data?.length ?? 0,
      totalMembers: customerLoyalty.data?.length ?? 0,
      rewardsUnlocked: customerLoyalty.data?.filter((l) => l.reward_unlocked).length ?? 0,
    },
    templates: templates.data?.length ?? 0,
  };
}

// ============================================================
// Generate AI recommendations grounded in real data
// ============================================================
async function generateRecommendations(businessId: string, _body: RequestBody) {
  const context = await gatherBusinessContext(businessId);

  const recommendations: Array<Record<string, unknown>> = [];

  // Rule-based recommendations grounded in real data
  if (context.reviews.negative > 0) {
    recommendations.push({
      task_type: "recover_customer",
      title: `Recover ${context.reviews.negative} unhappy customer${context.reviews.negative > 1 ? "s" : ""}`,
      description: `${context.reviews.negative} customer${context.reviews.negative > 1 ? "s have" : " has"} left negative reviews (1-2 stars). Reach out with personalized recovery messages.`,
      reasoning: `Negative reviews directly impact business reputation. With ${context.reviews.negative} negative review${context.reviews.negative > 1 ? "s" : ""}, proactive recovery can convert unhappy customers into loyal advocates.`,
      evidence: { negative_count: context.reviews.negative, avg_rating: context.reviews.avgRating },
      confidence: 0.85,
      priority: "critical",
      expected_impact: "Recover up to 40% of unhappy customers, improving overall rating by 0.2-0.5 stars",
      affected_customers: context.reviews.negative,
    });
  }

  if (context.reviews.responseRate < 50 && context.reviews.total > 0) {
    recommendations.push({
      task_type: "improve_response_rate",
      title: `Improve review response rate (${context.reviews.responseRate.toFixed(0)}%)`,
      description: `Only ${context.reviews.responseRate.toFixed(0)}% of reviews have responses. Responding to reviews builds trust and improves visibility.`,
      reasoning: `Businesses that respond to reviews are seen as more trustworthy. Current response rate is ${context.reviews.responseRate.toFixed(0)}%, below the recommended 80%+.`,
      evidence: { response_rate: context.reviews.responseRate, total_reviews: context.reviews.total },
      confidence: 0.9,
      priority: "high",
      expected_impact: "Increase response rate to 80%+, improving customer trust and Google ranking",
      affected_customers: context.reviews.total,
    });
  }

  if (context.customers.atRisk > 0) {
    recommendations.push({
      task_type: "recover_customer",
      title: `Re-engage ${context.customers.atRisk} at-risk customer${context.customers.atRisk > 1 ? "s" : ""}`,
      description: `${context.customers.atRisk} customer${context.customers.atRisk > 1 ? "s are" : " is"} classified as at-risk. Send targeted re-engagement campaigns.`,
      reasoning: `At-risk customers show declining engagement patterns. Proactive outreach can prevent churn and recover revenue.`,
      evidence: { at_risk_count: context.customers.atRisk },
      confidence: 0.8,
      priority: "high",
      expected_impact: "Recover 30-50% of at-risk customers, preserving recurring revenue",
      affected_customers: context.customers.atRisk,
    });
  }

  if (context.workflows.total === 0 && context.reviews.total > 5) {
    recommendations.push({
      task_type: "create_workflow",
      title: "Create your first automation workflow",
      description: "Automate review follow-ups, customer recovery, and loyalty rewards with workflows.",
      reasoning: `With ${context.reviews.total} reviews, automation can save hours of manual work. No workflows are currently set up.`,
      evidence: { review_count: context.reviews.total, workflow_count: 0 },
      confidence: 0.75,
      priority: "medium",
      expected_impact: "Save 5+ hours per week on manual customer engagement tasks",
      affected_customers: 0,
    });
  }

  if (context.messages.failed > 0) {
    recommendations.push({
      task_type: "improve_communication",
      title: `Fix ${context.messages.failed} failed message${context.messages.failed > 1 ? "s" : ""}`,
      description: `${context.messages.failed} message${context.messages.failed > 1 ? "s" : ""} failed to deliver. Check provider configuration and retry.`,
      reasoning: `Failed messages indicate provider misconfiguration or invalid recipient data. Resolving this ensures communications reach customers.`,
      evidence: { failed_count: context.messages.failed, total_messages: context.messages.total },
      confidence: 0.85,
      priority: "high",
      expected_impact: "Restore 100% message deliverability",
      affected_customers: context.messages.failed,
    });
  }

  if (context.customers.vip > 0 && context.loyalty.programs === 0) {
    recommendations.push({
      task_type: "reward_loyalty",
      title: `Reward ${context.customers.vip} VIP customer${context.customers.vip > 1 ? "s" : ""}`,
      description: `${context.customers.vip} VIP customer${context.customers.vip > 1 ? "s" : ""} have no loyalty program. Create a loyalty program to reward repeat visits.`,
      reasoning: `VIP customers are your most valuable segment. A loyalty program increases retention and lifetime value.`,
      evidence: { vip_count: context.customers.vip, loyalty_programs: 0 },
      confidence: 0.8,
      priority: "medium",
      expected_impact: "Increase VIP retention by 25% and drive repeat visits",
      affected_customers: context.customers.vip,
    });
  }

  if (context.reviews.positive > 0 && context.reviews.responseRate < 100) {
    const unrespondedPositive = context.reviews.positive - context.reviews.positive * (context.reviews.responseRate / 100);
    if (unrespondedPositive > 0) {
      recommendations.push({
        task_type: "respond_to_review",
        title: `Thank ${Math.round(unrespondedPositive)} happy customer${unrespondedPositive > 1 ? "s" : ""}`,
        description: `${Math.round(unrespondedPositive)} positive review${unrespondedPositive > 1 ? "s" : ""} without a response. Thank customers to encourage advocacy.`,
        reasoning: `Thanking happy customers reinforces positive behavior and encourages word-of-mouth referrals.`,
        evidence: { unresponded_positive: Math.round(unrespondedPositive) },
        confidence: 0.7,
        priority: "low",
        expected_impact: "Increase customer advocacy and referral rate by 15%",
        affected_customers: Math.round(unrespondedPositive),
      });
    }
  }

  // Insert recommendations as AI tasks
  const insertedTasks: unknown[] = [];
  for (const rec of recommendations) {
    const { data } = await supabase.from("ai_tasks").insert({
      business_id: businessId,
      task_type: rec.task_type as string,
      title: rec.title as string,
      description: rec.description as string,
      reasoning: rec.reasoning as string,
      evidence: rec.evidence as Record<string, unknown>,
      confidence: rec.confidence as number,
      priority: rec.priority as string,
      status: "recommended",
      expected_impact: rec.expected_impact as string,
      affected_customers: rec.affected_customers as number,
    }).select().maybeSingle();
    if (data) insertedTasks.push(data);
  }

  // Log agent action
  await supabase.from("ai_agent_logs").insert({
    business_id: businessId,
    log_level: "info",
    action: "generate_recommendations",
    reasoning: `Generated ${recommendations.length} recommendations based on real business data`,
    input_data: { context_summary: { reviews: context.reviews.total, customers: context.customers.total, workflows: context.workflows.total } },
    output_data: { count: recommendations.length },
  });

  return json({ recommendations: insertedTasks, context });
}

// ============================================================
// Generate AI briefing grounded in real data
// ============================================================
async function generateBriefing(businessId: string, body: RequestBody) {
  const period = (body.period as string) || "daily";
  const context = await gatherBusinessContext(businessId);

  const wins: string[] = [];
  const risks: string[] = [];
  const recommendations: string[] = [];
  const progress: string[] = [];
  const upcoming: string[] = [];

  // Wins
  if (context.reviews.positive > context.reviews.negative) {
    wins.push(`${context.reviews.positive} positive reviews vs ${context.reviews.negative} negative`);
  }
  if (context.reviews.avgRating >= 4.0) {
    wins.push(`Average rating is ${context.reviews.avgRating} stars`);
  }
  if (context.customers.vip > 0) {
    wins.push(`${context.customers.vip} VIP customer${context.customers.vip > 1 ? "s" : ""} in your base`);
  }
  if (context.workflows.active > 0) {
    wins.push(`${context.workflows.active} active workflow${context.workflows.active > 1 ? "s" : ""} running`);
  }

  // Risks
  if (context.reviews.negative > 0) {
    risks.push(`${context.reviews.negative} negative review${context.reviews.negative > 1 ? "s need" : " needs"} attention`);
  }
  if (context.reviews.responseRate < 50) {
    risks.push(`Response rate at ${context.reviews.responseRate.toFixed(0)}% — below recommended 80%`);
  }
  if (context.customers.atRisk > 0) {
    risks.push(`${context.customers.atRisk} at-risk customer${context.customers.atRisk > 1 ? "s" : ""} may churn`);
  }
  if (context.messages.failed > 0) {
    risks.push(`${context.messages.failed} message${context.messages.failed > 1 ? "s" : ""} failed delivery`);
  }

  // Recommendations
  if (context.reviews.negative > 0) {
    recommendations.push(`Reach out to ${context.reviews.negative} unhappy customer${context.reviews.negative > 1 ? "s" : ""} with recovery messages`);
  }
  if (context.reviews.responseRate < 80) {
    recommendations.push(`Increase review response rate from ${context.reviews.responseRate.toFixed(0)}% to 80%+`);
  }
  if (context.customers.atRisk > 0) {
    recommendations.push(`Launch re-engagement campaign for ${context.customers.atRisk} at-risk customers`);
  }

  // Progress
  if (context.workflows.totalExecutions > 0) {
    progress.push(`${context.workflows.totalExecutions} total workflow executions with ${context.workflows.successRate.toFixed(0)}% success rate`);
  }
  if (context.loyalty.totalMembers > 0) {
    progress.push(`${context.loyalty.totalMembers} loyalty members, ${context.loyalty.rewardsUnlocked} rewards unlocked`);
  }

  // Upcoming
  if (context.campaigns.active > 0) {
    upcoming.push(`${context.campaigns.active} active campaign${context.campaigns.active > 1 ? "s" : ""} running`);
  }
  if (context.customers.inactive > 0) {
    upcoming.push(`${context.customers.inactive} inactive customer${context.customers.inactive > 1 ? "s" : ""} could be re-engaged`);
  }

  const summary = `${period.charAt(0).toUpperCase() + period.slice(1)} briefing: ${context.reviews.total} reviews (${context.reviews.avgRating} avg), ${context.customers.total} customers, ${context.workflows.active} active workflows. ${risks.length} risk${risks.length !== 1 ? "s" : ""}, ${wins.length} win${wins.length !== 1 ? "s" : ""}.`;

  const { data: briefing } = await supabase.from("ai_briefings").insert({
    business_id: businessId,
    period,
    briefing_date: new Date().toISOString().slice(0, 10),
    summary,
    wins,
    risks,
    recommendations,
    progress,
    upcoming_opportunities: upcoming,
    metrics_snapshot: context as unknown as Record<string, unknown>,
  }).select().maybeSingle();

  await supabase.from("ai_agent_logs").insert({
    business_id: businessId,
    log_level: "info",
    action: "generate_briefing",
    reasoning: `Generated ${period} briefing with ${wins.length} wins, ${risks.length} risks, ${recommendations.length} recommendations`,
    output_data: { briefing_id: briefing?.id },
  });

  return json({ briefing });
}

// ============================================================
// Generate AI simulation (always labelled as estimate)
// ============================================================
async function generateSimulation(businessId: string, body: RequestBody) {
  const scenario = (body.scenario as string) || "review_response";
  const context = await gatherBusinessContext(businessId);

  let projectedState: Record<string, unknown> = {};
  let assumptions: string[] = [];
  let projectedOutcome = "";
  let confidence = 0.6;

  switch (scenario) {
    case "review_response": {
      const currentResponseRate = context.reviews.responseRate;
      const projectedResponseRate = 90;
      const ratingImprovement = 0.2;
      projectedState = {
        current_response_rate: currentResponseRate,
        projected_response_rate: projectedResponseRate,
        current_avg_rating: context.reviews.avgRating,
        projected_avg_rating: parseFloat((context.reviews.avgRating + ratingImprovement).toFixed(2)),
        additional_reviews_needed: Math.ceil(context.reviews.total * 0.1),
      };
      assumptions = [
        "Response rate increases to 90% within 30 days",
        "Each responded review improves customer perception",
        "Rating improvement is gradual over 60-90 days",
        "Based on industry benchmarks for review response impact",
      ];
      projectedOutcome = `Responding to all reviews could improve average rating from ${context.reviews.avgRating} to ${(context.reviews.avgRating + ratingImprovement).toFixed(2)} stars within 60-90 days.`;
      confidence = 0.7;
      break;
    }
    case "loyalty_improvement": {
      projectedState = {
        current_loyalty_members: context.loyalty.totalMembers,
        projected_members: Math.round(context.customers.total * 0.3),
        current_vip: context.customers.vip,
        projected_vip: Math.round(context.customers.total * 0.15),
        retention_improvement: "15-25%",
      };
      assumptions = [
        "Loyalty program targets 30% of customer base",
        "VIP tier captures top 15% of customers",
        "Retention improvement based on industry loyalty benchmarks",
        "Assumes 60-day rollout period",
      ];
      projectedOutcome = `Implementing a loyalty program could increase retention by 15-25% and convert ${Math.round(context.customers.total * 0.15)} customers to VIP status.`;
      confidence = 0.65;
      break;
    }
    case "review_conversion": {
      const currentConversion = context.reviews.total > 0 ? (context.reviews.total / Math.max(context.customers.total, 1)) * 100 : 0;
      projectedState = {
        current_conversion_rate: parseFloat(currentConversion.toFixed(1)),
        projected_conversion_rate: 40,
        current_reviews: context.reviews.total,
        projected_reviews: Math.round(context.customers.total * 0.4),
      };
      assumptions = [
        "QR code placement optimized at all touchpoints",
        "Follow-up messages sent to customers who don't complete reviews",
        "Industry average review conversion is 30-40%",
        "Assumes 90-day implementation period",
      ];
      projectedOutcome = `Optimizing review conversion could increase from ${currentConversion.toFixed(1)}% to 40%, generating ${Math.round(context.customers.total * 0.4)} total reviews.`;
      confidence = 0.6;
      break;
    }
    case "campaign_launch": {
      projectedState = {
        target_segment: "at_risk",
        target_count: context.customers.atRisk,
        expected_reach: context.customers.atRisk,
        expected_response_rate: "25-35%",
        expected_recovery_rate: "30-50%",
      };
      assumptions = [
        "Campaign targets all at-risk customers",
        "Personalized messaging with special offer",
        "Response rate based on industry re-engagement benchmarks",
        "Assumes 14-day campaign duration",
      ];
      projectedOutcome = `Launching a recovery campaign for ${context.customers.atRisk} at-risk customers could recover 30-50% (${Math.round(context.customers.atRisk * 0.4)} customers).`;
      confidence = 0.6;
      break;
    }
    default: {
      projectedState = { scenario };
      assumptions = ["Custom simulation based on current business data"];
      projectedOutcome = "Custom projection based on current business context.";
      confidence = 0.5;
    }
  }

  const { data: sim } = await supabase.from("ai_simulations").insert({
    business_id: businessId,
    simulation_type: scenario,
    scenario: body.scenarioLabel as string || scenario,
    current_state: context as unknown as Record<string, unknown>,
    projected_state: projectedState,
    assumptions,
    projected_outcome: projectedOutcome,
    confidence,
    is_labelled_estimate: true,
  }).select().maybeSingle();

  await supabase.from("ai_agent_logs").insert({
    business_id: businessId,
    log_level: "ai_reasoning",
    action: "generate_simulation",
    reasoning: `Generated ${scenario} simulation with ${confidence * 100}% confidence. All projections are labelled as estimates.`,
    output_data: { simulation_id: sim?.id },
  });

  return json({ simulation: sim });
}

// ============================================================
// Generate AI strategy for a goal
// ============================================================
async function generateGoalStrategy(businessId: string, body: RequestBody) {
  const goalType = (body.goal_type as string) || "custom";
  const targetValue = (body.target_value as number) || 100;
  const context = await gatherBusinessContext(businessId);

  let strategy = "";
  switch (goalType) {
    case "rating_target": {
      strategy = `To reach ${targetValue} stars: (1) Respond to all ${context.reviews.negative} negative reviews within 24 hours. (2) Send review requests to ${context.customers.total} customers via QR and follow-up messages. (3) Create a workflow that triggers on positive reviews to thank customers. (4) Monitor weekly rating trends and adjust response timing.`;
      break;
    }
    case "review_conversion": {
      strategy = `To reach ${targetValue}% review conversion: (1) Optimize QR code placement at all customer touchpoints. (2) Send automated follow-up messages to customers who don't complete reviews within 48 hours. (3) Create a workflow that triggers on QR scan to send reminders. (4) A/B test review request timing (immediate vs 2-hour delay).`;
      break;
    }
    case "repeat_customers": {
      strategy = `To reach ${targetValue} repeat customers: (1) Launch a loyalty program rewarding ${context.customers.total > 50 ? "every 5th" : "every 3rd"} visit. (2) Create a workflow that triggers on customer visit to send personalized thank-you messages. (3) Segment customers and send targeted re-engagement campaigns to inactive customers. (4) Track repeat visit rate weekly.`;
      break;
    }
    case "reduce_negative": {
      strategy = `To reduce negative reviews to ${targetValue}: (1) Set up a workflow that triggers on negative reviews to alert management immediately. (2) Send recovery messages within 1 hour of negative feedback. (3) Create action items for each negative review with assigned follow-up. (4) Analyze negative review patterns weekly to identify root causes.`;
      break;
    }
    case "increase_loyalty": {
      strategy = `To reach ${targetValue} loyalty members: (1) Create a loyalty program with clear reward tiers. (2) Automatically enroll all new customers. (3) Send campaigns to existing customers promoting the loyalty program. (4) Create a workflow that triggers on reward unlock to notify customers.`;
      break;
    }
    default: {
      strategy = `To reach your goal of ${targetValue}: (1) Set up automated workflows to track progress. (2) Create targeted campaigns to drive engagement. (3) Monitor progress weekly and adjust strategy based on data.`;
    }
  }

  await supabase.from("ai_agent_logs").insert({
    business_id: businessId,
    log_level: "ai_reasoning",
    action: "generate_goal_strategy",
    reasoning: `Generated strategy for ${goalType} goal targeting ${targetValue}`,
    output_data: { strategy_length: strategy.length },
  });

  return json({ strategy });
}

// ============================================================
// Analyze overall business health
// ============================================================
async function analyzeBusinessHealth(businessId: string) {
  const context = await gatherBusinessContext(businessId);

  const healthScore = Math.round(
    (context.reviews.avgRating / 5) * 30 +
    (context.reviews.responseRate / 100) * 20 +
    (context.workflows.successRate / 100) * 15 +
    (context.customers.total > 0 ? Math.min(context.customers.vip / context.customers.total, 0.2) * 100 : 0) * 0.15 +
    (context.messages.total > 0 ? (context.messages.delivered / context.messages.total) * 100 : 100) * 0.10 +
    (context.loyalty.totalMembers > 0 ? 10 : 0)
  );

  const factors: Array<{ factor: string; score: number; weight: number }> = [
    { factor: "Review Rating", score: (context.reviews.avgRating / 5) * 100, weight: 30 },
    { factor: "Response Rate", score: context.reviews.responseRate, weight: 20 },
    { factor: "Workflow Success", score: context.workflows.successRate, weight: 15 },
    { factor: "VIP Ratio", score: context.customers.total > 0 ? Math.min((context.customers.vip / context.customers.total) * 500, 100) : 0, weight: 15 },
    { factor: "Message Delivery", score: context.messages.total > 0 ? (context.messages.delivered / context.messages.total) * 100 : 100, weight: 10 },
    { factor: "Loyalty Program", score: context.loyalty.programs > 0 ? 100 : 0, weight: 10 },
  ];

  const status = healthScore >= 80 ? "healthy" : healthScore >= 60 ? "moderate" : healthScore >= 40 ? "needs_attention" : "critical";

  await supabase.from("ai_agent_logs").insert({
    business_id: businessId,
    log_level: "info",
    action: "analyze_business_health",
    reasoning: `Business health score: ${healthScore}/100 (${status})`,
    output_data: { health_score: healthScore, status },
  });

  return json({ healthScore, status, factors, context });
}
