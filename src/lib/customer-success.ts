import { supabase } from "./supabase";
import type {
  CustomerHealthScore,
  CustomerSuccessAlert,
  ChurnRisk,
  HealthLevel,
  UsageTrend,
} from "./types";
import { getUsageWithLimits } from "./usage";

export async function getHealthScore(orgId: string): Promise<CustomerHealthScore | null> {
  const { data, error } = await supabase
    .from("customer_health_scores")
    .select("*")
    .eq("organization_id", orgId)
    .maybeSingle();
  if (error) throw error;
  return data as CustomerHealthScore | null;
}

export async function listHealthScores(): Promise<(CustomerHealthScore & { organization: { name: string } | null })[]> {
  const { data, error } = await supabase
    .from("customer_health_scores")
    .select("*, organization:organizations(name)")
    .order("health_score", { ascending: true });
  if (error) throw error;
  return (data || []) as (CustomerHealthScore & { organization: { name: string } | null })[];
}

export async function calculateHealthScore(orgId: string): Promise<CustomerHealthScore> {
  const { usage, plan, alerts } = await getUsageWithLimits(orgId);

  let score = 50;
  const factors: Record<string, unknown> = {};

  if (usage) {
    const totalUsage =
      usage.reviews_generated +
      usage.ai_requests +
      usage.messages_sent +
      usage.reports_generated +
      usage.qr_scans +
      usage.automation_executions;
    if (totalUsage > 50) score += 20;
    else if (totalUsage > 10) score += 10;
    else if (totalUsage === 0) score -= 20;
    factors.total_usage = totalUsage;
  }

  if (plan) {
    score += 10;
    factors.plan_name = plan.name;
  }

  if (alerts.length > 0) {
    score -= alerts.length * 5;
    factors.usage_alerts = alerts.length;
  }

  const { data: subData } = await supabase
    .from("subscriptions")
    .select("status, trial_ends_at")
    .eq("organization_id", orgId)
    .maybeSingle();

  if (subData) {
    factors.subscription_status = subData.status;
    if (subData.status === "cancelled") score -= 30;
    if (subData.status === "trial") {
      const trialEnd = subData.trial_ends_at ? new Date(subData.trial_ends_at) : null;
      if (trialEnd) {
        const daysLeft = Math.ceil((trialEnd.getTime() - Date.now()) / 86400000);
        factors.trial_days_left = daysLeft;
        if (daysLeft < 3) score -= 10;
      }
    }
  }

  score = Math.max(0, Math.min(100, score));

  const engagement_level: HealthLevel = score >= 70 ? "high" : score >= 40 ? "medium" : "low";
  const churn_risk: ChurnRisk = score < 20 ? "critical" : score < 40 ? "high" : score < 60 ? "medium" : "low";
  const usage_trend: UsageTrend = score >= 70 ? "growing" : score >= 40 ? "stable" : "declining";

  const existing = await getHealthScore(orgId);
  if (existing) {
    const { data, error } = await supabase
      .from("customer_health_scores")
      .update({
        health_score: score,
        engagement_level,
        churn_risk,
        usage_trend,
        factors,
        last_calculated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw error;
    return data as CustomerHealthScore;
  }

  const { data, error } = await supabase
    .from("customer_health_scores")
    .insert({
      organization_id: orgId,
      health_score: score,
      engagement_level,
      churn_risk,
      usage_trend,
      factors,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as CustomerHealthScore;
}

export async function listAlerts(orgId: string): Promise<CustomerSuccessAlert[]> {
  const { data, error } = await supabase
    .from("customer_success_alerts")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as CustomerSuccessAlert[];
}

export async function listAllAlerts(): Promise<(CustomerSuccessAlert & { organization: { name: string } | null })[]> {
  const { data, error } = await supabase
    .from("customer_success_alerts")
    .select("*, organization:organizations(name)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as (CustomerSuccessAlert & { organization: { name: string } | null })[];
}

export async function createAlert(
  orgId: string,
  input: {
    alert_type: CustomerSuccessAlert["alert_type"];
    severity: CustomerSuccessAlert["severity"];
    title: string;
    description?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<CustomerSuccessAlert> {
  const { data, error } = await supabase
    .from("customer_success_alerts")
    .insert({
      organization_id: orgId,
      ...input,
      status: "open",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as CustomerSuccessAlert;
}

export async function resolveAlert(
  id: string,
  resolutionNotes: string
): Promise<CustomerSuccessAlert> {
  const { data, error } = await supabase
    .from("customer_success_alerts")
    .update({
      status: "resolved",
      resolution_notes: resolutionNotes,
      resolved_at: new Date().toISOString(),
      resolved_by: (await supabase.auth.getUser()).data.user?.id ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as CustomerSuccessAlert;
}

export async function acknowledgeAlert(id: string): Promise<CustomerSuccessAlert> {
  const { data, error } = await supabase
    .from("customer_success_alerts")
    .update({ status: "acknowledged", updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as CustomerSuccessAlert;
}
