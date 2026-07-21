import { supabase } from "./supabase";
import type {
  Customer,
  CustomerEvent,
  CustomerSegment,
  AutomationRule,
  Campaign,
  LoyaltyProgram,
  CustomerLoyalty,
  EngagementNotification,
  AutomationTriggerType,
  AutomationActionType,
  CampaignType,
  CampaignStatus,
  LoyaltyProgramType,
} from "./types";

// =========================================================
// CUSTOMERS
// =========================================================

export async function fetchCustomers(businessId: string): Promise<{ data: Customer[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("business_id", businessId)
    .order("updated_at", { ascending: false });
  return { data: data as Customer[] | null, error: error?.message ?? null };
}

export async function fetchCustomerTimeline(
  businessId: string,
  customerId: string,
): Promise<{ data: CustomerEvent[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from("customer_events")
    .select("*")
    .eq("business_id", businessId)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(100);
  return { data: data as CustomerEvent[] | null, error: error?.message ?? null };
}

export function segmentMeta(segment: CustomerSegment): {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: string;
} {
  const map: Record<CustomerSegment, { label: string; color: string; bg: string; border: string; icon: string }> = {
    new: { label: "New", color: "text-primary-300", bg: "bg-primary-500/15", border: "border-primary-500/30", icon: "✨" },
    returning: { label: "Returning", color: "text-accent-300", bg: "bg-accent-500/15", border: "border-accent-500/30", icon: "🔄" },
    loyal: { label: "Loyal", color: "text-success-400", bg: "bg-success-500/15", border: "border-success-500/30", icon: "💎" },
    promoter: { label: "Promoter", color: "text-success-400", bg: "bg-success-500/15", border: "border-success-500/30", icon: "📣" },
    passive: { label: "Passive", color: "text-slate-400", bg: "bg-slate-500/15", border: "border-slate-500/30", icon: "😐" },
    detractor: { label: "Detractor", color: "text-error-400", bg: "bg-error-500/15", border: "border-error-500/30", icon: "⚠️" },
    vip: { label: "VIP", color: "text-warning-400", bg: "bg-warning-500/15", border: "border-warning-500/30", icon: "👑" },
    inactive: { label: "Inactive", color: "text-slate-500", bg: "bg-slate-600/15", border: "border-slate-600/30", icon: "💤" },
    needs_followup: { label: "Needs Follow-up", color: "text-warning-400", bg: "bg-warning-500/15", border: "border-warning-500/30", icon: "📨" },
    returning_after_long_time: { label: "Returning After Long Time", color: "text-accent-300", bg: "bg-accent-500/15", border: "border-accent-500/30", icon: "🔙" },
  };
  return map[segment] ?? map.new;
}

// =========================================================
// AUTOMATION RULES
// =========================================================

export async function fetchAutomationRules(
  businessId: string,
): Promise<{ data: AutomationRule[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from("automation_rules")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  return { data: data as AutomationRule[] | null, error: error?.message ?? null };
}

export async function createAutomationRule(
  rule: Omit<AutomationRule, "id" | "created_at" | "updated_at" | "trigger_count" | "last_triggered_at">,
): Promise<{ data: AutomationRule | null; error: string | null }> {
  const { data, error } = await supabase.from("automation_rules").insert(rule).select().single();
  return { data: data as AutomationRule | null, error: error?.message ?? null };
}

export async function updateAutomationRule(
  id: string,
  updates: Partial<Pick<AutomationRule, "name" | "trigger_type" | "trigger_config" | "action_type" | "action_config" | "delay_hours" | "status">>,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("automation_rules").update(updates).eq("id", id);
  return { error: error?.message ?? null };
}

export async function deleteAutomationRule(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("automation_rules").delete().eq("id", id);
  return { error: error?.message ?? null };
}

export function triggerTypeMeta(type: AutomationTriggerType): { label: string; icon: string } {
  const map: Record<AutomationTriggerType, { label: string; icon: string }> = {
    review_submitted: { label: "Review Submitted", icon: "⭐" },
    rating_threshold: { label: "Rating Threshold", icon: "📊" },
    customer_segment: { label: "Customer Segment", icon: "👥" },
    campaign_response: { label: "Campaign Response", icon: "📣" },
  };
  return map[type];
}

export function actionTypeMeta(type: AutomationActionType): { label: string; icon: string } {
  const map: Record<AutomationActionType, { label: string; icon: string }> = {
    send_message: { label: "Send Message", icon: "✉️" },
    notify_manager: { label: "Notify Manager", icon: "🔔" },
    open_recovery: { label: "Open Recovery", icon: "🚑" },
    add_points: { label: "Add Loyalty Points", icon: "💎" },
    send_coupon: { label: "Send Coupon", icon: "🎟️" },
  };
  return map[type];
}

// =========================================================
// CAMPAIGNS
// =========================================================

export async function fetchCampaigns(businessId: string): Promise<{ data: Campaign[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  return { data: data as Campaign[] | null, error: error?.message ?? null };
}

export async function createCampaign(
  campaign: Omit<Campaign, "id" | "created_at" | "updated_at" | "reach_count" | "response_count" | "conversion_count">,
): Promise<{ data: Campaign | null; error: string | null }> {
  const { data, error } = await supabase.from("campaigns").insert(campaign).select().single();
  return { data: data as Campaign | null, error: error?.message ?? null };
}

export async function updateCampaign(
  id: string,
  updates: Partial<Pick<Campaign, "name" | "description" | "campaign_type" | "audience_segment" | "status" | "schedule_start" | "schedule_end" | "metadata">>,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("campaigns").update(updates).eq("id", id);
  return { error: error?.message ?? null };
}

export async function deleteCampaign(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("campaigns").delete().eq("id", id);
  return { error: error?.message ?? null };
}

export function campaignTypeMeta(type: CampaignType): { label: string; icon: string } {
  const map: Record<CampaignType, { label: string; icon: string }> = {
    review: { label: "Review Campaign", icon: "⭐" },
    discount: { label: "Discount", icon: "🏷️" },
    festival: { label: "Festival", icon: "🎉" },
    referral: { label: "Referral", icon: "🤝" },
    weekend_offer: { label: "Weekend Offer", icon: "📅" },
    happy_hour: { label: "Happy Hour", icon: "🍸" },
    new_menu: { label: "New Menu", icon: "🍽️" },
  };
  return map[type];
}

export function campaignStatusMeta(status: CampaignStatus): { label: string; color: string; bg: string } {
  const map: Record<CampaignStatus, { label: string; color: string; bg: string }> = {
    draft: { label: "Draft", color: "text-slate-400", bg: "bg-slate-600/15" },
    active: { label: "Active", color: "text-success-400", bg: "bg-success-500/15" },
    paused: { label: "Paused", color: "text-warning-400", bg: "bg-warning-500/15" },
    completed: { label: "Completed", color: "text-primary-300", bg: "bg-primary-500/15" },
  };
  return map[status];
}

// =========================================================
// LOYALTY
// =========================================================

export async function fetchLoyaltyPrograms(
  businessId: string,
): Promise<{ data: LoyaltyProgram[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from("loyalty_programs")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  return { data: data as LoyaltyProgram[] | null, error: error?.message ?? null };
}

export async function createLoyaltyProgram(
  program: Omit<LoyaltyProgram, "id" | "created_at" | "updated_at" | "redeemed_count">,
): Promise<{ data: LoyaltyProgram | null; error: string | null }> {
  const { data, error } = await supabase.from("loyalty_programs").insert(program).select().single();
  return { data: data as LoyaltyProgram | null, error: error?.message ?? null };
}

export async function updateLoyaltyProgram(
  id: string,
  updates: Partial<Pick<LoyaltyProgram, "name" | "program_type" | "target_count" | "reward_description" | "points_per_action" | "status">>,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("loyalty_programs").update(updates).eq("id", id);
  return { error: error?.message ?? null };
}

export async function deleteLoyaltyProgram(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("loyalty_programs").delete().eq("id", id);
  return { error: error?.message ?? null };
}

export async function fetchCustomerLoyalty(
  businessId: string,
): Promise<{ data: CustomerLoyalty[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from("customer_loyalty")
    .select("*")
    .eq("business_id", businessId)
    .order("updated_at", { ascending: false });
  return { data: data as CustomerLoyalty[] | null, error: error?.message ?? null };
}

export function programTypeMeta(type: LoyaltyProgramType): { label: string; icon: string } {
  const map: Record<LoyaltyProgramType, { label: string; icon: string }> = {
    visit_based: { label: "Visit Based", icon: "🔢" },
    review_based: { label: "Review Based", icon: "⭐" },
    birthday: { label: "Birthday", icon: "🎂" },
    festival: { label: "Festival", icon: "🎉" },
  };
  return map[type];
}

// =========================================================
// NOTIFICATIONS
// =========================================================

export async function fetchEngagementNotifications(
  businessId: string,
): Promise<{ data: EngagementNotification[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from("engagement_notifications")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(50);
  return { data: data as EngagementNotification[] | null, error: error?.message ?? null };
}

export async function markNotificationRead(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("engagement_notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", id);
  return { error: error?.message ?? null };
}

export async function markAllNotificationsRead(businessId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("engagement_notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("business_id", businessId)
    .eq("is_read", false);
  return { error: error?.message ?? null };
}

export function severityMeta(severity: string): { label: string; color: string; bg: string; icon: string } {
  const map: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    info: { label: "Info", color: "text-primary-300", bg: "bg-primary-500/15", icon: "ℹ️" },
    warning: { label: "Warning", color: "text-warning-400", bg: "bg-warning-500/15", icon: "⚠️" },
    critical: { label: "Critical", color: "text-error-400", bg: "bg-error-500/15", icon: "🚨" },
    success: { label: "Success", color: "text-success-400", bg: "bg-success-500/15", icon: "✅" },
  };
  return map[severity] ?? map.info;
}

// =========================================================
// AI FOLLOW-UP WRITER
// =========================================================

export interface FollowUpMessage {
  subject: string;
  body: string;
  tone: string;
}

export interface FollowUpResponse {
  messages: FollowUpMessage[];
  message?: string;
  error?: string;
}

export async function generateFollowUpMessages(params: {
  businessName: string;
  messageType: "thank_you" | "recovery" | "discount" | "reminder" | "festival" | "birthday" | "visit_again";
  customerName?: string;
  rating?: number;
  reviewText?: string;
  businessContext?: string;
}): Promise<FollowUpResponse> {
  try {
    const { data, error } = await supabase.functions.invoke("customer-engagement-ai", {
      body: { ...params, task: "write_followup" },
    });
    if (error) return { messages: [], error: error.message };
    return data as FollowUpResponse;
  } catch (e) {
    return { messages: [], error: e instanceof Error ? e.message : "Failed to generate messages" };
  }
}

export interface CustomerInsight {
  title: string;
  insight: string;
  recommendation: string;
  confidence: "high" | "medium" | "low";
  customer_ids?: string[];
}

export interface CustomerInsightsResponse {
  insights: CustomerInsight[];
  message?: string;
  error?: string;
}

export async function generateCustomerInsights(params: {
  businessId: string;
  customers: Customer[];
  reviews: { rating: number; ai_generated_review: string | null; created_at: string }[];
}): Promise<CustomerInsightsResponse> {
  try {
    const { data, error } = await supabase.functions.invoke("customer-engagement-ai", {
      body: { ...params, task: "customer_insights" },
    });
    if (error) return { insights: [], error: error.message };
    return data as CustomerInsightsResponse;
  } catch (e) {
    return { insights: [], error: e instanceof Error ? e.message : "Failed to generate insights" };
  }
}

// =========================================================
// SEGMENTATION LOGIC (client-side, data-driven)
// =========================================================

export function computeSegment(customer: {
  total_visits: number;
  total_reviews: number;
  avg_rating: number;
  last_visit_at: string | null;
  first_seen_at: string;
}): CustomerSegment {
  const now = Date.now();
  const daysSinceLastVisit = customer.last_visit_at
    ? (now - new Date(customer.last_visit_at).getTime()) / 86400000
    : null;
  const daysSinceFirstSeen = (now - new Date(customer.first_seen_at).getTime()) / 86400000;

  if (customer.total_visits >= 10 && customer.avg_rating >= 4) return "vip";
  if (customer.total_visits >= 5) return "loyal";
  if (customer.avg_rating >= 4.5 && customer.total_reviews >= 2) return "promoter";
  if (customer.avg_rating <= 2 && customer.total_reviews >= 1) return "detractor";
  if (customer.avg_rating >= 3 && customer.avg_rating < 4.5 && customer.total_reviews >= 1) return "passive";
  if (daysSinceLastVisit !== null && daysSinceLastVisit > 90 && customer.total_visits > 1) return "returning_after_long_time";
  if (daysSinceLastVisit !== null && daysSinceLastVisit > 60) return "inactive";
  if (customer.total_reviews >= 1 && customer.avg_rating <= 3) return "needs_followup";
  if (customer.total_visits >= 2) return "returning";
  if (daysSinceFirstSeen < 7) return "new";
  return "new";
}
