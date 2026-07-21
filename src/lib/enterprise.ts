import { supabase } from "./supabase";
import type { Organization } from "./types";

// ============================================================
// TYPES
// ============================================================

export type RegionType = "region" | "zone" | "territory" | "country" | "state" | "city" | "area" | "district";
export type BranchType = "head_office" | "store" | "franchise" | "kiosk" | "warehouse" | "pop_up";
export type BranchStatus = "active" | "inactive" | "maintenance" | "suspended" | "onboarding";
export type EnterpriseRole =
  | "ENTERPRISE_ADMIN"
  | "ORGANIZATION_ADMIN"
  | "REGIONAL_DIRECTOR"
  | "REGIONAL_MANAGER"
  | "AREA_MANAGER"
  | "BRANCH_MANAGER"
  | "DEPARTMENT_MANAGER"
  | "SUPERVISOR"
  | "EMPLOYEE"
  | "READ_ONLY_AUDITOR";
export type PolicyType = "branding" | "operational" | "compliance" | "approval" | "communication" | "marketing" | "ai" | "integration";
export type EventCategory = "branch" | "manager" | "policy" | "campaign" | "performance" | "review" | "risk" | "compliance" | "system";
export type EventSeverity = "info" | "warning" | "critical" | "positive";

export interface EnterpriseRegion {
  id: string;
  organization_id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  region_type: RegionType;
  code: string | null;
  metadata: Record<string, unknown>;
  status: string;
  created_at: string;
  updated_at: string;
  children?: EnterpriseRegion[];
  branch_count?: number;
}

export interface EnterpriseBranch {
  id: string;
  organization_id: string;
  region_id: string | null;
  business_id: string | null;
  name: string;
  slug: string;
  branch_code: string | null;
  branch_type: BranchType;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  timezone: string;
  currency: string;
  language: string;
  phone: string | null;
  email: string | null;
  operating_hours: Record<string, unknown>;
  status: BranchStatus;
  health_score: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  region?: EnterpriseRegion | null;
  business?: { id: string; name: string; slug: string } | null;
  manager_count?: number;
  performance?: BranchPerformance;
}

export interface BranchManager {
  id: string;
  branch_id: string;
  user_id: string;
  enterprise_role: EnterpriseRole;
  status: string;
  assigned_at: string;
  created_at: string;
  updated_at: string;
  profile?: { id: string; full_name: string | null; email: string | null; avatar_url: string | null } | null;
}

export interface EnterpriseRoleAssignment {
  id: string;
  organization_id: string;
  user_id: string;
  enterprise_role: EnterpriseRole;
  scope_type: "organization" | "region" | "branch";
  scope_id: string | null;
  permissions: string[];
  status: string;
  assigned_by: string | null;
  created_at: string;
  updated_at: string;
  profile?: { id: string; full_name: string | null; email: string | null } | null;
}

export interface OrganizationPolicy {
  id: string;
  organization_id: string;
  region_id: string | null;
  branch_id: string | null;
  policy_key: string;
  policy_type: PolicyType;
  name: string;
  description: string | null;
  rules: Record<string, unknown>;
  is_inherited: boolean;
  is_overridable: boolean;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnterpriseEvent {
  id: string;
  organization_id: string;
  region_id: string | null;
  branch_id: string | null;
  event_type: string;
  event_category: EventCategory;
  severity: EventSeverity;
  title: string;
  description: string | null;
  event_data: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  branch?: { id: string; name: string } | null;
  region?: { id: string; name: string } | null;
}

export interface BranchPerformance {
  branch_id: string;
  total_reviews: number;
  avg_rating: number;
  response_rate: number;
  total_customers: number;
  total_campaigns: number;
  total_messages: number;
  delivered_rate: number;
  active_workflows: number;
  health_score: number;
  review_trend: number;
}

export interface DashboardBranchSummary {
  branch_id: string;
  branch_name: string;
  city: string;
  avg_rating: number;
  total_reviews: number;
  response_rate: number;
  total_customers: number;
  total_campaigns: number;
  total_messages: number;
  delivered_rate: number;
  active_workflows: number;
  health_score: number;
  review_trend: number;
}

export interface EnterpriseDashboardData {
  total_branches: number;
  active_branches: number;
  total_regions: number;
  total_managers: number;
  total_reviews: number;
  avg_rating: number;
  total_customers: number;
  total_campaigns: number;
  total_messages: number;
  response_rate: number;
  top_performers: DashboardBranchSummary[];
  low_performers: DashboardBranchSummary[];
  recent_events: EnterpriseEvent[];
  regional_breakdown: Array<{ region: string; branch_count: number; avg_rating: number; total_reviews: number }>;
}

export interface ComparisonData {
  branches: Array<{
    branch_id: string;
    branch_name: string;
    city: string | null;
    avg_rating: number;
    total_reviews: number;
    response_rate: number;
    total_customers: number;
    total_campaigns: number;
    health_score: number;
  }>;
}

// ============================================================
// ORGANIZATION RESOLUTION
// ============================================================

export async function getUserOrganization(): Promise<Organization | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("organization_members")
    .select("organization_id, organizations(*)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  return (data as { organizations: Organization } | null)?.organizations ?? null;
}

export async function getUserOrgId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  return data?.organization_id ?? null;
}

