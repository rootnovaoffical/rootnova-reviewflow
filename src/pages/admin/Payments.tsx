import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { LoadingSpinner, ErrorState, EmptyState, Badge, PageHeader, Pagination } from "../../components/ui";
import type { Payment, Organization } from "../../lib/types";

const PAGE_SIZE = 20;

interface PaymentWithOrg extends Payment {
  organizations: Pick<Organization, "name"> | null;
}

export default function Payments() {
  const [payments, setPayments] = useState<PaymentWithOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE - 1;

    let query = supabase
      .from("payments")
      .select("*, organizations(name)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(start, end);

    if (statusFilter !== "ALL") {
      query = query.eq("status", statusFilter);
    }

    const { data, error: err, count } = await query;

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    setPayments((data ?? []) as PaymentWithOrg[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  return (
    <div>
      <PageHeader title="Payments" subtitle="Review and manage payment submissions" />

      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm font-medium text-slate-700">Filter by status:</label>
        <select
          className="input max-w-[200px]"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="ALL">All</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {loading ? (
        <LoadingSpinner size={32} />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : payments.length === 0 ? (
        <EmptyState message="No payments found" />
      ) : (
        <>
          <div className="card overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-600">Organization</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Amount</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Status</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Payment Date</th>
                  <th className="px-4 py-3 font-medium text-slate-600">UTR Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link to={`/payments/${p.id}`} className="text-primary-600 hover:underline">
                        {p.organizations?.name ?? "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3">₹{p.amount.toLocaleString()}</td>
                    <td className="px-4 py-3"><Badge status={p.status} /></td>
                    <td className="px-4 py-3 text-slate-500">
                      {p.payment_date ? new Date(p.payment_date).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{p.utr_reference ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
