import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import {
  LoadingSpinner,
  ErrorState,
  EmptyState,
  Badge,
  PageHeader,
  Pagination,
} from "../../components/ui";
import type { Payment } from "../../lib/types";

const PAGE_SIZE = 20;
const STATUS_FILTERS = ["ALL", "PENDING", "APPROVED", "REJECTED"] as const;

export default function Payments() {
  const { profile } = useAuth();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);
  const [orgError, setOrgError] = useState<string | null>(null);

  const [payments, setPayments] = useState<Payment[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrg = useCallback(async () => {
    if (!profile) return;
    setOrgLoading(true);
    const { data, error } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", profile.id)
      .maybeSingle();
    if (error) setOrgError(error.message);
    else if (!data?.organization_id) setOrgError("You are not a member of any organization.");
    else setOrgId(data.organization_id);
    setOrgLoading(false);
  }, [profile]);

  useEffect(() => {
    loadOrg();
  }, [loadOrg]);

  const loadPayments = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    let query = supabase
      .from("payments")
      .select("*", { count: "exact" })
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (statusFilter !== "ALL") {
      query = query.eq("status", statusFilter);
    }
    const { data, error, count: cnt } = await query;
    if (error) {
      setError(error.message);
    } else {
      setPayments((data ?? []) as Payment[]);
      setCount(cnt ?? 0);
    }
    setLoading(false);
  }, [orgId, page, statusFilter]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  if (orgLoading) return <LoadingSpinner />;
  if (orgError) return <ErrorState message={orgError} onRetry={loadOrg} />;

  return (
    <div>
      <PageHeader title="Payments" subtitle="Your payment history" />

      <div className="mb-4 flex gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === s
                ? "bg-primary-600 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
            onClick={() => {
              setStatusFilter(s);
              setPage(1);
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorState message={error} onRetry={loadPayments} />
      ) : payments.length === 0 ? (
        <EmptyState message={statusFilter === "ALL" ? "No payments yet." : `No ${statusFilter.toLowerCase()} payments.`} />
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Purpose</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Method</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">UTR Reference</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Payment Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Rejection Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-medium text-slate-800">₹{p.amount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{p.payment_purpose}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{p.payment_method}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{p.utr_reference ?? "—"}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {p.payment_date ? new Date(p.payment_date).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-6 py-4"><Badge status={p.status} /></td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {p.status === "REJECTED" && p.rejection_reason ? p.rejection_reason : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
