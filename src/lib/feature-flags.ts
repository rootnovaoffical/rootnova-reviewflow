import { supabase } from "./supabase";
import type { FeatureFlag, FeatureFlagOverride, PlanEntitlement } from "./types";

export async function listFeatureFlags(): Promise<FeatureFlag[]> {
  const { data, error } = await supabase
    .from("feature_flags")
    .select("*")
    .order("category", { ascending: true });
  if (error) throw error;
  return (data || []) as FeatureFlag[];
}

export async function getFeatureFlag(key: string): Promise<FeatureFlag | null> {
  const { data, error } = await supabase
    .from("feature_flags")
    .select("*")
    .eq("key", key)
    .maybeSingle();
  if (error) throw error;
  return data as FeatureFlag | null;
}

export async function createFeatureFlag(input: {
  key: string;
  label: string;
  description?: string;
  category: string;
  is_enabled?: boolean;
}): Promise<FeatureFlag> {
  const { data, error } = await supabase
    .from("feature_flags")
    .insert({
      ...input,
      is_enabled: input.is_enabled ?? false,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as FeatureFlag;
}

export async function updateFeatureFlag(
  key: string,
  is_enabled: boolean
): Promise<FeatureFlag> {
  const { data, error } = await supabase
    .from("feature_flags")
    .update({ is_enabled })
    .eq("key", key)
    .select("*")
    .single();
  if (error) throw error;
  return data as FeatureFlag;
}

export async function deleteFeatureFlag(key: string): Promise<void> {
  const { error } = await supabase.from("feature_flags").delete().eq("key", key);
  if (error) throw error;
}

export async function isFeatureEnabled(
  key: string,
  orgId?: string,
  userId?: string
): Promise<boolean> {
  const flag = await getFeatureFlag(key);
  if (!flag || !flag.is_enabled) return false;

  if (orgId) {
    const { data: override } = await supabase
      .from("feature_flag_overrides")
      .select("is_enabled")
      .eq("flag_key", key)
      .eq("organization_id", orgId)
      .maybeSingle();
    if (override) return override.is_enabled;
  }

  if (userId) {
    const { data: override } = await supabase
      .from("feature_flag_overrides")
      .select("is_enabled")
      .eq("flag_key", key)
      .eq("user_id", userId)
      .maybeSingle();
    if (override) return override.is_enabled;
  }

  return true;
}

export async function listOverrides(
  flagKey?: string,
  orgId?: string
): Promise<FeatureFlagOverride[]> {
  let query = supabase.from("feature_flag_overrides").select("*");
  if (flagKey) query = query.eq("flag_key", flagKey);
  if (orgId) query = query.eq("organization_id", orgId);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as FeatureFlagOverride[];
}

export async function createOverride(input: {
  flag_key: string;
  organization_id?: string;
  user_id?: string;
  is_enabled: boolean;
}): Promise<FeatureFlagOverride> {
  const { data, error } = await supabase
    .from("feature_flag_overrides")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data as FeatureFlagOverride;
}

export async function deleteOverride(id: string): Promise<void> {
  const { error } = await supabase
    .from("feature_flag_overrides")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function listEntitlements(planId: string): Promise<PlanEntitlement[]> {
  const { data, error } = await supabase
    .from("plan_entitlements")
    .select("*")
    .eq("plan_id", planId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data || []) as PlanEntitlement[];
}

export async function listAllEntitlements(): Promise<(PlanEntitlement & { plan: { name: string } | null })[]> {
  const { data, error } = await supabase
    .from("plan_entitlements")
    .select("*, plan:plans(name)")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data || []) as (PlanEntitlement & { plan: { name: string } | null })[];
}

export async function upsertEntitlement(input: {
  plan_id: string;
  feature_key: string;
  feature_label?: string;
  is_allowed: boolean;
  limit_value?: number | null;
  sort_order?: number;
}): Promise<PlanEntitlement> {
  const { data: existing } = await supabase
    .from("plan_entitlements")
    .select("id")
    .eq("plan_id", input.plan_id)
    .eq("feature_key", input.feature_key)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from("plan_entitlements")
      .update({
        feature_label: input.feature_label,
        is_allowed: input.is_allowed,
        limit_value: input.limit_value ?? null,
        sort_order: input.sort_order ?? 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw error;
    return data as PlanEntitlement;
  }

  const { data, error } = await supabase
    .from("plan_entitlements")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data as PlanEntitlement;
}

export async function deleteEntitlement(id: string): Promise<void> {
  const { error } = await supabase
    .from("plan_entitlements")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function checkEntitlement(
  planId: string,
  featureKey: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("plan_entitlements")
    .select("is_allowed")
    .eq("plan_id", planId)
    .eq("feature_key", featureKey)
    .maybeSingle();
  if (error) throw error;
  return data?.is_allowed ?? false;
}
