import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../../components/Layout";
import { supabase } from "../../lib/supabase";
import type { Payment } from "../../lib/types";
import { Loading, EmptyState, ErrorState } from "../../components/States";
import { formatCurrency, formatDate } from "../../lib/utils";

export default function AdminPayments() {
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("payments").select("*").order("created_at", { ascending: false }).then(({ data, error: err }) => {
      if (err) setError(err.message);
      setPayments(data as Payment[] || []);
    });
  }, []);

  if (!payments) return <Layout title="Payments"><Loading /></Layout>;
  if (error) return <Layout title="Payments"><ErrorState message={error} /></Layout>;

  return (
    <Layout title="Payments">
      {payments.length === 0 ? <EmptyState title="No payments" subtitle="Partner payment submissions will appear here." /> : (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">UTR</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4"><Link to={`/admin/payments/${p.id}`} className="text-white font-medium hover:text-primary-300">{formatCurrency(p.amount)}</Link></td>
                  <td className="px-6 py-4 text-slate-400">{p.payment_method}</td>
                  <td className="px-6 py-4 text-slate-400">{p.utr_reference || "—"}</td>
                  <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs ${p.status === "APPROVED" ? "bg-success-500/20 text-success-400" : p.status === "REJECTED" ? "bg-error-500/20 text-error-400" : p.status === "UNDER_REVIEW" ? "bg-warning-500/20 text-warning-400" : "bg-slate-500/20 text-slate-400"}`}>{p.status}</span></td>
                  <td className="px-6 py-4 text-slate-400">{formatDate(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
