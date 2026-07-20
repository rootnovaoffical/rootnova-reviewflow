import { supabase } from "./supabase";
import type { Business, ReviewSession, AnalyticsEvent, Profile } from "./types";

export async function getBusinessById(id: string): Promise<Business | null> {
  const { data, error } = await supabase.from("businesses").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Business | null;
}

export async function getReviewSessions(businessId: string): Promise<ReviewSession[]> {
  const { data, error } = await supabase.from("review_sessions").select("*").eq("business_id", businessId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as ReviewSession[];
}

export async function getAnalyticsEvents(businessId: string): Promise<AnalyticsEvent[]> {
  const { data, error } = await supabase.from("analytics_events").select("*").eq("business_id", businessId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as AnalyticsEvent[];
}

export async function listBusinessesByOrg(orgId: string): Promise<Business[]> {
  const { data, error } = await supabase.from("businesses").select("*").eq("organization_id", orgId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as Business[];
}

export async function listProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as Profile[];
}


export async function listBusinesses(): Promise<Business[]> {
  const { data, error } = await supabase.from("businesses").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as Business[];
}

export async function getQuestions(businessId: string): Promise<import("./types").Question[]> {
  const { data, error } = await supabase.from("questions").select("*").eq("business_id", businessId).order("sort_order", { ascending: true });
  if (error) throw error;
  return (data || []) as import("./types").Question[];
}

export async function createQuestion(businessId: string, input: Record<string, unknown>): Promise<import("./types").Question> {
  const { data, error } = await supabase.from("questions").insert({ ...input, business_id: businessId }).select("*").single();
  if (error) throw error;
  return data as import("./types").Question;
}

export async function updateQuestion(id: string, patch: Record<string, unknown>): Promise<import("./types").Question> {
  const { data, error } = await supabase.from("questions").update(patch).eq("id", id).select("*").single();
  if (error) throw error;
  return data as import("./types").Question;
}

export async function deleteQuestion(id: string): Promise<void> {
  const { error } = await supabase.from("questions").delete().eq("id", id);
  if (error) throw error;
}

export async function updateBusiness(id: string, patch: Record<string, unknown>): Promise<Business> {
  const { data, error } = await supabase.from("businesses").update(patch).eq("id", id).select("*").single();
  if (error) throw error;
  return data as Business;
}

export async function listAdminInvitations(): Promise<import("./types").AdminInvitation[]> {
  const { data, error } = await supabase.from("admin_invitations").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as import("./types").AdminInvitation[];
}

export async function updateProfileStatus(userId: string, status: string): Promise<void> {
  const { error } = await supabase.from("profiles").update({ account_status: status }).eq("id", userId);
  if (error) throw error;
}

export async function listAuditLogs(limit = 100): Promise<import("./types").AuditLog[]> {
  const { data, error } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data || []) as import("./types").AuditLog[];
}

export { logAudit } from "./audit";

export const db = {
  getProfile: (id: string) => supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
  updateProfile: (id: string, updates: Record<string, unknown>) => supabase.from("profiles").update(updates).eq("id", id),
  listOrganizations: () => supabase.from("organizations").select("*").order("created_at", { ascending: false }),
  getOrganization: (id: string) => supabase.from("organizations").select("*").eq("id", id).maybeSingle(),
  updateOrganization: (id: string, updates: Record<string, unknown>) => supabase.from("organizations").update(updates).eq("id", id),
  createOrganization: (data: Record<string, unknown>) => supabase.from("organizations").insert(data).select().single(),
  listOrgMembers: (orgId: string) => supabase.from("organization_members").select("*, profile:profiles!organization_members_user_id_fkey(*)").eq("organization_id", orgId).order("created_at", { ascending: true }),
  listBusinesses: () => supabase.from("businesses").select("*").order("created_at", { ascending: false }),
  listBusinessesWithOrg: () => supabase.from("businesses").select("*, organization:organizations(name)").order("created_at", { ascending: false }),
  listBusinessesByOrg: (orgId: string) => supabase.from("businesses").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }),
  getBusiness: (id: string) => supabase.from("businesses").select("*").eq("id", id).maybeSingle(),
  getBusinessBySlug: (slug: string) => supabase.from("businesses").select("*").eq("slug", slug).maybeSingle(),
  createBusiness: (data: Record<string, unknown>) => supabase.from("businesses").insert(data).select().single(),
  updateBusiness: (id: string, updates: Record<string, unknown>) => supabase.from("businesses").update(updates).eq("id", id),
  listQuestions: (businessId: string) => supabase.from("questions").select("*").eq("business_id", businessId).order("sort_order", { ascending: true }),
  listActiveQuestions: (businessId: string) => supabase.from("questions").select("*").eq("business_id", businessId).eq("is_active", true).order("sort_order", { ascending: true }),
  createQuestion: (data: Record<string, unknown>) => supabase.from("questions").insert(data).select().single(),
  updateQuestion: (id: string, updates: Record<string, unknown>) => supabase.from("questions").update(updates).eq("id", id),
  deleteQuestion: (id: string) => supabase.from("questions").delete().eq("id", id),
  listReviewSessions: (businessId: string) => supabase.from("review_sessions").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
  createReviewSession: (data: Record<string, unknown>) => supabase.from("review_sessions").insert(data).select().single(),
  getReviewSession: (id: string) => supabase.from("review_sessions").select("*").eq("id", id).maybeSingle(),
  updateReviewSession: (id: string, updates: Record<string, unknown>) => supabase.from("review_sessions").update(updates).eq("id", id),
  listAnalytics: (businessId: string) => supabase.from("analytics_events").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
  trackEvent: (eventType: string, businessId: string | null, sessionId: string | null, metadata: Record<string, unknown> = {}) => supabase.from("analytics_events").insert({ event_type: eventType, business_id: businessId, session_id: sessionId, metadata }),
  listPlans: () => supabase.from("plans").select("*").order("sort_order", { ascending: true }),
  getPlan: (id: string) => supabase.from("plans").select("*").eq("id", id).maybeSingle(),
  createPlan: (data: Record<string, unknown>) => supabase.from("plans").insert(data).select().single(),
  updatePlan: (id: string, updates: Record<string, unknown>) => supabase.from("plans").update(updates).eq("id", id),
  deletePlan: (id: string) => supabase.from("plans").delete().eq("id", id),
  listSubscriptions: () => supabase.from("subscriptions").select("*, plan:plans(*)").order("created_at", { ascending: false }),
  listSubscriptionsByOrg: (orgId: string) => supabase.from("subscriptions").select("*, plan:plans(*)").eq("organization_id", orgId).order("created_at", { ascending: false }),
  createSubscription: (data: Record<string, unknown>) => supabase.from("subscriptions").insert(data).select().single(),
  updateSubscription: (id: string, updates: Record<string, unknown>) => supabase.from("subscriptions").update(updates).eq("id", id),
  listPayments: () => supabase.from("payments").select("*, organization:organizations(*)").order("created_at", { ascending: false }),
  listPaymentsByOrg: (orgId: string) => supabase.from("payments").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }),
  getPayment: (id: string) => supabase.from("payments").select("*").eq("id", id).maybeSingle(),
  createPayment: (data: Record<string, unknown>) => supabase.from("payments").insert(data).select().single(),
  updatePayment: (id: string, updates: Record<string, unknown>) => supabase.from("payments").update(updates).eq("id", id),
  listPlatformAssets: () => supabase.from("platform_assets").select("*").order("key", { ascending: true }),
  getPlatformAsset: (key: string) => supabase.from("platform_assets").select("*").eq("key", key).maybeSingle(),
  createPlatformAsset: (data: Record<string, unknown>) => supabase.from("platform_assets").insert(data).select().single(),
  updatePlatformAsset: (key: string, updates: Record<string, unknown>) => supabase.from("platform_assets").update(updates).eq("key", key),
  listFeatureFlags: () => supabase.from("feature_flags").select("*").order("category", { ascending: true }),
  updateFeatureFlag: (key: string, is_enabled: boolean) => supabase.from("feature_flags").update({ is_enabled }).eq("key", key),
  listAuditLogs: (limit = 100) => supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(limit),
  logAudit: (action: string, targetType: string | null = null, targetId: string | null = null, orgId: string | null = null, metadata: Record<string, unknown> = {}) => supabase.rpc("log_audit", { p_action: action, p_target_type: targetType, p_target_id: targetId, p_org_id: orgId, p_metadata: metadata }),
  listBusinessAdmins: (businessId: string) => supabase.from("business_admins").select("*, profile:profiles!business_admins_user_id_fkey(*)").eq("business_id", businessId),
};
