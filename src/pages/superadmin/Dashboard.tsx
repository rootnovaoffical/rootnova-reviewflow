import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { PageHeader, StatCard, Card, Badge } from "../../components/Shell";

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState({ organizations: 0, businesses: 0, payments: 0, pendingPayments: 0, reviews: 0, admins: 0 });
  const [recent, setRecent] = useState<{ id: string; name: string; status: string }[]>([]);
  useEffect(() => {
    (async () => {
      const [orgs, biz, pay, pendingPay, reviews, admins] = await Promise.all([
        supabase.from("organizations").select("id", { count: "exact", head: true }),
        supabase.from("businesses").select("id", { count: "exact", head: true }),
        supabase.from("payments").select("id", { count: "exact", head: true }),
        supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "PENDING"),
        supabase.from("review_sessions").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).in("role", ["ROOTNOVA_SUPER_ADMIN", "ROOTNOVA_ADMIN"]),
      ]);
      setStats({ organizations: orgs.count ?? 0, businesses: biz.count ?? 0, payments: pay.count ?? 0, pendingPayments: pendingPay.count ?? 0, reviews: reviews.count ?? 0, admins: admins.count ?? 0 });
      const { data } = await supabase.from("businesses").select("id, name, status").order("created_at", { ascending: false }).limit(5);
      setRecent((data as { id: string; name: string; status: string }[]) || []);
    })();
  }, []);
  return (
    <div>
      <PageHeader title="Super Admin Dashboard" subtitle="Platform overview" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 p-8">
        <StatCard label="Organizations" value={stats.organizations} />
        <StatCard label="Businesses" value={stats.businesses} />
        <StatCard label="Reviews" value={stats.reviews} />
        <StatCard label="Payments" value={stats.payments} />
        <StatCard label="Pending" value={stats.pendingPayments} hint="Awaiting review" />
        <StatCard label="Admins" value={stats.admins} />
      </div>
      <div className="px-8">
        <Card>
          <h3 className="text-white font-semibold mb-4">Recent businesses</h3>
          <div className="space-y-2">
            {recent.map((b) => (
              <Link key={b.id} to={`/admin/businesses/${b.id}`} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors">
                <span className="text-slate-200 text-sm">{b.name}</span>
                <Badge color={b.status === "active" ? "green" : "slate"}>{b.status}</Badge>
              </Link>
            ))}
            {recent.length === 0 && <p className="text-slate-500 text-sm">No businesses yet.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
