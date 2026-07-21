import { useEffect, useState, useMemo, useCallback } from "react";
import BusinessShell from "./BusinessShell";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { SkeletonCard, SkeletonList } from "../../components/Skeleton";
import { EmptyState, ErrorState } from "../../components/States";
import { StatTile } from "../../components/StatTile";
import { InfoDot } from "../../components/Tooltip";
import { formatDateTime, timeAgo } from "../../lib/utils";
import { insertAuditLog } from "../../lib/auth";
import {
  fetchActionPriorities,
  saveActionItems,
  updateActionItemStatus,
  updateActionItemNotes,
  type ActionPriority,
  type HealthSummary,
} from "../../lib/action-center";
import type { ActionItem, ReviewSession } from "../../lib/types";

type StatusFilter = "all" | "open" | "in_progress" | "resolved" | "dismissed";

const priorityMeta = (level: string) => {
  switch (level) {
    case "critical": return { label: "Critical", color: "text-error-400", bg: "bg-error-500/15", border: "border-error-500/30", dot: "bg-error-400", ring: "shadow-[0_0_20px_-6px_rgba(239,68,68,0.5)]" };
    case "high": return { label: "High", color: "text-warning-400", bg: "bg-warning-500/15", border: "border-warning-500/30", dot: "bg-warning-400", ring: "shadow-[0_0_20px_-6px_rgba(250,204,21,0.4)]" };
    case "medium": return { label: "Medium", color: "text-primary-300", bg: "bg-primary-500/15", border: "border-primary-500/30", dot: "bg-primary-400", ring: "shadow-[0_0_20px_-6px_rgba(99,102,241,0.4)]" };
    default: return { label: "Low", color: "text-slate-400", bg: "bg-slate-500/15", border: "border-slate-500/30", dot: "bg-slate-400", ring: "" };
  }
};

const statusMeta = (status: string) => {
  switch (status) {
    case "open": return { label: "Open", color: "text-primary-300", bg: "bg-primary-500/15", dot: "bg-primary-400" };
    case "in_progress": return { label: "In Progress", color: "text-warning-400", bg: "bg-warning-500/15", dot: "bg-warning-400" };
    case "resolved": return { label: "Resolved", color: "text-success-400", bg: "bg-success-500/15", dot: "bg-success-400" };
    case "dismissed": return { label: "Dismissed", color: "text-slate-500", bg: "bg-slate-600/15", dot: "bg-slate-500" };
    default: return { label: "Open", color: "text-primary-300", bg: "bg-primary-500/15", dot: "bg-primary-400" };
  }
};

const healthMeta = (overall: string) => {
  switch (overall) {
    case "improving": return { label: "Improving", color: "text-success-400", bg: "bg-success-500/15", icon: "📈" };
    case "stable": return { label: "Stable", color: "text-primary-300", bg: "bg-primary-500/15", icon: "➡️" };
    case "needs_attention": return { label: "Needs Attention", color: "text-error-400", bg: "bg-error-500/15", icon: "⚠️" };
    default: return { label: "Stable", color: "text-primary-300", bg: "bg-primary-500/15", icon: "➡️" };
  }
};

