import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { LoadingSpinner, ErrorState, PageHeader } from "../../components/ui";

interface Stats {
  businesses: number;
  organizations: number;
  paymentsPending: number;
  activeSubscriptions: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      const [biz, orgs, pay, subs] = await Promise.all([
        supabase.from("businesses").select("*", { count: "exact", head: true }),
        supabase.from("organizations").select("*", { count: "exact", head: true }),
        supabase.from("payments").select("*", { count: "exact", head: true }).eq("status", "PENDING"),
        supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "ACTIVE"),
      ]);

      if (biz.error || orgs.error || pay.error || subs.error) {
        setError("Failed to load dashboard stats");
        setLoading(false);
        return;
      }

      setStats({
        businesses: biz.count ?? 0,
        organizations: orgs.count ?? 0,
        paymentsPending: pay.count ?? 0,
        activeSubscriptions: subs.count ?? 0,
      });
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <LoadingSpinner size={32} />;
  if (error) return <ErrorState message={error} />;
  if (!stats) return <ErrorState message="No data available" />;

  const cards = [
    { label: "Total Businesses", value: stats.businesses, color: "text-primary-600" },
    { label: "Organizations", value: stats.organizations, color: "text-accent-600" },
    { label: "Pending Payments", value: stats.paymentsPending, color: "text-yellow-600" },
    { label: "Active Subscriptions", value: stats.activeSubscriptions, color: "text-green-600" },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Platform overview and key metrics" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="card p-6">
            <p className="text-sm font-medium text-slate-500">{card.label}</p>
            <p className={`mt-2 text-3xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
