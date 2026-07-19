import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { Loading } from "../../components/States";

export default function PartnerDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<{ businesses: number; reviews: number; payments: number; } | null>(null);
  const [org, setOrg] = useState<{ name: string } | null>(null);

  useEffect(() => {
    if (!profile) return;
    supabase.from("organization_members").select("organization_id").eq("user_id", profile.id).single()
      .then(({ data: mem }) => {
        if (mem?.organization_id) {
          supabase.from("organizations").select("name").eq("id", mem.organization_id).single().then(({ data }) => setOrg(data as { name: string } | null));
          Promise.all([
            supabase.from("businesses").select("id", { count: "exact", head: true }).eq("organization_id", mem.organization_id),
            supabase.from("payments").select("id", { count: "exact", head: true }).eq("organization_id", mem.organization_id),
          ]).then(async ([b, p]) => {
            const { data: bizIds } = await supabase.from("businesses").select("id").eq("organization_id", mem.organization_id);
            const ids = (bizIds || []).map((x: { id: string }) => x.id);
            const reviewCount = ids.length > 0
              ? await supabase.from("review_sessions").select("id", { count: "exact", head: true }).in("business_id", ids)
              : { count: 0 };
            setStats({ businesses: b.count || 0, reviews: reviewCount.count || 0, payments: p.count || 0 });
          });
        }
      });
  }, [profile]);

  if (!stats) return <Layout title="Dashboard"><Loading /></Layout>;

  const cards = [
    { label: "Businesses", value: stats.businesses, color: "from-primary-500 to-primary-600" },
    { label: "Reviews", value: stats.reviews, color: "from-accent-500 to-accent-600" },
    { label: "Payments", value: stats.payments, color: "from-success-500 to-success-600" },
  ];

  return (
    <Layout title="Dashboard">
      <p className="text-slate-400 mb-6">{org?.name || "Your Organization"}</p>
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
