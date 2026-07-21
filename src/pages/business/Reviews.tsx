import { useEffect, useState, useMemo, useCallback } from "react";
import BusinessShell from "./BusinessShell";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { SkeletonList, SkeletonCard } from "../../components/Skeleton";
import { EmptyState, ErrorState } from "../../components/States";
import { StatTile, RatingDistribution, Sparkline } from "../../components/StatTile";
import { InfoDot } from "../../components/Tooltip";
import { formatDateTime, timeAgo } from "../../lib/utils";
import { insertAuditLog } from "../../lib/auth";
import {
  fetchReviewIntelligence,
  updateReviewResponse,
  type ReviewInsights,
} from "../../lib/review-intelligence";
import type { ReviewSession } from "../../lib/types";

type SortMode = "newest" | "oldest" | "highest" | "lowest";
type SentimentFilter = "all" | "positive" | "neutral" | "negative" | "needs-attention" | "responded" | "unresponded";

function sentimentForRating(rating: number): "positive" | "neutral" | "negative" {
  if (rating >= 4) return "positive";
  if (rating === 3) return "neutral";
  return "negative";
}

function sentimentMeta(s: "positive" | "neutral" | "negative") {
  if (s === "positive") return { label: "Positive", color: "text-success-400", bg: "bg-success-500/15", dot: "bg-success-400" };
  if (s === "neutral") return { label: "Neutral", color: "text-warning-400", bg: "bg-warning-500/15", dot: "bg-warning-400" };
  return { label: "Negative", color: "text-error-400", bg: "bg-error-500/15", dot: "bg-error-400" };
}

