import { useEffect, useState } from "react";
import BusinessShell from "./BusinessShell";
import { Card, PageHeader, Badge } from "../../components/Shell";
import { Loading, EmptyState } from "../../components/States";
import { getComparisonData, getUserOrgId, type ComparisonData } from "../../lib/enterprise";

export default function EnterpriseComparison() {
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"avg_rating" | "total_reviews" | "response_rate" | "total_customers" | "health_score">("avg_rating");

  useEffect(() => {
    (async () => {
      const orgId = await getUserOrgId();
      if (!orgId) { setLoading(false); return; }
      const comparison = await getComparisonData(orgId);
      setData(comparison);
      setLoading(false);
    })();
  }, []);

  if (loading) return <BusinessShell title="Comparison"><Loading /></BusinessShell>;
  if (!data || data.branches.length === 0) return <BusinessShell title="Comparison"><EmptyState title="No Data" message="No branch data for comparison yet." /></BusinessShell>;

  const sorted = [...data.branches].sort((a, b) => (b[sortBy] ?? 0) - (a[sortBy] ?? 0));
  const maxRating = Math.max(...sorted.map((b) => b.avg_rating), 1);
  const maxHealth = Math.max(...sorted.map((b) => b.health_score), 1);

  return (
    <BusinessShell title="Location Comparison">
      <PageHeader title="Location Comparison" subtitle="Compare performance across all branches" />

      <div className="px-4 md:px-8 pb-8 space-y-6">
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-slate-400 text-sm">Sort by:</span>
            {([
              { key: "avg_rating", label: "Rating" },
              { key: "total_reviews", label: "Reviews" },
              { key: "response_rate", label: "Response" },
              { key: "total_customers", label: "Customers" },
              { key: "health_score", label: "Health" },
            ] as const).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSortBy(opt.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${sortBy === opt.key ? "bg-primary-600 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 text-xs uppercase border-b border-white/5">
                  <th className="text-left py-2 px-3">Branch</th>
                  <th className="text-left py-2 px-3">City</th>
                  <th className="text-right py-2 px-3">Rating</th>
                  <th className="text-right py-2 px-3">Reviews</th>
                  <th className="text-right py-2 px-3">Response %</th>
                  <th className="text-right py-2 px-3">Customers</th>
                  <th className="text-right py-2 px-3">Health</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((b, i) => (
                  <tr key={b.branch_id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-3 text-white font-medium">
                      <span className="text-slate-500 mr-2">#{i + 1}</span>
                      {b.branch_name}
                    </td>
                    <td className="py-3 px-3 text-slate-400">{b.city || "—"}</td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(b.avg_rating / 5) * 100}%` }} />
                        </div>
                        <span className="text-white font-medium">{b.avg_rating.toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right text-slate-300">{b.total_reviews}</td>
                    <td className="py-3 px-3 text-right text-slate-300">{b.response_rate.toFixed(0)}%</td>
                    <td className="py-3 px-3 text-right text-slate-300">{b.total_customers}</td>
                    <td className="py-3 px-3 text-right">
                      <Badge color={b.health_score >= 70 ? "emerald" : b.health_score >= 40 ? "amber" : "rose"}>{b.health_score.toFixed(0)}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Visual bars */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-white font-semibold mb-4">⭐ Rating Comparison</h3>
            <div className="space-y-2">
              {sorted.slice(0, 10).map((b) => (
                <div key={b.branch_id} className="flex items-center gap-3">
                  <span className="text-slate-400 text-xs w-24 truncate">{b.branch_name}</span>
                  <div className="flex-1 h-6 rounded-lg bg-white/5 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-500/80 to-amber-400 rounded-lg flex items-center justify-end pr-2" style={{ width: `${(b.avg_rating / maxRating) * 100}%` }}>
                      <span className="text-xs text-white font-medium">{b.avg_rating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="text-white font-semibold mb-4">❤️ Health Score</h3>
            <div className="space-y-2">
              {sorted.slice(0, 10).map((b) => (
                <div key={b.branch_id} className="flex items-center gap-3">
                  <span className="text-slate-400 text-xs w-24 truncate">{b.branch_name}</span>
                  <div className="flex-1 h-6 rounded-lg bg-white/5 overflow-hidden">
                    <div className={`h-full rounded-lg flex items-center justify-end pr-2 ${b.health_score >= 70 ? "bg-gradient-to-r from-emerald-500/80 to-emerald-400" : b.health_score >= 40 ? "bg-gradient-to-r from-amber-500/80 to-amber-400" : "bg-gradient-to-r from-rose-500/80 to-rose-400"}`} style={{ width: `${(b.health_score / maxHealth) * 100}%` }}>
                      <span className="text-xs text-white font-medium">{b.health_score.toFixed(0)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </BusinessShell>
  );
}
