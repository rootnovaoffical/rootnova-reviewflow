import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { getActiveBusiness, getCommandCenterData, callAIAgent, logAgentAction } from "../../lib/ai-agent";
import type { CommandCenterData } from "../../lib/ai-agent";

export default function AICommandCenter() {
  const [data, setData] = useState<CommandCenterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const loadData = useCallback(async (bid: string) => {
    try {
      const ccData = await getCommandCenterData(bid);
      setData(ccData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const bid = await getActiveBusiness();
      if (!bid) {
        setError("No business found for your account");
        setLoading(false);
        return;
      }
      setBusinessId(bid);
      await loadData(bid);
    })();
  }, [loadData]);

  const handleGenerateRecommendations = async () => {
    if (!businessId) return;
    setGenerating(true);
    try {
      const { data: result, error: err } = await callAIAgent(businessId, "generate_recommendations", {});
      if (err) throw new Error(err);
      if (result) {
        await logAgentAction(businessId, {
          log_level: "info",
          action: "manual_recommendation_generation",
          reasoning: "Business owner triggered recommendation generation from Command Center",
        });
      }
      await loadData(businessId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate recommendations");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <CommandCenterSkeleton />;
  if (error) return <ErrorState message={error} />;
  if (!data) return <EmptyState />;

  const healthScore = Math.round(
    (data.businessHealth.avgRating / 5) * 30 +
    (data.businessHealth.responseRate / 100) * 20 +
    (data.workflowHealth.successRate / 100) * 15 +
    15 +
    (data.communicationPerformance.total > 0 ? (data.communicationPerformance.delivered / data.communicationPerformance.total) * 100 : 100) * 0.1 +
    10
  );

  return (
    <div className="space-y-6 animate-page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Command Center</h1>
          <p className="text-sm text-slate-400 mt-1">Your intelligent business operating system</p>
        </div>
        <button
          onClick={handleGenerateRecommendations}
          disabled={generating}
          className="btn-primary"
        >
          {generating ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analyzing...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Generate AI Recommendations
            </>
          )}
        </button>
      </div>

      {/* Health Score */}
      <div className="glass-strong p-6 animate-fade-up">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Business Health Score</h2>
            <p className="text-xs text-slate-400 mt-1">Computed from real platform data</p>
          </div>
          <div className="text-4xl font-bold text-gradient">{healthScore}<span className="text-lg text-slate-500">/100</span></div>
        </div>
        <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${healthScore}%`,
              background: healthScore >= 80
                ? "linear-gradient(90deg, #22c55e, #10b981)"
                : healthScore >= 60
                ? "linear-gradient(90deg, #f59e0b, #f97316)"
                : "linear-gradient(90deg, #ef4444, #dc2626)",
            }}
          />
        </div>
        <div className="flex items-center gap-2 mt-3">
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
            healthScore >= 80 ? "bg-green-500/15 text-green-400" :
            healthScore >= 60 ? "bg-amber-500/15 text-amber-400" :
            "bg-red-500/15 text-red-400"
          }`}>
            {healthScore >= 80 ? "Healthy" : healthScore >= 60 ? "Moderate" : healthScore >= 40 ? "Needs Attention" : "Critical"}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatTile label="Avg Rating" value={data.businessHealth.avgRating.toFixed(1)} suffix="/5" color="#f59e0b" delay={0} />
        <StatTile label="Total Reviews" value={String(data.businessHealth.totalReviews)} color="#3b82f6" delay={50} />
        <StatTile label="Response Rate" value={`${data.businessHealth.responseRate.toFixed(0)}%`} color="#10b981" delay={100} />
        <StatTile label="Active Workflows" value={String(data.workflowHealth.active)} color="#8b5cf6" delay={150} />
        <StatTile label="Messages Sent" value={String(data.communicationPerformance.total)} color="#06b6d4" delay={200} />
        <StatTile label="Pending Campaigns" value={String(data.upcomingCampaigns)} color="#f97316" delay={250} />
      </div>

      {/* Critical Issues & Positive Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-5 animate-fade-up" style={{ animationDelay: "300ms" }}>
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Critical Issues
          </h3>
          {data.criticalIssues.length === 0 ? (
            <p className="text-sm text-slate-400">No critical issues detected. Your business is running smoothly.</p>
          ) : (
            <div className="space-y-3">
              {data.criticalIssues.map((issue, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/5">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${issue.severity === "critical" ? "bg-red-500" : "bg-amber-500"}`} />
                  <div>
                    <p className="text-sm text-white">{issue.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5 capitalize">{issue.type.replace(/_/g, " ")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card p-5 animate-fade-up" style={{ animationDelay: "350ms" }}>
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Positive Trends
          </h3>
          {data.positiveTrends.length === 0 ? (
            <p className="text-sm text-slate-400">No positive trends detected yet. Keep engaging with customers.</p>
          ) : (
            <div className="space-y-3">
              {data.positiveTrends.map((trend, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-green-500/5 border border-green-500/10">
                  <svg className="w-4 h-4 text-green-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-sm text-slate-200">{trend}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top Priorities */}
      <div className="glass-card p-5 animate-fade-up" style={{ animationDelay: "400ms" }}>
        <h3 className="font-semibold text-white mb-4">Top Priorities</h3>
        {data.topPriorities.length === 0 ? (
          <p className="text-sm text-slate-400">No open action items. All caught up.</p>
        ) : (
          <div className="space-y-2">
            {data.topPriorities.map((p) => (
              <Link key={p.id} to="/business/ai-tasks" className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    p.priority === "critical" ? "bg-red-500/15 text-red-400" :
                    p.priority === "high" ? "bg-amber-500/15 text-amber-400" :
                    "bg-blue-500/15 text-blue-400"
                  }`}>{p.priority}</span>
                  <span className="text-sm text-white">{p.title}</span>
                </div>
                <span className="text-xs text-slate-400">{(p.confidence * 100).toFixed(0)}% confidence</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Next Best Actions */}
      <div className="glass-card p-5 animate-fade-up" style={{ animationDelay: "450ms" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white">Next Best Actions</h3>
          <Link to="/business/ai-tasks" className="text-xs text-blue-400 hover:text-blue-300">View all tasks →</Link>
        </div>
        {data.nextBestActions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-slate-400 mb-3">No AI recommendations yet. Generate recommendations to get started.</p>
            <button onClick={handleGenerateRecommendations} disabled={generating} className="btn-primary">
              Generate Recommendations
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.nextBestActions.map((action) => (
              <div key={action.id} className="p-4 rounded-xl bg-white/5 border border-white/10 card-hover">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-medium text-white">{action.title}</h4>
                  <span className="text-xs text-blue-400 shrink-0 ml-2">{(action.confidence * 100).toFixed(0)}%</span>
                </div>
                <p className="text-xs text-slate-400 mb-2">{action.description}</p>
                <p className="text-xs text-green-400">{action.expectedImpact}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity & Workflow Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-5 animate-fade-up" style={{ animationDelay: "500ms" }}>
          <h3 className="font-semibold text-white mb-4">Recent Activity (7 days)</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <ActivityTile label="Reviews" value={data.recentActivity.reviews} color="#f59e0b" />
            <ActivityTile label="New Customers" value={data.recentActivity.customers} color="#10b981" />
            <ActivityTile label="Messages" value={data.recentActivity.messages} color="#06b6d4" />
            <ActivityTile label="Workflow Runs" value={data.recentActivity.workflows} color="#8b5cf6" />
            <ActivityTile label="Campaigns" value={data.recentActivity.campaigns} color="#f97316" />
          </div>
        </div>

        <div className="glass-card p-5 animate-fade-up" style={{ animationDelay: "550ms" }}>
          <h3 className="font-semibold text-white mb-4">Workflow Health</h3>
          <div className="space-y-3">
            <HealthBar label="Total Workflows" value={data.workflowHealth.total} max={Math.max(data.workflowHealth.total, 10)} color="#8b5cf6" />
            <HealthBar label="Active Workflows" value={data.workflowHealth.active} max={Math.max(data.workflowHealth.total, 10)} color="#10b981" />
            <HealthBar label="Total Executions" value={data.workflowHealth.executions} max={Math.max(data.workflowHealth.executions, 50)} color="#3b82f6" />
            <HealthBar label="Success Rate" value={data.workflowHealth.successRate} max={100} suffix="%" color="#22c55e" />
          </div>
        </div>
      </div>

      {/* Communication Performance */}
      <div className="glass-card p-5 animate-fade-up" style={{ animationDelay: "600ms" }}>
        <h3 className="font-semibold text-white mb-4">Communication Performance</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <CommStat label="Total" value={data.communicationPerformance.total} color="#64748b" />
          <CommStat label="Delivered" value={data.communicationPerformance.delivered} color="#10b981" />
          <CommStat label="Read" value={data.communicationPerformance.read} color="#3b82f6" />
          <CommStat label="Failed" value={data.communicationPerformance.failed} color="#ef4444" />
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value, suffix, color, delay }: { label: string; value: string; suffix?: string; color: string; delay: number }) {
  return (
    <div className="stat-tile-3d animate-stat-3d" style={{ animationDelay: `${delay}ms` }}>
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="text-2xl font-bold" style={{ color }}>{value}<span className="text-sm text-slate-500">{suffix}</span></div>
    </div>
  );
}

function ActivityTile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="p-3 rounded-xl bg-white/5">
      <div className="text-2xl font-bold" style={{ color }}>{value}</div>
      <div className="text-xs text-slate-400 mt-0.5">{label}</div>
    </div>
  );
}

function HealthBar({ label, value, max, suffix, color }: { label: string; value: number; max: number; suffix?: string; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-slate-400">{label}</span>
        <span className="text-xs font-medium text-white">{value}{suffix}</span>
      </div>
      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function CommStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="p-4 rounded-xl bg-white/5 text-center">
      <div className="text-2xl font-bold" style={{ color }}>{value}</div>
      <div className="text-xs text-slate-400 mt-1">{label}</div>
    </div>
  );
}

function CommandCenterSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-64 skeleton" />
      <div className="h-24 skeleton" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-20 skeleton" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-48 skeleton" />
        <div className="h-48 skeleton" />
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <svg className="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <p className="text-slate-400">{message}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <svg className="w-12 h-12 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
      <p className="text-slate-400">No data available yet.</p>
    </div>
  );
}
