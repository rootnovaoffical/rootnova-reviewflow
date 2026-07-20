import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShellLayout, StatCard, Badge } from "../../components/Shell";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { Loading } from "../../components/States";
import type { Business } from "../../lib/types";

export default function BusinessDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<{ reviews: number; avgRating: number; questions: number; recentActivity: number } | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
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
          supabase.from("review_sessions").select("rating, created_at").eq("business_id", data.business_id).order("created_at", { ascending: false }),
          supabase.from("questions").select("id", { count: "exact", head: true }).eq("business_id", data.business_id).eq("is_active", true),
        ]).then(([r, q]) => {
          const reviews = r.data || [];
          const avg = reviews.length > 0 ? reviews.reduce((s, x) => s + x.rating, 0) / reviews.length : 0;
          const last7 = reviews.filter((r) => new Date(r.created_at) > new Date(Date.now() - 7 * 86400000)).length;
          setStats({ reviews: reviews.length, avgRating: avg, questions: q.count || 0, recentActivity: last7 });
          setLoading(false);
        });
      });
  }, [profile, navigate]);

  if (loading) return <ShellLayout nav={[]} title="Dashboard"><Loading /></ShellLayout>;
  if (!business) {
    return (
      <ShellLayout nav={[]} title="Dashboard">
        <div className="p-8 text-center">
          <h2 className="text-xl font-bold text-white mb-2">No Business Assigned</h2>
          <p className="text-slate-400 mb-4">Complete onboarding to set up your ReviewFlow.</p>
          <button onClick={() => navigate("/business/onboarding")} className="px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white font-medium rounded-lg transition-colors">
            Start Onboarding
          </button>
        </div>
      </ShellLayout>
    );
  }

  const reviewUrl = `${window.location.origin}/r/${business.slug}`;

  return (
    <ShellLayout nav={businessNav} title="Dashboard">
      <div className="p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-4">
          {business.logo_url ? (
            <img src={business.logo_url} alt={business.name} className="w-14 h-14 rounded-xl object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-xl">
              {business.name[0]}
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold text-white">{business.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge color={business.status === "active" ? "green" : "amber"}>{business.status}</Badge>
              {business.business_category && <Badge>{business.business_category}</Badge>}
              {business.location_city && <span className="text-xs text-slate-500">{business.location_city}</span>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Reviews" value={stats?.reviews ?? 0} icon="⭐" />
          <StatCard label="Avg Rating" value={(stats?.avgRating ?? 0).toFixed(1)} icon="📊" />
          <StatCard label="Active Questions" value={stats?.questions ?? 0} icon="❓" />
          <StatCard label="Last 7 Days" value={stats?.recentActivity ?? 0} icon="📈" hint="New reviews" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-sm font-medium text-slate-400 mb-4">ReviewFlow Link</h3>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={reviewUrl}
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 text-sm"
              />
              <button
                onClick={() => { navigator.clipboard.writeText(reviewUrl); }}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
              >
                Copy
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              Share this link or QR code with customers to collect reviews.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-sm font-medium text-slate-400 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button onClick={() => navigate("/business/my-business")} className="w-full text-left px-4 py-2.5 bg-slate-800/50 hover:bg-slate-800 rounded-lg text-white text-sm transition-colors">
                Edit business profile & branding
              </button>
              <button onClick={() => navigate("/business/questions")} className="w-full text-left px-4 py-2.5 bg-slate-800/50 hover:bg-slate-800 rounded-lg text-white text-sm transition-colors">
                Manage review questions
              </button>
              <button onClick={() => navigate("/business/reviews")} className="w-full text-left px-4 py-2.5 bg-slate-800/50 hover:bg-slate-800 rounded-lg text-white text-sm transition-colors">
                View collected reviews
              </button>
            </div>
          </div>
        </div>
      </div>
    </ShellLayout>
  );
}

import type { NavItem } from "../../components/Shell";

const businessNav: NavItem[] = [
  { label: "Dashboard", to: "/business", icon: "📊" },
  { label: "My Business", to: "/business/my-business", icon: "🏪" },
  { label: "Questions", to: "/business/questions", icon: "❓" },
  { label: "Reviews", to: "/business/reviews", icon: "⭐" },
  { label: "Analytics", to: "/business/analytics", icon: "📈" },
  { label: "Settings", to: "/business/settings", icon: "⚙️" },
];
