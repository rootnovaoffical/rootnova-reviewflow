import { supabase } from "./supabase";
import type { UsageRecord, Plan, UsageMetricKey } from "./types";

export async function getUsageForPeriod(
  orgId: string,
  periodStart: string,
  periodEnd: string
): Promise<UsageRecord | null> {
  const { data, error } = await supabase
    .from("usage_records")
    .select("*")
    .eq("organization_id", orgId)
    .eq("period_start", periodStart)
    .eq("period_end", periodEnd)
    .maybeSingle();
  if (error) throw error;
  return data as UsageRecord | null;
}

export async function listUsageRecords(orgId: string): Promise<UsageRecord[]> {
  const { data, error } = await supabase
    .from("usage_records")
    .select("*")
    .eq("organization_id", orgId)
    .order("period_start", { ascending: false });
  if (error) throw error;
  return (data || []) as UsageRecord[];
}

export async function upsertUsageRecord(
  orgId: string,
  periodStart: string,
  periodEnd: string,
  metrics: Partial<Record<UsageMetricKey, number>>
): Promise<UsageRecord> {
  const existing = await getUsageForPeriod(orgId, periodStart, periodEnd);
  if (existing) {
    const { data, error } = await supabase
      .from("usage_records")
      .update({ ...metrics, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw error;
    return data as UsageRecord;
  }
  const { data, error } = await supabase
    .from("usage_records")
    .insert({
      organization_id: orgId,
      period_start: periodStart,
      period_end: periodEnd,
      ...metrics,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as UsageRecord;
}

export async function incrementUsage(
  orgId: string,
  metric: UsageMetricKey,
  amount = 1
): Promise<void> {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const startStr = periodStart.toISOString().split("T")[0];
  const endStr = periodEnd.toISOString().split("T")[0];

  const existing = await getUsageForPeriod(orgId, startStr, endStr);
  if (existing) {
    const newValue = (existing[metric] || 0) + amount;
    const { error } = await supabase
      .from("usage_records")
      .update({ [metric]: newValue, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("usage_records").insert({
      organization_id: orgId,
      period_start: startStr,
      period_end: endStr,
      [metric]: amount,
    });
    if (error) throw error;
  }
}

export interface UsageWithLimits {
  usage: UsageRecord | null;
  plan: Plan | null;
  limits: Partial<Record<UsageMetricKey, number>>;
  percentages: Partial<Record<UsageMetricKey, number>>;
  alerts: Array<{ metric: UsageMetricKey; percentage: number; current: number; limit: number }>;
}

export async function getUsageWithLimits(orgId: string): Promise<UsageWithLimits> {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const startStr = periodStart.toISOString().split("T")[0];
  const endStr = periodEnd.toISOString().split("T")[0];

  const [usageResult, subResult] = await Promise.all([
    getUsageForPeriod(orgId, startStr, endStr),
    supabase
      .from("subscriptions")
      .select("*, plan:plans(*)")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .maybeSingle(),
  ]);

  const plan = subResult.data?.plan as Plan | null;
  const usage = usageResult;

  const limits: Partial<Record<UsageMetricKey, number>> = {};
  if (plan) {
    limits.reviews_generated = plan.max_review_sessions ?? undefined;
    limits.ai_requests = plan.ai_usage_allowance ? Number(plan.ai_usage_allowance) : undefined;
  }

  const percentages: Partial<Record<UsageMetricKey, number>> = {};
  const alerts: UsageWithLimits["alerts"] = [];

  const metricKeys: UsageMetricKey[] = [
    "reviews_generated",
    "ai_requests",
    "messages_sent",
    "reports_generated",
    "qr_scans",
    "customers_stored",
    "automation_executions",
  ];

  for (const key of metricKeys) {
    const current = usage?.[key] ?? 0;
    const limit = limits[key];
    if (limit && limit > 0) {
      const pct = Math.round((current / limit) * 100);
      percentages[key] = pct;
      if (pct >= 80) {
        alerts.push({ metric: key, percentage: pct, current, limit });
      }
    }
  }

  return { usage, plan, limits, percentages, alerts };
}

export async function listAllUsageRecords(): Promise<(UsageRecord & { organization: { name: string } | null })[]> {
  const { data, error } = await supabase
    .from("usage_records")
    .select("*, organization:organizations(name)")
    .order("period_start", { ascending: false });
  if (error) throw error;
  return (data || []) as (UsageRecord & { organization: { name: string } | null })[];
}
