import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import BusinessShell from "./BusinessShell";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { SkeletonCard } from "../../components/Skeleton";
import { EmptyState, ErrorState } from "../../components/States";
import { categoryMeta, authTypeMeta } from "../../lib/integrations";
import type { IntegrationProvider } from "../../lib/types";

export default function IntegrationMarketplace() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [providers, setProviders] = useState<IntegrationProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      const { data: link } = await supabase
        .from("business_admins")
        .select("business_id")
        .eq("user_id", profile.id)
        .maybeSingle();
      if (link?.business_id) {
        const { data: inst } = await supabase
          .from("installed_integrations")
          .select("provider_id")
          .eq("business_id", link.business_id);
        setInstalledIds(new Set((inst || []).map((i: { provider_id: string }) => i.provider_id)));
      }
      const { data, error: err } = await supabase
        .from("integration_providers")
        .select("*")
        .eq("is_active", true)
        .order("is_featured", { ascending: false })
        .order("sort_order");
      if (err) throw new Error(err.message);
      setProviders(data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load marketplace");
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const categories = useMemo(() => {
    const set = new Set(providers.map((p) => p.category));
    return ["all", ...Array.from(set)];
  }, [providers]);

  const filtered = useMemo(() => {
    let result = providers;
    if (categoryFilter !== "all") result = result.filter((p) => p.category === categoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
    }
    return result;
  }, [providers, categoryFilter, search]);

  const featured = filtered.filter((p) => p.is_featured);
  const regular = filtered.filter((p) => !p.is_featured);

  if (loading) return (
    <BusinessShell title="Marketplace">
      <div className="p-4 md:p-8 space-y-6">
        <SkeletonCard />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      </div>
    </BusinessShell>
  );

  if (error) return (
    <BusinessShell title="Marketplace">
      <div className="p-4 md:p-8"><ErrorState message={error} onRetry={load} /></div>
    </BusinessShell>
  );

  return (
    <BusinessShell title="Marketplace">
      <div className="p-4 md:p-8 space-y-6 page-enter">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-up">
          <div>
            <h2 className="text-xl font-bold text-white">Integration Marketplace</h2>
            <p className="text-sm text-slate-400 mt-1">Browse and install from 30+ integrations across every category.</p>
          </div>
          <button onClick={() => navigate("/business/integrations")} className="btn-ghost px-4 py-2.5 text-slate-300 text-sm font-medium rounded-xl">
            ← Back to Integrations
          </button>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3 animate-fade-up" style={{ animationDelay: "100ms" }}>
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

        {filtered.length === 0 ? (
          <EmptyState title="No integrations found" subtitle="Try different search terms or filters." />
        ) : (
          <>
            {/* Featured */}
            {featured.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">Featured</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {featured.map((prov, i) => {
                    const cm = categoryMeta(prov.category);
                    const am = authTypeMeta(prov.auth_type);
                    const isInstalled = installedIds.has(prov.id);
                    return (
                      <div key={prov.id} className="glass rounded-2xl p-5 card-hover animate-fade-up relative overflow-hidden" style={{ animationDelay: `${i * 40}ms` }}>
                        <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-warning-500/10 blur-2xl" />
                        <div className="flex items-start gap-3 mb-3 relative">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/10 flex items-center justify-center text-2xl shrink-0">
                            {cm.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-white font-semibold text-sm">{prov.name}</h3>
                              <span className="text-xs text-warning-400">★ Featured</span>
                            </div>
                            <span className={`text-xs ${cm.color}`}>{cm.label}</span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 mb-3 line-clamp-2">{prov.description}</p>
                        <div className="flex items-center gap-2 mb-4 flex-wrap">
                          <span className="text-xs text-slate-500">{am.icon} {am.label}</span>
                          {prov.supported_features.includes("real_time") && <span className="text-xs px-2 py-0.5 rounded-full bg-success-500/15 text-success-400">Real-time</span>}
                          {prov.supported_features.includes("webhooks") && <span className="text-xs px-2 py-0.5 rounded-full bg-accent-500/15 text-accent-300">Webhooks</span>}
                          {prov.supported_features.includes("sync") && <span className="text-xs px-2 py-0.5 rounded-full bg-primary-500/15 text-primary-300">Sync</span>}
                        </div>
                        {isInstalled ? (
                          <button onClick={() => navigate("/business/integrations")} className="w-full px-4 py-2 bg-success-600/20 text-success-400 rounded-xl text-sm font-medium">
                            ✓ Installed
                          </button>
                        ) : (
                          <button onClick={() => navigate("/business/integrations")} className="w-full btn-primary px-4 py-2 text-white text-sm font-medium rounded-xl">
                            Install
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* All */}
            {regular.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">All Integrations</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {regular.map((prov, i) => {
                    const cm = categoryMeta(prov.category);
                    const isInstalled = installedIds.has(prov.id);
                    return (
                      <div key={prov.id} className="glass rounded-2xl p-4 card-hover animate-fade-up" style={{ animationDelay: `${i * 30}ms` }}>
                        <div className="flex items-start gap-2 mb-2">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500/15 to-accent-500/5 flex items-center justify-center text-lg shrink-0">
                            {cm.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-white font-semibold text-xs">{prov.name}</h3>
                            <span className={`text-xs ${cm.color}`}>{cm.label}</span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 mb-3 line-clamp-2">{prov.description}</p>
                        {isInstalled ? (
                          <span className="text-xs text-success-400">✓ Installed</span>
                        ) : (
                          <button onClick={() => navigate("/business/integrations")} className="text-xs text-primary-300 hover:text-primary-200 font-medium">
                            Install →
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </BusinessShell>
  );
}