export default function BusinessActions() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<ReviewSession[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [healthSummary, setHealthSummary] = useState<HealthSummary | null>(null);
  const [nextBestAction, setNextBestAction] = useState<string | null>(null);
  const [showHealth, setShowHealth] = useState(false);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selected, setSelected] = useState<ActionItem | null>(null);

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
      if (!link?.business_id) { setActionItems([]); setReviews([]); setLoading(false); return; }
      setBusinessId(link.business_id);

      const [revRes, actRes] = await Promise.all([
        supabase.from("review_sessions").select("*").eq("business_id", link.business_id).order("created_at", { ascending: false }),
        supabase.from("action_items").select("*").eq("business_id", link.business_id).order("created_at", { ascending: false }),
      ]);
      if (revRes.error) throw revRes.error;
      if (actRes.error) throw actRes.error;
      setReviews((revRes.data || []) as ReviewSession[]);
      setActionItems((actRes.data || []) as ActionItem[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load action center");
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const open = actionItems.filter((a) => a.status === "open").length;
    const inProgress = actionItems.filter((a) => a.status === "in_progress").length;
    const resolved = actionItems.filter((a) => a.status === "resolved").length;
    const dismissed = actionItems.filter((a) => a.status === "dismissed").length;
    const critical = actionItems.filter((a) => a.priority_level === "critical" && a.status !== "resolved" && a.status !== "dismissed").length;
    return { open, inProgress, resolved, dismissed, critical, total: actionItems.length };
  }, [actionItems]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return actionItems;
    return actionItems.filter((a) => a.status === statusFilter);
  }, [actionItems, statusFilter]);

  const handleAnalyze = async () => {
    if (!businessId || reviews.length === 0) return;
    setAnalyzing(true);
    setAnalyzeError(null);
    setShowHealth(true);
    const result = await fetchActionPriorities(businessId, reviews);
    if (result.error) {
      setAnalyzeError(result.error);
      setHealthSummary(null);
      setNextBestAction(null);
    } else {
      setHealthSummary(result.healthSummary);
      setNextBestAction(result.nextBestAction);
      if (result.priorities && result.priorities.length > 0) {
        const { error: saveErr } = await saveActionItems(businessId, result.priorities as ActionPriority[]);
        if (saveErr) {
          showToast("Failed to save some action items", "error");
        } else {
          showToast(`${result.priorities.length} action item${result.priorities.length !== 1 ? "s" : ""} generated`, "success");
          if (profile) {
            await insertAuditLog({
              actor_id: profile.id,
              actor_email: profile.email,
              action: "action_priorities_generated",
              target_type: "business",
              target_id: businessId,
              metadata: { count: result.priorities.length },
            });
          }
          load();
        }
      } else if (result.message) {
        showToast(result.message, "info");
      }
    }
    setAnalyzing(false);
  };

  const handleStatusChange = async (itemId: string, status: ActionItem["status"]) => {
    const { error: updateErr } = await updateActionItemStatus(itemId, status as "open" | "in_progress" | "dismissed" | "resolved");
    if (updateErr) {
      showToast("Failed to update status", "error");
      return;
    }
    if (profile) {
      await insertAuditLog({
        actor_id: profile.id,
        actor_email: profile.email,
        action: "action_item_status_changed",
        target_type: "action_item",
        target_id: itemId,
        metadata: { status },
      });
    }
    showToast("Status updated", "success");
    setActionItems((prev) => prev.map((a) => a.id === itemId ? { ...a, status, updated_at: new Date().toISOString() } : a));
    setSelected((prev) => prev && prev.id === itemId ? { ...prev, status, updated_at: new Date().toISOString() } : prev);
  };

  const handleNotesSave = async (itemId: string, notes: string) => {
    const { error: notesErr } = await updateActionItemNotes(itemId, notes);
    if (notesErr) {
      showToast("Failed to save notes", "error");
      return;
    }
    showToast("Notes saved", "success");
    setActionItems((prev) => prev.map((a) => a.id === itemId ? { ...a, internal_notes: notes.trim() || null, updated_at: new Date().toISOString() } : a));
    setSelected((prev) => prev && prev.id === itemId ? { ...prev, internal_notes: notes.trim() || null, updated_at: new Date().toISOString() } : prev);
  };

  if (loading) return (
    <BusinessShell title="Action Center">
      <div className="p-4 md:p-8 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonCard className="!min-h-[100px]" />
          <SkeletonCard className="!min-h-[100px]" />
          <SkeletonCard className="!min-h-[100px]" />
          <SkeletonCard className="!min-h-[100px]" />
        </div>
        <SkeletonList items={3} />
      </div>
    </BusinessShell>
  );

  if (error) return (
    <BusinessShell title="Action Center">
      <div className="p-4 md:p-8"><ErrorState message={error} onRetry={load} /></div>
    </BusinessShell>
  );

  if (reviews.length === 0) return (
    <BusinessShell title="Action Center">
      <div className="p-4 md:p-8 page-enter">
        <EmptyState
          title="No reviews to analyze yet"
          subtitle="Once customers start leaving feedback, the Action Center will analyze your reviews and surface intelligent priorities and recommended actions."
        />
      </div>
    </BusinessShell>
  );

  return (
    <BusinessShell title="Action Center">
      <div className="p-4 md:p-8 space-y-6 page-enter">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-up">
          <div>
            <h2 className="text-xl font-bold text-white">Action & Growth Center</h2>
            <p className="text-sm text-slate-400 mt-1">Know what to focus on and what to do next.</p>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="btn-primary px-5 py-2.5 text-white text-sm font-medium rounded-xl whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {analyzing ? "Analyzing..." : "✨ Generate AI Priorities"}
          </button>
        </div>

        {/* Overview stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-tile-3d">
            <div className="relative">
              <StatTile label="Open Actions" value={stats.open} icon="📋" accent="primary" delay={0} />
              <div className="absolute top-2 right-2"><InfoDot content="Action items that need your attention" /></div>
            </div>
          </div>
          <div className="stat-tile-3d">
            <StatTile label="In Progress" value={stats.inProgress} icon="🔄" accent="warning" delay={80} hint="Being worked on" />
          </div>
          <div className="stat-tile-3d">
            <StatTile label="Resolved" value={stats.resolved} icon="✅" accent="success" delay={160} hint="Completed actions" />
          </div>
          <div className="stat-tile-3d">
            <div className="relative">
              <StatTile label="Critical" value={stats.critical} icon="🚨" accent="error" delay={240} hint="Urgent priorities" />
              <div className="absolute top-2 right-2"><InfoDot content="Critical priority items that are not yet resolved or dismissed" /></div>
            </div>
          </div>
        </div>

        {/* Next Best Action banner */}
        {nextBestAction && (
          <div className="glass-strong rounded-2xl p-6 animate-fade-up border-l-4 border-primary-500" style={{ animationDelay: "280ms" }}>
            <div className="flex items-start gap-3">
              <div className="text-2xl shrink-0">🎯</div>
              <div>
                <h3 className="text-sm font-medium text-primary-300 uppercase tracking-wide mb-1">Next Best Action</h3>
                <p className="text-lg text-white leading-relaxed">{nextBestAction}</p>
              </div>
            </div>
          </div>
        )}

        {/* Business Health panel */}
        {showHealth && (
          <HealthPanel
            health={healthSummary}
            loading={analyzing}
            error={analyzeError}
            onClose={() => setShowHealth(false)}
          />
        )}

        {/* Filter pills */}
        {actionItems.length > 0 && (
          <div className="flex gap-2 flex-wrap animate-fade-up" style={{ animationDelay: "340ms" }}>
            <FilterPill active={statusFilter === "all"} onClick={() => setStatusFilter("all")} label={`All (${stats.total})`} />
            <FilterPill active={statusFilter === "open"} onClick={() => setStatusFilter("open")} label={`Open (${stats.open})`} />
            <FilterPill active={statusFilter === "in_progress"} onClick={() => setStatusFilter("in_progress")} label={`In Progress (${stats.inProgress})`} />
            <FilterPill active={statusFilter === "resolved"} onClick={() => setStatusFilter("resolved")} label={`Resolved (${stats.resolved})`} />
            <FilterPill active={statusFilter === "dismissed"} onClick={() => setStatusFilter("dismissed")} label={`Dismissed (${stats.dismissed})`} />
          </div>
        )}

        {/* Action items feed */}
        {actionItems.length === 0 && !analyzing ? (
          <div className="glass rounded-2xl p-8 text-center animate-fade-up" style={{ animationDelay: "360ms" }}>
            <div className="text-4xl mb-3">🧠</div>
            <h3 className="text-lg font-semibold text-white mb-2">No action items yet</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Click "Generate AI Priorities" above to analyze your reviews and get intelligent, actionable recommendations for your business.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState title="No items match this filter" subtitle="Try a different status filter." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((item, i) => (
              <ActionCard
                key={item.id}
                item={item}
                delay={i * 40}
                onOpen={() => setSelected(item)}
                onStatusChange={(s) => handleStatusChange(item.id, s)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <ActionDetailPanel
          item={selected}
          onClose={() => setSelected(null)}
          onStatusChange={(s) => handleStatusChange(selected.id, s)}
          onNotesSave={(notes) => handleNotesSave(selected.id, notes)}
        />
      )}
    </BusinessShell>
  );
}

function HealthPanel({ health, loading, error, onClose }: {
  health: HealthSummary | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  return (
    <div className="glass-strong rounded-2xl p-6 animate-fade-up" style={{ animationDelay: "300ms" }}>
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="text-xl">📊</span>
          <div>
            <h3 className="text-base font-bold text-white">Business Health</h3>
            <p className="text-xs text-slate-500">Based on your actual review data</p>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Analyzing your reviews...</p>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="py-8"><ErrorState message={error} /></div>
      )}

      {health && !loading && !error && (
        <div className="space-y-5">
          {/* Overall health badge */}
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl ${healthMeta(health.overall).bg}`}>
            <span className="text-lg">{healthMeta(health.overall).icon}</span>
            <span className={`text-sm font-medium ${healthMeta(health.overall).color}`}>
              {healthMeta(health.overall).label}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <HealthCard label="Customer Sentiment" text={health.sentiment} icon="💬" accent="primary" />
            <HealthCard label="Rating Momentum" text={health.ratingMomentum} icon="📈" accent="accent" />
            <HealthCard label="Response Activity" text={health.responseActivity} icon="✉️" accent="success" />
            <HealthCard label="Recurring Complaints" text={health.recurringComplaints} icon="⚠️" accent="error" />
            {health.positiveTrends && (
              <div className="md:col-span-2">
                <HealthCard label="Positive Trends" text={health.positiveTrends} icon="✨" accent="success" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function HealthCard({ label, text, icon, accent }: { label: string; text: string; icon: string; accent: "primary" | "accent" | "success" | "error" }) {
  const accentMap = {
    primary: "text-primary-400",
    accent: "text-accent-400",
    success: "text-success-400",
    error: "text-error-400",
  };
  return (
    <div className="bg-slate-900/40 rounded-xl p-4 border border-white/5">
      <p className={`text-xs uppercase tracking-wide mb-2 font-medium ${accentMap[accent]}`}>
        {icon} {label}
      </p>
      <p className="text-slate-200 text-sm leading-relaxed">{text}</p>
    </div>
  );
}

function FilterPill({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${active ? "btn-primary text-white" : "btn-ghost text-slate-300"}`}
    >
      {label}
    </button>
  );
}

function ActionCard({ item, delay, onOpen, onStatusChange }: {
  item: ActionItem;
  delay: number;
  onOpen: () => void;
  onStatusChange: (status: ActionItem["status"]) => void;
}) {
  const pm = priorityMeta(item.priority_level);
  const sm = statusMeta(item.status);
  const isDone = item.status === "resolved" || item.status === "dismissed";

  return (
    <div
      className={`glass rounded-2xl p-5 card-hover cursor-pointer animate-fade-up flex flex-col border ${pm.border} ${isDone ? "opacity-60" : ""}`}
      style={{ animationDelay: `${delay}ms` }}
      onClick={onOpen}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3 gap-2">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pm.bg} ${pm.color} shrink-0`}>
          {pm.label}
        </span>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sm.bg} ${sm.color} shrink-0`}>
          {sm.label}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-white text-sm font-semibold leading-snug mb-2">{item.title}</h3>

      {/* Explanation */}
      {item.explanation && (
        <p className="text-slate-300 text-xs leading-relaxed line-clamp-2 flex-1">{item.explanation}</p>
      )}

      {/* Recommended action */}
      {item.recommended_action && (
        <div className="mt-3 flex items-start gap-1.5 text-xs text-primary-300">
          <span className="shrink-0 mt-0.5">→</span>
          <p className="leading-relaxed line-clamp-2">{item.recommended_action}</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
        <p className="text-xs text-slate-600">{timeAgo(item.created_at)}</p>
        {!isDone && (
          <button
            onClick={(e) => { e.stopPropagation(); onStatusChange("in_progress"); }}
            className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
          >
            Start →
          </button>
        )}
      </div>
    </div>
  );
}

function ActionDetailPanel({ item, onClose, onStatusChange, onNotesSave }: {
  item: ActionItem;
  onClose: () => void;
  onStatusChange: (status: ActionItem["status"]) => void;
  onNotesSave: (notes: string) => void;
}) {
  const pm = priorityMeta(item.priority_level);
  const sm = statusMeta(item.status);
  const [notes, setNotes] = useState(item.internal_notes || "");
  const [savingNotes, setSavingNotes] = useState(false);

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    await onNotesSave(notes);
    setSavingNotes(false);
  };

  const statusButtons: { status: ActionItem["status"]; label: string }[] = [
    { status: "open", label: "Reopen" },
    { status: "in_progress", label: "In Progress" },
    { status: "resolved", label: "Resolve" },
    { status: "dismissed", label: "Dismiss" },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
      <div
        className="glass-strong rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto page-enter"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pm.bg} ${pm.color}`}>{pm.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sm.bg} ${sm.color}`}>{sm.label}</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-700/50 text-slate-400">
                {item.confidence} confidence
              </span>
            </div>
            <h3 className="text-lg font-bold text-white leading-snug">{item.title}</h3>
            <p className="text-xs text-slate-500 mt-2">Generated {formatDateTime(item.ai_generated_at)}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Explanation */}
        {item.explanation && (
          <div className="bg-slate-900/50 rounded-xl p-4 mb-4 border border-white/5">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">What's Happening</p>
            <p className="text-slate-200 text-sm leading-relaxed">{item.explanation}</p>
          </div>
        )}

        {/* Why it matters */}
        {item.why_it_matters && (
          <div className="bg-warning-500/10 rounded-xl p-4 mb-4 border border-warning-500/20">
            <p className="text-xs text-warning-400 uppercase tracking-wide mb-2 font-medium">Why It Matters</p>
            <p className="text-slate-200 text-sm leading-relaxed">{item.why_it_matters}</p>
          </div>
        )}

        {/* Recommended action */}
        {item.recommended_action && (
          <div className="bg-primary-500/10 rounded-xl p-4 mb-4 border border-primary-500/20">
            <p className="text-xs text-primary-400 uppercase tracking-wide mb-2 font-medium">Recommended Action</p>
            <p className="text-slate-200 text-sm leading-relaxed">{item.recommended_action}</p>
          </div>
        )}

        {/* Evidence */}
        {(() => {
          const evidence = item.evidence as { summary?: string; review_ids?: number[] };
          const hasSummary = evidence.summary && evidence.summary.trim();
          const hasIds = evidence.review_ids && Array.isArray(evidence.review_ids) && evidence.review_ids.length > 0;
          if (!hasSummary && !hasIds) return null;
          return (
            <div className="bg-slate-900/40 rounded-xl p-4 mb-4 border border-white/5">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Supporting Evidence</p>
              {hasSummary && (
                <p className="text-slate-300 text-sm leading-relaxed mb-2">{evidence.summary}</p>
              )}
              {hasIds && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {evidence.review_ids!.map((rid) => (
                    <span key={rid} className="px-2 py-0.5 rounded-md bg-white/5 text-xs text-slate-400">
                      Review #{rid}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Internal notes */}
        <div className="mb-5">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Internal Notes</p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add your private notes about this action..."
            className="input-field w-full min-h-[80px] p-3 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none resize-none"
          />
          <button
            onClick={handleSaveNotes}
            disabled={savingNotes || notes.trim() === (item.internal_notes || "").trim()}
            className="mt-2 btn-ghost px-4 py-2 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingNotes ? "Saving..." : "Save Notes"}
          </button>
        </div>

        {/* Status actions */}
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Update Status</p>
          <div className="flex flex-wrap gap-2">
            {statusButtons.map((btn) => (
              <button
                key={btn.status}
                onClick={() => onStatusChange(btn.status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  item.status === btn.status
                    ? "btn-primary text-white"
                    : "btn-ghost text-slate-300"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
