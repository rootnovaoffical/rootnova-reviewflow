import { useEffect, useState, useMemo, useCallback } from "react";
import BusinessShell from "./BusinessShell";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { SkeletonCard, SkeletonStatGrid } from "../../components/Skeleton";
import { EmptyState, ErrorState } from "../../components/States";
import { StatTile } from "../../components/StatTile";
import { Sparkline } from "../../components/StatTile";
import { timeAgo } from "../../lib/utils";
import {
  fetchWorkflows,
  fetchExecutions,
  computeWorkflowAnalytics,
  executionStatusMeta,
  triggerTypeMeta,
  type WorkflowAnalytics,
} from "../../lib/workflow";
import type { Workflow, WorkflowExecution, ExecutionStatus } from "../../lib/types";

export default function BusinessWorkflowAnalytics() {
  const { profile } = useAuth();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setError(null);
    setLoading(true);
    try {
      const { data: link } = await supabase
        .from("business_admins")
        .select("business_id")
        .eq("user_id", profile.id)
        .maybeSingle();
      if (!link?.business_id) { setWorkflows([]); setLoading(false); return; }

      const [wfRes, execRes] = await Promise.all([
        fetchWorkflows(link.business_id),
        fetchExecutions(link.business_id, undefined, 500),
      ]);
      if (wfRes.error) throw new Error(wfRes.error);
      if (execRes.error) throw new Error(execRes.error);
      setWorkflows(wfRes.data || []);
      setExecutions(execRes.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const analytics: WorkflowAnalytics = useMemo(() => computeWorkflowAnalytics(workflows, executions), [workflows, executions]);

  const dailyExecutions = useMemo(() => {
    const counts: number[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      counts.push(executions.filter((e) => e.started_at.slice(0, 10) === ds).length);
    }
    return counts;
  }, [executions]);

  const dailySuccess = useMemo(() => {
    const counts: number[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      counts.push(executions.filter((e) => e.status === "completed" && e.started_at.slice(0, 10) === ds).length);
    }
    return counts;
  }, [executions]);

  if (loading) return (
    <BusinessShell title="Workflow Analytics">
      <div className="p-4 md:p-8 space-y-6">
        <SkeletonStatGrid />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </BusinessShell>
  );

  if (error) return (
    <BusinessShell title="Workflow Analytics">
      <div className="p-4 md:p-8"><ErrorState message={error} onRetry={load} /></div>
    </BusinessShell>
  );

  if (workflows.length === 0 && executions.length === 0) return (
    <BusinessShell title="Workflow Analytics">
      <div className="p-4 md:p-8 page-enter">
        <EmptyState
          title="No workflow data yet"
          subtitle="Once you create and activate workflows, analytics will show execution counts, success rates, top performing workflows, and daily activity trends."
        />
      </div>
    </BusinessShell>
  );

  return (
    <BusinessShell title="Workflow Analytics">
      <div className="p-4 md:p-8 space-y-6 page-enter">
        {/* Header */}
        <div className="animate-fade-up">
          <h2 className="text-xl font-bold text-white">Workflow Analytics</h2>
          <p className="text-sm text-slate-400 mt-1">Execution performance, success rates, and workflow comparison.</p>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-tile-3d">
            <StatTile label="Total Workflows" value={analytics.total} icon="📋" accent="primary" delay={0} />
          </div>
          <div className="stat-tile-3d">
            <StatTile label="Total Executions" value={analytics.totalExecutions} icon="⚡" accent="accent" delay={80} />
          </div>
          <div className="stat-tile-3d">
            <StatTile label="Success Rate" value={analytics.successRate} suffix="%" icon="✅" accent="success" delay={160} />
          </div>
          <div className="stat-tile-3d">
            <StatTile label="Failure Rate" value={analytics.failureRate} suffix="%" icon="❌" accent="error" delay={240} />
          </div>
        </div>

        {/* Activity charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass rounded-2xl p-6 animate-fade-up" style={{ animationDelay: "300ms" }}>
            <h3 className="text-sm font-medium text-slate-400 mb-4">Daily Executions</h3>
            <p className="text-3xl font-bold text-white mb-2">{analytics.totalExecutions} <span className="text-sm font-normal text-slate-500">total</span></p>
            <Sparkline data={dailyExecutions} />
            <div className="flex justify-between text-xs text-slate-600 mt-2">
              <span>14 days ago</span>
              <span>Today</span>
            </div>
          </div>

          <div className="glass rounded-2xl p-6 animate-fade-up" style={{ animationDelay: "360ms" }}>
            <h3 className="text-sm font-medium text-slate-400 mb-4">Daily Successes</h3>
            <p className="text-3xl font-bold text-success-400 mb-2">{analytics.successful} <span className="text-sm font-normal text-slate-500">completed</span></p>
            <Sparkline data={dailySuccess} />
            <div className="flex justify-between text-xs text-slate-600 mt-2">
              <span>14 days ago</span>
              <span>Today</span>
            </div>
          </div>
        </div>

        {/* Status breakdown */}
        <div className="glass rounded-2xl p-6 animate-fade-up" style={{ animationDelay: "420ms" }}>
          <h3 className="text-sm font-medium text-slate-400 mb-4">Execution Status Breakdown</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {(Object.keys(analytics.byStatus) as ExecutionStatus[]).sort((a, b) => analytics.byStatus[b] - analytics.byStatus[a]).map((status) => {
              const sm = executionStatusMeta(status);
              const count = analytics.byStatus[status];
              const pct = analytics.totalExecutions > 0 ? Math.round((count / analytics.totalExecutions) * 100) : 0;
              return (
                <div key={status} className="bg-slate-900/40 rounded-xl p-3 border border-white/5 text-center">
                  <div className="text-lg mb-1">{sm.icon}</div>
                  <p className="text-xs text-slate-500">{sm.label}</p>
                  <p className="text-lg font-bold text-white mt-1">{count}</p>
                  <p className="text-xs text-slate-600">{pct}%</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top workflows */}
        {analytics.topWorkflows.length > 0 && (
          <div className="glass rounded-2xl p-6 animate-fade-up" style={{ animationDelay: "480ms" }}>
            <h3 className="text-sm font-medium text-slate-400 mb-4">Top Performing Workflows</h3>
            <div className="space-y-3">
              {analytics.topWorkflows.map((wf, i) => {
                const wfData = workflows.find((w) => w.id === wf.id);
                const tm = wfData ? triggerTypeMeta(wfData.trigger_type) : null;
                return (
                  <div key={wf.id} className="flex items-center gap-4">
                    <span className="text-sm text-slate-600 w-6">#{i + 1}</span>
                    <span className="text-lg shrink-0">{tm?.icon || "📋"}</span>
                    <span className="text-sm text-slate-300 flex-1 truncate">{wf.name}</span>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-center">
                        <p className="text-xs text-slate-500">Executions</p>
                        <p className="text-sm font-bold text-white">{wf.executions}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-slate-500">Success</p>
                        <p className="text-sm font-bold text-success-400">{wf.successRate}%</p>
                      </div>
                      <div className="w-24">
                        <div className="h-2.5 rounded-full bg-white/5 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-400 transition-all duration-700" style={{ width: `${wf.successRate}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent executions */}
        {executions.length > 0 && (
          <div className="glass rounded-2xl p-6 animate-fade-up" style={{ animationDelay: "540ms" }}>
            <h3 className="text-sm font-medium text-slate-400 mb-4">Recent Executions</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {executions.slice(0, 15).map((exec) => {
                const sm = executionStatusMeta(exec.status as ExecutionStatus);
                const wf = workflows.find((w) => w.id === exec.workflow_id);
                return (
                  <div key={exec.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/30 border border-white/5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sm.bg} ${sm.color} shrink-0`}>{sm.icon} {sm.label}</span>
                    <span className="text-xs text-slate-300 flex-1 truncate">{wf?.name || "Unknown workflow"}</span>
                    {exec.duration_ms !== null && <span className="text-xs text-slate-600 shrink-0">{exec.duration_ms}ms</span>}
                    <span className="text-xs text-slate-600 shrink-0">{timeAgo(exec.started_at)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </BusinessShell>
  );
}