export async function getUserEnterpriseRole(orgId: string): Promise<EnterpriseRole | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", orgId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  return (data?.role as EnterpriseRole) ?? null;
}

export function isEnterpriseAdminRole(role: string | null | undefined): boolean {
  return role === "ENTERPRISE_ADMIN" || role === "ORGANIZATION_ADMIN";
}

// ============================================================
// REGIONS
// ============================================================

export async function fetchRegions(orgId: string): Promise<EnterpriseRegion[]> {
  const { data } = await supabase
    .from("enterprise_regions")
    .select("*")
    .eq("organization_id", orgId)
    .order("name");
  return (data ?? []) as EnterpriseRegion[];
}

export async function createRegion(orgId: string, region: {
  name: string;
  slug: string;
  region_type: RegionType;
  parent_id?: string | null;
  code?: string | null;
}): Promise<EnterpriseRegion | null> {
  const { data } = await supabase
    .from("enterprise_regions")
    .insert({
      organization_id: orgId,
      name: region.name,
      slug: region.slug,
      region_type: region.region_type,
      parent_id: region.parent_id ?? null,
      code: region.code ?? null,
    })
    .select("*")
    .single();
  return data as EnterpriseRegion | null;
}

export async function updateRegion(regionId: string, updates: Partial<Pick<EnterpriseRegion, "name" | "status" | "metadata" | "code">>): Promise<void> {
  await supabase.from("enterprise_regions").update(updates).eq("id", regionId);
}

export async function deleteRegion(regionId: string): Promise<void> {
  await supabase.from("enterprise_regions").delete().eq("id", regionId);
}

