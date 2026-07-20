import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { Loading, ErrorState } from "../../components/States";

export default function BusinessDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<{ reviews: number; avgRating: number; questions: number } | null>(null);
  const [businessName, setBusinessName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    supabase.from("business_admins").select("business_id, business:businesses!business_id(name)").eq("user_id", profile.id).maybeSingle()
      .then(({ data, error: baErr }) => {
        if (baErr) { setError(baErr.message); setStats({ reviews: 0, avgRating: 0, questions: 0 }); return; }
        if (!data?.business_id) { setStats({ reviews: 0, avgRating: 0, questions: 0 }); return; }
        setBusinessName((data as any).business?.name || "My Business");
        Promise.all([
          supabase.from("review_sessions").select("rating").eq("business_id", data.business_id),
          supabase.from("questions").select("id", { count: "exact", head: true }).eq("business_id", data.business_id).eq("is_active", true),
        ]).then(([r, q]) => {
          if (r.error || q.error) { setError(r.error?.message || q.error?.message || "Failed to load stats"); }
          const reviews = r.data || [];
          const avg = reviews.length > 0 ? reviews.reduce((s, x) => s + x.rating, 0) / reviews.length : 0;
          setStats({ reviews: reviews.length, avgRating: avg, questions: q.count || 0 });
        });
      });
  }, [profile]);

  if (!stats) return <Layout title="Dashboard"><Loading /></Layout>;
  if (error) return <Layout title="Dashboard"><ErrorState message={error} /></Layout>;

  const cards = [
    { label: "Total Reviews", value: stats.reviews, color: "from-primary-500 to-primary-600" },
    { label: "Avg Rating", value: stats.avgRating.toFixed(1), color: "from-warning-500 to-warning-600" },
    { label: "Active Questions", value: stats.questions, color: "from-accent-500 to-accent-600" },
  ];

  return (
    <Layout title="Dashboard">
      <p className="text-slate-400 mb-6">{businessName}</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="glass rounded-2xl p-6 animate-slide-up">
            <p className="text-sm text-slate-400 mb-1">{c.label}</p>
            <p className={`text-3xl font-bold bg-gradient-to-r ${c.color} bg-clip-text text-transparent`}>{c.value}</p>
          </div>
        ))}
      </div>
    </Layout>
  );
}
