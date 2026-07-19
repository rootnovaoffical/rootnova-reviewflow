import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { Loading, ErrorState } from "../../components/States";
import { timeAgo } from "../../lib/utils";

export function PartnerDashboard() {
  const { profile } = useAuth();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [recentReviews, setRecentReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      if (!profile?.id) return;
      const { data: member } = await supabase.from("organization_members").select("organization_id").eq("user_id", profile.id).maybeSingle();
      const oid = (member as any)?.organization_id || null;
      setOrgId(oid);
      if (!oid) { setLoading(false); return; }
      try {
        const { data: businesses } = await supabase.from("businesses").select("id, status, name").eq("organization_id", oid);
        const bizIds = (businesses || []).map((b: any) => b.id);
        let sessions: any[] = [];
        if (bizIds.length > 0) {
          const { data: sess } = await supabase.from("review_sessions").select("id, ai_status, rating, business_id, created_at, business:businesses!review_sessions_business_id_fkey(name)").in("business_id", bizIds).order("created_at", { ascending: false }).limit(5);
          sessions = sess || [];
        }
        const { data: payments } = await supabase.from("payments").select("id, status").eq("organization_id", oid);
        setStats({
          businesses: (businesses || []).length,
          activeBusinesses: (businesses || []).filter((b: any) => b.status === "active").length,
          reviews: sessions.length,
          aiCompleted: sessions.filter((s: any) => s.ai_status === "completed").length,
          pendingPayments: (payments || []).filter((p: any) => p.status === "PENDING" || p.status === "UNDER_REVIEW").length,
        });
        setRecentReviews(sessions);
      } catch (err) { setError(err instanceof Error ? err.message : "Failed to load dashboard"); }
      finally { setLoading(false); }
    })();
  }, [profile?.id]);

  if (loading) return <Loading message="Loading dashboard…" />;
  if (error) return <ErrorState message={error} />;
  if (!orgId) return <ErrorState message="You are not a member of any organization." />;

  const cards = [
    { label: "Businesses", value: stats.businesses ?? 0, link: "/partner/businesses" },
    { label: "Active", value: stats.activeBusinesses ?? 0, link: "/partner/businesses" },
    { label: "Reviews", value: stats.reviews ?? 0, link: "/partner/businesses" },
    { label: "AI Generated", value: stats.aiCompleted ?? 0, link: "/partner/businesses" },
    { label: "Pending Payments", value: stats.pendingPayments ?? 0, link: "/partner/payments" },
  ];

  return (
    <div className="space-y-8">
      <div><h1 className="font-display text-2xl font-bold text-ink-50">Dashboard</h1><p className="mt-1 text-sm text-ink-400">Your organization overview</p></div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (<Link key={c.label} to={c.link} className="card card-hover"><p className="text-xs font-semibold uppercase tracking-wider text-ink-400">{c.label}</p><p className="mt-2 font-display text-3xl font-bold text-ink-50">{c.value}</p></Link>))}
      </div>
      <div>
        <h2 className="mb-4 font-display text-lg font-semibold text-ink-50">Recent Reviews</h2>
        {recentReviews.length === 0 ? <p className="text-sm text-ink-400">No reviews yet.</p> : (
          <div className="space-y-2">
            {recentReviews.map((r: any) => (
              <Link key={r.id} to={`/partner/businesses/${r.business_id}`} className="card card-hover flex items-center justify-between">
                <div><p className="font-medium text-ink-50">{r.business?.name || "Unknown"} · {r.rating}⭐</p><p className="text-sm text-ink-400">{r.ai_status}</p></div>
                <span className="text-xs text-ink-400">{timeAgo(r.created_at)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