export function buildRegionTree(regions: EnterpriseRegion[]): EnterpriseRegion[] {
  const map = new Map<string, EnterpriseRegion>();
  const roots: EnterpriseRegion[] = [];

  regions.forEach((r) => map.set(r.id, { ...r, children: [] }));
  regions.forEach((r) => {
    const node = map.get(r.id)!;
    if (r.parent_id && map.has(r.parent_id)) {
      map.get(r.parent_id)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

// ============================================================
// BRANCHES
// ============================================================

export async function fetchBranches(orgId: string): Promise<EnterpriseBranch[]> {
  const { data } = await supabase
    .from("enterprise_branches")
    .select("*, region:enterprise_regions(*), business:businesses(id,name,slug)")
    .eq("organization_id", orgId)
    .order("name");
  return (data ?? []) as unknown as EnterpriseBranch[];
}

export async function fetchBranch(branchId: string): Promise<EnterpriseBranch | null> {
  const { data } = await supabase
    .from("enterprise_branches")
    .select("*, region:enterprise_regions(*), business:businesses(id,name,slug)")
    .eq("id", branchId)
    .maybeSingle();
  return data as unknown as EnterpriseBranch | null;
}

export async function createBranch(orgId: string, branch: {
  name: string;
  slug: string;
  branch_type?: BranchType;
  region_id?: string | null;
  business_id?: string | null;
  branch_code?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  timezone?: string;
  currency?: string;
  language?: string;
  phone?: string | null;
  email?: string | null;
  operating_hours?: Record<string, unknown>;
}): Promise<EnterpriseBranch | null> {
  const { data } = await supabase
    .from("enterprise_branches")
    .insert({
      organization_id: orgId,
      name: branch.name,
      slug: branch.slug,
      branch_type: branch.branch_type ?? "store",
      region_id: branch.region_id ?? null,
      business_id: branch.business_id ?? null,
      branch_code: branch.branch_code ?? null,
      address: branch.address ?? null,
      city: branch.city ?? null,
      state: branch.state ?? null,
      country: branch.country ?? null,
      timezone: branch.timezone ?? "UTC",
      currency: branch.currency ?? "USD",
      language: branch.language ?? "en",
      phone: branch.phone ?? null,
      email: branch.email ?? null,
      operating_hours: branch.operating_hours ?? {},
    })
    .select("*")
    .single();
  return data as EnterpriseBranch | null;
}

export async function updateBranch(branchId: string, updates: Partial<EnterpriseBranch>): Promise<void> {
  const { operating_hours, ...rest } = updates;
  const safe: Record<string, unknown> = { ...rest };
  if (operating_hours !== undefined) safe.operating_hours = operating_hours;
  await supabase.from("enterprise_branches").update(safe).eq("id", branchId);
}

export async function deleteBranch(branchId: string): Promise<void> {
  await supabase.from("enterprise_branches").delete().eq("id", branchId);
}

// ============================================================
// BRANCH MANAGERS
// ============================================================

export async function fetchBranchManagers(branchId: string): Promise<BranchManager[]> {
  const { data } = await supabase
    .from("enterprise_branch_managers")
    .select("*, profile:profiles(id,full_name,email,avatar_url)")
    .eq("branch_id", branchId)
    .order("assigned_at", { ascending: false });
  return (data ?? []) as unknown as BranchManager[];
}

export async function assignBranchManager(branchId: string, userId: string, role: EnterpriseRole): Promise<BranchManager | null> {
  const { data } = await supabase
    .from("enterprise_branch_managers")
    .insert({ branch_id: branchId, user_id: userId, enterprise_role: role })
    .select("*")
    .single();
  return data as BranchManager | null;
}

export async function removeBranchManager(managerId: string): Promise<void> {
  await supabase.from("enterprise_branch_managers").delete().eq("id", managerId);
}

// ============================================================
// ENTERPRISE ROLES
// ============================================================

export async function fetchEnterpriseRoles(orgId: string): Promise<EnterpriseRoleAssignment[]> {
  const { data } = await supabase
    .from("enterprise_roles")
    .select("*, profile:profiles(id,full_name,email)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as EnterpriseRoleAssignment[];
}

export async function assignEnterpriseRole(orgId: string, assignment: {
  user_id: string;
  enterprise_role: EnterpriseRole;
  scope_type: "organization" | "region" | "branch";
  scope_id?: string | null;
  permissions?: string[];
}): Promise<void> {
  await supabase.from("enterprise_roles").insert({
    organization_id: orgId,
    user_id: assignment.user_id,
    enterprise_role: assignment.enterprise_role,
    scope_type: assignment.scope_type,
    scope_id: assignment.scope_id ?? null,
    permissions: assignment.permissions ?? [],
  });
}

// ============================================================
// POLICIES
// ============================================================

export async function fetchPolicies(orgId: string): Promise<OrganizationPolicy[]> {
  const { data } = await supabase
    .from("organization_policies")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  return (data ?? []) as OrganizationPolicy[];
}

export async function createPolicy(orgId: string, policy: {
  policy_key: string;
  policy_type: PolicyType;
  name: string;
  description?: string | null;
  rules?: Record<string, unknown>;
  region_id?: string | null;
  branch_id?: string | null;
  is_overridable?: boolean;
}): Promise<OrganizationPolicy | null> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = await supabase
    .from("organization_policies")
    .insert({
      organization_id: orgId,
      policy_key: policy.policy_key,
      policy_type: policy.policy_type,
      name: policy.name,
      description: policy.description ?? null,
      rules: policy.rules ?? {},
      region_id: policy.region_id ?? null,
      branch_id: policy.branch_id ?? null,
      is_overridable: policy.is_overridable ?? true,
      created_by: user?.id ?? null,
    })
    .select("*")
    .single();
  return data as OrganizationPolicy | null;
}

export async function updatePolicy(policyId: string, updates: Partial<OrganizationPolicy>): Promise<void> {
  const safe: Record<string, unknown> = { ...updates };
  delete safe.id;
  delete safe.organization_id;
  delete safe.created_at;
  await supabase.from("organization_policies").update(safe).eq("id", policyId);
}

export async function deletePolicy(policyId: string): Promise<void> {
  await supabase.from("organization_policies").delete().eq("id", policyId);
}

// ============================================================
// EVENTS
// ============================================================

export async function fetchEvents(orgId: string, limit = 50): Promise<EnterpriseEvent[]> {
  const { data } = await supabase
    .from("enterprise_events")
    .select("*, branch:enterprise_branches(id,name), region:enterprise_regions(id,name)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as EnterpriseEvent[];
}

export async function logEnterpriseEvent(orgId: string, event: {
  event_type: string;
  event_category: EventCategory;
  severity?: EventSeverity;
  title: string;
  description?: string | null;
  region_id?: string | null;
  branch_id?: string | null;
  event_data?: Record<string, unknown>;
}): Promise<void> {
  await supabase.from("enterprise_events").insert({
    organization_id: orgId,
    event_type: event.event_type,
    event_category: event.event_category,
    severity: event.severity ?? "info",
    title: event.title,
    description: event.description ?? null,
    region_id: event.region_id ?? null,
    branch_id: event.branch_id ?? null,
    event_data: event.event_data ?? {},
  });
}

// ============================================================
// ENTERPRISE DASHBOARD — cross-location aggregation
// ============================================================

export async function getEnterpriseDashboard(orgId: string): Promise<EnterpriseDashboardData> {
  const [branches, regions, managers, events] = await Promise.all([
    supabase.from("enterprise_branches").select("*").eq("organization_id", orgId),
    supabase.from("enterprise_regions").select("id").eq("organization_id", orgId),
    supabase.from("enterprise_branch_managers")
      .select("id, branch:enterprise_branches!inner(organization_id)")
      .eq("branch.organization_id", orgId),
    supabase.from("enterprise_events")
      .select("*, branch:enterprise_branches(id,name), region:enterprise_regions(id,name)")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const branchList = (branches.data ?? []) as EnterpriseBranch[];
  const activeBranches = branchList.filter((b) => b.status === "active");

  // Fetch performance for each branch that has a business_id
  const branchBusinessIds = branchList
    .filter((b) => b.business_id)
    .map((b) => ({ branch: b, businessId: b.business_id! }));

  const performances = await Promise.all(
    branchBusinessIds.map(async ({ branch, businessId }) => {
      const perf = await getBranchPerformance(branch.id, businessId);
      return { branch, perf };
    })
  );

  const allPerf = performances.map(({ branch, perf }) => ({
    branch_id: branch.id,
    branch_name: branch.name,
    city: branch.city,
    avg_rating: perf.avg_rating,
    total_reviews: perf.total_reviews,
    response_rate: perf.response_rate,
    total_customers: perf.total_customers,
    total_campaigns: perf.total_campaigns,
    health_score: perf.health_score,
  }));

  const sortedByRating = [...allPerf].sort((a, b) => b.avg_rating - a.avg_rating);
  const topPerformers = sortedByRating.slice(0, 5);
  const lowPerformers = [...sortedByRating].reverse().slice(0, 5);

  // Regional breakdown
  const regionalMap = new Map<string, { region: string; branch_count: number; ratings: number[]; total_reviews: number }>();
  branchList.forEach((b) => {
    const regionName = b.region?.name ?? "Unassigned";
    const existing = regionalMap.get(regionName) ?? { region: regionName, branch_count: 0, ratings: [], total_reviews: 0 };
    existing.branch_count++;
    const perf = allPerf.find((p) => p.branch_id === b.id);
    if (perf) {
      if (perf.avg_rating > 0) existing.ratings.push(perf.avg_rating);
      existing.total_reviews += perf.total_reviews;
    }
    regionalMap.set(regionName, existing);
  });

  const regionalBreakdown = Array.from(regionalMap.values()).map((r) => ({
    region: r.region,
    branch_count: r.branch_count,
    avg_rating: r.ratings.length > 0 ? r.ratings.reduce((s, v) => s + v, 0) / r.ratings.length : 0,
    total_reviews: r.total_reviews,
  }));

  const totalReviews = allPerf.reduce((s, p) => s + p.total_reviews, 0);
  const avgRating = allPerf.length > 0 && allPerf.some((p) => p.avg_rating > 0)
    ? allPerf.filter((p) => p.avg_rating > 0).reduce((s, p) => s + p.avg_rating, 0) / allPerf.filter((p) => p.avg_rating > 0).length
    : 0;
  const totalCustomers = allPerf.reduce((s, p) => s + p.total_customers, 0);
  const totalCampaigns = allPerf.reduce((s, p) => s + p.total_campaigns, 0);
  const responseRate = allPerf.length > 0
    ? allPerf.reduce((s, p) => s + p.response_rate, 0) / allPerf.length
    : 0;

  return {
    total_branches: branchList.length,
    active_branches: activeBranches.length,
    total_regions: regions.data?.length ?? 0,
    total_managers: managers.data?.length ?? 0,
    total_reviews: totalReviews,
    avg_rating: avgRating,
    total_customers: totalCustomers,
    total_campaigns: totalCampaigns,
    total_messages: 0,
    response_rate: responseRate,
    top_performers: topPerformers.map((p) => ({
      branch_id: p.branch_id,
      branch_name: p.branch_name,
      city: p.city ?? "",
      avg_rating: p.avg_rating,
      total_reviews: p.total_reviews,
      response_rate: p.response_rate,
      total_customers: p.total_customers,
      total_campaigns: p.total_campaigns,
      total_messages: 0,
      delivered_rate: 0,
      active_workflows: 0,
      health_score: p.health_score,
      review_trend: 0,
    })),
    low_performers: lowPerformers.map((p) => ({
      branch_id: p.branch_id,
      branch_name: p.branch_name,
      city: p.city ?? "",
      avg_rating: p.avg_rating,
      total_reviews: p.total_reviews,
      response_rate: p.response_rate,
      total_customers: p.total_customers,
      total_campaigns: p.total_campaigns,
      total_messages: 0,
      delivered_rate: 0,
      active_workflows: 0,
      health_score: p.health_score,
      review_trend: 0,
    })),
    recent_events: (events.data ?? []) as unknown as EnterpriseEvent[],
    regional_breakdown: regionalBreakdown,
  };
}

export async function getBranchPerformance(branchId: string, businessId: string): Promise<BranchPerformance> {
  const [reviews, customers, campaigns, messages, workflows] = await Promise.all([
    supabase.from("review_sessions").select("rating, business_response, created_at").eq("business_id", businessId),
    supabase.from("customers").select("id").eq("business_id", businessId),
    supabase.from("campaigns").select("id").eq("business_id", businessId),
    supabase.from("messages").select("status").eq("business_id", businessId),
    supabase.from("workflows").select("id, status").eq("business_id", businessId),
  ]);

  const completedReviews = (reviews.data ?? []).filter((r) => r.rating !== null);
  const avgRating = completedReviews.length > 0
    ? completedReviews.reduce((s, r) => s + (r.rating ?? 0), 0) / completedReviews.length
    : 0;
  const responded = completedReviews.filter((r) => r.business_response).length;
  const responseRate = completedReviews.length > 0 ? (responded / completedReviews.length) * 100 : 0;
  const totalCustomers = customers.data?.length ?? 0;
  const totalCampaigns = campaigns.data?.length ?? 0;
  const totalMessages = messages.data?.length ?? 0;
  const delivered = messages.data?.filter((m) => m.status === "delivered" || m.status === "read" || m.status === "clicked").length ?? 0;
  const deliveredRate = totalMessages > 0 ? (delivered / totalMessages) * 100 : 0;
  const activeWorkflows = workflows.data?.filter((w) => w.status === "active").length ?? 0;

  // Review trend (last 7 days vs previous 7)
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const recentReviews = completedReviews.filter((r) => new Date(r.created_at) >= sevenDaysAgo).length;
  const previousReviews = completedReviews.filter((r) => new Date(r.created_at) >= fourteenDaysAgo && new Date(r.created_at) < sevenDaysAgo).length;
  const reviewTrend = previousReviews > 0 ? ((recentReviews - previousReviews) / previousReviews) * 100 : recentReviews > 0 ? 100 : 0;

  // Health score: weighted combination
  const healthScore = Math.round(
    (avgRating / 5) * 40 +
    (responseRate / 100) * 25 +
    (deliveredRate / 100) * 15 +
    Math.min(activeWorkflows * 5, 20)
  );

  return {
    branch_id: branchId,
    total_reviews: completedReviews.length,
    avg_rating: avgRating,
    response_rate: responseRate,
    total_customers: totalCustomers,
    total_campaigns: totalCampaigns,
    total_messages: totalMessages,
    delivered_rate: deliveredRate,
    active_workflows: activeWorkflows,
    health_score: healthScore,
    review_trend: reviewTrend,
  };
}

// ============================================================
// COMPARISON
// ============================================================

export async function getComparisonData(orgId: string): Promise<ComparisonData> {
  const branches = await fetchBranches(orgId);

  const branchesWithPerf = await Promise.all(
    branches
      .filter((b) => b.business_id)
      .map(async (b) => {
        const perf = await getBranchPerformance(b.id, b.business_id!);
        return {
          branch_id: b.id,
          branch_name: b.name,
          city: b.city,
          avg_rating: perf.avg_rating,
          total_reviews: perf.total_reviews,
          response_rate: perf.response_rate,
          total_customers: perf.total_customers,
          total_campaigns: perf.total_campaigns,
          health_score: perf.health_score,
        };
      })
  );

  return { branches: branchesWithPerf };
}

// ============================================================
// AI ENTERPRISE INSIGHTS — calls enterprise-ai edge function
// ============================================================

export interface EnterpriseAIInsight {
  type: string;
  title: string;
  description: string;
  evidence: string[];
  confidence: number;
  severity: "info" | "warning" | "critical" | "positive";
  recommended_action: string;
  affected_branches: string[];
}

export async function generateEnterpriseAIInsights(orgId: string, dashboardData: EnterpriseDashboardData): Promise<EnterpriseAIInsight[]> {
  try {
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enterprise-ai`;
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ orgId, dashboardData }),
    });

    if (!response.ok) return [];
    const result = await response.json();
    if (!result.insights || !Array.isArray(result.insights)) return [];
    return result.insights as EnterpriseAIInsight[];
  } catch {
    return [];
  }
}

// ============================================================
// ROLE METADATA
// ============================================================

export const enterpriseRoleMeta: Record<EnterpriseRole, { label: string; color: string; scope: string }> = {
  ENTERPRISE_ADMIN: { label: "Enterprise Admin", color: "indigo", scope: "Organization" },
  ORGANIZATION_ADMIN: { label: "Organization Admin", color: "indigo", scope: "Organization" },
  REGIONAL_DIRECTOR: { label: "Regional Director", color: "sky", scope: "Region" },
  REGIONAL_MANAGER: { label: "Regional Manager", color: "sky", scope: "Region" },
  AREA_MANAGER: { label: "Area Manager", color: "blue", scope: "Region" },
  BRANCH_MANAGER: { label: "Branch Manager", color: "emerald", scope: "Branch" },
  DEPARTMENT_MANAGER: { label: "Department Manager", color: "emerald", scope: "Branch" },
  SUPERVISOR: { label: "Supervisor", color: "amber", scope: "Branch" },
  EMPLOYEE: { label: "Employee", color: "slate", scope: "Branch" },
  READ_ONLY_AUDITOR: { label: "Read-Only Auditor", color: "slate", scope: "Organization" },
};

export const branchStatusMeta: Record<BranchStatus, { label: string; color: string }> = {
  active: { label: "Active", color: "emerald" },
  inactive: { label: "Inactive", color: "slate" },
  maintenance: { label: "Maintenance", color: "amber" },
  suspended: { label: "Suspended", color: "rose" },
  onboarding: { label: "Onboarding", color: "sky" },
};

export const regionTypeMeta: Record<RegionType, { label: string }> = {
  region: { label: "Region" },
  zone: { label: "Zone" },
  territory: { label: "Territory" },
  country: { label: "Country" },
  state: { label: "State" },
  city: { label: "City" },
  area: { label: "Area" },
  district: { label: "District" },
};

export const policyTypeMeta: Record<PolicyType, { label: string }> = {
  branding: { label: "Branding" },
  operational: { label: "Operational" },
  compliance: { label: "Compliance" },
  approval: { label: "Approval" },
  communication: { label: "Communication" },
  marketing: { label: "Marketing" },
  ai: { label: "AI" },
  integration: { label: "Integration" },
};

export const eventSeverityMeta: Record<EventSeverity, { label: string; color: string }> = {
  info: { label: "Info", color: "blue" },
  warning: { label: "Warning", color: "amber" },
  critical: { label: "Critical", color: "rose" },
  positive: { label: "Positive", color: "emerald" },
};
