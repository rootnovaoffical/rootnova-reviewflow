import { supabase } from "./supabase";
import type {
  Customer,
  CustomerEvent,
  ReviewSession,
  Message,
  Campaign,
  CustomerLoyalty,
  WorkflowExecution,
  ActionItem,
  AITask,
  AIRecommendation,
} from "./types";

// =========================================================
// CUSTOMER 360 — AGGREGATION LAYER
// No new tables. Reads from existing modules and unifies.
// =========================================================

export interface TimelineEvent {
  id: string;
  timestamp: string;
  type: string;
  label: string;
  icon: string;
  color: string;
  detail: string | null;
  source: "review" | "message" | "campaign" | "loyalty" | "workflow" | "action" | "ai" | "event";
}

export interface HealthScore {
  score: number;
  band: "excellent" | "good" | "fair" | "at_risk" | "critical";
  factors: Array<{ label: string; value: string; weight: number; contribution: number }>;
  explanation: string;
  confidence: number;
  recommendation: string;
}

export interface RelationshipScore {
  score: number;
  band: "champion" | "engaged" | "casual" | "dormant" | "detractor";
  factors: Array<{ label: string; value: string; contribution: number }>;
  explanation: string;
  confidence: number;
}

export interface FuturePrediction {
  type: "churn_probability" | "expected_ltv" | "next_visit_window" | "review_likelihood" | "upsell_probability";
  label: string;
  estimated: string;
  numericEstimate: number;
  confidence: number;
  evidence: string[];
  assumptions: string[];
}

export interface Customer360Data {
  customer: Customer;
  reviews: ReviewSession[];
  messages: Message[];
  campaigns: Campaign[];
  loyalty: CustomerLoyalty[];
  workflowExecutions: WorkflowExecution[];
  actionItems: ActionItem[];
  aiTasks: AITask[];
  aiRecommendations: AIRecommendation[];
  timeline: TimelineEvent[];
  healthScore: HealthScore;
  relationshipScore: RelationshipScore;
  insights: Customer360Insight[];
  predictions: FuturePrediction[];
}

export interface Customer360Insight {
  title: string;
  insight: string;
  recommendation: string;
  confidence: "high" | "medium" | "low";
  category: "churn_risk" | "upsell" | "reward" | "review_potential" | "recovery" | "communication" | "general";
}

// =========================================================
// FETCH — aggregates all data for a single customer
// =========================================================

export async function fetchCustomer360(
  businessId: string,
  customerId: string,
): Promise<{ data: Customer360Data | null; error: string | null }> {
  try {
    const [custRes, eventsRes, reviewsRes, messagesRes, loyaltyRes, execRes, actionsRes, aiTasksRes, aiRecsRes] = await Promise.all([
      supabase.from("customers").select("*").eq("id", customerId).eq("business_id", businessId).maybeSingle(),
      supabase.from("customer_events").select("*").eq("customer_id", customerId).eq("business_id", businessId).order("created_at", { ascending: false }).limit(200),
      supabase.from("review_sessions").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
      supabase.from("messages").select("*").eq("business_id", businessId).eq("customer_id", customerId).order("created_at", { ascending: false }).limit(100),
      supabase.from("customer_loyalty").select("*").eq("customer_id", customerId).eq("business_id", businessId).order("updated_at", { ascending: false }),
      supabase.from("workflow_executions").select("*").eq("business_id", businessId).order("created_at", { ascending: false }).limit(50),
      supabase.from("action_items").select("*").eq("business_id", businessId).order("created_at", { ascending: false }).limit(50),
      supabase.from("ai_tasks").select("*").eq("business_id", businessId).eq("related_entity_id", customerId).order("created_at", { ascending: false }).limit(20),
      supabase.from("ai_recommendations").select("*").eq("business_id", businessId).order("created_at", { ascending: false }).limit(20),
    ]);

    if (custRes.error) throw new Error(custRes.error.message);
    if (!custRes.data) return { data: null, error: "Customer not found" };

    const customer = custRes.data as Customer;
    const events = (eventsRes.data ?? []) as CustomerEvent[];
    const allReviews = (reviewsRes.data ?? []) as ReviewSession[];
    const messages = (messagesRes.data ?? []) as Message[];
    const loyalty = (loyaltyRes.data ?? []) as CustomerLoyalty[];
    const executions = (execRes.data ?? []) as WorkflowExecution[];
    const actionItems = (actionsRes.data ?? []) as ActionItem[];
    const aiTasks = (aiTasksRes.data ?? []) as AITask[];
    const aiRecs = (aiRecsRes.data ?? []) as AIRecommendation[];

    // Filter reviews to this customer via events
    const reviewSessionIds = new Set(events.filter((e) => e.review_session_id).map((e) => e.review_session_id));
    const customerReviews = allReviews.filter((r) => reviewSessionIds.has(r.id));

    // Filter campaigns that targeted this customer's segment
    const campaignsRes = await supabase.from("campaigns").select("*").eq("business_id", businessId).order("created_at", { ascending: false });
    const campaigns = (campaignsRes.data ?? []) as Campaign[];

    // Build unified timeline
    const timeline = buildTimeline(events, customerReviews, messages, loyalty, executions, aiTasks);

    // Compute scores
    const healthScore = computeHealthScore(customer, customerReviews, messages, loyalty, events);
    const relationshipScore = computeRelationshipScore(customer, customerReviews, messages, loyalty, events);

    // Generate data-driven insights (client-side, grounded in real data)
    const insights = generateInsights(customer, customerReviews, messages, loyalty, healthScore);

    // Generate future predictions (grounded in real data, never presented as facts)
    const predictions = computePredictions(customer, customerReviews, messages, loyalty, events, healthScore, relationshipScore);

    return {
      data: {
        customer,
        reviews: customerReviews,
        messages,
        campaigns,
        loyalty,
        workflowExecutions: executions,
        actionItems,
        aiTasks,
        aiRecommendations: aiRecs,
        timeline,
        healthScore,
        relationshipScore,
        insights,
        predictions,
      },
      error: null,
    };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Failed to load Customer 360" };
  }
}

