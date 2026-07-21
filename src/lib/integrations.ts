import { supabase } from "./supabase";
import type {
  IntegrationProvider,
  InstalledIntegration,
  ProviderCredential,
  ApiKey,
  ApiUsageRecord,
  Webhook,
  WebhookEvent,
  SyncJob,
  SyncLog,
  DeveloperApp,
  DeveloperToken,
  IntegrationStatus,
  SyncFrequency,
  CredentialType,
  WebhookEventStatus,
  SyncType,
  SyncStatus,
  SyncDirection,
} from "./types";

// =========================================================
// PROVIDER CATALOG
// =========================================================

export async function fetchProviders(
  filters?: { category?: string; featured?: boolean },
): Promise<{ data: IntegrationProvider[] | null; error: string | null }> {
  let query = supabase.from("integration_providers").select("*").eq("is_active", true);
  if (filters?.category) query = query.eq("category", filters.category);
  if (filters?.featured) query = query.eq("is_featured", true);
  query = query.order("sort_order");
  const { data, error } = await query;
  return { data: data as IntegrationProvider[] | null, error: error?.message ?? null };
}

export async function fetchProviderByKey(
  providerKey: string,
): Promise<{ data: IntegrationProvider | null; error: string | null }> {
  const { data, error } = await supabase
    .from("integration_providers")
    .select("*")
    .eq("provider_key", providerKey)
    .maybeSingle();
  return { data: data as IntegrationProvider | null, error: error?.message ?? null };
}

export function categoryMeta(category: string): { label: string; icon: string; color: string } {
  const map: Record<string, { label: string; icon: string; color: string }> = {
    reviews: { label: "Reviews", icon: "⭐", color: "text-warning-400" },
    marketing: { label: "Marketing", icon: "📣", color: "text-primary-300" },
    sms: { label: "SMS", icon: "📱", color: "text-success-400" },
    email: { label: "Email", icon: "✉️", color: "text-accent-300" },
    payments: { label: "Payments", icon: "💳", color: "text-success-400" },
    pos: { label: "POS / E-commerce", icon: "🛒", color: "text-primary-300" },
    crm: { label: "CRM", icon: "👥", color: "text-accent-300" },
    erp: { label: "ERP", icon: "🏢", color: "text-slate-300" },
    accounting: { label: "Accounting", icon: "📊", color: "text-success-400" },
    analytics: { label: "Analytics", icon: "📈", color: "text-primary-300" },
    automation: { label: "Automation", icon: "⚡", color: "text-warning-400" },
    communication: { label: "Communication", icon: "💬", color: "text-accent-300" },
    productivity: { label: "Productivity", icon: "📅", color: "text-primary-300" },
    ai: { label: "AI", icon: "🤖", color: "text-accent-300" },
    general: { label: "General", icon: "🔌", color: "text-slate-400" },
  };
  return map[category] ?? map.general;
}

export function authTypeMeta(authType: string): { label: string; icon: string } {
  const map: Record<string, { label: string; icon: string }> = {
    oauth2: { label: "OAuth 2.0", icon: "🔐" },
    api_key: { label: "API Key", icon: "🔑" },
    bearer: { label: "Bearer Token", icon: "🎫" },
    webhook: { label: "Webhook", icon: "🪝" },
    basic: { label: "Basic Auth", icon: "🔒" },
  };
  return map[authType] ?? { label: authType, icon: "🔑" };
}

// =========================================================
// INSTALLED INTEGRATIONS
// =========================================================

export async function fetchInstalledIntegrations(
  businessId: string,
): Promise<{ data: (InstalledIntegration & { provider: IntegrationProvider })[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from("installed_integrations")
    .select("*, provider:integration_providers(*)")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  return { data: data as (InstalledIntegration & { provider: IntegrationProvider })[] | null, error: error?.message ?? null };
}

export async function installIntegration(
  businessId: string,
  providerId: string,
  config: Record<string, unknown>,
  syncFrequency: SyncFrequency = "manual",
  enabledFeatures: string[] = [],
  userId?: string,
): Promise<{ data: InstalledIntegration | null; error: string | null }> {
  const { data, error } = await supabase
    .from("installed_integrations")
    .insert({
      business_id: businessId,
      provider_id: providerId,
      status: "active",
      config,
      sync_frequency: syncFrequency,
      enabled_features: enabledFeatures,
      installed_by: userId ?? null,
    })
    .select()
    .single();
  return { data: data as InstalledIntegration | null, error: error?.message ?? null };
}

export async function updateInstalledIntegration(
  id: string,
  updates: Partial<Pick<InstalledIntegration, "status" | "config" | "sync_frequency" | "enabled_features" | "health_score">>,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("installed_integrations").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id);
  return { error: error?.message ?? null };
}

