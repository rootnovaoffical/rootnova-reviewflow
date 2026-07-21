// ============================================================
// MODULE 14 — MOBILE AI ASSISTANT
// Reuses Module 9 AI Business Agent
// ============================================================

import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import MobileShell from "../../components/MobileShell";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { cacheGet, cacheSet } from "../../lib/mobile-offline";
import { timeAgo } from "../../lib/utils";
import type { AITask, AIBriefing } from "../../lib/types";

export default function MobileAI() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<AITask[]>([]);
  const [briefing, setBriefing] = useState<AIBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"insights" | "tasks" | "briefing">("insights");

  const load = useCallback(async () => {
    if (!profile) return;
    const cacheKey = `mobile-ai-${profile.id}`;
    const cached = cacheGet<{ tasks: AITask[]; briefing: AIBriefing | null }>(cacheKey);
    if (cached) { setTasks(cached.tasks); setBriefing(cached.briefing); }

    const { data: bizData } = await supabase
      .from("business_admins")
      .select("business_id")
      .eq("user_id", profile.id)
      .maybeSingle();
    if (!bizData?.business_id) { setLoading(false); return; }

    const [tasksRes, briefingRes] = await Promise.all([
      supabase.from("ai_tasks").select("*").eq("business_id", bizData.business_id).order("created_at", { ascending: false }).limit(20),
      supabase.from("ai_briefings").select("*").eq("business_id", bizData.business_id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    const t = (tasksRes.data ?? []) as AITask[];
    const b = (briefingRes.data ?? null) as AIBriefing | null;
    setTasks(t);
    setBriefing(b);
    cacheSet(cacheKey, { tasks: t, briefing: b }, 15);
    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const acceptTask = async (taskId: string) => {
    await supabase.from("ai_tasks").update({ status: "accepted", accepted_at: new Date().toISOString() }).eq("id", taskId);
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: "accepted" } : t));
  };

  const dismissTask = async (taskId: string) => {
    await supabase.from("ai_tasks").update({ status: "dismissed", dismissed_at: new Date().toISOString() }).eq("id", taskId);
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: "dismissed" } : t));
  };

  if (loading) return <MobileShell title="AI Assistant">{skeleton()}</MobileShell>;

  return (
    <MobileShell title="AI Assistant">
      <div className="space-y-4 page-enter">
        {/* Tab selector */}
        <div className="flex gap-2">
          {(["insights", "tasks", "briefing"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${tab === t ? "bg-primary-500/20 text-primary-300 border border-primary-500/30" : "bg-white/5 text-slate-400 border border-transparent"}`}>{t}</button>
          ))}
        </div>

        {/* Insights tab */}
        {tab === "insights" && (
          <div className="space-y-3 animate-fade-up">
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🤖</span>
                <h3 className="text-sm font-medium text-white">Executive Briefing</h3>
              </div>
              {briefing ? (
                <div className="space-y-3">
                  <p className="text-xs text-slate-300 leading-relaxed">{briefing.summary}</p>
                  {briefing.wins.length > 0 && (
                    <div><p className="text-[10px] text-emerald-400 uppercase mb-1">Wins</p>{briefing.wins.map((w, i) => <p key={i} className="text-xs text-slate-400 mb-0.5">• {w}</p>)}</div>
                  )}
                  {briefing.risks.length > 0 && (
                    <div><p className="text-[10px] text-amber-400 uppercase mb-1">Risks</p>{briefing.risks.map((r, i) => <p key={i} className="text-xs text-slate-400 mb-0.5">• {r}</p>)}</div>
                  )}
                  {briefing.recommendations.length > 0 && (
                    <div><p className="text-[10px] text-primary-400 uppercase mb-1">Recommendations</p>{briefing.recommendations.map((r, i) => <p key={i} className="text-xs text-slate-400 mb-0.5">• {r}</p>)}</div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No briefing available yet. AI will generate one as your business collects data.</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => navigate("/mobile/analytics")} className="glass rounded-xl p-3 text-left hover:bg-white/10 transition-colors">
                <span className="text-xl block mb-1">📈</span>
                <span className="text-xs text-slate-300">View Analytics</span>
              </button>
              <button onClick={() => navigate("/mobile/campaigns")} className="glass rounded-xl p-3 text-left hover:bg-white/10 transition-colors">
                <span className="text-xl block mb-1">📣</span>
                <span className="text-xs text-slate-300">Campaigns</span>
              </button>
            </div>
          </div>
        )}

        {/* Tasks tab */}
        {tab === "tasks" && (
          <div className="space-y-3 animate-fade-up">
            {tasks.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-4xl">✅</span>
                <p className="text-sm text-slate-500 mt-2">No AI tasks right now.</p>
              </div>
            ) : (
              tasks.filter((t) => t.status === "recommended").map((t, i) => (
                <div key={t.id} className="glass rounded-2xl p-4 animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-medium text-white">{t.title}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] shrink-0 ${t.priority === "critical" ? "bg-rose-500/20 text-rose-400" : t.priority === "high" ? "bg-amber-500/20 text-amber-400" : "bg-slate-500/20 text-slate-400"}`}>{t.priority}</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-2">{t.description}</p>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] text-slate-500">Confidence: {Math.round(t.confidence * 100)}%</span>
                    <span className="text-[10px] text-slate-600">•</span>
                    <span className="text-[10px] text-slate-500">{timeAgo(t.created_at)}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => acceptTask(t.id)} className="btn-primary flex-1 py-2 text-white text-xs font-medium rounded-lg">Accept</button>
                    <button onClick={() => dismissTask(t.id)} className="px-3 py-2 text-slate-400 text-xs rounded-lg bg-white/5">Dismiss</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Briefing tab */}
        {tab === "briefing" && (
          <div className="space-y-3 animate-fade-up">
            {briefing ? (
              <div className="glass rounded-2xl p-4">
                <p className="text-xs text-slate-500 mb-2">{briefing.period} briefing • {timeAgo(briefing.created_at)}</p>
                <p className="text-sm text-slate-300 leading-relaxed mb-3">{briefing.summary}</p>
                {briefing.progress.length > 0 && (
                  <div className="mb-3"><p className="text-[10px] text-sky-400 uppercase mb-1">Progress</p>{briefing.progress.map((p, i) => <p key={i} className="text-xs text-slate-400 mb-0.5">• {p}</p>)}</div>
                )}
                {briefing.upcoming_opportunities.length > 0 && (
                  <div><p className="text-[10px] text-emerald-400 uppercase mb-1">Opportunities</p>{briefing.upcoming_opportunities.map((o, i) => <p key={i} className="text-xs text-slate-400 mb-0.5">• {o}</p>)}</div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-12">No briefing available.</p>
            )}
          </div>
        )}
      </div>
    </MobileShell>
  );
}

function skeleton() {
  return (
    <div className="space-y-3 pt-4">
      <div className="h-8 bg-white/5 rounded-full animate-pulse" />
      <div className="h-40 bg-white/5 rounded-2xl animate-pulse" />
      <div className="h-20 bg-white/5 rounded-2xl animate-pulse" />
    </div>
  );
}
