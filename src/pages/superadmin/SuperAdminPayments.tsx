import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Loading, ErrorState, EmptyState } from "../../components/States";
import { formatCurrency, timeAgo } from "../../lib/utils";
import type { Payment } from "../../lib/types";

export function SuperAdminPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("payments").select("*, organization:organizations!payments_organization_id_fkey(name)").order("created_at", { ascending: false });
      if (error) setError(error.message); else setPayments((data as any) || []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <Loading message="Loading payments…" />;
  if (error) return <ErrorState message={error} />;

  const filtered = filter === "ALL" ? payments : payments.filter((p: any) => p.status === filter);

  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-2xl font-bold text-ink-50">Payments</h1><p className="mt-1 text-sm text-ink-400">Review and approve payment proofs</p></div>
      <div className="flex gap-2 overflow-x-auto scrollbar-thin">
        {["ALL", "PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium ${filter === f ? "bg-indigo-500/15 text-indigo-300" : "bg-white/5 text-ink-400 hover:text-ink-100"}`}>{f.replace("_", " ")}</button>
        ))}
      </div>
      {filtered.length === 0 ? <EmptyState title="No payments" message="Payments will appear here once partners submit them." /> : (
        <div className="space-y-2">
          {filtered.map((p: any) => (
            <Link key={p.id} to={`/superadmin/payments/${p.id}`} className="card card-hover flex items-center justify-between">
              <div><p className="font-medium text-ink-50">{formatCurrency(p.amount)}</p><p className="text-sm text-ink-400">{p.organization?.name || "Unknown"} · {p.payment_method}</p></div>
              <div className="flex items-center gap-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${p.status === "APPROVED" ? "bg-emerald-500/15 text-emerald-300" : p.status === "PENDING" || p.status === "UNDER_REVIEW" ? "bg-amber-500/15 text-amber-300" : p.status === "REJECTED" ? "bg-red-500/15 text-red-300" : "bg-ink-700 text-ink-400"}`}>{p.status.replace("_", " ")}</span><span className="text-xs text-ink-400">{timeAgo(p.created_at)}</span></div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