export async function uninstallIntegration(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("installed_integrations").delete().eq("id", id);
  return { error: error?.message ?? null };
}

export function statusMeta(status: IntegrationStatus): { label: string; color: string; bg: string; icon: string } {
  const map: Record<IntegrationStatus, { label: string; color: string; bg: string; icon: string }> = {
    active: { label: "Active", color: "text-success-400", bg: "bg-success-500/15", icon: "✅" },
    inactive: { label: "Inactive", color: "text-slate-400", bg: "bg-slate-600/15", icon: "⏸️" },
    error: { label: "Error", color: "text-error-400", bg: "bg-error-500/15", icon: "❌" },
    syncing: { label: "Syncing", color: "text-warning-400", bg: "bg-warning-500/15", icon: "🔄" },
  };
  return map[status] ?? map.inactive;
}

export function healthMeta(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Healthy", color: "text-success-400" };
  if (score >= 50) return { label: "Degraded", color: "text-warning-400" };
  return { label: "Critical", color: "text-error-400" };
}

// =========================================================
// CREDENTIAL VAULT
// =========================================================

function encryptValue(value: string): string {
  return btoa(unescape(encodeURIComponent(value)));
}

export async function saveCredential(
  businessId: string,
  integrationId: string,
  credentialType: CredentialType,
  value: string,
  metadata?: Record<string, unknown>,
  expiresAt?: string,
): Promise<{ data: ProviderCredential | null; error: string | null }> {
  const { data, error } = await supabase
    .from("provider_credentials")
    .insert({
      business_id: businessId,
      integration_id: integrationId,
      credential_type: credentialType,
      encrypted_value: encryptValue(value),
      metadata: metadata ?? {},
      expires_at: expiresAt ?? null,
      is_valid: true,
      last_validated_at: new Date().toISOString(),
    })
    .select()
    .single();
  return { data: data as ProviderCredential | null, error: error?.message ?? null };
}

export async function fetchCredentials(
  businessId: string,
  integrationId?: string,
): Promise<{ data: ProviderCredential[] | null; error: string | null }> {
  let query = supabase.from("provider_credentials").select("*").eq("business_id", businessId);
  if (integrationId) query = query.eq("integration_id", integrationId);
  query = query.order("created_at", { ascending: false });
  const { data, error } = await query;
  return { data: data as ProviderCredential[] | null, error: error?.message ?? null };
}

export async function deleteCredential(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("provider_credentials").delete().eq("id", id);
  return { error: error?.message ?? null };
}

// =========================================================
// API KEYS
// =========================================================

function generateApiKey(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let key = "rfk_";
  for (let i = 0; i < 48; i++) key += chars[Math.floor(Math.random() * chars.length)];
  return key;
}

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createApiKey(
  businessId: string,
  keyName: string,
  scopes: string[],
  rateLimitPerHour = 1000,
  userId?: string,
): Promise<{ key: string | null; data: ApiKey | null; error: string | null }> {
  const rawKey = generateApiKey();
  const keyHash = await hashKey(rawKey);
  const keyPrefix = rawKey.substring(0, 12);
  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      business_id: businessId,
      key_name: keyName,
      key_prefix: keyPrefix,
      key_hash: keyHash,
      scopes,
      rate_limit_per_hour: rateLimitPerHour,
      created_by: userId ?? null,
    })
    .select()
    .single();
  return { key: rawKey, data: data as ApiKey | null, error: error?.message ?? null };
}

