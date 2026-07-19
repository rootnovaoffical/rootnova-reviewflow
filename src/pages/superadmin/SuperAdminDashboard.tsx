import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Loading, ErrorState } from "../../components/States";
import { timeAgo } from "../../lib/utils";

export function SuperAdminDashboard() {
  const [stats, setStats] = useState<Record<string, number>>({});
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [orgs, businesses, sessions, payments, plans, flags] = await Promise.all([
          supabase.from("organizations").select("id, status", { count: "exact", head: true }),
          supabase.from("businesses").select("id, status", { count: "exact", head: true }),
          supabase.from("review_sessions").select("id, ai_status", { count: "exact", head: true }),
          supabase.from("payments").select("id, status", { count: "exact", head: true }),
          supabase.from("plans").select("id", { count: "exact", head: true }),
          supabase.from("feature_flags").select("id, is_enabled", { count: "exact", head: true }),
        ]);
        const { data: audit } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(8);
        setStats({
          organizations: orgs.count || 0,
          businesses: businesses.count || 0,
          reviews: sessions.count || 0,
          payments: payments.count || 0,
          plans: plans.count || 0,
          flags: flags.count || 0,
        });
        setRecentActivity(audit || []);
      } catch (err) { setError(err instanceof Error ? err.message : "Failed to load dashboard"); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <Loading message="Loading dashboard…" />;
  if (error) return <ErrorState message={error} />;

  const cards = [
    { label: "Organizations", value: stats.organizations, link: "/superadmin/organizations" },
    { label: "Businesses", value: stats.businesses, link: "/superadmin/businesses" },
    { label: "Reviews", value: stats.reviews, link: "/superadmin/businesses" },
    { label: "Payments", value: stats.payments, link: "/superadmin/payments" },
    { label: "Plans", value: stats.plans, link: "/superadmin/plans" },
    { label: "Feature Flags", value: stats.flags, link: "/superadmin/feature-flags" },
  ];

  return (
    <div className="space-y-8">
      <div><h1 className="font-display text-2xl font-bold text-ink-50">Dashboard</h1><p className="mt-1 text-sm text-ink-400">Platform overview</p></div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (<Link key={c.label} to={c.link} className="card card-hover"><p className="text-xs font-semibold uppercase tracking-wider text-ink-400">{c.label}</p><p className="mt-2 font-display text-3xl font-bold text-ink-50">{c.value}</p></Link>))}
      </div>
      <div>
        <h2 className="mb-4 font-display text-lg font-semibold text-ink-50">Recent Activity</h2>
        {recentActivity.length === 0 ? <p className="text-sm text-ink-400">No recent activity.</p> : (
          <div className="space-y-2">
            {recentActivity.map((a: any) => (
              <div key={a.id} className="card flex items-center justify-between">
                <div><p className="text-sm font-medium text-ink-100">{a.action.replace(/_/g, " ")}</p><p className="text-xs text-ink-400">{a.actor_email || "System"} · {a.target_type || "—"}</p></div>
                <span className="text-xs text-ink-400">{timeAgo(a.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
