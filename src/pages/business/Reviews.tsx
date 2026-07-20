import { useEffect, useState, useMemo } from "react";
import BusinessShell from "./BusinessShell";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { SkeletonList } from "../../components/Skeleton";
import { EmptyState } from "../../components/States";
import { formatDateTime, timeAgo } from "../../lib/utils";
import type { ReviewSession } from "../../lib/types";

export default function BusinessReviews() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [reviews, setReviews] = useState<ReviewSession[] | null>(null);
  const [filter, setFilter] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "7d" | "30d" | "90d">("all");
  const [selected, setSelected] = useState<ReviewSession | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    supabase.from("business_admins").select("business_id").eq("user_id", profile.id).maybeSingle()
      .then(({ data }) => {
        if (!data?.business_id) { setReviews([]); return; }
        supabase.from("review_sessions").select("*").eq("business_id", data.business_id).order("created_at", { ascending: false }).then(({ data: r }) => setReviews(r as ReviewSession[] || []));
      });
  }, [profile]);

  const filtered = useMemo(() => {
    if (!reviews) return null;
    let result = reviews;
    if (filter !== null) result = result.filter((r) => r.rating === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((r) => (r.ai_generated_review || "").toLowerCase().includes(q));
    }
    if (dateFilter !== "all") {
      const days = dateFilter === "7d" ? 7 : dateFilter === "30d" ? 30 : 90;
      const cutoff = new Date(Date.now() - days * 86400000);
      result = result.filter((r) => new Date(r.created_at) >= cutoff);
    }
    return result;
  }, [reviews, filter, search, dateFilter]);

  if (!filtered) return <BusinessShell title="Reviews"><div className="p-4 md:p-8"><SkeletonList items={4} /></div></BusinessShell>;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast("Review copied to clipboard", "success");
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <BusinessShell title="Reviews">
      <div className="p-4 md:p-8 space-y-6 page-enter">
        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none"
              placeholder="Search reviews..."
            />
          </div>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="input-field px-3 py-2.5 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none"
          >
            <option value="all">All time</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>

        {/* Rating filter pills */}
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilter(null)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === null ? "btn-primary text-white" : "btn-ghost text-slate-300"}`}>All</button>
          {[5, 4, 3, 2, 1].map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === s ? "btn-primary text-white" : "btn-ghost text-slate-300"}`}>
              {s} {"\u2B50"}
            </button>
          ))}
        </div>

        {/* Results count */}
        <p className="text-xs text-slate-500">{filtered.length} review{filtered.length !== 1 ? "s" : ""}</p>

        {/* Review list */}
        {filtered.length === 0 ? (
          <EmptyState title="No reviews found" subtitle="Reviews matching your filters will appear here. Share your review link to start collecting feedback." />
        ) : (
          <div className="space-y-3">
            {filtered.map((r, i) => (
              <div
                key={r.id}
                className="glass rounded-2xl p-5 card-hover cursor-pointer animate-fade-up"
                style={{ animationDelay: `${i * 30}ms` }}
                onClick={() => setSelected(r)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="text-xl">{"\u2B50".repeat(r.rating)}</div>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${r.ai_status === "completed" ? "bg-success-500/15 text-success-400" : "bg-warning-500/15 text-warning-400"}`}>
                    {r.ai_status}
                  </span>
                </div>
                {r.ai_generated_review ? (
                  <p className="text-slate-200 text-sm leading-relaxed line-clamp-3">{r.ai_generated_review}</p>
                ) : (
                  <p className="text-slate-500 text-sm italic">Rating only — no AI review generated</p>
                )}
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-slate-600">{timeAgo(r.created_at)}</p>
                  {r.ai_generated_review && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCopy(r.ai_generated_review!, r.id); }}
                      className={`text-xs text-primary-400 hover:text-primary-300 transition-colors ${copiedId === r.id ? "copy-success text-success-400" : ""}`}
                    >
                      {copiedId === r.id ? "\u2713 Copied" : "Copy"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setSelected(null)}>
          <div className="glass-strong rounded-2xl p-6 w-full max-w-lg page-enter" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-2xl mb-1">{"\u2B50".repeat(selected.rating)}</div>
                <p className="text-xs text-slate-500">{formatDateTime(selected.created_at)}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs ${selected.ai_status === "completed" ? "bg-success-500/15 text-success-400" : "bg-warning-500/15 text-warning-400"}`}>
                {selected.ai_status}
              </span>
            </div>
            {selected.ai_generated_review && (
              <div className="bg-slate-900/50 rounded-xl p-4 mb-4 border border-white/5">
                <p className="text-slate-200 text-sm leading-relaxed">{selected.ai_generated_review}</p>
              </div>
            )}
            {selected.answers && selected.answers.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Customer Answers</p>
                <div className="space-y-1.5">
                  {selected.answers.map((a: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-slate-400">{a.question_id?.slice(0, 8) || "Q"}</span>
                      <span className="text-white">{a.answer}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-3">
              {selected.ai_generated_review && (
                <button onClick={() => handleCopy(selected.ai_generated_review!, selected.id)} className={`btn-primary flex-1 py-2.5 text-white text-sm font-medium rounded-lg ${copiedId === selected.id ? "copy-success" : ""}`}>
                  {copiedId === selected.id ? "\u2713 Copied!" : "Copy Review"}
                </button>
              )}
              <button onClick={() => setSelected(null)} className="btn-ghost flex-1 py-2.5 text-white text-sm font-medium rounded-lg">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </BusinessShell>
  );
}
