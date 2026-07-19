import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import { supabase } from "../../lib/supabase";
import { Loading } from "../../components/States";

export default function AdminDashboard() {
  const [stats, setStats] = useState<{ orgs: number; businesses: number; payments: number; reviews: number; } | null>(null);

  useEffect(() => {
    Promise.all([
      supabase.from("organizations").select("id", { count: "exact", head: true }),
      supabase.from("businesses").select("id", { count: "exact", head: true }),
      supabase.from("payments").select("id", { count: "exact", head: true }),
      supabase.from("review_sessions").select("id", { count: "exact", head: true }),
    ]).then(([o, b, p, r]) => {
      setStats({ orgs: o.count || 0, businesses: b.count || 0, payments: p.count || 0, reviews: r.count || 0 });
    });
  }, []);

  if (!stats) return <Layout title="Dashboard"><Loading /></Layout>;

  const cards = [
    { label: "Organizations", value: stats.orgs, color: "from-primary-500 to-primary-600" },
    { label: "Businesses", value: stats.businesses, color: "from-accent-500 to-accent-600" },
    { label: "Payments", value: stats.payments, color: "from-success-500 to-success-600" },
    { label: "Review Sessions", value: stats.reviews, color: "from-warning-500 to-warning-600" },
  ];

  return (
    <Layout title="Dashboard">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
