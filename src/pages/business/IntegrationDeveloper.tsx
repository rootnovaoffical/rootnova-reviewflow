import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import BusinessShell from "./BusinessShell";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { SkeletonCard, SkeletonList } from "../../components/Skeleton";
import { EmptyState, ErrorState } from "../../components/States";
import { StatTile } from "../../components/StatTile";
import { timeAgo } from "../../lib/utils";
import { insertAuditLog } from "../../lib/auth";
import {
  createApiKey,
  fetchApiKeys,
  revokeApiKey,
  deleteApiKey,
  fetchApiUsage,
  fetchApiUsageStats,
  createDeveloperApp,
  fetchDeveloperApps,
  deleteDeveloperApp,
  fetchDeveloperTokens,
  revokeDeveloperToken,
} from "../../lib/integrations";

type ApiUsageStats = { totalCalls: number; avgResponseTime: number; errorRate: number; callsByEndpoint: Record<string, number> };
import type { ApiKey, ApiUsageRecord, DeveloperApp, DeveloperToken } from "../../lib/types";

type Tab = "keys" | "apps" | "usage" | "docs";

const API_SCOPES = [
  "reviews:read", "reviews:write",
  "customers:read", "customers:write",
  "business:read", "business:write",
  "analytics:read",
  "webhooks:manage",
  "integrations:manage",
];

const API_ENDPOINTS = [
  { method: "GET", path: "/v1/reviews", desc: "List all reviews" },
  { method: "POST", path: "/v1/reviews", desc: "Create a review" },
  { method: "GET", path: "/v1/reviews/:id", desc: "Get a single review" },
  { method: "GET", path: "/v1/customers", desc: "List customers" },
  { method: "GET", path: "/v1/customers/:id", desc: "Get customer details" },
  { method: "GET", path: "/v1/business", desc: "Get business profile" },
  { method: "PATCH", path: "/v1/business", desc: "Update business profile" },
  { method: "GET", path: "/v1/analytics/overview", desc: "Get analytics overview" },
  { method: "GET", path: "/v1/integrations", desc: "List installed integrations" },
  { method: "POST", path: "/v1/webhooks", desc: "Register a webhook" },
  { method: "DELETE", path: "/v1/webhooks/:id", desc: "Delete a webhook" },
];