// =========================================================
// TIMELINE BUILDER — unifies all event sources
// =========================================================

const eventMeta: Record<string, { label: string; icon: string; color: string }> = {
  qr_scanned: { label: "QR Scanned", icon: "📱", color: "text-primary-300" },
  review_submitted: { label: "Review Submitted", icon: "⭐", color: "text-warning-400" },
  ai_review_generated: { label: "AI Review Generated", icon: "✨", color: "text-accent-400" },
  google_review_completed: { label: "Google Review Completed", icon: "🔍", color: "text-success-400" },
  business_replied: { label: "Business Replied", icon: "💬", color: "text-primary-300" },
  follow_up_sent: { label: "Follow-up Sent", icon: "✉️", color: "text-accent-300" },
  customer_returned: { label: "Customer Returned", icon: "🔄", color: "text-success-400" },
  reward_redeemed: { label: "Reward Redeemed", icon: "🎁", color: "text-warning-400" },
  became_loyal: { label: "Became Loyal", icon: "💎", color: "text-success-400" },
  message_delivered: { label: "Message Delivered", icon: "📨", color: "text-accent-300" },
  message_read: { label: "Message Read", icon: "👁️", color: "text-success-400" },
  message_failed: { label: "Message Failed", icon: "❌", color: "text-error-400" },
  workflow_executed: { label: "Workflow Executed", icon: "⚡", color: "text-warning-400" },
  ai_task_created: { label: "AI Task Created", icon: "🤖", color: "text-primary-300" },
  campaign_sent: { label: "Campaign Received", icon: "📣", color: "text-accent-400" },
};

