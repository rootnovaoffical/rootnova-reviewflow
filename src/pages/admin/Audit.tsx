import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { LoadingSpinner, ErrorState, EmptyState, PageHeader, Pagination } from "../../components/ui";
import type { AuditLog } from "../../lib/types";

const PAGE_SIZE = 50;

export default function Audit() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState("ALL");

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE - 1;

    let query = supabase
      .from("audit_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(start, end);

    if (actionFilter !== "ALL") {
      query = query.eq("action", actionFilter);
    }

    const { data, error: err, count } = await query;

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    setLogs((data ?? []) as AuditLog[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [page, actionFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [actionFilter]);

  return (
    <div>
      <PageHeader title="Audit Logs" subtitle="Track all administrative actions" />

      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm font-medium text-slate-700">Filter by action:</label>
        <select className="input max-w-[240px]" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
          <option value="ALL">All Actions</option>
          <option value="payment.approve">payment.approve</option>
          <option value="payment.reject">payment.reject</option>
          <option value="business.update">business.update</option>
          <option value="organization.create">organization.create</option>
          <option value="organization.update">organization.update</option>
          <option value="subscription.create">subscription.create</option>
          <option value="plan.create">plan.create</option>
          <option value="plan.update">plan.update</option>
          <option value="admin.invite">admin.invite</option>
          <option value="admin.revoke">admin.revoke</option>
        </select>
      </div>

      {loading ? (
        <LoadingSpinner size={32} />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : logs.length === 0 ? (
        <EmptyState message="No audit logs found" />
      ) : (
        <>
          <div className="card overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-600">Actor</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Action</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Target Type</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700">{l.actor_email ?? "—"}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{l.action}</td>
                    <td className="px-4 py-3 text-slate-500">{l.target_type ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(l.created_at).toLocaleString()}</td>
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
