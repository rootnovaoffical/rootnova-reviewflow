import { useEffect, useState, useMemo } from "react";
import BusinessShell from "./BusinessShell";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { Loading, EmptyState } from "../../components/States";
import { StatTile, RatingDistribution, Sparkline } from "../../components/StatTile";
import type { ReviewSession, AnalyticsEvent } from "../../lib/types";

export default function BusinessAnalytics() {
  const { profile } = useAuth();
  const [reviews, setReviews] = useState<ReviewSession[]>([]);
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    supabase.from("business_admins").select("business_id").eq("user_id", profile.id).maybeSingle()
      .then(({ data }) => {
        if (!data?.business_id) { setLoading(false); return; }
        Promise.all([
          supabase.from("review_sessions").select("*").eq("business_id", data.business_id).order("created_at", { ascending: false }).limit(500),
          supabase.from("analytics_events").select("*").eq("business_id", data.business_id).order("created_at", { ascending: false }).limit(500),
        ]).then(([r, e]) => {
          setReviews((r.data || []) as ReviewSession[]);
          setEvents((e.data || []) as AnalyticsEvent[]);
          setLoading(false);
        });
      });
  }, [profile]);

  const stats = useMemo(() => {
    const ratings = reviews.map((r) => r.rating);
    const avg = ratings.length > 0 ? ratings.reduce((s, r) => s + r, 0) / ratings.length : 0;
    const positive = ratings.filter((r) => r >= 4).length;
    const negative = ratings.filter((r) => r <= 2).length;
    const aiGenerated = reviews.filter((r) => r.ai_generated_review && r.ai_status === "completed").length;

    // Daily review counts for last 30 days
    const dailyReviews: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      dailyReviews.push({ date: ds, count: reviews.filter((r) => r.created_at.slice(0, 10) === ds).length });
    }

    // Event type counts
    const eventCounts: Record<string, number> = {};
    events.forEach((e) => { eventCounts[e.event_type] = (eventCounts[e.event_type] || 0) + 1; });

    // Positive vs negative trend (last 7 days vs previous 7 days)
    const last7 = reviews.filter((r) => new Date(r.created_at) > new Date(Date.now() - 7 * 86400000));
    const prev7 = reviews.filter((r) => {
      const d = new Date(r.created_at);
      return d <= new Date(Date.now() - 7 * 86400000) && d > new Date(Date.now() - 14 * 86400000);
    });
    const last7Pos = last7.filter((r) => r.rating >= 4).length;
    const prev7Pos = prev7.filter((r) => r.rating >= 4).length;
    const trend = prev7Pos > 0 ? ((last7Pos - prev7Pos) / prev7Pos) * 100 : last7Pos > 0 ? 100 : 0;

    return { ratings, avg, positive, negative, aiGenerated, dailyReviews, eventCounts, trend, last7Count: last7.length };
  }, [reviews, events]);

  if (loading) return <BusinessShell title="Analytics"><Loading /></BusinessShell>;

  const hasData = reviews.length > 0 || events.length > 0;

  return (
    <BusinessShell title="Analytics">
      <div className="p-4 md:p-8 space-y-6 page-enter">
        {!hasData ? (
          <EmptyState
            title="No analytics yet"
            subtitle="Once customers start using your ReviewFlow, you'll see ratings, trends, and activity here."
          />
        ) : (
          <>
            {/* Key metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatTile label="Total Reviews" value={reviews.length} icon={"\u2B50"} accent="primary" delay={0} />
              <StatTile label="Average Rating" value={stats.avg} icon={"\uD83D\uDCCA"} accent="accent" delay={80} />
              <StatTile label="Positive (4-5)" value={stats.positive} icon={"\u2705"} accent="success" delay={160} hint={`${reviews.length > 0 ? Math.round((stats.positive / reviews.length) * 100) : 0}% of total`} />
              <StatTile label="AI Generated" value={stats.aiGenerated} icon={"\u2728"} accent="warning" delay={240} hint="Reviews written by AI" />
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Rating distribution */}
              <div className="glass rounded-2xl p-6 animate-fade-up" style={{ animationDelay: "300ms" }}>
                <h3 className="text-sm font-medium text-slate-400 mb-4">Rating Distribution</h3>
                {stats.ratings.length === 0 ? (
                  <p className="text-sm text-slate-500 py-8 text-center">No ratings yet.</p>
                ) : (
                  <RatingDistribution ratings={stats.ratings} />
                )}
              </div>

              {/* Reviews over time */}
              <div className="glass rounded-2xl p-6 animate-fade-up" style={{ animationDelay: "360ms" }}>
                <h3 className="text-sm font-medium text-slate-400 mb-4">Reviews Over Time</h3>
                <p className="text-3xl font-bold text-white mb-2">{stats.last7Count} <span className="text-sm font-normal text-slate-500">this week</span></p>
                {stats.trend !== 0 && (
                  <p className={`text-xs mb-3 ${stats.trend > 0 ? "text-success-400" : "text-error-400"}`}>
                    {stats.trend > 0 ? "\u2191" : "\u2193"} {Math.abs(Math.round(stats.trend))}% vs last week
                  </p>
                )}
                <Sparkline data={stats.dailyReviews.map((d) => d.count)} height={64} />
                <div className="flex justify-between text-xs text-slate-600 mt-2">
                  <span>30 days ago</span>
                  <span>Today</span>
                </div>
              </div>
            </div>

            {/* Event activity */}
            <div className="glass rounded-2xl p-6 animate-fade-up" style={{ animationDelay: "420ms" }}>
              <h3 className="text-sm font-medium text-slate-400 mb-4">Customer Activity</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {[
                  { key: "page_view", label: "Page Views", icon: "\uD83D\uDC41" },
                  { key: "review_start", label: "Started", icon: "\uD83D\uDE80" },
                  { key: "rating_submitted", label: "Ratings", icon: "\u2B50" },
                  { key: "questions_submitted", label: "Questions", icon: "\u2753" },
                  { key: "ai_completion", label: "AI Reviews", icon: "\u2728" },
                  { key: "copy_event", label: "Copied", icon: "\uD83D\uDCCB" },
                  { key: "google_click", label: "Google", icon: "\uD83D\uDD17" },
                ].map((e) => (
                  <div key={e.key} className="bg-slate-900/40 rounded-xl p-3 border border-white/5">
                    <div className="text-lg mb-1">{e.icon}</div>
                    <p className="text-2xl font-bold text-white tabular-nums">{stats.eventCounts[e.key] || 0}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{e.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Positive vs negative trend */}
            <div className="glass rounded-2xl p-6 animate-fade-up" style={{ animationDelay: "480ms" }}>
              <h3 className="text-sm font-medium text-slate-400 mb-4">Sentiment Breakdown</h3>
              {reviews.length > 0 ? (
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-success-400">Positive (4-5 stars)</span>
                      <span className="text-white">{stats.positive} ({Math.round((stats.positive / reviews.length) * 100)}%)</span>
                    </div>
                    <div className="h-3 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-success-600 to-success-400 transition-all duration-700" style={{ width: `${(stats.positive / reviews.length) * 100}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-warning-400">Neutral (3 stars)</span>
                      <span className="text-white">{reviews.filter((r) => r.rating === 3).length} ({Math.round((reviews.filter((r) => r.rating === 3).length / reviews.length) * 100)}%)</span>
                    </div>
                    <div className="h-3 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-warning-600 to-warning-400 transition-all duration-700" style={{ width: `${(reviews.filter((r) => r.rating === 3).length / reviews.length) * 100}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-error-400">Negative (1-2 stars)</span>
                      <span className="text-white">{stats.negative} ({Math.round((stats.negative / reviews.length) * 100)}%)</span>
                    </div>
                    <div className="h-3 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-error-600 to-error-400 transition-all duration-700" style={{ width: `${(stats.negative / reviews.length) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500 py-4 text-center">No sentiment data yet.</p>
              )}
            </div>
          </>
        )}
      </div>
    </BusinessShell>
  );
}