export default function BusinessReviews() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<ReviewSession[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [sentimentFilter, setSentimentFilter] = useState<SentimentFilter>("all");
  const [dateFilter, setDateFilter] = useState<"all" | "7d" | "30d" | "90d">("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");

  const [selected, setSelected] = useState<ReviewSession | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [insights, setInsights] = useState<ReviewInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [showInsights, setShowInsights] = useState(false);

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
      if (!link?.business_id) { setReviews([]); setLoading(false); return; }
      setBusinessId(link.business_id);

      const { data: codes, error: qrErr } = await supabase
        .from("review_sessions")
        .select("*")
        .eq("business_id", link.business_id)
        .order("created_at", { ascending: false });
      if (qrErr) throw qrErr;
      setReviews((codes || []) as ReviewSession[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    if (!reviews) return null;
    const ratings = reviews.map((r) => r.rating);
    const avg = ratings.length > 0 ? ratings.reduce((s, r) => s + r, 0) / ratings.length : 0;
    const positive = reviews.filter((r) => r.rating >= 4).length;
    const neutral = reviews.filter((r) => r.rating === 3).length;
    const negative = reviews.filter((r) => r.rating <= 2).length;
    const responded = reviews.filter((r) => r.business_response && r.business_response.trim()).length;
    const unresponded = reviews.length - responded;
    const needsAttention = reviews.filter((r) => r.rating <= 3 && !r.business_response).length;

    const dailyCounts: number[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      dailyCounts.push(reviews.filter((r) => r.created_at.slice(0, 10) === ds).length);
    }

    const last7 = reviews.filter((r) => new Date(r.created_at) > new Date(Date.now() - 7 * 86400000)).length;
    const prev7 = reviews.filter((r) => {
      const d = new Date(r.created_at);
      return d <= new Date(Date.now() - 7 * 86400000) && d > new Date(Date.now() - 14 * 86400000);
    }).length;
    const trend = prev7 > 0 ? ((last7 - prev7) / prev7) * 100 : last7 > 0 ? 100 : 0;

    return { ratings, avg, positive, neutral, negative, responded, unresponded, needsAttention, dailyCounts, last7, trend };
  }, [reviews]);

  const filtered = useMemo(() => {
    if (!reviews) return null;
    let result = [...reviews];

    if (ratingFilter !== null) result = result.filter((r) => r.rating === ratingFilter);

    if (sentimentFilter !== "all") {
      if (sentimentFilter === "positive") result = result.filter((r) => r.rating >= 4);
      else if (sentimentFilter === "neutral") result = result.filter((r) => r.rating === 3);
      else if (sentimentFilter === "negative") result = result.filter((r) => r.rating <= 2);
      else if (sentimentFilter === "needs-attention") result = result.filter((r) => r.rating <= 3 && !r.business_response);
      else if (sentimentFilter === "responded") result = result.filter((r) => r.business_response && r.business_response.trim());
      else if (sentimentFilter === "unresponded") result = result.filter((r) => !r.business_response || !r.business_response.trim());
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((r) =>
        (r.ai_generated_review || "").toLowerCase().includes(q) ||
        (r.business_response || "").toLowerCase().includes(q),
      );
    }

    if (dateFilter !== "all") {
      const days = dateFilter === "7d" ? 7 : dateFilter === "30d" ? 30 : 90;
      const cutoff = new Date(Date.now() - days * 86400000);
      result = result.filter((r) => new Date(r.created_at) >= cutoff);
    }

    switch (sortMode) {
      case "newest": result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); break;
      case "oldest": result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); break;
      case "highest": result.sort((a, b) => b.rating - a.rating); break;
      case "lowest": result.sort((a, b) => a.rating - b.rating); break;
    }

    return result;
  }, [reviews, ratingFilter, sentimentFilter, search, dateFilter, sortMode]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast("Review copied to clipboard", "success");
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleResponseSubmit = async (reviewId: string, response: string) => {
    const { error: respError } = await updateReviewResponse(reviewId, response);
    if (respError) {
      showToast("Failed to save response", "error");
      return;
    }
    if (profile) {
      await insertAuditLog({
        actor_id: profile.id,
        actor_email: profile.email,
        action: "review_response_submitted",
        target_type: "review_session",
        target_id: reviewId,
      });
    }
    showToast("Response saved successfully", "success");
    setReviews((prev) =>
      prev ? prev.map((r) =>
        r.id === reviewId
          ? { ...r, business_response: response.trim() || null, business_response_at: response.trim() ? new Date().toISOString() : null }
          : r,
      ) : prev,
    );
    setSelected((prev) =>
      prev && prev.id === reviewId
        ? { ...prev, business_response: response.trim() || null, business_response_at: response.trim() ? new Date().toISOString() : null }
        : prev,
    );
  };

  const handleAnalyze = async () => {
    if (!businessId || !reviews || reviews.length === 0) return;
    setInsightsLoading(true);
    setInsightsError(null);
    setShowInsights(true);
    const result = await fetchReviewIntelligence(businessId, reviews);
    if (result.error) {
      setInsightsError(result.error);
      setInsights(null);
    } else if (result.insights) {
      setInsights(result.insights);
    } else {
      setInsightsError(result.message || "No insights available for current reviews.");
    }
    setInsightsLoading(false);
  };

  if (loading) return (
    <BusinessShell title="Reviews">
      <div className="p-4 md:p-8 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonCard className="!min-h-[100px]" />
          <SkeletonCard className="!min-h-[100px]" />
          <SkeletonCard className="!min-h-[100px]" />
          <SkeletonCard className="!min-h-[100px]" />
        </div>
        <SkeletonList items={4} />
      </div>
    </BusinessShell>
  );

  if (error) return (
    <BusinessShell title="Reviews">
      <div className="p-4 md:p-8"><ErrorState message={error} onRetry={load} /></div>
    </BusinessShell>
  );

  if (!reviews || reviews.length === 0) return (
    <BusinessShell title="Reviews">
      <div className="p-4 md:p-8 page-enter">
        <EmptyState
          title="No reviews yet"
          subtitle="Once customers start leaving feedback, you'll see them here with intelligent insights, sentiment analysis, and response tools."
        />
      </div>
    </BusinessShell>
  );

  return (
    <BusinessShell title="Reviews">
      <div className="p-4 md:p-8 space-y-6 page-enter">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-up">
          <div>
            <h2 className="text-xl font-bold text-white">Review Intelligence</h2>
            <p className="text-sm text-slate-400 mt-1">Understand what your customers are saying and take action.</p>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={insightsLoading}
            className="btn-primary px-5 py-2.5 text-white text-sm font-medium rounded-xl whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {insightsLoading ? "Analyzing..." : "✨ Generate AI Insights"}
          </button>
        </div>

        {/* Overview stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-tile-3d">
            <div className="relative">
              <StatTile label="Total Reviews" value={reviews.length} icon="⭐" accent="primary" delay={0} />
              <div className="absolute top-2 right-2"><InfoDot content="All customer reviews collected through your ReviewFlow" /></div>
            </div>
          </div>
          <div className="stat-tile-3d">
            <StatTile label="Avg Rating" value={stats!.avg} icon="📊" accent="accent" delay={80} hint={`${stats!.avg.toFixed(1)} out of 5`} />
          </div>
          <div className="stat-tile-3d">
            <div className="relative">
              <StatTile label="Needs Attention" value={stats!.needsAttention} icon="⚠️" accent="error" delay={160} hint="Low ratings without a response" />
              <div className="absolute top-2 right-2"><InfoDot content="Reviews rated 3 stars or below that haven't been responded to yet" /></div>
            </div>
          </div>
          <div className="stat-tile-3d">
            <StatTile label="Responded" value={stats!.responded} icon="💬" accent="success" delay={240} hint={`${Math.round((stats!.responded / reviews.length) * 100)}% of reviews`} />
          </div>
        </div>

        {/* Trend + sentiment row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trend sparkline */}
          <div className="glass rounded-2xl p-6 animate-fade-up" style={{ animationDelay: "300ms" }}>
            <h3 className="text-sm font-medium text-slate-400 mb-4">Review Activity</h3>
            <p className="text-3xl font-bold text-white mb-1">{stats!.last7} <span className="text-sm font-normal text-slate-500">this week</span></p>
            {stats!.trend !== 0 && (
              <p className={`text-xs mb-3 ${stats!.trend > 0 ? "text-success-400" : "text-error-400"}`}>
                {stats!.trend > 0 ? "↑" : "↓"} {Math.abs(Math.round(stats!.trend))}% vs last week
              </p>
            )}
            <Sparkline data={stats!.dailyCounts} />
            <div className="flex justify-between text-xs text-slate-600 mt-2">
              <span>14 days ago</span>
              <span>Today</span>
            </div>
          </div>

          {/* Sentiment breakdown */}
          <div className="glass rounded-2xl p-6 animate-fade-up" style={{ animationDelay: "360ms" }}>
            <h3 className="text-sm font-medium text-slate-400 mb-4">Sentiment</h3>
            <div className="space-y-3">
              <SentimentBar label="Positive" count={stats!.positive} total={reviews.length} color="success" />
              <SentimentBar label="Neutral" count={stats!.neutral} total={reviews.length} color="warning" />
              <SentimentBar label="Negative" count={stats!.negative} total={reviews.length} color="error" />
            </div>
          </div>

          {/* Rating distribution */}
          <div className="glass rounded-2xl p-6 animate-fade-up" style={{ animationDelay: "420ms" }}>
            <h3 className="text-sm font-medium text-slate-400 mb-4">Rating Distribution</h3>
            <RatingDistribution ratings={stats!.ratings} />
          </div>
        </div>

        {/* AI Insights panel */}
        {showInsights && (
          <InsightsPanel
            insights={insights}
            loading={insightsLoading}
            error={insightsError}
            onClose={() => setShowInsights(false)}
          />
        )}

        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-3 animate-fade-up" style={{ animationDelay: "480ms" }}>
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none"
              placeholder="Search reviews and responses..."
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
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="input-field px-3 py-2.5 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="highest">Highest rated</option>
            <option value="lowest">Lowest rated</option>
          </select>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 flex-wrap animate-fade-up" style={{ animationDelay: "540ms" }}>
          <FilterPill active={sentimentFilter === "all"} onClick={() => { setSentimentFilter("all"); setRatingFilter(null); }} label="All" />
          {[
            { key: "positive" as const, label: "Positive", count: stats!.positive },
            { key: "neutral" as const, label: "Neutral", count: stats!.neutral },
            { key: "negative" as const, label: "Negative", count: stats!.negative },
            { key: "needs-attention" as const, label: "Needs Attention", count: stats!.needsAttention },
            { key: "unresponded" as const, label: "Unresponded", count: stats!.unresponded },
            { key: "responded" as const, label: "Responded", count: stats!.responded },
          ].map((f) => (
            <FilterPill
              key={f.key}
              active={sentimentFilter === f.key}
              onClick={() => { setSentimentFilter(f.key); setRatingFilter(null); }}
              label={`${f.label}${f.count !== undefined ? ` (${f.count})` : ""}`}
            />
          ))}
          <div className="w-px h-8 bg-white/10 mx-1 hidden sm:block" />
          {[5, 4, 3, 2, 1].map((s) => (
            <button
              key={s}
              onClick={() => { setRatingFilter(ratingFilter === s ? null : s); setSentimentFilter("all"); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${ratingFilter === s ? "btn-primary text-white" : "btn-ghost text-slate-300"}`}
            >
              {s} ⭐
            </button>
          ))}
        </div>

        {/* Results count */}
        <p className="text-xs text-slate-500">{filtered!.length} review{filtered!.length !== 1 ? "s" : ""}</p>

        {/* Review feed */}
        {filtered!.length === 0 ? (
          <EmptyState title="No reviews match" subtitle="Try adjusting your filters or search terms." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered!.map((r, i) => (
              <ReviewCard
                key={r.id}
                review={r}
                delay={i * 40}
                copied={copiedId === r.id}
                onCopy={() => r.ai_generated_review && handleCopy(r.ai_generated_review, r.id)}
                onOpen={() => setSelected(r)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <ReviewDetailPanel
          review={selected}
          copied={copiedId === selected.id}
          onCopy={() => selected.ai_generated_review && handleCopy(selected.ai_generated_review, selected.id)}
          onClose={() => setSelected(null)}
          onResponse={handleResponseSubmit}
        />
      )}
    </BusinessShell>
  );
}

function SentimentBar({ label, count, total, color }: { label: string; count: number; total: number; color: "success" | "warning" | "error" }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  const colorMap = {
    success: "from-success-600 to-success-400",
    warning: "from-warning-600 to-warning-400",
    error: "from-error-600 to-error-400",
  };
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-300">{label}</span>
        <span className="text-white tabular-nums">{count} ({Math.round(pct)}%)</span>
      </div>
      <div className="h-3 rounded-full bg-white/5 overflow-hidden">
        <div className={`h-full bg-gradient-to-r ${colorMap[color]} transition-all duration-700 ease-out`} style={{ width: `${pct}%` }} />
      </div>
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

function ReviewCard({ review, delay, copied, onCopy, onOpen }: {
  review: ReviewSession;
  delay: number;
  copied: boolean;
  onCopy: () => void;
  onOpen: () => void;
}) {
  const sentiment = sentimentForRating(review.rating);
  const sm = sentimentMeta(sentiment);
  const hasResponse = !!(review.business_response && review.business_response.trim());

  return (
    <div
      className="glass rounded-2xl p-5 card-hover cursor-pointer animate-fade-up flex flex-col"
      style={{ animationDelay: `${delay}ms` }}
      onClick={onOpen}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="text-xl">{"⭐".repeat(review.rating)}</div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sm.bg} ${sm.color}`}>
            {sm.label}
          </span>
        </div>
      </div>

      {/* Review text */}
      {review.ai_generated_review ? (
        <p className="text-slate-200 text-sm leading-relaxed line-clamp-3 flex-1">{review.ai_generated_review}</p>
      ) : (
        <p className="text-slate-500 text-sm italic flex-1">Rating only — no AI review generated</p>
      )}

      {/* Response indicator */}
      {hasResponse && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-success-400">
          <span className="w-1.5 h-1.5 rounded-full bg-success-400" />
          Responded {review.business_response_at ? timeAgo(review.business_response_at) : ""}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
        <p className="text-xs text-slate-600">{timeAgo(review.created_at)}</p>
        {review.ai_generated_review && (
          <button
            onClick={(e) => { e.stopPropagation(); onCopy(); }}
            className={`text-xs text-primary-400 hover:text-primary-300 transition-colors ${copied ? "copy-success text-success-400" : ""}`}
          >
            {copied ? "✓ Copied" : "Copy"}
          </button>
        )}
      </div>
    </div>
  );
}

function ReviewDetailPanel({ review, copied, onCopy, onClose, onResponse }: {
  review: ReviewSession;
  copied: boolean;
  onCopy: () => void;
  onClose: () => void;
  onResponse: (reviewId: string, response: string) => Promise<void>;
}) {
  const sentiment = sentimentForRating(review.rating);
  const sm = sentimentMeta(sentiment);
  const [responseText, setResponseText] = useState(review.business_response || "");
  const [saving, setSaving] = useState(false);
  const [showResponseEditor, setShowResponseEditor] = useState(false);

  const hasResponse = !!(review.business_response && review.business_response.trim());

  const handleSubmitResponse = async () => {
    if (!responseText.trim()) return;
    setSaving(true);
    await onResponse(review.id, responseText);
    setSaving(false);
    setShowResponseEditor(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
      <div
        className="glass-strong rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto page-enter"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="text-2xl mb-1">{"⭐".repeat(review.rating)}</div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sm.bg} ${sm.color}`}>
                {sm.label}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${review.ai_status === "completed" ? "bg-success-500/15 text-success-400" : "bg-warning-500/15 text-warning-400"}`}>
                {review.ai_status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">{formatDateTime(review.created_at)}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Review content */}
        {review.ai_generated_review && (
          <div className="bg-slate-900/50 rounded-xl p-4 mb-5 border border-white/5">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Customer Review</p>
            <p className="text-slate-200 text-sm leading-relaxed">{review.ai_generated_review}</p>
          </div>
        )}

        {/* Customer answers */}
        {review.answers && Array.isArray(review.answers) && (review.answers as unknown[]).length > 0 && (
          <div className="mb-5">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Customer Answers</p>
            <div className="space-y-1.5">
              {(review.answers as Array<{ question?: string; question_id?: string; answer: string }>).map((a, i) => (
                <div key={i} className="flex justify-between text-sm bg-slate-900/30 rounded-lg px-3 py-2">
                  <span className="text-slate-400">{a.question || a.question_id?.slice(0, 8) || `Question ${i + 1}`}</span>
                  <span className="text-white font-medium">{a.answer}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Business response section */}
        <div className="mb-5">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Your Response</p>
          {hasResponse && !showResponseEditor ? (
            <div className="bg-primary-500/10 rounded-xl p-4 border border-primary-500/20">
              <p className="text-slate-200 text-sm leading-relaxed">{review.business_response}</p>
              {review.business_response_at && (
                <p className="text-xs text-slate-500 mt-2">Responded {formatDateTime(review.business_response_at)}</p>
              )}
              <button
                onClick={() => { setResponseText(review.business_response || ""); setShowResponseEditor(true); }}
                className="text-xs text-primary-400 hover:text-primary-300 transition-colors mt-3"
              >
                Edit response
              </button>
            </div>
          ) : showResponseEditor || !hasResponse ? (
            <div className="space-y-3">
              <textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Write a thoughtful response to this customer..."
                className="input-field w-full min-h-[100px] p-3 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none resize-none"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSubmitResponse}
                  disabled={saving || !responseText.trim()}
                  className="btn-primary flex-1 py-2.5 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving..." : hasResponse ? "Update Response" : "Post Response"}
                </button>
                {showResponseEditor && (
                  <button
                    onClick={() => setShowResponseEditor(false)}
                    className="btn-ghost px-4 py-2.5 text-white text-sm font-medium rounded-lg"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {review.ai_generated_review && (
            <button
              onClick={onCopy}
              className={`btn-primary flex-1 py-2.5 text-white text-sm font-medium rounded-lg ${copied ? "copy-success" : ""}`}
            >
              {copied ? "✓ Copied!" : "Copy Review"}
            </button>
          )}
          <button onClick={onClose} className="btn-ghost flex-1 py-2.5 text-white text-sm font-medium rounded-lg">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function InsightsPanel({ insights, loading, error, onClose }: {
  insights: ReviewInsights | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  return (
    <div className="glass-strong rounded-2xl p-6 animate-fade-up" style={{ animationDelay: "120ms" }}>
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="text-xl">✨</span>
          <div>
            <h3 className="text-base font-bold text-white">AI Review Intelligence</h3>
            <p className="text-xs text-slate-500">Generated from your actual customer reviews</p>
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
        <div className="py-8">
          <ErrorState message={error} />
        </div>
      )}

      {insights && !loading && !error && (
        <div className="space-y-5">
          {/* Sentiment summary */}
          {insights.sentimentSummary && (
            <div className="bg-slate-900/50 rounded-xl p-4 border border-white/5">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Overall Sentiment</p>
              <p className="text-slate-200 text-sm leading-relaxed">{insights.sentimentSummary}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* What customers love */}
            {insights.whatCustomersLove && insights.whatCustomersLove.length > 0 && (
              <InsightSection title="What Customers Love" icon="💚" items={insights.whatCustomersLove} accent="success" />
            )}
            {/* Common complaints */}
            {insights.commonComplaints && insights.commonComplaints.length > 0 && (
              <InsightSection title="Common Complaints" icon="⚠️" items={insights.commonComplaints} accent="error" />
            )}
            {/* Recurring themes */}
            {insights.recurringThemes && insights.recurringThemes.length > 0 && (
              <InsightSection title="Recurring Themes" icon="🔄" items={insights.recurringThemes} accent="primary" />
            )}
            {/* Priority areas */}
            {insights.priorityAreas && insights.priorityAreas.length > 0 && (
              <InsightSection title="Priority Areas" icon="🎯" items={insights.priorityAreas} accent="warning" />
            )}
            {/* Emerging issues */}
            {insights.emergingIssues && insights.emergingIssues.length > 0 && (
              <InsightSection title="Emerging Issues" icon="📈" items={insights.emergingIssues} accent="error" />
            )}
            {/* Positive trends */}
            {insights.positiveTrends && insights.positiveTrends.length > 0 && (
              <InsightSection title="Positive Trends" icon="✨" items={insights.positiveTrends} accent="success" />
            )}
          </div>

          {/* Suggested actions */}
          {insights.suggestedActions && insights.suggestedActions.length > 0 && (
            <div className="bg-primary-500/10 rounded-xl p-4 border border-primary-500/20">
              <p className="text-xs text-primary-400 uppercase tracking-wide mb-3 font-medium">Suggested Actions</p>
              <div className="space-y-2">
                {insights.suggestedActions.map((action, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-primary-400 text-sm shrink-0 mt-0.5">{i + 1}.</span>
                    <p className="text-slate-200 text-sm leading-relaxed">{action}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InsightSection({ title, icon, items, accent }: {
  title: string;
  icon: string;
  items: string[];
  accent: "success" | "error" | "primary" | "warning";
}) {
  const accentMap = {
    success: "text-success-400",
    error: "text-error-400",
    primary: "text-primary-400",
    warning: "text-warning-400",
  };
  return (
    <div className="bg-slate-900/40 rounded-xl p-4 border border-white/5">
      <p className={`text-xs uppercase tracking-wide mb-3 font-medium ${accentMap[accent]}`}>
        {icon} {title}
      </p>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${accent === "success" ? "bg-success-400" : accent === "error" ? "bg-error-400" : accent === "warning" ? "bg-warning-400" : "bg-primary-400"}`} />
            <p className="text-slate-300 text-sm leading-relaxed">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