export default function IntegrationDeveloper() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("keys");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>([]);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [apps, setApps] = useState<DeveloperApp[]>([]);
  const [newAppName, setNewAppName] = useState("");
  const [newAppDesc, setNewAppDesc] = useState("");
  const [newAppRedirect, setNewAppRedirect] = useState("");
  const [createdApp, setCreatedApp] = useState<{ clientId: string; clientSecret: string } | null>(null);
  const [creatingApp, setCreatingApp] = useState(false);

  const [tokens, setTokens] = useState<DeveloperToken[]>([]);
  const [usage, setUsage] = useState<ApiUsageRecord[]>([]);
  const [usageStats, setUsageStats] = useState<ApiUsageStats | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      const { data: link, error: linkErr } = await supabase
        .from("business_admins")
        .select("business_id")
        .eq("user_id", profile.id)
        .maybeSingle();
      if (linkErr) throw linkErr;
      if (!link?.business_id) { setLoading(false); return; }
      setBusinessId(link.business_id);

      const [keysRes, appsRes, tokensRes, usageRes] = await Promise.all([
        fetchApiKeys(link.business_id),
        fetchDeveloperApps(link.business_id),
        fetchDeveloperTokens(link.business_id),
        fetchApiUsage(link.business_id, 100),
      ]);
      setKeys(keysRes.data || []);
      setApps(appsRes.data || []);
      setTokens(tokensRes.data || []);
      setUsage(usageRes.data || []);

      const stats = await fetchApiUsageStats(link.business_id);
      setUsageStats(stats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load developer portal");
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const handleCreateKey = async () => {
    if (!businessId || !profile || !newKeyName.trim()) return;
    setCreating(true);
    try {
      const { key, error: err } = await createApiKey(businessId, newKeyName, newKeyScopes, 1000, profile.id);
      if (err || !key) throw new Error(err || "Failed to create key");
      await insertAuditLog({
        actor_id: profile.id, actor_email: profile.email ?? undefined,
        action: "api_key_created", target_type: "api_key", target_id: newKeyName,
        metadata: { scopes: newKeyScopes },
      });
      setCreatedKey(key);
      setNewKeyName("");
      setNewKeyScopes([]);
      showToast("API key created", "success");
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to create key", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeKey = async (id: string) => {
    const { error } = await revokeApiKey(id);
    if (error) { showToast("Failed to revoke", "error"); return; }
    setKeys((prev) => prev.map((k) => k.id === id ? { ...k, is_active: false } : k));
    showToast("API key revoked", "success");
  };

  const handleDeleteKey = async (id: string) => {
    const { error } = await deleteApiKey(id);
    if (error) { showToast("Failed to delete", "error"); return; }
    setKeys((prev) => prev.filter((k) => k.id !== id));
    showToast("API key deleted", "success");
  };

  const handleCreateApp = async () => {
    if (!businessId || !newAppName.trim()) return;
    setCreatingApp(true);
    try {
      const { clientId, clientSecret, error: err } = await createDeveloperApp(
        businessId, newAppName, newAppDesc, newAppRedirect ? [newAppRedirect] : [], API_SCOPES,
      );
      if (err) throw new Error(err);
      setCreatedApp({ clientId, clientSecret });
      setNewAppName("");
      setNewAppDesc("");
      setNewAppRedirect("");
      showToast("Developer app created", "success");
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to create app", "error");
    } finally {
      setCreatingApp(false);
    }
  };

  const handleDeleteApp = async (id: string) => {
    const { error } = await deleteDeveloperApp(id);
    if (error) { showToast("Failed to delete", "error"); return; }
    setApps((prev) => prev.filter((a) => a.id !== id));
    showToast("App deleted", "success");
  };

  const handleRevokeToken = async (id: string) => {
    const { error } = await revokeDeveloperToken(id);
    if (error) { showToast("Failed to revoke", "error"); return; }
    setTokens((prev) => prev.map((t) => t.id === id ? { ...t, is_revoked: true } : t));
    showToast("Token revoked", "success");
  };

  if (loading) return (
    <BusinessShell title="Developer">
      <div className="p-4 md:p-8 space-y-6">
        <SkeletonCard />
        <SkeletonList items={3} />
      </div>
    </BusinessShell>
  );

  if (error) return (
    <BusinessShell title="Developer">
      <div className="p-4 md:p-8"><ErrorState message={error} onRetry={load} /></div>
    </BusinessShell>
  );

  return (
    <BusinessShell title="Developer">
      <div className="p-4 md:p-8 space-y-6 page-enter">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-up">
          <div>
            <h2 className="text-xl font-bold text-white">Developer Portal</h2>
            <p className="text-sm text-slate-400 mt-1">API keys, OAuth apps, usage tracking, and documentation.</p>
          </div>
          <button onClick={() => navigate("/business/integrations")} className="btn-ghost px-4 py-2.5 text-slate-300 text-sm font-medium rounded-xl">
            ← Back to Integrations
          </button>
        </div>

        {/* Stats */}
        {usageStats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatTile label="API Keys" value={keys.filter((k) => k.is_active).length} icon="🔑" accent="primary" delay={0} />
            <StatTile label="Total Calls" value={usageStats.totalCalls} icon="📡" accent="accent" delay={80} />
            <StatTile label="Avg Response" value={usageStats.avgResponseTime} suffix="ms" icon="⚡" accent="success" delay={160} />
            <StatTile label="Error Rate" value={usageStats.errorRate} suffix="%" icon="⚠️" accent="warning" delay={240} />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 glass rounded-xl w-fit animate-fade-up" style={{ animationDelay: "300ms" }}>
          {(["keys", "apps", "usage", "docs"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? "bg-primary-600 text-white" : "text-slate-400 hover:text-white"}`}
            >
              {t === "keys" ? "API Keys" : t === "apps" ? "OAuth Apps" : t === "usage" ? "Usage" : "Documentation"}
            </button>
          ))}
        </div>

        {/* API Keys Tab */}
        {tab === "keys" && (
          <div className="space-y-4 animate-fade-up" style={{ animationDelay: "360ms" }}>
            {createdKey && (
              <div className="glass rounded-2xl p-5 border border-success-500/30">
                <h3 className="text-sm font-semibold text-success-400 mb-2">API Key Created — Copy Now</h3>
                <p className="text-xs text-slate-400 mb-2">This key will only be shown once. Store it securely.</p>
                <code className="block p-3 bg-slate-900/60 rounded-lg text-sm text-success-300 break-all">{createdKey}</code>
                <button onClick={() => setCreatedKey(null)} className="mt-3 text-xs text-slate-400 hover:text-white">Dismiss</button>
              </div>
            )}
            <div className="glass rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Create New API Key</h3>
              <div className="space-y-3">
                <input
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="Key name (e.g. Production API)"
                  className="input-field w-full px-4 py-2 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none"
                />
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wide">Scopes</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {API_SCOPES.map((scope) => (
                      <button
                        key={scope}
                        onClick={() => setNewKeyScopes((prev) => prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope])}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${newKeyScopes.includes(scope) ? "bg-primary-600 text-white" : "bg-slate-700 text-slate-400 hover:text-white"}`}
                      >
                        {scope}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={handleCreateKey} disabled={creating || !newKeyName.trim()} className="btn-primary px-4 py-2 text-white text-sm font-medium rounded-xl disabled:opacity-50">
                  {creating ? "Creating..." : "Generate Key"}
                </button>
              </div>
            </div>
            {keys.length === 0 ? (
              <EmptyState title="No API keys yet" subtitle="Create an API key to start using the ReviewFlow API." />
            ) : (
              <div className="space-y-2">
                {keys.map((key, i) => (
                  <div key={key.id} className="glass rounded-2xl p-4 flex items-center justify-between animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-medium text-sm">{key.key_name}</h3>
                        {key.is_active ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-success-500/15 text-success-400">Active</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-600/15 text-slate-400">Revoked</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{key.key_prefix}...{key.scopes.length} scopes</p>
                      <p className="text-xs text-slate-600 mt-0.5">Created {timeAgo(key.created_at)}{key.last_used_at ? ` · Last used ${timeAgo(key.last_used_at)}` : ""}</p>
                    </div>
                    <div className="flex gap-2">
                      {key.is_active && (
                        <button onClick={() => handleRevokeKey(key.id)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-warning-600/20 text-warning-400 hover:bg-warning-600/30 transition-colors">
                          Revoke
                        </button>
                      )}
                      <button onClick={() => handleDeleteKey(key.id)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-error-600/20 text-error-400 hover:bg-error-600/30 transition-colors">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* OAuth Apps Tab */}
        {tab === "apps" && (
          <div className="space-y-4 animate-fade-up" style={{ animationDelay: "360ms" }}>
            {createdApp && (
              <div className="glass rounded-2xl p-5 border border-success-500/30">
                <h3 className="text-sm font-semibold text-success-400 mb-2">App Created — Copy Credentials Now</h3>
                <p className="text-xs text-slate-400 mb-3">These credentials will only be shown once.</p>
                <div className="space-y-2">
                  <div><span className="text-xs text-slate-500">Client ID</span><code className="block p-2 bg-slate-900/60 rounded-lg text-sm text-success-300 break-all">{createdApp.clientId}</code></div>
                  <div><span className="text-xs text-slate-500">Client Secret</span><code className="block p-2 bg-slate-900/60 rounded-lg text-sm text-success-300 break-all">{createdApp.clientSecret}</code></div>
                </div>
                <button onClick={() => setCreatedApp(null)} className="mt-3 text-xs text-slate-400 hover:text-white">Dismiss</button>
              </div>
            )}
            <div className="glass rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Register Developer App</h3>
              <div className="space-y-3">
                <input
                  value={newAppName}
                  onChange={(e) => setNewAppName(e.target.value)}
                  placeholder="App name"
                  className="input-field w-full px-4 py-2 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none"
                />
                <input
                  value={newAppDesc}
                  onChange={(e) => setNewAppDesc(e.target.value)}
                  placeholder="Description"
                  className="input-field w-full px-4 py-2 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none"
                />
                <input
                  value={newAppRedirect}
                  onChange={(e) => setNewAppRedirect(e.target.value)}
                  placeholder="Redirect URI (https://...)"
                  className="input-field w-full px-4 py-2 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none"
                />
                <button onClick={handleCreateApp} disabled={creatingApp || !newAppName.trim()} className="btn-primary px-4 py-2 text-white text-sm font-medium rounded-xl disabled:opacity-50">
                  {creatingApp ? "Creating..." : "Create App"}
                </button>
              </div>
            </div>
            {apps.length === 0 ? (
              <EmptyState title="No developer apps" subtitle="Register an app to enable OAuth-based integrations." />
            ) : (
              <div className="space-y-2">
                {apps.map((app, i) => (
                  <div key={app.id} className="glass rounded-2xl p-4 flex items-center justify-between animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
                    <div>
                      <h3 className="text-white font-medium text-sm">{app.app_name}</h3>
                      <p className="text-xs text-slate-500 mt-1">{app.client_id}</p>
                      <p className="text-xs text-slate-600 mt-0.5">{app.scopes.length} scopes · Created {timeAgo(app.created_at)}</p>
                    </div>
                    <button onClick={() => handleDeleteApp(app.id)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-error-600/20 text-error-400 hover:bg-error-600/30 transition-colors">
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
            {tokens.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">Active Tokens</h3>
                {tokens.map((token) => (
                  <div key={token.id} className="glass rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${token.is_revoked ? "bg-slate-600/15 text-slate-400" : "bg-success-500/15 text-success-400"}`}>
                        {token.is_revoked ? "Revoked" : "Active"}
                      </span>
                      <p className="text-xs text-slate-500 mt-1">{token.scopes.length} scopes · Expires {token.expires_at ? timeAgo(token.expires_at) : "never"}</p>
                    </div>
                    {!token.is_revoked && (
                      <button onClick={() => handleRevokeToken(token.id)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-warning-600/20 text-warning-400 hover:bg-warning-600/30 transition-colors">
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Usage Tab */}
        {tab === "usage" && (
          <div className="space-y-4 animate-fade-up" style={{ animationDelay: "360ms" }}>
            {usage.length === 0 ? (
              <EmptyState title="No API calls recorded" subtitle="API usage will appear here once you start making calls." />
            ) : (
              <div className="glass rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5 text-xs text-slate-400 uppercase tracking-wide">
                        <th className="text-left p-3">Endpoint</th>
                        <th className="text-left p-3">Method</th>
                        <th className="text-left p-3">Status</th>
                        <th className="text-left p-3">Response Time</th>
                        <th className="text-left p-3">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usage.map((rec) => (
                        <tr key={rec.id} className="border-b border-white/5 hover:bg-white/5">
                          <td className="p-3 text-slate-300">{rec.endpoint}</td>
                          <td className="p-3"><span className="text-xs font-mono px-2 py-0.5 rounded bg-primary-500/15 text-primary-300">{rec.method}</span></td>
                          <td className="p-3"><span className={rec.status_code && rec.status_code < 400 ? "text-success-400" : "text-error-400"}>{rec.status_code}</span></td>
                          <td className="p-3 text-slate-400 tabular-nums">{rec.response_time_ms ? `${rec.response_time_ms}ms` : "—"}</td>
                          <td className="p-3 text-slate-500">{timeAgo(rec.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Documentation Tab */}
        {tab === "docs" && (
          <div className="space-y-4 animate-fade-up" style={{ animationDelay: "360ms" }}>
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-2">Authentication</h3>
              <p className="text-sm text-slate-400 mb-3">All API requests require an API key passed in the <code className="text-primary-300">Authorization</code> header as a Bearer token.</p>
              <div className="bg-slate-900/60 rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm text-slate-300"><code>{`curl -X GET https://api.reviewflow.com/v1/reviews \\
  -H "Authorization: Bearer rfk_your_api_key" \\
  -H "Content-Type: application/json"`}</code></pre>
              </div>
            </div>
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-2">Available Endpoints</h3>
              <div className="space-y-2">
                {API_ENDPOINTS.map((ep) => (
                  <div key={ep.path} className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/40 border border-white/5">
                    <span className={`text-xs font-mono px-2 py-1 rounded font-medium ${ep.method === "GET" ? "bg-success-500/15 text-success-400" : ep.method === "POST" ? "bg-primary-500/15 text-primary-300" : ep.method === "PATCH" ? "bg-warning-500/15 text-warning-400" : "bg-error-500/15 text-error-400"}`}>
                      {ep.method}
                    </span>
                    <code className="text-sm text-slate-300 flex-1">{ep.path}</code>
                    <span className="text-xs text-slate-500">{ep.desc}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-2">Rate Limiting</h3>
              <p className="text-sm text-slate-400">API keys have a default rate limit of 1,000 requests per hour. Response headers include:</p>
              <div className="mt-3 space-y-1 text-sm text-slate-300">
                <p><code className="text-primary-300">X-RateLimit-Limit</code> — Total requests allowed per hour</p>
                <p><code className="text-primary-300">X-RateLimit-Remaining</code> — Remaining requests in current window</p>
                <p><code className="text-primary-300">X-RateLimit-Reset</code> — Unix timestamp when the limit resets</p>
              </div>
            </div>
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-2">Webhooks</h3>
              <p className="text-sm text-slate-400 mb-3">Register webhook endpoints to receive real-time events. Each webhook is signed with HMAC-SHA256.</p>
              <div className="bg-slate-900/60 rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm text-slate-300"><code>{`// Verify webhook signature
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(JSON.stringify(payload))
  .digest('hex');

if (signature === request.headers['x-reviewflow-signature']) {
  // Valid webhook
}`}</code></pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </BusinessShell>
  );
}
