import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import BusinessShell from "./BusinessShell";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { SkeletonStatGrid, SkeletonList } from "../../components/Skeleton";
import { ErrorState } from "../../components/States";
import { StatTile } from "../../components/StatTile";
import { timeAgo } from "../../lib/utils";
import { insertAuditLog } from "../../lib/auth";
import {
  fetchWorkflows,
  fetchExecutions,
  computeWorkflowAnalytics,
  workflowStatusMeta,
  triggerTypeMeta,
  generateAIWorkflow,
  type WorkflowAnalytics,
} from "../../lib/workflow";
import type { Workflow, WorkflowExecution, WorkflowStatus } from "../../lib/types";

export default function BusinessWorkflows() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAIBuilder, setShowAIBuilder] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);

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
      if (!link?.business_id) { setWorkflows([]); setLoading(false); return; }
      setBusinessId(link.business_id);

      const [wfRes, execRes] = await Promise.all([
        fetchWorkflows(link.business_id),
        fetchExecutions(link.business_id, undefined, 100),
      ]);
      if (wfRes.error) throw new Error(wfRes.error);
      if (execRes.error) throw new Error(execRes.error);
      setWorkflows(wfRes.data || []);
      setExecutions(execRes.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load workflows");
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const analytics: WorkflowAnalytics = computeWorkflowAnalytics(workflows, executions);

  const handleToggleStatus = async (wf: Workflow) => {
    const newStatus: WorkflowStatus = wf.status === "active" ? "paused" : "active";
    const { error } = await supabase.from("workflows").update({ status: newStatus }).eq("id", wf.id);
    if (error) { showToast("Failed to update workflow", "error"); return; }
    setWorkflows((prev) => prev.map((w) => w.id === wf.id ? { ...w, status: newStatus } : w));
    showToast(`Workflow ${newStatus === "active" ? "activated" : "paused"}`, "success");
  };

  const handleDelete = async (wf: Workflow) => {
    const { error } = await supabase.from("workflows").delete().eq("id", wf.id);
    if (error) { showToast("Failed to delete workflow", "error"); return; }
    setWorkflows((prev) => prev.filter((w) => w.id !== wf.id));
    showToast("Workflow deleted", "success");
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim() || !businessId) return;
    setAiGenerating(true);
    const businessName = "Your Business";
    const result = await generateAIWorkflow({ businessName, prompt: aiPrompt });
    if (result.error) {
      showToast(result.error, "error");
      setAiGenerating(false);
      return;
    }
    // Create the workflow from AI output
    const wf = result.workflow;
    const { data, error } = await supabase.from("workflows").insert({
      business_id: businessId,
      name: wf.name,
      description: wf.description,
      status: "draft",
      trigger_type: wf.trigger_type,
      trigger_config: wf.trigger_config,
      canvas_data: {},
      variables: wf.variables,
      is_ai_generated: true,
      ai_explanation: result.explanation,
    }).select().single();
    if (error) { showToast("Failed to create workflow", "error"); setAiGenerating(false); return; }
    // Save nodes
    if (wf.nodes.length > 0) {
      const nodes = wf.nodes.map((n, i) => ({
        workflow_id: data.id,
        business_id: businessId,
        node_key: n.key,
        node_type: n.node_type,
        node_category: n.node_category,
        label: n.label,
        config: n.config,
        position_x: n.position_x,
        position_y: n.position_y,
        is_collapsed: false,
        sort_order: i,
      }));
      await supabase.from("workflow_nodes").insert(nodes);
    }
    // Save edges
    if (wf.edges.length > 0) {
      const edges = wf.edges.map((e) => ({
        workflow_id: data.id,
        business_id: businessId,
        source_node_key: e.source,
        target_node_key: e.target,
        edge_label: e.label || null,
        edge_data: {},
      }));
      await supabase.from("workflow_edges").insert(edges);
    }
    if (profile) {
      await insertAuditLog({ actor_id: profile.id, actor_email: profile.email, action: "workflow_ai_generated", target_type: "workflow", target_id: data.id, metadata: { prompt: aiPrompt } });
    }
    showToast("AI workflow generated! Review and edit it.", "success");
    setAiGenerating(false);
    setShowAIBuilder(false);
    setAiPrompt("");
    navigate(`/business/workflows/${data.id}`);
  };

  if (loading) return (
    <BusinessShell title="Workflows">
      <div className="p-4 md:p-8 space-y-6">
        <SkeletonStatGrid />
        <SkeletonList items={3} />
      </div>
    </BusinessShell>
  );

  if (error) return (
    <BusinessShell title="Workflows">
      <div className="p-4 md:p-8"><ErrorState message={error} onRetry={load} /></div>
    </BusinessShell>
  );

  return (
    <BusinessShell title="Workflows">
      <div className="p-4 md:p-8 space-y-6 page-enter">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-up">
          <div>
            <h2 className="text-xl font-bold text-white">Automation Workflows</h2>
            <p className="text-sm text-slate-400 mt-1">Visually automate customer journeys. No code required.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAIBuilder(true)} className="btn-ghost px-4 py-2.5 text-primary-300 text-sm font-medium rounded-xl whitespace-nowrap">
              ✨ AI Builder
            </button>
            <button onClick={() => navigate("/business/workflows/templates")} className="btn-ghost px-4 py-2.5 text-slate-300 text-sm font-medium rounded-xl whitespace-nowrap">
              📋 Templates
            </button>
            <button onClick={() => navigate("/business/workflows/analytics")} className="btn-ghost px-4 py-2.5 text-slate-300 text-sm font-medium rounded-xl whitespace-nowrap">
              📊 Analytics
            </button>
            <button onClick={() => navigate("/business/workflows/new")} className="btn-primary px-5 py-2.5 text-white text-sm font-medium rounded-xl whitespace-nowrap">
              + New Workflow
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-tile-3d">
            <StatTile label="Total Workflows" value={analytics.total} icon="📋" accent="primary" delay={0} />
          </div>
          <div className="stat-tile-3d">
            <StatTile label="Active" value={analytics.active} icon="🟢" accent="success" delay={80} />
          </div>
          <div className="stat-tile-3d">
            <StatTile label="Executions" value={analytics.totalExecutions} icon="⚡" accent="accent" delay={160} />
          </div>
          <div className="stat-tile-3d">
            <StatTile label="Success Rate" value={analytics.successRate} suffix="%" icon="✅" accent="warning" delay={240} />
          </div>
        </div>

        {/* Workflow list */}
        {workflows.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center animate-fade-up" style={{ animationDelay: "300ms" }}>
            <div className="text-4xl mb-3">📋</div>
            <h3 className="text-lg font-semibold text-white mb-2">No workflows yet</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto mb-4">
              Create your first automation workflow or start from a template. You can also ask AI to build one for you.
            </p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => navigate("/business/workflows/templates")} className="btn-ghost px-5 py-2.5 text-slate-300 text-sm font-medium rounded-xl">
                Browse Templates
              </button>
              <button onClick={() => setShowAIBuilder(true)} className="btn-primary px-5 py-2.5 text-white text-sm font-medium rounded-xl">
                ✨ AI Builder
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workflows.map((wf, i) => {
              const sm = workflowStatusMeta(wf.status);
              const tm = triggerTypeMeta(wf.trigger_type);
              const successRate = wf.execution_count > 0 ? Math.round((wf.success_count / wf.execution_count) * 100) : 0;
              return (
                <div
                  key={wf.id}
                  className={`glass rounded-2xl p-5 card-hover cursor-pointer animate-fade-up border ${wf.status === "active" ? "border-success-500/20" : "border-white/5"}`}
                  style={{ animationDelay: `${i * 40}ms` }}
                  onClick={() => navigate(`/business/workflows/${wf.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-lg shrink-0">{tm.icon}</span>
                      <h3 className="text-white text-sm font-semibold truncate">{wf.name}</h3>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sm.bg} ${sm.color} shrink-0`}>{sm.label}</span>
                  </div>

                  {wf.description && <p className="text-xs text-slate-400 line-clamp-2 mb-3">{wf.description}</p>}

                  {wf.is_ai_generated && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-500/15 text-primary-300 mb-3">
                      ✨ AI Generated
                    </span>
                  )}

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center">
                      <p className="text-xs text-slate-500">Runs</p>
                      <p className="text-sm font-bold text-white">{wf.execution_count}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-500">Success</p>
                      <p className="text-sm font-bold text-success-400">{successRate}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-500">Failed</p>
                      <p className="text-sm font-bold text-error-400">{wf.failure_count}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/5" onClick={(e) => e.stopPropagation()}>
                    <p className="text-xs text-slate-600">{timeAgo(wf.updated_at)}</p>
                    <div className="flex gap-2">
                      <button onClick={() => handleToggleStatus(wf)} className="text-xs text-primary-400 hover:text-primary-300 transition-colors">
                        {wf.status === "active" ? "Pause" : "Activate"}
                      </button>
                      <button onClick={() => handleDelete(wf)} className="text-xs text-error-400 hover:text-error-300 transition-colors">Delete</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* AI Builder Modal */}
      {showAIBuilder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setShowAIBuilder(false)}>
          <div className="glass-strong rounded-2xl p-6 w-full max-w-lg page-enter" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <span className="text-xl">✨</span>
                <h3 className="text-lg font-bold text-white">AI Workflow Builder</h3>
              </div>
              <button onClick={() => setShowAIBuilder(false)} className="text-slate-400 hover:text-white transition-colors p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <p className="text-sm text-slate-400 mb-4">Describe what you want to automate in plain English. AI will generate the workflow for you.</p>

            <div className="space-y-3 mb-4">
              {[
                "Thank customers who leave 5-star reviews",
                "Recover customers who leave negative reviews",
                "Send birthday wishes with a special offer",
                "Re-engage customers who haven't visited in 60 days",
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => setAiPrompt(example)}
                  className="block w-full text-left p-2.5 rounded-xl bg-slate-900/40 border border-white/5 text-xs text-slate-400 hover:border-primary-500/20 hover:text-slate-300 transition-all"
                >
                  "{example}"
                </button>
              ))}
            </div>

            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Describe your automation..."
              className="input-field w-full min-h-[80px] p-3 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none resize-none"
            />

            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowAIBuilder(false)} className="btn-ghost px-4 py-2 text-slate-300 text-sm font-medium rounded-lg">Cancel</button>
              <button onClick={handleAIGenerate} disabled={aiGenerating || !aiPrompt.trim()} className="btn-primary px-5 py-2 text-white text-sm font-medium rounded-lg disabled:opacity-50">
                {aiGenerating ? "Generating..." : "Generate Workflow"}
              </button>
            </div>
          </div>
        </div>
      )}
    </BusinessShell>
  );
}
