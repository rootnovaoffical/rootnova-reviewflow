// ============================================================
// MODULE 14 — MOBILE REVIEWS
// Reuses Module 1 review logic
// ============================================================

import { useEffect, useState, useCallback } from "react";
import MobileShell from "../../components/MobileShell";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { cacheGet, cacheSet, enqueueAction } from "../../lib/mobile-offline";
import { timeAgo } from "../../lib/utils";
import { useToast } from "../../context/ToastContext";
import type { ReviewSession } from "../../lib/types";

type FilterType = "all" | "positive" | "negative" | "unreplied";

export default function MobileReviews() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [reviews, setReviews] = useState<ReviewSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const loadReviews = useCallback(async () => {
    if (!profile) return;
    const cacheKey = `mobile-reviews-${profile.id}`;
    const cached = cacheGet<ReviewSession[]>(cacheKey);
    if (cached) setReviews(cached);

    const { data: bizData } = await supabase
      .from("business_admins")
      .select("business_id")
      .eq("user_id", profile.id)
      .maybeSingle();
    if (!bizData?.business_id) { setLoading(false); return; }

    const { data } = await supabase
      .from("review_sessions")
      .select("*")
      .eq("business_id", bizData.business_id)
      .order("created_at", { ascending: false })
      .limit(100);

    const list = (data ?? []) as ReviewSession[];
    setReviews(list);
    cacheSet(cacheKey, list, 10);
    setLoading(false);
  }, [profile]);

  useEffect(() => { loadReviews(); }, [loadReviews]);

  const filtered = reviews.filter((r) => {
    switch (filter) {
      case "positive": return r.rating >= 4;
      case "negative": return r.rating <= 2;
      case "unreplied": return !r.business_response;
      default: return true;
    }
  });

  const submitReply = async (reviewId: string) => {
    if (!replyText.trim()) return;
    if (navigator.onLine) {
      const { error } = await supabase
        .from("review_sessions")
        .update({ business_response: replyText, business_response_at: new Date().toISOString() })
        .eq("id", reviewId);
      if (error) { showToast("Failed to send reply", "error"); return; }
      showToast("Reply sent", "success");
    } else {
      enqueueAction("review_reply", { reviewId, body: replyText });
      showToast("Reply queued — will sync when online", "success");
    }
    setReviews((prev) => prev.map((r) => r.id === reviewId ? { ...r, business_response: replyText } : r));
    setReplyingTo(null);
    setReplyText("");
  };

  if (loading) return <MobileShell title="Reviews">{skeleton()}</MobileShell>;

  return (
    <MobileShell title="Reviews">
      <div className="space-y-4 page-enter">
        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["all", "positive", "negative", "unreplied"] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filter === f ? "bg-primary-500/20 text-primary-300 border border-primary-500/30" : "bg-white/5 text-slate-400 border border-transparent"}`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Review count */}
        <p className="text-xs text-slate-500">{filtered.length} reviews</p>

        {/* Reviews list */}
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-4xl">⭐</span>
            <p className="text-sm text-slate-500 mt-2">No reviews found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r, i) => (
              <div key={r.id} className="glass rounded-2xl p-4 animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="flex items-start justify-between mb-2">
                  <span className="text-lg">{"⭐".repeat(r.rating)}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${r.ai_status === "completed" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>{r.ai_status}</span>
                </div>
                {r.ai_generated_review && <p className="text-sm text-slate-300 mb-2 line-clamp-3">{r.ai_generated_review}</p>}
                <p className="text-[10px] text-slate-600 mb-3">{timeAgo(r.created_at)}</p>

                {r.business_response ? (
                  <div className="bg-white/5 rounded-lg p-2.5 border-l-2 border-primary-500/30">
                    <p className="text-[10px] text-slate-500 mb-1">Your reply</p>
                    <p className="text-xs text-slate-300">{r.business_response}</p>
                  </div>
                ) : replyingTo === r.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your reply..."
                      rows={3}
                      className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-sm text-white placeholder-slate-600 focus:border-primary-500/50 focus:outline-none resize-none"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => submitReply(r.id)} className="btn-primary flex-1 py-2 text-white text-xs font-medium rounded-lg">Send</button>
                      <button onClick={() => { setReplyingTo(null); setReplyText(""); }} className="px-3 py-2 text-slate-400 text-xs rounded-lg bg-white/5">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => { setReplyingTo(r.id); setReplyText(""); }} className="text-xs text-primary-400 hover:text-primary-300">Reply →</button>
                )}
              </div>
            ))}
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
      {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 bg-white/5 rounded-2xl animate-pulse" />)}
    </div>
  );
}
