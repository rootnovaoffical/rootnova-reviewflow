import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { PageHeader, Card, Badge } from "../../components/Shell";
import { formatCurrency, formatDate } from "../../lib/utils";
import type { Payment } from "../../lib/types";

const STATUSES = ["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"] as const;

export default function SuperAdminPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filter, setFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    let q = supabase.from("payments").select("*, organizations(name), plans(name)").order("created_at", { ascending: false });
    if (filter !== "ALL") q = q.eq("status", filter);
    const { data } = await q;
    setPayments((data as Payment[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [filter]);
  return (
    <div>
      <PageHeader title="Payments" subtitle="Review and approve partner payments" />
      <div className="px-8 flex gap-2 mb-4">
        {["ALL", ...STATUSES].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === s ? "bg-brand-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>{s}</button>
        ))}
      </div>
      <div className="px-8">
        {loading ? <p className="text-slate-400">Loading…</p> : (
          <div className="grid gap-3">
            {payments.map((p) => (
              <Link key={p.id} to={`/admin/payments/${p.id}`}>
                <Card>
                  <div className="flex items-center justify-between">
                    <div><p className="text-white font-medium">{formatCurrency(p.amount)}</p><p className="text-slate-400 text-xs">{(p as { organizations?: { name?: string } }).organizations?.name || "—"} · UTR: {p.utr_reference || "—"}</p><p className="text-slate-500 text-xs">{formatDate(p.created_at)}</p></div>
                    <Badge color={p.status === "APPROVED" ? "green" : p.status === "REJECTED" ? "red" : p.status === "UNDER_REVIEW" ? "amber" : "slate"}>{p.status}</Badge>
                  </div>
                </Card>
              </Link>
            ))}
            {payments.length === 0 && <p className="text-slate-500 text-sm">No payments.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