export async function fetchApiKeys(businessId: string): Promise<{ data: ApiKey[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from("api_keys")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  return { data: data as ApiKey[] | null, error: error?.message ?? null };
}

export async function revokeApiKey(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("api_keys").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", id);
  return { error: error?.message ?? null };
}

export async function deleteApiKey(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("api_keys").delete().eq("id", id);
  return { error: error?.message ?? null };
}

// =========================================================
// API USAGE
// =========================================================

export async function fetchApiUsage(
  businessId: string,
  limit = 100,
): Promise<{ data: ApiUsageRecord[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from("api_usage")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return { data: data as ApiUsageRecord[] | null, error: error?.message ?? null };
}

export async function fetchApiUsageStats(
  businessId: string,
): Promise<{ totalCalls: number; avgResponseTime: number; errorRate: number; callsByEndpoint: Record<string, number> }> {
  const { data } = await supabase
    .from("api_usage")
    .select("endpoint, status_code, response_time_ms")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1000);
  if (!data || data.length === 0) return { totalCalls: 0, avgResponseTime: 0, errorRate: 0, callsByEndpoint: {} };
  const total = data.length;
  const errors = data.filter((r) => r.status_code >= 400).length;
  const avgTime = data.reduce((sum, r) => sum + (r.response_time_ms ?? 0), 0) / total;
  const byEndpoint: Record<string, number> = {};
  for (const r of data) byEndpoint[r.endpoint] = (byEndpoint[r.endpoint] ?? 0) + 1;
  return { totalCalls: total, avgResponseTime: Math.round(avgTime), errorRate: Math.round((errors / total) * 100), callsByEndpoint: byEndpoint };
}

// =========================================================
// WEBHOOKS
// =========================================================

function generateWebhookSecret(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let secret = "whsec_";
  for (let i = 0; i < 32; i++) secret += chars[Math.floor(Math.random() * chars.length)];
  return secret;
}

export async function fetchWebhooks(businessId: string): Promise<{ data: Webhook[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from("webhooks")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  return { data: data as Webhook[] | null, error: error?.message ?? null };
}

export async function createWebhook(
  businessId: string,
  name: string,
  url: string,
  events: string[],
): Promise<{ data: Webhook | null; error: string | null }> {
  const { data, error } = await supabase
    .from("webhooks")
    .insert({ business_id: businessId, name, url, events, secret: generateWebhookSecret(), is_active: true })
    .select()
    .single();
  return { data: data as Webhook | null, error: error?.message ?? null };
}

export async function updateWebhook(
  id: string,
  updates: Partial<Pick<Webhook, "name" | "url" | "events" | "is_active">>,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("webhooks").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id);
  return { error: error?.message ?? null };
}

export async function deleteWebhook(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("webhooks").delete().eq("id", id);
  return { error: error?.message ?? null };
}

// =========================================================
// WEBHOOK EVENTS
// =========================================================

export async function fetchWebhookEvents(
  businessId: string,
  webhookId?: string,
  limit = 100,
): Promise<{ data: WebhookEvent[] | null; error: string | null }> {
  let query = supabase.from("webhook_events").select("*").eq("business_id", businessId);
  if (webhookId) query = query.eq("webhook_id", webhookId);
  query = query.order("created_at", { ascending: false }).limit(limit);
  const { data, error } = await query;
  return { data: data as WebhookEvent[] | null, error: error?.message ?? null };
}

export async function replayWebhookEvent(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("webhook_events")
    .update({ status: "pending", attempt_count: 0, next_retry_at: new Date().toISOString() })
    .eq("id", id);
  return { error: error?.message ?? null };
}

export function webhookEventStatusMeta(status: WebhookEventStatus): { label: string; color: string; bg: string; icon: string } {
  const map: Record<WebhookEventStatus, { label: string; color: string; bg: string; icon: string }> = {
    pending: { label: "Pending", color: "text-slate-400", bg: "bg-slate-600/15", icon: "⏳" },
    delivered: { label: "Delivered", color: "text-success-400", bg: "bg-success-500/15", icon: "✅" },
    failed: { label: "Failed", color: "text-error-400", bg: "bg-error-500/15", icon: "❌" },
    retrying: { label: "Retrying", color: "text-warning-400", bg: "bg-warning-500/15", icon: "🔄" },
    dead_letter: { label: "Dead Letter", color: "text-error-500", bg: "bg-error-600/15", icon: "💀" },
  };
  return map[status] ?? map.pending;
}

// =========================================================
// SYNC JOBS
// =========================================================

export async function fetchSyncJobs(
  businessId: string,
  integrationId?: string,
  limit = 50,
): Promise<{ data: SyncJob[] | null; error: string | null }> {
  let query = supabase.from("sync_jobs").select("*").eq("business_id", businessId);
  if (integrationId) query = query.eq("integration_id", integrationId);
  query = query.order("created_at", { ascending: false }).limit(limit);
  const { data, error } = await query;
  return { data: data as SyncJob[] | null, error: error?.message ?? null };
}

export async function createSyncJob(
  businessId: string,
  integrationId: string,
  syncType: SyncType,
  direction: SyncDirection,
): Promise<{ data: SyncJob | null; error: string | null }> {
  const { data, error } = await supabase
    .from("sync_jobs")
    .insert({ business_id: businessId, integration_id: integrationId, sync_type: syncType, direction, status: "queued" })
    .select()
    .single();
  return { data: data as SyncJob | null, error: error?.message ?? null };
}

export async function updateSyncJob(
  id: string,
  updates: Partial<SyncJob>,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("sync_jobs").update(updates).eq("id", id);
  return { error: error?.message ?? null };
}

export function syncStatusMeta(status: SyncStatus): { label: string; color: string; bg: string; icon: string } {
  const map: Record<SyncStatus, { label: string; color: string; bg: string; icon: string }> = {
    queued: { label: "Queued", color: "text-slate-400", bg: "bg-slate-600/15", icon: "📥" },
    running: { label: "Running", color: "text-warning-400", bg: "bg-warning-500/15", icon: "🔄" },
    completed: { label: "Completed", color: "text-success-400", bg: "bg-success-500/15", icon: "✅" },
    failed: { label: "Failed", color: "text-error-400", bg: "bg-error-500/15", icon: "❌" },
    partial: { label: "Partial", color: "text-warning-400", bg: "bg-warning-500/15", icon: "⚠️" },
  };
  return map[status] ?? map.queued;
}

// =========================================================
// SYNC LOGS
// =========================================================

export async function fetchSyncLogs(
  businessId: string,
  syncJobId: string,
  limit = 200,
): Promise<{ data: SyncLog[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from("sync_logs")
    .select("*")
    .eq("business_id", businessId)
    .eq("sync_job_id", syncJobId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return { data: data as SyncLog[] | null, error: error?.message ?? null };
}

// =========================================================
// DEVELOPER APPS
// =========================================================

function generateClientId(): string {
  return "rf_" + crypto.randomUUID().replace(/-/g, "").substring(0, 24);
}

function generateClientSecret(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let secret = "";
  for (let i = 0; i < 40; i++) secret += chars[Math.floor(Math.random() * chars.length)];
  return secret;
}

export async function createDeveloperApp(
  businessId: string,
  appName: string,
  description: string,
  redirectUris: string[],
  scopes: string[],
): Promise<{ clientId: string; clientSecret: string; data: DeveloperApp | null; error: string | null }> {
  const clientId = generateClientId();
  const clientSecret = generateClientSecret();
  const secretHash = await hashKey(clientSecret);
  const { data, error } = await supabase
    .from("developer_apps")
    .insert({
      business_id: businessId,
      app_name: appName,
      description,
      client_id: clientId,
      client_secret_hash: secretHash,
      redirect_uris: redirectUris,
      scopes,
      is_active: true,
    })
    .select()
    .single();
  return { clientId, clientSecret, data: data as DeveloperApp | null, error: error?.message ?? null };
}

export async function fetchDeveloperApps(businessId: string): Promise<{ data: DeveloperApp[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from("developer_apps")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  return { data: data as DeveloperApp[] | null, error: error?.message ?? null };
}

export async function deleteDeveloperApp(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("developer_apps").delete().eq("id", id);
  return { error: error?.message ?? null };
}

// =========================================================
// DEVELOPER TOKENS
// =========================================================

export async function fetchDeveloperTokens(businessId: string): Promise<{ data: DeveloperToken[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from("developer_tokens")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  return { data: data as DeveloperToken[] | null, error: error?.message ?? null };
}

export async function revokeDeveloperToken(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("developer_tokens").update({ is_revoked: true, updated_at: new Date().toISOString() }).eq("id", id);
  return { error: error?.message ?? null };
}

// =========================================================
// INTEGRATION HEALTH SUMMARY
// =========================================================

export interface IntegrationHealthSummary {
  total: number;
  active: number;
  error: number;
  syncing: number;
  avgHealth: number;
  failedSyncs: number;
  totalApiCalls: number;
}

export async function fetchIntegrationHealth(businessId: string): Promise<{ data: IntegrationHealthSummary | null; error: string | null }> {
  const { data: integrations } = await supabase
    .from("installed_integrations")
    .select("status, health_score, last_sync_status")
    .eq("business_id", businessId);
  if (!integrations) return { data: null, error: "Failed to fetch integrations" };
  const { count: failedSyncs } = await supabase
    .from("sync_jobs")
    .select("*", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("status", "failed");
  const { count: apiCalls } = await supabase
    .from("api_usage")
    .select("*", { count: "exact", head: true })
    .eq("business_id", businessId);
  const total = integrations.length;
  const active = integrations.filter((i) => i.status === "active").length;
  const error = integrations.filter((i) => i.status === "error").length;
  const syncing = integrations.filter((i) => i.status === "syncing").length;
  const avgHealth = total > 0 ? Math.round(integrations.reduce((sum, i) => sum + (i.health_score ?? 100), 0) / total) : 100;
  return {
    data: {
      total,
      active,
      error,
      syncing,
      avgHealth,
      failedSyncs: failedSyncs ?? 0,
      totalApiCalls: apiCalls ?? 0,
    },
    error: null,
  };
}
