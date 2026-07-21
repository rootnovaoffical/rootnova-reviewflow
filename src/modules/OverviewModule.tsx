import { useEffect, useState } from "react";
import { Star, MessageSquare, Eye, Sparkles, TrendingUp } from "lucide-react";
import { supabase } from "../lib/supabase";
import type { ReviewSession } from "../lib/types";

export default function OverviewModule({ businessId, businessName }: { businessId: string; businessName: string }) {
  const [stats, setStats] = useState({ totalReviews: 0, avgRating: 0, totalViews: 0, totalCompletions: 0, ratingDist: [0,0,0,0,0], recentReviews: [] as ReviewSession[] });
  useEffect(() => {
    const load = async () => {
      try {
        const { data: reviews } = await supabase.from("review_sessions").select("*").eq("business_id", businessId).order("created_at", { ascending: false }).limit(100);
        const { count: views } = await supabase.from("analytics_events").select("*", { count: "exact", head: true }).eq("business_id", businessId).eq("event_type", "page_view");
        const { count: completions } = await supabase.from("analytics_events").select("*", { count: "exact", head: true }).eq("business_id", businessId).eq("event_type", "ai_completion");
        const all = (reviews || []) as ReviewSession[];
        const dist = [0,0,0,0,0]; all.forEach(r => { if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++; });
        setStats({ totalReviews: all.length, avgRating: all.length > 0 ? all.reduce((s, r) => s + r.rating, 0) / all.length : 0, totalViews: views || 0, totalCompletions: completions || 0, ratingDist: dist, recentReviews: all.slice(0, 10) });
      } catch {}
    };
    load();
  }, [businessId]);
  const maxDist = Math.max(...stats.ratingDist, 1);
  return (
    <div className="space-y-6 screen-enter">
      <div><h1 className="text-xl font-bold text-white">Dashboard Overview</h1><p className="text-sm text-slate-400">Real-time analytics for {businessName}</p></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: <Star className="w-5 h-5" />, label: "Avg Rating", value: stats.avgRating.toFixed(1), color: "text-amber-400", bg: "bg-amber-500/10" },
          { icon: <MessageSquare className="w-5 h-5" />, label: "Total Reviews", value: String(stats.totalReviews), color: "text-primary-400", bg: "bg-primary-500/10" },
          { icon: <Eye className="w-5 h-5" />, label: "Page Views", value: String(stats.totalViews), color: "text-accent-400", bg: "bg-accent-500/10" },
          { icon: <Sparkles className="w-5 h-5" />, label: "AI Generated", value: String(stats.totalCompletions), color: "text-success-400", bg: "bg-success-500/10" },
        ].map(s => (
          <div key={s.label} className="stat-card glass-card rounded-2xl p-5"><div className="flex items-center justify-between mb-3"><div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center ${s.color}`}>{s.icon}</div></div><p className="text-2xl font-bold text-white">{s.value}</p><p className="text-xs text-slate-400 mt-1">{s.label}</p></div>
        ))}
      </div>
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary-400" /> Rating Distribution</h3>
        <div className="space-y-3">
          {stats.ratingDist.map((count, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-sm text-slate-400 w-12 flex items-center gap-1">{i + 1} <Star className="w-3 h-3 fill-amber-400 text-amber-400" /></span>
              <div className="flex-1 h-6 bg-slate-800/50 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${(count / maxDist) * 100}%`, background: ["#ef4444","#f97316","#eab308","#3b8266","#a855f7"][i] }} /></div>
              <span className="text-sm font-semibold text-white w-8 text-right">{count}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><MessageSquare className="w-5 h-5 text-primary-400" /> Recent Reviews</h3>
        {stats.recentReviews.length === 0 ? <p className="text-slate-500 text-sm py-8 text-center">No reviews yet.</p> : (
          <div className="space-y-3">{stats.recentReviews.slice(0, 5).map(r => (
            <div key={r.id} className="glass rounded-xl p-4 border border-white/5">
              <div className="flex items-start gap-3">
                <div className="flex items-center gap-1 shrink-0">{[1,2,3,4,5].map(s => <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? "fill-current" : ""}`} style={{ color: s <= r.rating ? ["#ef4444","#f97316","#eab308","#3b82f6","#a855f7"][r.rating-1] : "#334155" }} />)}</div>
                <div className="flex-1 min-w-0">
                  {r.ai_generated_review && <p className="text-sm text-slate-300 line-clamp-2">"{r.ai_generated_review}"</p>}
                  <div className="flex items-center gap-3 mt-1.5"><span className="text-xs text-slate-500">{new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span><span className={`text-xs px-2 py-0.5 rounded-full ${r.ai_status === "completed" ? "bg-success-500/15 text-success-400" : "bg-amber-500/15 text-amber-400"}`}>{r.ai_status}</span></div>
                </div>
              </div>
            </div>
          ))}</div>
        )}
      </div>
    </div>
  );
}
