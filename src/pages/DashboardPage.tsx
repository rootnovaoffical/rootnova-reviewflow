import { useState, useEffect, useCallback } from "react";
import { Star, TrendingUp, MessageSquare, Eye, Copy, ExternalLink, Settings, BarChart3, Sparkles, ArrowUpRight, ArrowDownRight, QrCode } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useToast } from "../context/ToastContext";
import type { Business, ReviewSession } from "../lib/types";
import SpatialBackground from "../components/SpatialBackground";

type Tab = "overview" | "reviews" | "settings";

interface Stats {
  totalReviews: number;
  avgRating: number;
  totalViews: number;
  totalCompletions: number;
  ratingDist: number[];
  recentReviews: ReviewSession[];
  trend: { reviews: number; views: number; rating: number };
}

export default function DashboardPage() {
  const { showToast } = useToast();
  const [business, setBusiness] = useState<Business | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [editingSettings, setEditingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ name: "", welcome_message: "", google_place_id: "", public_review_enabled: true });

  const loadBusiness = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("businesses").select("*").eq("status", "active").limit(1).maybeSingle();
      if (error || !data) { setLoading(false); return; }
      setBusiness(data as Business);
      setSettingsForm({ name: (data as Business).name, welcome_message: (data as Business).welcome_message, google_place_id: (data as Business).google_place_id || "", public_review_enabled: (data as Business).public_review_enabled });
    } catch { setLoading(false); }
  }, []);

  const loadStats = useCallback(async (bizId: string) => {
    try {
      const { data: reviews } = await supabase.from("review_sessions").select("*").eq("business_id", bizId).order("created_at", { ascending: false }).limit(100);
      const { count: totalViews } = await supabase.from("analytics_events").select("*", { count: "exact", head: true }).eq("business_id", bizId).eq("event_type", "page_view");
      const { count: totalCompletions } = await supabase.from("analytics_events").select("*", { count: "exact", head: true }).eq("business_id", bizId).eq("event_type", "ai_completion");
      const allReviews = (reviews || []) as ReviewSession[];
      const totalR = allReviews.length;
      const avg = totalR > 0 ? allReviews.reduce((s, r) => s + r.rating, 0) / totalR : 0;
      const dist = [0, 0, 0, 0, 0];
      allReviews.forEach((r) => { if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++; });
      setStats({ totalReviews: totalR, avgRating: avg, totalViews: totalViews || 0, totalCompletions: totalCompletions || 0, ratingDist: dist, recentReviews: allReviews.slice(0, 10), trend: { reviews: totalR, views: totalViews || 0, rating: avg } });
    } catch { /* non-blocking */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadBusiness(); }, [loadBusiness]);
  useEffect(() => { if (business) loadStats(business.id); }, [business, loadStats]);

  const handleSaveSettings = async () => {
    if (!business) return;
    try {
      const { error } = await supabase.from("businesses").update({
        name: settingsForm.name, welcome_message: settingsForm.welcome_message,
        google_place_id: settingsForm.google_place_id || null,
        public_review_enabled: settingsForm.public_review_enabled,
      }).eq("id", business.id);
      if (error) throw error;
      setBusiness({ ...business, ...settingsForm, google_place_id: settingsForm.google_place_id || null });
      setEditingSettings(false);
      showToast("Settings saved successfully!", "success");
    } catch { showToast("Failed to save settings", "error"); }
  };

  const copyReviewLink = () => {
    const url = `${window.location.origin}/review/${business?.slug || "happy-hour-cafe"}`;
    navigator.clipboard.writeText(url);
    showToast("Review link copied!", "success");
  };

  if (loading) return <><SpatialBackground /><div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" /></div></>;
  if (!business) return <><SpatialBackground /><div className="min-h-screen flex items-center justify-center"><div className="glass-strong rounded-3xl p-10 text-center"><h1 className="text-2xl font-bold text-white mb-2">No Business Found</h1><p className="text-slate-400">Unable to load dashboard data.</p></div></div></>;

  const maxDist = Math.max(...(stats?.ratingDist || [1]), 1);

  return (
    <>
      <SpatialBackground />
      <div className="min-h-screen flex">
        {/* Sidebar */}
        <aside className="w-64 hidden md:flex flex-col glass-strong border-r border-white/10 min-h-screen p-4 sticky top-0">
          <div className="flex items-center gap-3 mb-8 px-2">
            {business.logo_url ? <img src={business.logo_url} alt={business.name} className="w-10 h-10 rounded-xl object-cover" /> : <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center"><Sparkles className="w-5 h-5 text-white" /></div>}
            <div><h2 className="text-sm font-bold text-white truncate">{business.name}</h2><p className="text-xs text-slate-500">RootNova Dashboard</p></div>
          </div>
          <nav className="space-y-1">
            <button onClick={() => setTab("overview")} className={`sidebar-link w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${tab === "overview" ? "sidebar-link-active text-white" : "text-slate-400"}`}><BarChart3 className="w-4 h-4" /> Overview</button>
            <button onClick={() => setTab("reviews")} className={`sidebar-link w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${tab === "reviews" ? "sidebar-link-active text-white" : "text-slate-400"}`}><MessageSquare className="w-4 h-4" /> Reviews</button>
            <button onClick={() => setTab("settings")} className={`sidebar-link w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${tab === "settings" ? "sidebar-link-active text-white" : "text-slate-400"}`}><Settings className="w-4 h-4" /> Settings</button>
          </nav>
          <div className="mt-auto pt-4 border-t border-white/5">
            <button onClick={copyReviewLink} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-white sidebar-link"><QrCode className="w-4 h-4" /> Copy Review Link</button>
            <a href={`#/review/${business.slug}`} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-white sidebar-link"><ExternalLink className="w-4 h-4" /> View Public Page</a>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full">
          {/* Mobile tabs */}
          <div className="md:hidden flex gap-2 mb-6 glass rounded-xl p-1">
            <button onClick={() => setTab("overview")} className={`flex-1 py-2 rounded-lg text-xs font-medium ${tab === "overview" ? "bg-primary-600 text-white" : "text-slate-400"}`}>Overview</button>
            <button onClick={() => setTab("reviews")} className={`flex-1 py-2 rounded-lg text-xs font-medium ${tab === "reviews" ? "bg-primary-600 text-white" : "text-slate-400"}`}>Reviews</button>
            <button onClick={() => setTab("settings")} className={`flex-1 py-2 rounded-lg text-xs font-medium ${tab === "settings" ? "bg-primary-600 text-white" : "text-slate-400"}`}>Settings</button>
          </div>

          {/* OVERVIEW */}
          {tab === "overview" && stats && (
            <div className="space-y-6 screen-enter">
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">Dashboard Overview</h1>
                <p className="text-slate-400 text-sm">Real-time analytics for {business.name}</p>
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={<Star className="w-5 h-5" />} label="Avg Rating" value={stats.avgRating.toFixed(1)} color="text-amber-400" bg="bg-amber-500/10" trend={stats.trend.rating >= 4 ? "up" : "down"} trendValue={`${stats.avgRating.toFixed(1)} / 5`} />
                <StatCard icon={<MessageSquare className="w-5 h-5" />} label="Total Reviews" value={String(stats.totalReviews)} color="text-primary-400" bg="bg-primary-500/10" trend="up" trendValue={`${stats.totalReviews} total`} />
                <StatCard icon={<Eye className="w-5 h-5" />} label="Page Views" value={String(stats.totalViews)} color="text-accent-400" bg="bg-accent-500/10" trend="up" trendValue={`${stats.totalViews} views`} />
                <StatCard icon={<Sparkles className="w-5 h-5" />} label="AI Generated" value={String(stats.totalCompletions)} color="text-success-400" bg="bg-success-500/10" trend="up" trendValue={`${stats.totalCompletions} completed`} />
              </div>

              {/* Rating distribution */}
              <div className="glass-card rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary-400" /> Rating Distribution</h3>
                <div className="space-y-3">
                  {stats.ratingDist.map((count, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-sm text-slate-400 w-12 flex items-center gap-1">{i + 1} <Star className="w-3 h-3 fill-amber-400 text-amber-400" /></span>
                      <div className="flex-1 h-6 bg-slate-800/50 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(count / maxDist) * 100}%`, background: ["#ef4444","#f97316","#eab308","#3b82f6","#a855f7"][i] }} />
                      </div>
                      <span className="text-sm font-semibold text-white w-8 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent reviews */}
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2"><MessageSquare className="w-5 h-5 text-primary-400" /> Recent Reviews</h3>
                  <button onClick={() => setTab("reviews")} className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1">View All <ArrowUpRight className="w-3 h-3" /></button>
                </div>
                {stats.recentReviews.length === 0 ? <p className="text-slate-500 text-sm py-8 text-center">No reviews yet. Share your review link to get started!</p> : (
                  <div className="space-y-3">
                    {stats.recentReviews.slice(0, 5).map((r) => <ReviewRow key={r.id} review={r} />)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* REVIEWS */}
          {tab === "reviews" && stats && (
            <div className="space-y-6 screen-enter">
              <div><h1 className="text-2xl font-bold text-white mb-1">All Reviews</h1><p className="text-slate-400 text-sm">{stats.totalReviews} total reviews for {business.name}</p></div>
              {stats.recentReviews.length === 0 ? <div className="glass-card rounded-2xl p-12 text-center"><MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-3" /><p className="text-slate-400">No reviews yet.</p></div> : (
                <div className="space-y-3">
                  {stats.recentReviews.map((r) => <ReviewRow key={r.id} review={r} expanded />)}
                </div>
              )}
            </div>
          )}

          {/* SETTINGS */}
          {tab === "settings" && (
            <div className="space-y-6 screen-enter">
              <div><h1 className="text-2xl font-bold text-white mb-1">Business Settings</h1><p className="text-slate-400 text-sm">Configure your review flow and Google integration</p></div>

              <div className="glass-card rounded-2xl p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Business Name</label>
                  <input type="text" value={settingsForm.name} onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })} disabled={!editingSettings} className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-white/10 text-white text-sm focus:outline-none focus:border-primary-500 disabled:opacity-60" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Welcome Message</label>
                  <textarea value={settingsForm.welcome_message} onChange={(e) => setSettingsForm({ ...settingsForm, welcome_message: e.target.value })} disabled={!editingSettings} rows={2} className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-white/10 text-white text-sm focus:outline-none focus:border-primary-500 disabled:opacity-60 resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Google Place ID</label>
                  <input type="text" value={settingsForm.google_place_id} onChange={(e) => setSettingsForm({ ...settingsForm, google_place_id: e.target.value })} disabled={!editingSettings} placeholder="ChIJ..." className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-white/10 text-white text-sm focus:outline-none focus:border-primary-500 disabled:opacity-60" />
                  <p className="text-xs text-slate-500 mt-1.5">Used to generate the Google review link: search.google.com/local/writereview?placeid=...</p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={settingsForm.public_review_enabled} onChange={(e) => setSettingsForm({ ...settingsForm, public_review_enabled: e.target.checked })} disabled={!editingSettings} className="w-5 h-5 rounded accent-primary-500" />
                    <span className="text-sm text-slate-300">Public review flow enabled</span>
                  </label>
                </div>
                <div className="flex gap-3 pt-2">
                  {editingSettings ? (
                    <>
                      <button onClick={handleSaveSettings} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white text-sm font-medium hover:-translate-y-0.5 transition-all">Save Changes</button>
                      <button onClick={() => { setEditingSettings(false); setSettingsForm({ name: business.name, welcome_message: business.welcome_message, google_place_id: business.google_place_id || "", public_review_enabled: business.public_review_enabled }); }} className="px-6 py-2.5 rounded-xl glass text-slate-300 text-sm font-medium hover:bg-white/5">Cancel</button>
                    </>
                  ) : (
                    <button onClick={() => setEditingSettings(true)} className="px-6 py-2.5 rounded-xl glass text-white text-sm font-medium hover:bg-white/5 transition-all">Edit Settings</button>
                  )}
                </div>
              </div>

              <div className="glass-card rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><QrCode className="w-5 h-5 text-primary-400" /> Review Link</h3>
                <div className="flex items-center gap-3">
                  <code className="flex-1 px-4 py-3 rounded-xl bg-slate-900/50 border border-white/10 text-primary-300 text-sm truncate">{window.location.origin}/review/{business.slug}</code>
                  <button onClick={copyReviewLink} className="px-4 py-3 rounded-xl glass text-white hover:bg-white/10 transition-all"><Copy className="w-4 h-4" /></button>
                </div>
                <a href={`#/review/${business.slug}`} className="mt-3 inline-flex items-center gap-2 text-sm text-primary-400 hover:text-primary-300"><ExternalLink className="w-4 h-4" /> Open public review page</a>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}

function StatCard({ icon, label, value, color, bg, trend, trendValue }: { icon: React.ReactNode; label: string; value: string; color: string; bg: string; trend: "up" | "down"; trendValue: string }) {
  return (
    <div className="stat-card glass-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center ${color}`}>{icon}</div>
        {trend === "up" ? <ArrowUpRight className="w-4 h-4 text-success-400" /> : <ArrowDownRight className="w-4 h-4 text-error-400" />}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-slate-400 mt-1">{label}</p>
      <p className="text-xs text-slate-600 mt-0.5">{trendValue}</p>
    </div>
  );
}

function ReviewRow({ review, expanded }: { review: ReviewSession; expanded?: boolean }) {
  const colors = ["#ef4444", "#f97316", "#eab308", "#3b82f6", "#a855f7"];
  const c = colors[review.rating - 1] || "#6366f1";
  return (
    <div className="glass rounded-xl p-4 border border-white/5 hover:border-white/10 transition-all">
      <div className="flex items-start gap-3">
        <div className="flex items-center gap-1 shrink-0">
          {[1, 2, 3, 4, 5].map((s) => <Star key={s} className={`w-3.5 h-3.5 ${s <= review.rating ? "fill-current" : ""}`} style={{ color: s <= review.rating ? c : "#334155" }} />)}
        </div>
        <div className="flex-1 min-w-0">
          {review.ai_generated_review && (expanded || true) && <p className="text-sm text-slate-300 line-clamp-2">"{review.ai_generated_review}"</p>}
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-xs text-slate-500">{new Date(review.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${review.ai_status === "completed" ? "bg-success-500/15 text-success-400" : "bg-amber-500/15 text-amber-400"}`}>{review.ai_status}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
