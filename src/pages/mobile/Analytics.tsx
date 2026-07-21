// ============================================================
// MODULE 14 — MOBILE ANALYTICS
// Reuses Module 12 analytics services
// ============================================================

import { useEffect, useState, useCallback } from "react";
import MobileShell from "../../components/MobileShell";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { cacheGet, cacheSet } from "../../lib/mobile-offline";
import { getDashboardMetrics, getRatingDistribution, getSentimentSplit, getSessionsOverTime } from "../../lib/analytics";
import type { DashboardMetrics, RatingDistribution, SentimentSplit, SessionsOverTimePoint } from "../../types";

export default function MobileAnalytics() {
  const { profile } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [dist, setDist] = useState<RatingDistribution[]>([]);
  const [sentiment, setSentiment] = useState<SentimentSplit | null>(null);
  const [trend, setTrend] = useState<SessionsOverTimePoint[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) return;
    const cacheKey = `mobile-analytics-${profile.id}`;
    const cached = cacheGet<typeof metrics>(cacheKey + "-metrics");
    if (cached) setMetrics(cached);

    const { data: bizData } = await supabase
      .from("business_admins")
      .select("business_id")
      .eq("user_id", profile.id)
      .maybeSingle();
    if (!bizData?.business_id) { setLoading(false); return; }

    const filters = { businessId: bizData.business_id };
    const [m, d, s, t] = await Promise.all([
      getDashboardMetrics(filters),
      getRatingDistribution(filters),
      getSentimentSplit(filters),
      getSessionsOverTime(filters, 14),
    ]);

    setMetrics(m); setDist(d); setSentiment(s); setTrend(t);
    cacheSet(cacheKey + "-metrics", m, 15);
    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <MobileShell title="Analytics" backTo="/mobile">{skeleton()}</MobileShell>;

  const maxTrend = Math.max(...trend.map((t) => t.count), 1);
  const totalSentiment = sentiment ? sentiment.positive + sentiment.neutral + sentiment.negative : 0;

  return (
    <MobileShell title="Analytics" backTo="/mobile">
      <div className="space-y-4 page-enter">
        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-3">
          <KpiCard label="Total Reviews" value={metrics?.totalSessions ?? 0} icon="⭐" />
          <KpiCard label="Avg Rating" value={(metrics?.averageRating ?? 0).toFixed(1)} icon="📊" />
          <KpiCard label="Last 30 Days" value={metrics?.sessionsLast30Days ?? 0} icon="📅" />
          <KpiCard label="AI Generated" value={metrics?.aiReviewsGenerated ?? 0} icon="✨" />
        </div>

        {/* Rating distribution */}
        <div className="glass rounded-2xl p-4 animate-fade-up" style={{ animationDelay: "120ms" }}>
          <h3 className="text-sm font-medium text-slate-300 mb-3">Rating Distribution</h3>
          {dist.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">No data yet.</p>
          ) : (
            <div className="space-y-2">
              {dist.map((d) => {
                const max = Math.max(...dist.map((x) => x.count), 1);
                return (
                  <div key={d.rating} className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 w-4">{d.rating}★</span>
                    <div className="flex-1 h-6 bg-slate-800 rounded-lg overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-lg transition-all duration-500" style={{ width: `${(d.count / max) * 100}%` }} />
                    </div>
                    <span className="text-xs text-slate-500 w-8 text-right">{d.count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sentiment split */}
        <div className="glass rounded-2xl p-4 animate-fade-up" style={{ animationDelay: "160ms" }}>
          <h3 className="text-sm font-medium text-slate-300 mb-3">Sentiment</h3>
          {totalSentiment === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">No data yet.</p>
          ) : (
            <div className="space-y-2">
              <SentimentBar label="Positive" count={sentiment?.positive ?? 0} total={totalSentiment} color="bg-emerald-500" />
              <SentimentBar label="Neutral" count={sentiment?.neutral ?? 0} total={totalSentiment} color="bg-slate-500" />
              <SentimentBar label="Negative" count={sentiment?.negative ?? 0} total={totalSentiment} color="bg-rose-500" />
            </div>
          )}
        </div>

        {/* Trend chart */}
        <div className="glass rounded-2xl p-4 animate-fade-up" style={{ animationDelay: "200ms" }}>
          <h3 className="text-sm font-medium text-slate-300 mb-3">14-Day Trend</h3>
          {trend.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">No data yet.</p>
          ) : (
            <div className="flex items-end gap-1 h-24">
              {trend.map((t, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end">
                  <div className="w-full bg-gradient-to-t from-primary-500/60 to-accent-500/60 rounded-t transition-all duration-300" style={{ height: `${(t.count / maxTrend) * 100}%`, minHeight: t.count > 0 ? "4px" : "0" }} />
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-between text-[10px] text-slate-600 mt-1">
            <span>14d ago</span>
            <span>Today</span>
          </div>
        </div>
      </div>
    </MobileShell>
  );
}

function KpiCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="glass rounded-xl p-3 animate-fade-up">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-400 uppercase">{label}</span>
        <span className="text-base opacity-50">{icon}</span>
      </div>
      <p className="text-xl font-bold text-white mt-1">{value}</p>
    </div>
  );
}

function SentimentBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-400 w-16">{label}</span>
      <div className="flex-1 h-5 bg-slate-800 rounded-lg overflow-hidden">
        <div className={`h-full ${color} rounded-lg transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-500 w-12 text-right">{count} ({Math.round(pct)}%)</span>
    </div>
  );
}

function skeleton() {
  return (
    <div className="space-y-3 pt-4">
      <div className="grid grid-cols-2 gap-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)}</div>
      <div className="h-32 bg-white/5 rounded-2xl animate-pulse" />
      <div className="h-32 bg-white/5 rounded-2xl animate-pulse" />
    </div>
  );
}
