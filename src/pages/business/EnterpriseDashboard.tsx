import { useEffect, useState } from "react";
import BusinessShell from "./BusinessShell";
import { Card, StatCard, PageHeader, Badge } from "../../components/Shell";
import { Loading, EmptyState } from "../../components/States";
import {
  getEnterpriseDashboard,
  getUserOrgId,
  generateEnterpriseAIInsights,
  type EnterpriseDashboardData,
  type EnterpriseAIInsight,
  eventSeverityMeta,
} from "../../lib/enterprise";

export default function EnterpriseDashboard() {
  const [data, setData] = useState<EnterpriseDashboardData | null>(null);
  const [aiInsights, setAiInsights] = useState<EnterpriseAIInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const orgId = await getUserOrgId();
      if (!orgId) {
        setError("No organization found for your account.");
        setLoading(false);
        return;
      }

      const dashboard = await getEnterpriseDashboard(orgId);
      setData(dashboard);
      setLoading(false);

      const insights = await generateEnterpriseAIInsights(orgId, dashboard);
      setAiInsights(insights);
    })();
  }, []);

  if (loading) return <BusinessShell title="Enterprise Dashboard"><Loading /></BusinessShell>;
  if (error || !data) return <BusinessShell title="Enterprise Dashboard"><EmptyState title="No Data" message={error ?? "No data available"} /></BusinessShell>;

  return (
    <BusinessShell title="Enterprise Dashboard">
      <PageHeader title="Enterprise Dashboard" subtitle="Cross-location intelligence across your organization" />

      <div className="px-4 md:px-8 pb-8 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 animate-fade-up">
          <StatCard label="Total Branches" value={data.total_branches} icon="🏪" />
          <StatCard label="Active" value={data.active_branches} icon="✅" />
          <StatCard label="Regions" value={data.total_regions} icon="🗺️" />
          <StatCard label="Managers" value={data.total_managers} icon="👥" />
          <StatCard label="Avg Rating" value={data.avg_rating.toFixed(2)} icon="⭐" />
          <StatCard label="Total Reviews" value={data.total_reviews} icon="📊" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Performers */}
          <Card>
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">🏆 Top Performers</h3>
            {data.top_performers.length === 0 ? (
              <p className="text-slate-500 text-sm">No performance data yet.</p>
            ) : (
              <div className="space-y-3">
                {data.top_performers.map((p, i) => (
                  <div key={p.branch_id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                    <span className="text-lg font-bold text-slate-500 w-6">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">{p.branch_name}</p>
                      <p className="text-slate-500 text-xs">{p.city || "—"} · {p.total_reviews} reviews</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold text-sm">{p.avg_rating.toFixed(1)}⭐</p>
                      <p className="text-slate-500 text-xs">{p.response_rate.toFixed(0)}% resp</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Low Performers */}
          <Card>
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">⚠️ Needs Attention</h3>
            {data.low_performers.length === 0 ? (
              <p className="text-slate-500 text-sm">No performance data yet.</p>
            ) : (
              <div className="space-y-3">
                {data.low_performers.map((p, i) => (
                  <div key={p.branch_id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                    <span className="text-lg font-bold text-slate-500 w-6">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">{p.branch_name}</p>
                      <p className="text-slate-500 text-xs">{p.city || "—"} · {p.total_reviews} reviews</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold text-sm">{p.avg_rating.toFixed(1)}⭐</p>
                      <p className="text-slate-500 text-xs">{p.health_score.toFixed(0)} health</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Regional Breakdown */}
        <Card>
          <h3 className="text-white font-semibold mb-4">🗺️ Regional Performance</h3>
          {data.regional_breakdown.length === 0 ? (
            <p className="text-slate-500 text-sm">No regional data yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 text-xs uppercase border-b border-white/5">
                    <th className="text-left py-2 px-3">Region</th>
                    <th className="text-right py-2 px-3">Branches</th>
                    <th className="text-right py-2 px-3">Avg Rating</th>
                    <th className="text-right py-2 px-3">Total Reviews</th>
                  </tr>
                </thead>
                <tbody>
                  {data.regional_breakdown.map((r) => (
                    <tr key={r.region} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-3 px-3 text-white font-medium">{r.region}</td>
                      <td className="py-3 px-3 text-right text-slate-300">{r.branch_count}</td>
                      <td className="py-3 px-3 text-right text-slate-300">{r.avg_rating.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right text-slate-300">{r.total_reviews}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* AI Insights */}
        <Card>
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">🤖 AI Enterprise Insights</h3>
          {aiInsights.length === 0 ? (
            <p className="text-slate-500 text-sm">AI insights will appear as more data becomes available across your locations.</p>
          ) : (
            <div className="space-y-3">
              {aiInsights.map((insight, i) => (
                <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="text-white font-medium text-sm">{insight.title}</p>
                      <p className="text-slate-400 text-xs mt-1">{insight.description}</p>
                    </div>
                    <Badge color={(eventSeverityMeta[insight.severity]?.color ?? "slate") as "slate" | "blue" | "amber" | "rose" | "emerald"}>{eventSeverityMeta[insight.severity]?.label ?? insight.severity}</Badge>
                  </div>
                  {insight.evidence.length > 0 && (
                    <ul className="text-xs text-slate-500 mt-2 space-y-1">
                      {insight.evidence.map((e, j) => <li key={j}>• {e}</li>)}
                    </ul>
                  )}
                  <div className="flex items-center gap-3 mt-3 pt-2 border-t border-white/5">
                    <span className="text-xs text-slate-500">Confidence: {(insight.confidence * 100).toFixed(0)}%</span>
                    <span className="text-xs text-primary-400">{insight.recommended_action}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Events */}
        <Card>
          <h3 className="text-white font-semibold mb-4">📡 Recent Enterprise Events</h3>
          {data.recent_events.length === 0 ? (
            <p className="text-slate-500 text-sm">No events recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {data.recent_events.slice(0, 10).map((event) => (
                <div key={event.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                  <Badge color={(eventSeverityMeta[event.severity]?.color ?? "slate") as "slate" | "blue" | "amber" | "rose" | "emerald"}>{eventSeverityMeta[event.severity]?.label ?? event.severity}</Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{event.title}</p>
                    {event.branch && <p className="text-slate-500 text-xs">{event.branch.name}</p>}
                  </div>
                  <span className="text-slate-500 text-xs whitespace-nowrap">{new Date(event.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </BusinessShell>
  );
}