function buildTimeline(
  events: CustomerEvent[],
  reviews: ReviewSession[],
  messages: Message[],
  loyalty: CustomerLoyalty[],
  executions: WorkflowExecution[],
  aiTasks: AITask[],
): TimelineEvent[] {
  const timeline: TimelineEvent[] = [];

  for (const e of events) {
    const meta = eventMeta[e.event_type] ?? { label: e.event_type, icon: "📌", color: "text-slate-400" };
    timeline.push({
      id: e.id,
      timestamp: e.created_at,
      type: e.event_type,
      label: meta.label,
      icon: meta.icon,
      color: meta.color,
      detail: e.event_data ? JSON.stringify(e.event_data).slice(0, 120) : null,
      source: "event",
    });
  }

  for (const r of reviews) {
    timeline.push({
      id: `review-${r.id}`,
      timestamp: r.created_at,
      type: "review",
      label: `${r.rating}★ Review`,
      icon: "⭐",
      color: "text-warning-400",
      detail: r.ai_generated_review?.slice(0, 120) ?? null,
      source: "review",
    });
    if (r.business_response) {
      timeline.push({
        id: `response-${r.id}`,
        timestamp: r.business_response_at ?? r.created_at,
        type: "business_replied",
        label: "Business Replied",
        icon: "💬",
        color: "text-primary-300",
        detail: r.business_response.slice(0, 120),
        source: "review",
      });
    }
  }

  for (const m of messages) {
    const meta = eventMeta[`message_${m.status}`] ?? { label: `Message ${m.status}`, icon: "📨", color: "text-accent-300" };
    timeline.push({
      id: `msg-${m.id}`,
      timestamp: m.created_at,
      type: `message_${m.status}`,
      label: meta.label,
      icon: meta.icon,
      color: meta.color,
      detail: m.subject ?? m.body.slice(0, 80),
      source: "message",
    });
  }

  for (const l of loyalty) {
    if (l.reward_unlocked && l.unlocked_at) {
      timeline.push({
        id: `loyalty-${l.id}`,
        timestamp: l.unlocked_at,
        type: "reward_redeemed",
        label: "Reward Unlocked",
        icon: "🎁",
        color: "text-warning-400",
        detail: `${l.points} points · ${l.visits_counted} visits`,
        source: "loyalty",
      });
    }
  }

  for (const ex of executions) {
    timeline.push({
      id: `exec-${ex.id}`,
      timestamp: ex.created_at,
      type: "workflow_executed",
      label: `Workflow ${ex.status}`,
      icon: "⚡",
      color: ex.status === "completed" ? "text-success-400" : ex.status === "failed" ? "text-error-400" : "text-warning-400",
      detail: ex.trigger_source,
      source: "workflow",
    });
  }

  for (const t of aiTasks) {
    timeline.push({
      id: `aitask-${t.id}`,
      timestamp: t.created_at,
      type: "ai_task_created",
      label: `AI: ${t.title}`,
      icon: "🤖",
      color: "text-primary-300",
      detail: t.description.slice(0, 120),
      source: "ai",
    });
  }

  return timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// =========================================================
// HEALTH SCORE — explainable, data-driven
// =========================================================

function computeHealthScore(
  customer: Customer,
  reviews: ReviewSession[],
  messages: Message[],
  loyalty: CustomerLoyalty[],
  events: CustomerEvent[],
): HealthScore {
  const factors: Array<{ label: string; value: string; weight: number; contribution: number }> = [];

  // Factor 1: Rating (25%)
  const avgRating = customer.avg_rating ?? 0;
  const ratingScore = avgRating > 0 ? Math.min(100, (avgRating / 5) * 100) : 50;
  factors.push({
    label: "Average Rating",
    value: avgRating > 0 ? `${avgRating.toFixed(1)}/5` : "No ratings",
    weight: 25,
    contribution: (ratingScore / 100) * 25,
  });

  // Factor 2: Engagement frequency (25%)
  const visitScore = Math.min(100, customer.total_visits * 10);
  factors.push({
    label: "Visit Frequency",
    value: `${customer.total_visits} visits`,
    weight: 25,
    contribution: (visitScore / 100) * 25,
  });

  // Factor 3: Recency (20%)
  const daysSinceLastVisit = customer.last_visit_at
    ? (Date.now() - new Date(customer.last_visit_at).getTime()) / 86400000
    : null;
  const recencyScore = daysSinceLastVisit === null ? 20 : Math.max(0, 100 - daysSinceLastVisit * 1.5);
  factors.push({
    label: "Recency",
    value: daysSinceLastVisit !== null ? `${Math.round(daysSinceLastVisit)}d ago` : "Never",
    weight: 20,
    contribution: (recencyScore / 100) * 20,
  });

  // Factor 4: Communication engagement (15%)
  const readMessages = messages.filter((m) => m.status === "read" || m.status === "clicked").length;
  const commScore = messages.length > 0 ? Math.min(100, (readMessages / messages.length) * 100) : 30;
  factors.push({
    label: "Communication Engagement",
    value: `${readMessages}/${messages.length} read`,
    weight: 15,
    contribution: (commScore / 100) * 15,
  });

  // Factor 5: Loyalty (15%)
  const loyaltyPoints = loyalty.reduce((s, l) => s + l.points, 0);
  const loyaltyScore = Math.min(100, loyaltyPoints);
  factors.push({
    label: "Loyalty Points",
    value: `${loyaltyPoints} points`,
    weight: 15,
    contribution: (loyaltyScore / 100) * 15,
  });

  const score = Math.round(factors.reduce((s, f) => s + f.contribution, 0));

  let band: HealthScore["band"];
  if (score >= 80) band = "excellent";
  else if (score >= 60) band = "good";
  else if (score >= 40) band = "fair";
  else if (score >= 20) band = "at_risk";
  else band = "critical";

  const topFactor = factors.sort((a, b) => b.contribution - a.contribution)[0];
  const weakestFactor = factors.sort((a, b) => a.contribution - b.contribution)[0];

  const explanation = `Score of ${score}/100 driven primarily by ${topFactor.label.toLowerCase()} (${topFactor.value}). Weakest area: ${weakestFactor.label.toLowerCase()} (${weakestFactor.value}).`;

  const confidence = reviews.length + events.length >= 5 ? 0.85 : reviews.length + events.length >= 2 ? 0.65 : 0.4;

  let recommendation: string;
  if (band === "excellent") recommendation = "This customer is thriving. Consider rewarding their loyalty or requesting a public review.";
  else if (band === "good") recommendation = "Healthy customer. Nurture with personalized communication to push toward excellent.";
  else if (band === "fair") recommendation = "Engagement is moderate. A targeted campaign or follow-up message could improve retention.";
  else if (band === "at_risk") recommendation = "This customer is slipping. Send a recovery message and consider a special offer.";
  else recommendation = "Critical risk. Immediate outreach recommended — this customer may churn without intervention.";

  return { score, band, factors, explanation, confidence, recommendation };
}

// =========================================================
// RELATIONSHIP SCORE — measures relationship quality
// =========================================================

function computeRelationshipScore(
  customer: Customer,
  _reviews: ReviewSession[],
  messages: Message[],
  _loyalty: CustomerLoyalty[],
  events: CustomerEvent[],
): RelationshipScore {
  const factors: Array<{ label: string; value: string; contribution: number }> = [];

  // Review frequency
  const reviewFreq = Math.min(25, customer.total_reviews * 5);
  factors.push({ label: "Review Frequency", value: `${customer.total_reviews} reviews`, contribution: reviewFreq });

  // Visit frequency
  const visitFreq = Math.min(25, customer.total_visits * 3);
  factors.push({ label: "Visit Frequency", value: `${customer.total_visits} visits`, contribution: visitFreq });

  // Sentiment (avg rating)
  const sentiment = customer.avg_rating ? Math.min(20, (customer.avg_rating / 5) * 20) : 5;
  factors.push({ label: "Sentiment", value: customer.avg_rating ? `${customer.avg_rating.toFixed(1)}/5` : "Neutral", contribution: sentiment });

  // Campaign engagement
  const campaignEng = Math.min(15, events.filter((e) => e.event_type === "campaign_sent" || e.event_type === "customer_returned").length * 5);
  factors.push({ label: "Campaign Engagement", value: `${events.filter((e) => e.event_type === "customer_returned").length} returns`, contribution: campaignEng });

  // Communication engagement
  const commEng = Math.min(15, messages.filter((m) => m.status === "read" || m.status === "clicked").length * 3);
  factors.push({ label: "Communication Engagement", value: `${messages.filter((m) => m.status === "read").length} read`, contribution: commEng });

  const score = Math.round(factors.reduce((s, f) => s + f.contribution, 0));

  let band: RelationshipScore["band"];
  if (score >= 75) band = "champion";
  else if (score >= 50) band = "engaged";
  else if (score >= 25) band = "casual";
  else if (score >= 10) band = "dormant";
  else band = "detractor";

  const confidence = events.length + messages.length >= 5 ? 0.8 : events.length >= 2 ? 0.6 : 0.4;
  const top = factors.sort((a, b) => b.contribution - a.contribution)[0];
  const explanation = `Relationship score of ${score}/100. Strongest signal: ${top.label.toLowerCase()} (${top.value}).`;

  return { score, band, factors, explanation, confidence };
}

// =========================================================
// INSIGHTS — grounded in real data, no hallucination
// =========================================================

function generateInsights(
  customer: Customer,
  reviews: ReviewSession[],
  messages: Message[],
  loyalty: CustomerLoyalty[],
  health: HealthScore,
): Customer360Insight[] {
  const insights: Customer360Insight[] = [];
  const dataPoints = reviews.length + messages.length + loyalty.length;

  // Churn risk
  if (health.band === "at_risk" || health.band === "critical") {
    const daysSince = customer.last_visit_at
      ? Math.round((Date.now() - new Date(customer.last_visit_at).getTime()) / 86400000)
      : null;
    insights.push({
      title: "High Churn Risk",
      insight: `${customer.display_name || "This customer"} has a health score of ${health.score}/100${daysSince ? ` and hasn't visited in ${daysSince} days` : ""}. Engagement is declining.`,
      recommendation: "Send a personalized recovery message with a special offer to re-engage.",
      confidence: dataPoints >= 3 ? "high" : "medium",
      category: "churn_risk",
    });
  }

  // Upsell opportunity
  if (customer.segment === "vip" || customer.total_visits >= 5) {
    insights.push({
      title: "Upsell Opportunity",
      insight: `${customer.display_name || "This customer"} is a ${customer.segment} customer with ${customer.total_visits} visits and ${customer.avg_rating?.toFixed(1) ?? "N/A"} avg rating. High engagement signals openness to premium offers.`,
      recommendation: "Introduce a premium product or service with an exclusive loyalty reward.",
      confidence: dataPoints >= 5 ? "high" : "medium",
      category: "upsell",
    });
  }

  // Reward opportunity
  if (loyalty.length > 0) {
    const totalPoints = loyalty.reduce((s, l) => s + l.points, 0);
    const unlocked = loyalty.some((l) => l.reward_unlocked);
    if (!unlocked && totalPoints > 0) {
      insights.push({
        title: "Reward Opportunity",
        insight: `${customer.display_name || "This customer"} has ${totalPoints} loyalty points but hasn't unlocked a reward yet.`,
        recommendation: "Send a targeted message highlighting how close they are to their next reward.",
        confidence: "medium",
        category: "reward",
      });
    }
  }

  // Review potential
  if (customer.total_visits >= 3 && customer.total_reviews < customer.total_visits * 0.5) {
    insights.push({
      title: "Review Potential",
      insight: `${customer.display_name || "This customer"} has visited ${customer.total_visits} times but only left ${customer.total_reviews} review(s). They're likely satisfied but haven't been prompted recently.`,
      recommendation: "Send a review request message at the optimal time (within 24h of their last visit).",
      confidence: dataPoints >= 4 ? "high" : "medium",
      category: "review_potential",
    });
  }

  // Recovery recommendation
  const negativeReviews = reviews.filter((r) => (r.rating ?? 0) <= 2);
  if (negativeReviews.length > 0) {
    insights.push({
      title: "Recovery Needed",
      insight: `${customer.display_name || "This customer"} has submitted ${negativeReviews.length} negative review(s) with an average rating of ${(negativeReviews.reduce((s, r) => s + (r.rating ?? 0), 0) / negativeReviews.length).toFixed(1)}/5.`,
      recommendation: "Reach out with a sincere recovery message acknowledging their feedback and offering a resolution.",
      confidence: "high",
      category: "recovery",
    });
  }

  // Communication timing
  if (messages.length > 0) {
    const readMessages = messages.filter((m) => m.status === "read" || m.status === "clicked");
    if (readMessages.length > 0) {
      const readHours = readMessages.map((m) => new Date(m.read_at ?? m.created_at).getHours());
      const avgHour = Math.round(readHours.reduce((s, h) => s + h, 0) / readHours.length);
      const timing = avgHour < 12 ? "mornings" : avgHour < 17 ? "afternoons" : "evenings";
      insights.push({
        title: "Preferred Communication Timing",
        insight: `This customer tends to read messages in the ${timing} (around ${avgHour}:00).`,
        recommendation: `Schedule future communications for ${timing} to maximize open rates.`,
        confidence: readMessages.length >= 3 ? "high" : "medium",
        category: "communication",
      });
    }
  }

  // Preferred channel
  if (messages.length >= 2) {
    const channelCounts: Record<string, number> = {};
    messages.forEach((m) => { channelCounts[m.channel] = (channelCounts[m.channel] || 0) + 1; });
    const topChannel = Object.entries(channelCounts).sort((a, b) => b[1] - a[1])[0];
    if (topChannel && topChannel[1] >= 2) {
      insights.push({
        title: "Preferred Channel",
        insight: `This customer has received ${topChannel[1]} messages via ${topChannel[0]}, making it their most active channel.`,
        recommendation: `Prioritize ${topChannel[0]} for important communications.`,
        confidence: "medium",
        category: "communication",
      });
    }
  }

  return insights;
}

// =========================================================
// FUTURE PREDICTIONS — grounded in real data, never presented as facts
// =========================================================

function computePredictions(
  customer: Customer,
  reviews: ReviewSession[],
  messages: Message[],
  loyalty: CustomerLoyalty[],
  events: CustomerEvent[],
  health: HealthScore,
  relationship: RelationshipScore,
): FuturePrediction[] {
  const predictions: FuturePrediction[] = [];
  const dataPoints = reviews.length + messages.length + loyalty.length + events.length;
  const baseConfidence = dataPoints >= 10 ? 0.8 : dataPoints >= 5 ? 0.65 : dataPoints >= 2 ? 0.45 : 0.25;

  const daysSinceLastVisit = customer.last_visit_at
    ? (Date.now() - new Date(customer.last_visit_at).getTime()) / 86400000
    : null;

  // 1. Churn probability
  {
    let churnProb = 0.5;
    const evidence: string[] = [];
    const assumptions: string[] = [];

    if (daysSinceLastVisit !== null) {
      if (daysSinceLastVisit > 60) { churnProb += 0.25; evidence.push(`Last visit was ${Math.round(daysSinceLastVisit)} days ago`); }
      else if (daysSinceLastVisit > 30) { churnProb += 0.12; evidence.push(`Last visit was ${Math.round(daysSinceLastVisit)} days ago`); }
      else if (daysSinceLastVisit < 7) { churnProb -= 0.2; evidence.push(`Visited recently (${Math.round(daysSinceLastVisit)} days ago)`); }
    } else {
      churnProb += 0.15;
      evidence.push("No recorded visit date");
    }

    if (health.band === "critical" || health.band === "at_risk") { churnProb += 0.15; evidence.push(`Health score is ${health.score}/100 (${health.band})`); }
    else if (health.band === "excellent") { churnProb -= 0.15; evidence.push(`Health score is ${health.score}/100 (excellent)`); }

    const readRate = messages.length > 0 ? messages.filter((m) => m.status === "read" || m.status === "clicked").length / messages.length : 1;
    if (readRate < 0.3 && messages.length >= 3) { churnProb += 0.1; evidence.push(`Only ${Math.round(readRate * 100)}% of messages are read`); }

    churnProb = Math.max(0.05, Math.min(0.95, churnProb));
    assumptions.push("Churn is defined as no activity for 90+ days");
    assumptions.push("Prediction is based on current engagement trajectory");

    predictions.push({
      type: "churn_probability",
      label: "Churn Probability (90 days)",
      estimated: `${Math.round(churnProb * 100)}%`,
      numericEstimate: churnProb,
      confidence: baseConfidence,
      evidence,
      assumptions,
    });
  }

  // 2. Expected lifetime value
  {
    const avgRating = customer.avg_rating ?? 0;
    const loyaltyPoints = loyalty.reduce((s, l) => s + l.points, 0);
    const segmentMultiplier = customer.segment === "vip" ? 1.5 : customer.segment === "repeat" ? 1.2 : customer.segment === "new" ? 0.7 : 1.0;

    const estimatedLTV = Math.round(customer.total_visits * 25 * segmentMultiplier + loyaltyPoints * 0.5 + (avgRating > 0 ? avgRating * 10 : 0));
    const confidence = dataPoints >= 5 ? 0.7 : dataPoints >= 2 ? 0.5 : 0.3;
    const evidence: string[] = [];
    const assumptions: string[] = [];

    evidence.push(`${customer.total_visits} visits recorded`);
    if (loyaltyPoints > 0) evidence.push(`${loyaltyPoints} loyalty points`);
    if (avgRating > 0) evidence.push(`${avgRating.toFixed(1)}/5 average rating`);
    evidence.push(`Segment: ${customer.segment}`);

    assumptions.push("Average visit value estimated at $25");
    assumptions.push("Loyalty points valued at $0.50 each");
    assumptions.push(`Segment multiplier of ${segmentMultiplier}x applied`);
    assumptions.push("LTV projected over 12 months from current trajectory");

    predictions.push({
      type: "expected_ltv",
      label: "Expected Lifetime Value (12 months)",
      estimated: `${estimatedLTV.toLocaleString()}`,
      numericEstimate: estimatedLTV,
      confidence,
      evidence,
      assumptions,
    });
  }

  // 3. Next visit window
  {
    let windowDays = 14;
    const evidence: string[] = [];
    const assumptions: string[] = [];

    if (customer.total_visits >= 2 && customer.last_visit_at) {
      const lastVisit = new Date(customer.last_visit_at).getTime();
      const firstVisit = events.length > 0 ? new Date(events[events.length - 1].created_at).getTime() : lastVisit;
      const span = Math.max(1, (lastVisit - firstVisit) / 86400000);
      const avgGap = span / Math.max(1, customer.total_visits - 1);
      windowDays = Math.round(avgGap);
      evidence.push(`Average gap between visits: ${windowDays} days`);
      evidence.push(`${customer.total_visits} visits total`);
    } else {
      evidence.push("Insufficient visit history for pattern detection");
      assumptions.push("Default 14-day window assumed for new customers");
    }

    if (daysSinceLastVisit !== null) {
      const daysUntilNext = Math.max(1, windowDays - Math.round(daysSinceLastVisit));
      evidence.push(`${Math.round(daysSinceLastVisit)} days since last visit`);
      predictions.push({
        type: "next_visit_window",
        label: "Next Expected Visit",
        estimated: daysUntilNext <= 0 ? "Overdue" : `~${daysUntilNext} days`,
        numericEstimate: daysUntilNext,
        confidence: baseConfidence,
        evidence,
        assumptions: [...assumptions, "Assumes current visit pattern continues"],
      });
    }
  }

  // 4. Review likelihood
  {
    const reviewRatio = customer.total_visits > 0 ? customer.total_reviews / customer.total_visits : 0;
    let likelihood = reviewRatio * 0.6;
    const evidence: string[] = [];
    const assumptions: string[] = [];

    evidence.push(`${customer.total_reviews} reviews from ${customer.total_visits} visits (${Math.round(reviewRatio * 100)}% rate)`);

    if (daysSinceLastVisit !== null && daysSinceLastVisit < 3) { likelihood += 0.2; evidence.push("Visited within last 3 days (prime review window)"); }
    else if (daysSinceLastVisit !== null && daysSinceLastVisit > 14) { likelihood -= 0.1; evidence.push("Last visit was >14 days ago"); }

    if (customer.avg_rating && customer.avg_rating >= 4) { likelihood += 0.1; evidence.push("High satisfaction (4+ rating)"); }

    likelihood = Math.max(0.05, Math.min(0.95, likelihood));
    assumptions.push("Review likelihood is highest within 72 hours of a visit");
    assumptions.push("Assumes customer is prompted with a review request");

    predictions.push({
      type: "review_likelihood",
      label: "Review Likelihood (next visit)",
      estimated: `${Math.round(likelihood * 100)}%`,
      numericEstimate: likelihood,
      confidence: baseConfidence,
      evidence,
      assumptions,
    });
  }

  // 5. Upsell probability
  {
    let upsellProb = 0.3;
    const evidence: string[] = [];
    const assumptions: string[] = [];

    if (customer.segment === "vip") { upsellProb += 0.3; evidence.push("VIP segment customer"); }
    else if (customer.segment === "repeat") { upsellProb += 0.2; evidence.push("Repeat segment customer"); }

    if (customer.total_visits >= 5) { upsellProb += 0.15; evidence.push(`${customer.total_visits} visits (high engagement)`); }
    if (customer.avg_rating && customer.avg_rating >= 4) { upsellProb += 0.1; evidence.push(`High satisfaction (${customer.avg_rating.toFixed(1)}/5)`); }
    if (relationship.band === "champion") { upsellProb += 0.1; evidence.push("Champion relationship status"); }

    upsellProb = Math.max(0.05, Math.min(0.95, upsellProb));
    assumptions.push("Upsell defined as accepting a premium offer or add-on");
    assumptions.push("Assumes offer is relevant and well-timed");

    predictions.push({
      type: "upsell_probability",
      label: "Upsell Probability",
      estimated: `${Math.round(upsellProb * 100)}%`,
      numericEstimate: upsellProb,
      confidence: baseConfidence,
      evidence,
      assumptions,
    });
  }

  return predictions;
}

// =========================================================
// AI INSIGHTS — calls customer-engagement-ai edge function
// =========================================================

export interface AIInsightResponse {
  insights: Customer360Insight[];
  message?: string;
  error?: string;
}

export async function generateAICustomerInsights(params: {
  businessId: string;
  customer: Customer;
  reviews: ReviewSession[];
  messages: Message[];
  healthScore: HealthScore;
  relationshipScore: RelationshipScore;
}): Promise<AIInsightResponse> {
  try {
    const { data, error } = await supabase.functions.invoke("customer-engagement-ai", {
      body: { ...params, task: "customer_360" },
    });
    if (error) return { insights: [], error: error.message };
    return data as AIInsightResponse;
  } catch (e) {
    return { insights: [], error: e instanceof Error ? e.message : "Failed to generate AI insights" };
  }
}

// =========================================================
// SCORE META HELPERS
// =========================================================

export function healthBandMeta(band: HealthScore["band"]): { label: string; color: string; bg: string; icon: string } {
  const map: Record<HealthScore["band"], { label: string; color: string; bg: string; icon: string }> = {
    excellent: { label: "Excellent", color: "text-success-400", bg: "bg-success-500/15", icon: "🌟" },
    good: { label: "Good", color: "text-primary-300", bg: "bg-primary-500/15", icon: "✅" },
    fair: { label: "Fair", color: "text-warning-400", bg: "bg-warning-500/15", icon: "⚖️" },
    at_risk: { label: "At Risk", color: "text-error-400", bg: "bg-error-500/15", icon: "⚠️" },
    critical: { label: "Critical", color: "text-error-400", bg: "bg-error-500/20", icon: "🚨" },
  };
  return map[band];
}

export function relationshipBandMeta(band: RelationshipScore["band"]): { label: string; color: string; bg: string; icon: string } {
  const map: Record<RelationshipScore["band"], { label: string; color: string; bg: string; icon: string }> = {
    champion: { label: "Champion", color: "text-success-400", bg: "bg-success-500/15", icon: "🏆" },
    engaged: { label: "Engaged", color: "text-primary-300", bg: "bg-primary-500/15", icon: "🤝" },
    casual: { label: "Casual", color: "text-accent-300", bg: "bg-accent-500/15", icon: "☕" },
    dormant: { label: "Dormant", color: "text-slate-400", bg: "bg-slate-600/15", icon: "💤" },
    detractor: { label: "Detractor", color: "text-error-400", bg: "bg-error-500/15", icon: "⚠️" },
  };
  return map[band];
}

export function insightCategoryMeta(category: Customer360Insight["category"]): { label: string; icon: string; color: string } {
  const map: Record<Customer360Insight["category"], { label: string; icon: string; color: string }> = {
    churn_risk: { label: "Churn Risk", icon: "🚨", color: "text-error-400" },
    upsell: { label: "Upsell", icon: "📈", color: "text-success-400" },
    reward: { label: "Reward", icon: "🎁", color: "text-warning-400" },
    review_potential: { label: "Review Potential", icon: "⭐", color: "text-accent-300" },
    recovery: { label: "Recovery", icon: "🚑", color: "text-error-400" },
    communication: { label: "Communication", icon: "📨", color: "text-primary-300" },
    general: { label: "General", icon: "💡", color: "text-slate-400" },
  };
  return map[category];
}

export function confidenceMeta(confidence: "high" | "medium" | "low"): { label: string; color: string } {
  const map = { high: { label: "High", color: "text-success-400" }, medium: { label: "Medium", color: "text-warning-400" }, low: { label: "Low", color: "text-slate-500" } };
  return map[confidence];
}
