// ============================================================
// MODULE 14 — MOBILE WORKFLOWS
// Reuses existing Workflow Engine
// ============================================================

import { useEffect, useState, useCallback } from "react";
import MobileShell from "../../components/MobileShell";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { cacheGet, cacheSet } from "../../lib/mobile-offline";
import { timeAgo } from "../../lib/utils";
import type { Workflow } from "../../lib/types";

export default function MobileWorkflows() {
  const { profile } = useAuth();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) return;
    const cacheKey = `mobile-workflows-${profile.id}`;
    const cached = cacheGet<Workflow[]>(cacheKey);
    if (cached) setWorkflows(cached);

    const { data: bizData } = await supabase
      .from("business_admins")
      .select("business_id")
      .eq("user_id", profile.id)
      .maybeSingle();
    if (!bizData?.business_id) { setLoading(false); return; }

    const { data } = await supabase
      .from("workflows")
      .select("*")
      .eq("business_id", bizData.business_id)
      .order("created_at", { ascending: false })
      .limit(30);

    const list = (data ?? []) as Workflow[];
    setWorkflows(list);
    cacheSet(cacheKey, list, 15);
    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const toggleWorkflow = async (wf: Workflow) => {
    const newStatus = wf.status === "active" ? "paused" : "active";
    await supabase.from("workflows").update({ status: newStatus }).eq("id", wf.id);
    setWorkflows((prev) => prev.map((w) => w.id === wf.id ? { ...w, status: newStatus } : w));
  };

  if (loading) return <MobileShell title="Workflows" backTo="/mobile">{skeleton()}</MobileShell>;

  return (
    <MobileShell title="Workflows" backTo="/mobile">
      <div className="space-y-3 page-enter">
        {workflows.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-4xl">⚡</span>
            <p className="text-sm text-slate-500 mt-2">No workflows yet.</p>
            <p className="text-xs text-slate-600 mt-1">Create workflows from the desktop app.</p>
          </div>
        ) : (
          workflows.map((wf, i) => (
            <div key={wf.id} className="glass rounded-2xl p-4 animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-white truncate">{wf.name}</h3>
                  <p className="text-xs text-slate-500">{wf.trigger_type} • {timeAgo(wf.created_at)}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${wf.status === "active" ? "bg-emerald-500/20 text-emerald-400" : wf.status === "paused" ? "bg-amber-500/20 text-amber-400" : "bg-slate-500/20 text-slate-400"}`}>{wf.status}</span>
              </div>
              {wf.description && <p className="text-xs text-slate-400 mb-3 line-clamp-2">{wf.description}</p>}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <MiniStat label="Runs" value={wf.execution_count} />
                <MiniStat label="Success" value={wf.success_count} />
                <MiniStat label="Failed" value={wf.failure_count} />
              </div>
              {(wf.status === "active" || wf.status === "paused") && (
                <button onClick={() => toggleWorkflow(wf)} className={`w-full py-2 text-xs font-medium rounded-lg ${wf.status === "active" ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                  {wf.status === "active" ? "Pause" : "Resume"}
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </MobileShell>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return <div className="text-center"><p className="text-sm font-bold text-white">{value}</p><p className="text-[10px] text-slate-500">{label}</p></div>;
}

function skeleton() {
  return <div className="space-y-3 pt-4">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-28 bg-white/5 rounded-2xl animate-pulse" />)}</div>;
}
