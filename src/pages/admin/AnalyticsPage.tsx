// Analytics page — platform-wide for RootNova admin, own-business for Business admin.

import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { getMyBusiness, listBusinesses } from "../../lib/business";
import {
  getDashboardMetrics, getRatingDistribution, getSessionsOverTime,
  getSentimentSplit, getTopCategories, getEventCounts, getRecentEvents,
  type AnalyticsFilters,
} from "../../lib/analytics";
import { Card, StatCard, Loading, Select, Badge } from "../../components/ui";
import { AreaChart, BarChart, DonutChart, BarList } from "../../components/charts";
import { Star, Sparkles, MessageSquareText, Copy, ExternalLink, TrendingUp } from "lucide-react";
import type { Business, DashboardMetrics, RatingDistribution, SessionsOverTimePoint, SentimentSplit, CategoryCount } from "../../types";
import { formatDistanceToNow } from "date-fns";

export default function AnalyticsPage() {
  const { role } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [ratings, setRatings] = useState<RatingDistribution[]>([]);
  const [overTime, setOverTime] = useState<SessionsOverTimePoint[]>([]);
  const [sentiment, setSentiment] = useState<SentimentSplit | null>(null);
  const [topPositive, setTopPositive] = useState<CategoryCount[]>([]);
  const [topNegative, setTopNegative] = useState<CategoryCount[]>([]);
  const [eventCounts, setEventCounts] = useState<{ copied: number; googleClicked: number } | null>(null);
  const [recentEvents, setRecentEvents] = useState<unknown[]>([]);

  useEffect(() => {
    (async () => {
      try {
        if (role === "BUSINESS_ADMIN") {
          const biz = await getMyBusiness();
          if (biz) { setBusinesses([biz]); setSelectedId(biz.id); }
        } else {
          const list = await listBusinesses();
          setBusinesses(list);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [role]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const filters: AnalyticsFilters = selectedId ? { businessId: selectedId } : {};
      const [m, r, t, s, tp, tn, ec, ev] = await Promise.all([
        getDashboardMetrics(filters),
        getRatingDistribution(filters),
        getSessionsOverTime(filters, 30),
        getSentimentSplit(filters),
        getTopCategories(filters, "POSITIVE"),
        getTopCategories(filters, "NEGATIVE"),
        getEventCounts(filters),
        getRecentEvents(selectedId || null, 10),
      ]);
      setMetrics(m); setRatings(r); setOverTime(t); setSentiment(s);
      setTopPositive(tp); setTopNegative(tn); setEventCounts(ec); setRecentEvents(ev as unknown[]);
      setLoading(false);
    })();
  }, [selectedId]);

  if (loading) return <Loading label="Loading analytics..." />;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-slate-400">Track review collection and customer feedback.</p>
        </div>
        {role === "ROOTNOVA_ADMIN" && (
          <Select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="w-56">
            <option value="">All businesses</option>
            {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
        )}
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Sessions" value={metrics?.totalSessions ?? 0} icon={<MessageSquareText className="w-4 h-4" />} accent="indigo" />
        <StatCard label="Sessions (30d)" value={metrics?.sessionsLast30Days ?? 0} icon={<TrendingUp className="w-4 h-4" />} accent="sky" />
        <StatCard label="Avg rating" value={metrics?.averageRating?.toFixed(1) ?? "—"} icon={<Star className="w-4 h-4" />} accent="amber" />
        <StatCard label="AI reviews" value={metrics?.aiReviewsGenerated ?? 0} icon={<Sparkles className="w-4 h-4" />} accent="indigo" />
        <StatCard label="Copy clicks" value={eventCounts?.copied ?? 0} icon={<Copy className="w-4 h-4" />} accent="emerald" />
        <StatCard label="Google clicks" value={eventCounts?.googleClicked ?? 0} icon={<ExternalLink className="w-4 h-4" />} accent="rose" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4"><h2 className="font-semibold text-white">Sessions over time</h2><Badge color="blue">30 days</Badge></div>
          <AreaChart data={overTime} />
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold text-white mb-4">Sentiment</h2>
          {sentiment && <DonutChart data={[{ label: "Positive (4-5)", value: sentiment.positive, color: "#10b981" }, { label: "Neutral (3)", value: sentiment.neutral, color: "#f59e0b" }, { label: "Negative (1-2)", value: sentiment.negative, color: "#f43f5e" }]} />}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5"><h2 className="font-semibold text-white mb-4">Rating distribution</h2><BarChart data={ratings.map((r) => ({ label: `${r.rating}★`, value: r.count }))} /></Card>
        <Card className="p-5"><h2 className="font-semibold text-white mb-4">Top positive feedback</h2><BarList data={topPositive} color="#10b981" /></Card>
        <Card className="p-5"><h2 className="font-semibold text-white mb-4">Top improvement areas</h2><BarList data={topNegative} color="#f43f5e" /></Card>
      </div>

      <Card className="p-5">
        <h2 className="font-semibold text-white mb-4">Recent events</h2>
        {recentEvents.length === 0 ? <p className="text-sm text-slate-500 py-6 text-center">No events yet.</p> : (
          <div className="space-y-2.5">
            {(recentEvents as { id: string; event_type: string; created_at: string; businesses?: { name: string } | null }[]).map((e) => (
              <div key={e.id} className="flex items-center gap-3 text-sm">
                <span className="text-slate-300 font-medium">{e.event_type.replace(/_/g, " ").toLowerCase()}</span>
                {e.businesses?.name && <span className="text-slate-500 truncate">· {e.businesses.name}</span>}
                <span className="text-xs text-slate-500 ml-auto">{formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
