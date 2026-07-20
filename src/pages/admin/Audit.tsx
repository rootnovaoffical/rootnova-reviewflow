import { useEffect, useState, useCallback } from "react";
import Layout from "../../components/Layout";
import { supabase } from "../../lib/supabase";
import type { AuditLog } from "../../lib/types";
import { Loading, EmptyState } from "../../components/States";
import { formatDateTime } from "../../lib/utils";

const PAGE_SIZE = 50;

export default function AdminAudit() {
  const [logs, setLogs] = useState<AuditLog[] | null>(null);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, count } = await supabase.from("audit_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    setLogs(data as AuditLog[] || []);
    setTotal(count || 0);
    setLoading(false);
  }, [page]);

  useEffect(() => { load(); }, [load]);

  if (loading && !logs) return <Layout title="Audit Log"><Loading /></Layout>;

  return (
    <Layout title="Audit Log">
      {logs && logs.length === 0 && page === 0 ? <EmptyState title="No audit logs" /> : (
        <>
          <div className="glass rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Actor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Target</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logs?.map((l) => (
                  <tr key={l.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-sm text-white">{l.actor_email || "—"}</td>
                    <td className="px-6 py-4 text-sm text-primary-300">{l.action}</td>
                    <td className="px-6 py-4 text-sm text-slate-400">{l.target_type || "—"}{l.target_id ? ` (${l.target_id.slice(0, 8)})` : ""}</td>
                    <td className="px-6 py-4 text-sm text-slate-400">{formatDateTime(l.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-4">
              <button disabled={page === 0} onClick={() => setPage(page - 1)} className="px-4 py-2 glass text-white text-sm rounded-lg disabled:opacity-40 hover:bg-white/10 transition-colors">Previous</button>
              <span className="text-sm text-slate-400">Page {page + 1} of {totalPages}</span>
              <button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="px-4 py-2 glass text-white text-sm rounded-lg disabled:opacity-40 hover:bg-white/10 transition-colors">Next</button>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
