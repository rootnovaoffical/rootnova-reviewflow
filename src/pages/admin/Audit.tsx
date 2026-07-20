import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import { supabase } from "../../lib/supabase";
import type { AuditLog } from "../../lib/types";
import { Loading, EmptyState } from "../../components/States";
import { formatDateTime } from "../../lib/utils";

export default function AdminAudit() {
  const [logs, setLogs] = useState<AuditLog[] | null>(null);

  useEffect(() => {
    supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100).then(({ data }) => setLogs(data as AuditLog[] || []));
  }, []);

  if (!logs) return <Layout title="Audit Log"><Loading /></Layout>;

  return (
    <Layout title="Audit Log">
      {logs.length === 0 ? <EmptyState title="No audit logs" /> : (
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
              {logs.map((l) => (
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
      )}
    </Layout>
  );
}
