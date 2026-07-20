import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BusinessShell from "./BusinessShell";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { SkeletonStatGrid, SkeletonCard } from "../../components/Skeleton";
import { StatTile, RatingDistribution, Sparkline } from "../../components/StatTile";
import { InfoDot } from "../../components/Tooltip";
import { timeAgo } from "../../lib/utils";
import { useToast } from "../../context/ToastContext";
import type { Business, ReviewSession } from "../../lib/types";

export default function BusinessDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [business, setBusiness] = useState<Business | null>(null);
  const [reviews, setReviews] = useState<ReviewSession[]>([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    supabase.from("business_admins").select("business_id, business:businesses!business_id(*)").eq("user_id", profile.id).maybeSingle()
      .then(({ data }) => {
        if (!data?.business_id) { setLoading(false); return; }
        const biz = (data as any).business as Business;
        setBusiness(biz);
        if (biz && !biz.onboarding_completed) { navigate("/business/onboarding"); return; }
        Promise.all([
          supabase.from("review_sessions").select("*").eq("business_id", data.business_id).order("created_at", { ascending: false }).limit(100),
          supabase.from("questions").select("id", { count: "exact", head: true }).eq("business_id", data.business_id).eq("is_active", true),
        ]).then(([r, q]) => {
          setReviews((r.data || []) as ReviewSession[]);
          setQuestionCount(q.count || 0);
          setLoading(false);
        });
      });
  }, [profile, navigate]);

  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  if (loading) return (
    <BusinessShell title="Dashboard">
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex items-center gap-4">
          <SkeletonCard className="!min-h-[56px] w-14" />
          <div className="flex-1"><SkeletonCard className="!min-h-[56px]" /></div>
        </div>
        <SkeletonStatGrid />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonCard className="!min-h-[200px]" />
      </div>
    </BusinessShell>
  );

  if (!business) {
    return (
      <BusinessShell title="Dashboard">
        <div className="p-8 text-center">
          <div className="max-w-md mx-auto mt-12">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">{"\uD83C\uDFE2"}</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Welcome to RootNova ReviewFlow</h2>
            <p className="text-slate-400 mb-6">Let's set up your business to start collecting authentic customer reviews.</p>
            <button onClick={() => navigate("/business/onboarding")} className="btn-primary px-8 py-3 text-white font-semibold rounded-xl">
              Start Setup
            </button>
          </div>
        </div>
      </BusinessShell>
    );
  }

  const ratings = reviews.map((r) => r.rating);
  const avg = ratings.length > 0 ? ratings.reduce((s, r) => s + r, 0) / ratings.length : 0;
  const last7 = reviews.filter((r) => new Date(r.created_at) > new Date(Date.now() - 7 * 86400000)).length;
  const aiGenerated = reviews.filter((r) => r.ai_generated_review && r.ai_status === "completed").length;
  const reviewUrl = `${window.location.origin}/r/${business.slug}`;

  // Daily counts for last 14 days
  const dailyCounts: number[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    dailyCounts.push(reviews.filter((r) => r.created_at.slice(0, 10) === ds).length);
  }

  const recentReviews = reviews.slice(0, 5);

  return (
    <BusinessShell title="Dashboard">
      <div className="p-4 md:p-8 space-y-6 page-enter">
        {/* Business header */}
        <div className="flex items-center gap-4 animate-fade-up">
          {business.logo_url ? (
            <img src={business.logo_url} alt={business.name} className="w-14 h-14 rounded-xl object-cover border border-white/10" />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-xl">
              {business.name[0]}
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold text-white">{business.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${business.status === "active" ? "bg-success-500/20 text-success-400" : "bg-warning-500/20 text-warning-400"}`}>{business.status}</span>
              {business.business_category && <span className="text-xs text-slate-500">{business.business_category}</span>}
              {business.location_city && <span className="text-xs text-slate-500">{"\u2022"} {business.location_city}</span>}
            </div>
          </div>
        </div>

        {/* Animated stat tiles with contextual tooltips */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-tile-3d">
            <StatTile label="Total Reviews" value={reviews.length} icon={"\u2B50"} accent="primary" delay={0} />
          </div>
          <div className="stat-tile-3d">
            <div className="relative">
              <StatTile label="Avg Rating" value={avg} icon={"\uD83D\uDCCA"} accent="accent" delay={80} />
              <div className="absolute top-2 right-2"><InfoDot content="The average star rating across all your reviews" /></div>
            </div>
          </div>
          <div className="stat-tile-3d">
            <div className="relative">
              <StatTile label="AI Reviews" value={aiGenerated} icon={"\u2728"} accent="success" delay={160} hint="Generated for customers" />
              <div className="absolute top-2 right-2"><InfoDot content="Reviews automatically written by AI based on customer ratings & answers" /></div>
            </div>
          </div>
          <div className="stat-tile-3d">
            <StatTile label="Last 7 Days" value={last7} icon={"\uD83D\uDE80"} accent="warning" delay={240} hint="New reviews" />
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Rating distribution */}
          <div className="glass rounded-2xl p-6 animate-fade-up" style={{ animationDelay: "300ms" }}>
            <h3 className="text-sm font-medium text-slate-400 mb-4">Rating Distribution</h3>
            {ratings.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center">No ratings yet. Share your review link to get started.</p>
            ) : (
              <RatingDistribution ratings={ratings} />
            )}
          </div>

          {/* Activity sparkline */}
          <div className="glass rounded-2xl p-6 animate-fade-up" style={{ animationDelay: "360ms" }}>
            <h3 className="text-sm font-medium text-slate-400 mb-4">Review Activity</h3>
            <p className="text-3xl font-bold text-white mb-2">{last7} <span className="text-sm font-normal text-slate-500">this week</span></p>
            <Sparkline data={dailyCounts} />
            <div className="flex justify-between text-xs text-slate-600 mt-2">
              <span>14 days ago</span>
              <span>Today</span>
            </div>
          </div>

          {/* Quick link card */}
          <div className="glass rounded-2xl p-6 animate-fade-up" style={{ animationDelay: "420ms" }}>
            <h3 className="text-sm font-medium text-slate-400 mb-4">Your Review Link</h3>
            <div className="bg-slate-900/50 rounded-lg p-3 mb-3 border border-white/5">
              <p className="text-sm text-primary-300 break-all">{reviewUrl}</p>
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(reviewUrl); setCopied(true); showToast("Review link copied to clipboard", "success"); setTimeout(() => setCopied(false), 1500); }}
              className={`btn-primary w-full py-2.5 text-white text-sm font-medium rounded-lg ${copied ? "copy-success" : ""}`}
            >
              {copied ? "\u2713 Copied!" : "Copy Link"}
            </button>
            <div className="mt-4 space-y-1.5">
              <button onClick={() => navigate("/business/questions")} className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-white/5 transition-colors">
                {"\u2192"} Manage questions ({questionCount} active)
              </button>
              <button onClick={() => navigate("/business/reviews")} className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-white/5 transition-colors">
                {"\u2192"} View all reviews
              </button>
            </div>
          </div>
        </div>

        {/* Recent reviews */}
        <div className="glass rounded-2xl p-6 animate-fade-up" style={{ animationDelay: "480ms" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-400">Recent Activity</h3>
            {recentReviews.length > 0 && (
              <button onClick={() => navigate("/business/reviews")} className="text-xs text-primary-400 hover:text-primary-300 transition-colors">
                View all {"\u2192"}
              </button>
            )}
          </div>
          {recentReviews.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-500 mb-3">No reviews yet. Once customers start leaving feedback, you'll see them here.</p>
              <button onClick={() => navigate("/business/my-business")} className="text-xs text-primary-400 hover:text-primary-300 transition-colors">
                Get your review link {"\u2192"}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentReviews.map((r) => (
                <div key={r.id} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
                  <div className="text-lg shrink-0">{"\u2B50".repeat(r.rating)}</div>
                  <div className="flex-1 min-w-0">
                    {r.ai_generated_review ? (
                      <p className="text-sm text-slate-300 line-clamp-2">{r.ai_generated_review}</p>
                    ) : (
                      <p className="text-sm text-slate-500 italic">Rating only (no AI review generated)</p>
                    )}
                    <p className="text-xs text-slate-600 mt-0.5">{timeAgo(r.created_at)}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs shrink-0 ${r.ai_status === "completed" ? "bg-success-500/15 text-success-400" : "bg-warning-500/15 text-warning-400"}`}>
                    {r.ai_status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </BusinessShell>
  );
}
