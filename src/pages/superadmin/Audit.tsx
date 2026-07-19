import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { PageHeader, Card } from "../../components/Shell";
import { formatDateTime } from "../../lib/utils";
import type { AuditLog } from "../../lib/types";

export default function SuperAdminAudit() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200);
      setLogs((data as AuditLog[]) || []);
      setLoading(false);
    })();
  }, []);
  return (
    <div>
      <PageHeader title="Audit Log" subtitle="Platform activity history" />
      <div className="p-8">
        {loading ? <p className="text-slate-400">Loading…</p> : (
          <Card>
            <div className="space-y-2 max-h-[70vh] overflow-y-auto">
              {logs.map((l) => (
                <div key={l.id} className="flex items-start gap-3 px-3 py-2 rounded-lg bg-slate-800/50">
                  <div className="flex-1 min-w-0"><p className="text-white text-sm">{l.action}</p><p className="text-slate-400 text-xs">{l.actor_email || "—"} · {l.target_type || "—"} {l.target_id ? `· ${l.target_id.slice(0, 8)}` : ""}</p></div>
                  <span className="text-slate-500 text-xs whitespace-nowrap">{formatDateTime(l.created_at)}</span>
                </div>
              ))}
              {logs.length === 0 && <p className="text-slate-500 text-sm">No audit entries.</p>}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
