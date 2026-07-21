// ============================================================
// MODULE 14 — MOBILE DASHBOARD
// Reuses existing review/analytics services
// ============================================================

import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import MobileShell from "../../components/MobileShell";
import EnterpriseSwitcher from "../../components/EnterpriseSwitcher";
import { useAuth } from "../../context/AuthContext";
import { useMobile } from "../../context/MobileContext";
import { supabase } from "../../lib/supabase";
import { cacheGet, cacheSet, isLowBandwidthMode } from "../../lib/mobile-offline";
import { timeAgo } from "../../lib/utils";
import type { Business, ReviewSession } from "../../lib/types";

interface DashboardData {
  business: Business | null;
  reviews: ReviewSession[];
  avgRating: number;
  totalReviews: number;
  last7: number;
  aiGenerated: number;
  pendingActions: number;
  campaignPerformance: number;
  qrScans: number;
  loyaltySummary: number;
  businessHealth: number;
}

export default function MobileDashboard() {
  const { profile } = useAuth();
  const { isOnline } = useMobile();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async (force = false) => {
    if (!profile) return;
    const cacheKey = `mobile-dashboard-${profile.id}`;
    if (!force && !isOnline) {
      const cached = cacheGet<DashboardData>(cacheKey);
      if (cached) { setData(cached); setLoading(false); return; }
    }
    if (!force) {
      const cached = cacheGet<DashboardData>(cacheKey);
      if (cached && isOnline) { setData(cached); setLoading(false); }
    }

    const { data: bizData } = await supabase
      .from("business_admins")
      .select("business:businesses!business_id(*)")
      .eq("user_id", profile.id)
      .maybeSingle();

    const biz = (bizData as { business: Business } | null)?.business ?? null;
    if (!biz) { setLoading(false); return; }

    const [reviewsRes, actionsRes, campaignsRes, qrRes, loyaltyRes] = await Promise.all([
      supabase.from("review_sessions").select("*").eq("business_id", biz.id).order("created_at", { ascending: false }).limit(100),
      supabase.from("action_items").select("id", { count: "exact", head: true }).eq("business_id", biz.id).in("status", ["open", "in_progress"]),
      supabase.from("campaigns").select("response_count, reach_count").eq("business_id", biz.id).eq("status", "active"),
      supabase.from("qr_codes").select("scan_count").eq("business_id", biz.id).eq("is_active", true),
      supabase.from("customer_loyalty").select("id", { count: "exact", head: true }).eq("business_id", biz.id).eq("reward_unlocked", true),
    ]);

    const reviews = (reviewsRes.data ?? []) as ReviewSession[];
    const ratings = reviews.map((r) => r.rating);
    const avg = ratings.length > 0 ? ratings.reduce((s, r) => s + r, 0) / ratings.length : 0;
    const last7 = reviews.filter((r) => new Date(r.created_at) > new Date(Date.now() - 7 * 86400000)).length;
    const aiGen = reviews.filter((r) => r.ai_generated_review && r.ai_status === "completed").length;
    const totalScans = (qrRes.data ?? []).reduce((s, q) => s + (q.scan_count || 0), 0);
    const campaignPerf = (campaignsRes.data ?? []).reduce((s, c) => {
      const reach = c.reach_count || 0;
      return reach > 0 ? s + ((c.response_count || 0) / reach) * 100 : s;
    }, 0) / Math.max(1, (campaignsRes.data ?? []).length);

    const dashboardData: DashboardData = {
      business: biz,
      reviews,
      avgRating: avg,
      totalReviews: reviews.length,
      last7,
      aiGenerated: aiGen,
      pendingActions: actionsRes.count ?? 0,
      campaignPerformance: Math.round(campaignPerf),
      qrScans: totalScans,
      loyaltySummary: loyaltyRes.count ?? 0,
      businessHealth: Math.round((avg / 5) * 100),
    };

    setData(dashboardData);
    cacheSet(cacheKey, dashboardData, 15);
    setLoading(false);
  }, [profile, isOnline]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <MobileShell title="Dashboard">{loadingSkeleton()}</MobileShell>;

  if (!data?.business) return (
    <MobileShell title="Dashboard">
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🏪</span>
        </div>
        <p className="text-slate-400 text-sm mb-4">No business assigned yet.</p>
        <button onClick={() => navigate("/business/onboarding")} className="btn-primary px-6 py-2.5 text-white text-sm font-medium rounded-xl">Start Setup</button>
      </div>
    </MobileShell>
  );

  const recentReviews = data.reviews.slice(0, 5);

  return (
    <MobileShell title="Dashboard">
      <div className="space-y-4 page-enter">
        <EnterpriseSwitcher />

        {/* Business header */}
        <div className="flex items-center gap-3 animate-fade-up">
          {data.business.logo_url ? (
            <img src={data.business.logo_url} alt={data.business.name} className="w-12 h-12 rounded-xl object-cover border border-white/10" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-lg">{data.business.name[0]}</div>
          )}
          <div className="min-w-0">
            <h2 className="text-base font-bold text-white truncate">{data.business.name}</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${data.business.status === "active" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>{data.business.status}</span>
              {data.business.location_city && <span className="text-[10px] text-slate-500">{data.business.location_city}</span>}
            </div>
          </div>
        </div>

        {/* Health score */}
        <div className="glass rounded-2xl p-4 animate-fade-up" style={{ animationDelay: "80ms" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Business Health Score</span>
            <span className="text-2xl font-bold text-white">{data.businessHealth}<span className="text-sm text-slate-500">/100</span></span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all duration-500" style={{ width: `${data.businessHealth}%` }} />
          </div>
        </div>

        {/* Stat grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Total Reviews" value={data.totalReviews} icon="⭐" delay={160} />
          <StatCard label="Avg Rating" value={data.avgRating.toFixed(1)} icon="📊" delay={200} />
          <StatCard label="Last 7 Days" value={data.last7} icon="🚀" delay={240} />
          <StatCard label="AI Reviews" value={data.aiGenerated} icon="✨" delay={280} />
          <StatCard label="Pending Actions" value={data.pendingActions} icon="🎯" delay={320} />
          <StatCard label="QR Scans" value={data.qrScans} icon="📱" delay={360} />
          <StatCard label="Campaign Perf" value={`${data.campaignPerformance}%`} icon="📈" delay={400} />
          <StatCard label="Loyalty Unlocks" value={data.loyaltySummary} icon="🎁" delay={440} />
        </div>

        {/* AI Summary */}
        <div className="glass rounded-2xl p-4 animate-fade-up" style={{ animationDelay: "480ms" }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">🤖</span>
            <h3 className="text-sm font-medium text-slate-300">AI Summary</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            {data.avgRating >= 4.5 ? "Excellent performance — your customers are highly satisfied. Keep up the great work and focus on increasing review volume." :
             data.avgRating >= 3.5 ? "Good performance with room for improvement. Focus on responding to negative reviews and engaging at-risk customers." :
             "Performance needs attention. Prioritize review recovery, customer follow-up, and operational improvements."}
          </p>
          <button onClick={() => navigate("/mobile/ai")} className="text-xs text-primary-400 hover:text-primary-300 mt-2">View AI Insights →</button>
        </div>

        {/* Recent reviews */}
        <div className="glass rounded-2xl p-4 animate-fade-up" style={{ animationDelay: "520ms" }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-300">Recent Reviews</h3>
            {recentReviews.length > 0 && <button onClick={() => navigate("/mobile/reviews")} className="text-xs text-primary-400">View all →</button>}
          </div>
          {recentReviews.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">No reviews yet.</p>
          ) : (
            <div className="space-y-2.5">
              {recentReviews.map((r) => (
                <div key={r.id} className="flex items-start gap-2 py-1.5 border-b border-white/5 last:border-0">
                  <span className="text-sm shrink-0">{"⭐".repeat(r.rating)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-300 line-clamp-2">{r.ai_generated_review ?? "Rating only"}</p>
                    <p className="text-[10px] text-slate-600 mt-0.5">{timeAgo(r.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3 animate-fade-up" style={{ animationDelay: "560ms" }}>
          <QuickAction label="QR Codes" icon="📱" />
          <QuickAction label="Analytics" icon="📈" />
          <QuickAction label="Campaigns" icon="📣" />
          <QuickAction label="Workflows" icon="⚡" />
        </div>

        {isLowBandwidthMode() && (
          <p className="text-xs text-amber-400/70 text-center">Low bandwidth mode — some data may be cached.</p>
        )}
      </div>
    </MobileShell>
  );
}

function StatCard({ label, value, icon, delay }: { label: string; value: string | number; icon: string; delay: number }) {
  return (
    <div className="glass rounded-xl p-3 animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</span>
        <span className="text-base opacity-50">{icon}</span>
      </div>
      <p className="text-xl font-bold text-white mt-1">{value}</p>
    </div>
  );
}

function QuickAction({ label, icon }: { label: string; icon: string }) {
  return (
    <div className="glass rounded-xl p-3 flex items-center gap-2">
      <span className="text-xl">{icon}</span>
      <span className="text-sm text-slate-300 font-medium">{label}</span>
    </div>
  );
}

function loadingSkeleton() {
  return (
    <div className="space-y-4 pt-4">
      <div className="h-12 bg-white/5 rounded-xl animate-pulse" />
      <div className="h-20 bg-white/5 rounded-2xl animate-pulse" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)}
      </div>
      <div className="h-32 bg-white/5 rounded-2xl animate-pulse" />
    </div>
  );
}
