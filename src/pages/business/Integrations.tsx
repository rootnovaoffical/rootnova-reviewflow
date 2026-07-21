import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import BusinessShell from "./BusinessShell";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { SkeletonCard, SkeletonStatGrid, SkeletonList } from "../../components/Skeleton";
import { EmptyState, ErrorState } from "../../components/States";
import { StatTile } from "../../components/StatTile";
import { timeAgo } from "../../lib/utils";
import { insertAuditLog } from "../../lib/auth";
import {
  fetchInstalledIntegrations,
  fetchIntegrationHealth,
  installIntegration,
  uninstallIntegration,
  updateInstalledIntegration,
  saveCredential,
  statusMeta,
  healthMeta,
  categoryMeta,
  authTypeMeta,
  type IntegrationHealthSummary,
} from "../../lib/integrations";
import type { InstalledIntegration, IntegrationProvider, CredentialType, SyncFrequency } from "../../lib/types";

type Tab = "connected" | "available" | "health" | "credentials";

export default function BusinessIntegrations() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [installed, setInstalled] = useState<(InstalledIntegration & { provider: IntegrationProvider })[]>([]);
  const [available, setAvailable] = useState<IntegrationProvider[]>([]);
  const [health, setHealth] = useState<IntegrationHealthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("connected");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [installModal, setInstallModal] = useState<IntegrationProvider | null>(null);
  const [credentialValue, setCredentialValue] = useState("");
  const [credentialType, setCredentialType] = useState<CredentialType>("api_key");
  const [syncFreq, setSyncFreq] = useState<SyncFrequency>("manual");
  const [installing, setInstalling] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    setError(null);
    setLoading(true);
    try {
      const { data: link, error: linkErr } = await supabase
        .from("business_admins")
        .select("business_id")
        .eq("user_id", profile.id)
        .maybeSingle();
      if (linkErr) throw linkErr;
      if (!link?.business_id) { setInstalled([]); setLoading(false); return; }
      setBusinessId(link.business_id);

      const [instRes, healthRes] = await Promise.all([
        fetchInstalledIntegrations(link.business_id),
        fetchIntegrationHealth(link.business_id),
      ]);
      if (instRes.error) throw new Error(instRes.error);
      setInstalled(instRes.data || []);
      setHealth(healthRes.data);

      const installedProviderIds = new Set((instRes.data || []).map((i) => i.provider_id));
      const { data: allProviders, error: provErr } = await supabase
        .from("integration_providers")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (provErr) throw new Error(provErr.message);
      setAvailable((allProviders || []).filter((p: IntegrationProvider) => !installedProviderIds.has(p.id)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load integrations");
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const categories = useMemo(() => {
    const set = new Set(available.map((p) => p.category));
    return ["all", ...Array.from(set)];
  }, [available]);

  const filteredAvailable = useMemo(() => {
    let result = available;
    if (categoryFilter !== "all") result = result.filter((p) => p.category === categoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
    }
    return result;
  }, [available, categoryFilter, search]);

  const handleInstall = async () => {
    if (!installModal || !businessId || !profile) return;
    if (!credentialValue.trim()) { showToast("Please enter credentials", "error"); return; }
    setInstalling(true);
    try {
      const { data: inst, error: instErr } = await installIntegration(
        businessId, installModal.id, {}, syncFreq, installModal.supported_features, profile.id,
      );
      if (instErr || !inst) throw new Error(instErr || "Install failed");
      await saveCredential(businessId, inst.id, credentialType, credentialValue);
      await insertAuditLog({
        actor_id: profile.id, actor_email: profile.email ?? undefined,
        action: "integration_installed", target_type: "integration", target_id: inst.id,
        metadata: { provider: installModal.provider_key, name: installModal.name },
      });
      showToast(`${installModal.name} connected successfully`, "success");
      setInstallModal(null);
      setCredentialValue("");
      setCredentialType("api_key");
      setSyncFreq("manual");
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to install", "error");
    } finally {
      setInstalling(false);
    }
  };

  const handleUninstall = async (inst: InstalledIntegration & { provider: IntegrationProvider }) => {
    if (!profile) return;
    const { error } = await uninstallIntegration(inst.id);
    if (error) { showToast("Failed to disconnect", "error"); return; }
    await insertAuditLog({
      actor_id: profile.id, actor_email: profile.email ?? undefined,
      action: "integration_uninstalled", target_type: "integration", target_id: inst.id,
      metadata: { provider: inst.provider.provider_key, name: inst.provider.name },
    });
    showToast(`${inst.provider.name} disconnected`, "success");
    load();
  };

  const handleToggle = async (inst: InstalledIntegration & { provider: IntegrationProvider }) => {
    const newStatus = inst.status === "active" ? "inactive" : "active";
    const { error } = await updateInstalledIntegration(inst.id, { status: newStatus });
    if (error) { showToast("Failed to update", "error"); return; }
    setInstalled((prev) => prev.map((i) => i.id === inst.id ? { ...i, status: newStatus } : i));
    showToast(`${inst.provider.name} ${newStatus === "active" ? "enabled" : "disabled"}`, "success");
  };

  if (loading) return (
    <BusinessShell title="Integrations">
      <div className="p-4 md:p-8 space-y-6">
        <SkeletonStatGrid />
        <SkeletonCard />
        <SkeletonList items={4} />
      </div>
    </BusinessShell>
  );

  if (error) return (
    <BusinessShell title="Integrations">
      <div className="p-4 md:p-8"><ErrorState message={error} onRetry={load} /></div>
    </BusinessShell>
  );

  return (
    <BusinessShell title="Integrations">
      <div className="p-4 md:p-8 space-y-6 page-enter">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-up">
          <div>
            <h2 className="text-xl font-bold text-white">Integration Center</h2>
            <p className="text-sm text-slate-400 mt-1">Connect ReviewFlow with your business tools. One platform, every integration.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate("/business/integrations/webhooks")} className="btn-ghost px-4 py-2.5 text-slate-300 text-sm font-medium rounded-xl">
              🪝 Webhooks
            </button>
            <button onClick={() => navigate("/business/integrations/developer")} className="btn-ghost px-4 py-2.5 text-slate-300 text-sm font-medium rounded-xl">
              👨‍💻 Developer
            </button>
            <button onClick={() => navigate("/business/integrations/marketplace")} className="btn-primary px-4 py-2.5 text-white text-sm font-medium rounded-xl">
              🏪 Marketplace
            </button>
          </div>
        </div>

        {/* Health stats */}
        {health && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatTile label="Active Integrations" value={health.active} icon="🔌" accent="success" delay={0} />
            <StatTile label="Avg Health Score" value={health.avgHealth} suffix="/100" icon="💚" accent="primary" delay={80} />
            <StatTile label="Failed Syncs" value={health.failedSyncs} icon="⚠️" accent="warning" delay={160} />
            <StatTile label="API Calls" value={health.totalApiCalls} icon="📡" accent="accent" delay={240} />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 glass rounded-xl w-fit animate-fade-up" style={{ animationDelay: "300ms" }}>
          {(["connected", "available", "health"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? "bg-primary-600 text-white" : "text-slate-400 hover:text-white"}`}
            >
              {t === "connected" ? "Connected" : t === "available" ? "Available" : "Health Monitor"}
            </button>
          ))}
        </div>

        {/* Connected Tab */}
        {tab === "connected" && (
          <div className="space-y-3 animate-fade-up" style={{ animationDelay: "360ms" }}>
            {installed.length === 0 ? (
              <div className="glass rounded-2xl p-8 text-center">
                <div className="text-4xl mb-3">🔌</div>
                <h3 className="text-lg font-semibold text-white mb-2">No integrations connected</h3>
                <p className="text-sm text-slate-400 max-w-md mx-auto">
                  Browse the marketplace to connect your first integration. ReviewFlow supports 30+ providers out of the box.
                </p>
                <button onClick={() => setTab("available")} className="mt-4 btn-primary px-4 py-2 text-white text-sm font-medium rounded-xl">
                  Browse Integrations
                </button>
              </div>
            ) : (
              installed.map((inst, i) => {
                const sm = statusMeta(inst.status);
                const hm = healthMeta(inst.health_score);
                const cm = categoryMeta(inst.provider.category);
                const am = authTypeMeta(inst.provider.auth_type);
                return (
                  <div key={inst.id} className="glass rounded-2xl p-5 animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/10 flex items-center justify-center text-2xl shrink-0">
                          {cm.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-white font-semibold">{inst.provider.name}</h3>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sm.bg} ${sm.color}`}>
                              {sm.icon} {sm.label}
                            </span>
                            <span className={`text-xs ${cm.color}`}>{cm.label}</span>
                          </div>
                          <p className="text-sm text-slate-400 mt-1 truncate">{inst.provider.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                            <span>Auth: {am.label}</span>
                            <span>Sync: {inst.sync_frequency}</span>
                            {inst.last_sync_at && <span>Last sync: {timeAgo(inst.last_sync_at)}</span>}
                            <span className={hm.color}>Health: {inst.health_score}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleToggle(inst)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${inst.status === "active" ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-success-600 text-white hover:bg-success-500"}`}
                        >
                          {inst.status === "active" ? "Disable" : "Enable"}
                        </button>
                        <button
                          onClick={() => handleUninstall(inst)}
                          className="px-3 py-2 rounded-lg text-sm font-medium bg-error-600/20 text-error-400 hover:bg-error-600/30 transition-colors"
                        >
                          Disconnect
                        </button>
                      </div>
                    </div>
                    {inst.last_error && (
                      <div className="mt-3 p-3 rounded-lg bg-error-500/10 border border-error-500/20">
                        <p className="text-xs text-error-400">{inst.last_error}</p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Available Tab */}
        {tab === "available" && (
          <div className="space-y-4 animate-fade-up" style={{ animationDelay: "360ms" }}>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search integrations..."
                className="input-field flex-1 px-4 py-2 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none"
              />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="input-field px-4 py-2 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm"
              >
                {categories.map((c) => <option key={c} value={c}>{c === "all" ? "All Categories" : categoryMeta(c).label}</option>)}
              </select>
            </div>
            {filteredAvailable.length === 0 ? (
              <EmptyState title="No integrations found" subtitle="Try different search terms or filters." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAvailable.map((prov, i) => {
                  const cm = categoryMeta(prov.category);
                  const am = authTypeMeta(prov.auth_type);
                  return (
                    <div key={prov.id} className="glass rounded-2xl p-5 card-hover animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/10 flex items-center justify-center text-xl shrink-0">
                          {cm.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-semibold text-sm">{prov.name}</h3>
                          <span className={`text-xs ${cm.color}`}>{cm.label}</span>
                        </div>
                        {prov.is_featured && <span className="text-xs text-warning-400">★</span>}
                      </div>
                      <p className="text-xs text-slate-400 mb-3 line-clamp-2">{prov.description}</p>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-xs text-slate-500">{am.icon} {am.label}</span>
                        {prov.supported_features.includes("real_time") && <span className="text-xs text-success-400">Real-time</span>}
                        {prov.supported_features.includes("webhooks") && <span className="text-xs text-accent-300">Webhooks</span>}
                      </div>
                      <button
                        onClick={() => { setInstallModal(prov); setCredentialType(prov.auth_type === "oauth2" ? "oauth_token" : prov.auth_type === "bearer" ? "bearer_token" : "api_key"); }}
                        className="w-full btn-primary px-4 py-2 text-white text-sm font-medium rounded-xl"
                      >
                        Connect
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Health Monitor Tab */}
        {tab === "health" && (
          <div className="space-y-4 animate-fade-up" style={{ animationDelay: "360ms" }}>
            {installed.length === 0 ? (
              <EmptyState title="No integrations to monitor" subtitle="Connect integrations to start monitoring health." />
            ) : (
              installed.map((inst, i) => {
                const hm = healthMeta(inst.health_score);
                const sm = statusMeta(inst.status);
                return (
                  <div key={inst.id} className="glass rounded-2xl p-5 animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-white font-semibold">{inst.provider.name}</h3>
                      <span className={`text-sm font-medium ${hm.color}`}>{inst.health_score}% — {hm.label}</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-white/5 overflow-hidden mb-3">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${inst.health_score >= 80 ? "bg-success-500" : inst.health_score >= 50 ? "bg-warning-500" : "bg-error-500"}`}
                        style={{ width: `${inst.health_score}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div><span className="text-slate-500">Status</span><br /><span className={sm.color}>{sm.label}</span></div>
                      <div><span className="text-slate-500">Sync Frequency</span><br /><span className="text-slate-300">{inst.sync_frequency}</span></div>
                      <div><span className="text-slate-500">Last Sync</span><br /><span className="text-slate-300">{inst.last_sync_at ? timeAgo(inst.last_sync_at) : "Never"}</span></div>
                      <div><span className="text-slate-500">Last Error</span><br /><span className={inst.last_error ? "text-error-400" : "text-success-400"}>{inst.last_error ? "Yes" : "None"}</span></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Install Modal */}
        {installModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setInstallModal(null)} />
            <div className="relative glass rounded-2xl p-6 w-full max-w-md animate-fade-up">
              <h3 className="text-lg font-bold text-white mb-1">Connect {installModal.name}</h3>
              <p className="text-sm text-slate-400 mb-4">{installModal.description}</p>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wide">Credential Type</label>
                  <select
                    value={credentialType}
                    onChange={(e) => setCredentialType(e.target.value as CredentialType)}
                    className="input-field w-full mt-1 px-4 py-2 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm"
                  >
                    <option value="api_key">API Key</option>
                    <option value="oauth_token">OAuth Token</option>
                    <option value="bearer_token">Bearer Token</option>
                    <option value="webhook_secret">Webhook Secret</option>
                    <option value="refresh_token">Refresh Token</option>
                    <option value="basic_auth">Basic Auth</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wide">Credential Value</label>
                  <input
                    type="password"
                    value={credentialValue}
                    onChange={(e) => setCredentialValue(e.target.value)}
                    placeholder="Enter credential..."
                    className="input-field w-full mt-1 px-4 py-2 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none"
                  />
                  <p className="text-xs text-slate-500 mt-1">Credentials are encrypted and stored securely.</p>
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wide">Sync Frequency</label>
                  <select
                    value={syncFreq}
                    onChange={(e) => setSyncFreq(e.target.value as SyncFrequency)}
                    className="input-field w-full mt-1 px-4 py-2 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm"
                  >
                    <option value="realtime">Real-time</option>
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setInstallModal(null)} className="flex-1 px-4 py-2.5 bg-slate-700 text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-600 transition-colors">
                  Cancel
                </button>
                <button onClick={handleInstall} disabled={installing} className="flex-1 btn-primary px-4 py-2.5 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                  {installing ? "Connecting..." : "Connect"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </BusinessShell>
  );
}
