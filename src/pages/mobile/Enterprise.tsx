// ============================================================
// MODULE 14 — MOBILE ENTERPRISE
// Reuses Module 13 enterprise services
// ============================================================

import { useEffect, useState, useCallback } from "react";
import MobileShell from "../../components/MobileShell";
import EnterpriseSwitcher from "../../components/EnterpriseSwitcher";
import { useAuth } from "../../context/AuthContext";
import { getUserOrgId, getEnterpriseDashboard } from "../../lib/enterprise";
import type { EnterpriseDashboardData } from "../../lib/enterprise";
import { cacheGet, cacheSet } from "../../lib/mobile-offline";

export default function MobileEnterprise() {
  const { profile } = useAuth();
  const [dashboard, setDashboard] = useState<EnterpriseDashboardData | null>(null);

  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) return;
    const cacheKey = `mobile-enterprise-${profile.id}`;
    const cached = cacheGet<EnterpriseDashboardData>(cacheKey);
    if (cached) setDashboard(cached);

    const orgId = await getUserOrgId();
    if (!orgId) { setLoading(false); return; }

    const dash = await getEnterpriseDashboard(orgId);

    setDashboard(dash);
    cacheSet(cacheKey, dash, 15);
    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <MobileShell title="Enterprise" backTo="/mobile">{skeleton()}</MobileShell>;

  return (
    <MobileShell title="Enterprise" backTo="/mobile">
      <div className="space-y-4 page-enter">
        <EnterpriseSwitcher />

        {/* Enterprise KPIs */}
        {dashboard && (
          <div className="grid grid-cols-2 gap-3">
            <KpiCard label="Branches" value={dashboard.total_branches} icon="🏢" />
            <KpiCard label="Active" value={dashboard.active_branches} icon="✅" />
            <KpiCard label="Regions" value={dashboard.total_regions} icon="🗺️" />
            <KpiCard label="Managers" value={dashboard.total_managers} icon="👤" />
            <KpiCard label="Reviews" value={dashboard.total_reviews} icon="⭐" />
            <KpiCard label="Avg Rating" value={dashboard.avg_rating.toFixed(1)} icon="📊" />
            <KpiCard label="Customers" value={dashboard.total_customers} icon="👥" />
            <KpiCard label="Campaigns" value={dashboard.total_campaigns} icon="📣" />
          </div>
        )}

        {/* Top performers */}
        {dashboard && dashboard.top_performers.length > 0 && (
          <div className="glass rounded-2xl p-4 animate-fade-up">
            <h3 className="text-sm font-medium text-emerald-400 mb-3">Top Performers</h3>
            <div className="space-y-2">
              {dashboard.top_performers.slice(0, 5).map((b, i) => (
                <div key={b.branch_id} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">#{i + 1}</span>
                    <span className="text-xs text-white">{b.branch_name}</span>
                    <span className="text-[10px] text-slate-600">{b.city}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-amber-400">⭐{b.avg_rating.toFixed(1)}</span>
                    <span className="text-xs text-slate-500">{b.total_reviews}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Low performers */}
        {dashboard && dashboard.low_performers.length > 0 && (
          <div className="glass rounded-2xl p-4 animate-fade-up" style={{ animationDelay: "80ms" }}>
            <h3 className="text-sm font-medium text-rose-400 mb-3">Needs Attention</h3>
            <div className="space-y-2">
              {dashboard.low_performers.slice(0, 5).map((b) => (
                <div key={b.branch_id} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                  <div>
                    <span className="text-xs text-white">{b.branch_name}</span>
                    <span className="text-[10px] text-slate-600 ml-2">{b.city}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-rose-400">⭐{b.avg_rating.toFixed(1)}</span>
                    <span className="text-xs text-slate-500">{b.health_score}/100</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent events */}
        {dashboard && dashboard.recent_events.length > 0 && (
          <div className="glass rounded-2xl p-4 animate-fade-up" style={{ animationDelay: "120ms" }}>
            <h3 className="text-sm font-medium text-slate-300 mb-3">Recent Events</h3>
            <div className="space-y-2">
              {dashboard.recent_events.slice(0, 5).map((e) => (
                <div key={e.id} className="flex items-start gap-2 py-1.5 border-b border-white/5 last:border-0">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${e.severity === "critical" ? "bg-rose-500/20 text-rose-400" : e.severity === "positive" ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-500/20 text-slate-400"}`}>{e.severity}</span>
                  <div className="min-w-0">
                    <p className="text-xs text-white truncate">{e.title}</p>
                    {e.branch && <p className="text-[10px] text-slate-600">{e.branch.name}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </MobileShell>
  );
}

function KpiCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="glass rounded-xl p-3 animate-fade-up">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-400 uppercase">{label}</span>
        <span className="text-base opacity-50">{icon}</span>
      </div>
      <p className="text-xl font-bold text-white mt-1">{value}</p>
    </div>
  );
}

function skeleton() {
  return <div className="space-y-3 pt-4"><div className="h-12 bg-white/5 rounded-xl animate-pulse" /><div className="grid grid-cols-2 gap-3">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)}</div></div>;
}
