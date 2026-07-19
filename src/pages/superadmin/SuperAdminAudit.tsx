import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Loading, ErrorState, EmptyState } from "../../components/States";
import { formatDateTime } from "../../lib/utils";
import type { AuditLog } from "../../lib/types";

export function SuperAdminAudit() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) setError(error.message); else setLogs((data as AuditLog[]) || []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <Loading message="Loading audit log…" />;
  if (error) return <ErrorState message={error} />;

  const filtered = search ? logs.filter((l) => l.action.toLowerCase().includes(search.toLowerCase()) || (l.actor_email || "").toLowerCase().includes(search.toLowerCase()) || (l.target_type || "").toLowerCase().includes(search.toLowerCase())) : logs;

  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-2xl font-bold text-ink-50">Audit Log</h1><p className="mt-1 text-sm text-ink-400">All platform activity</p></div>
      <input className="input max-w-md" placeholder="Search by action, actor, or target…" value={search} onChange={(e) => setSearch(e.target.value)} />
      {filtered.length === 0 ? <EmptyState title="No audit entries" message="Activity will appear here as actions are taken." /> : (
        <div className="space-y-2">
          {filtered.map((l) => (
            <div key={l.id} className="card flex items-center justify-between">
              <div><p className="text-sm font-medium text-ink-100">{l.action.replace(/_/g, " ")}</p><p className="text-xs text-ink-400">{l.actor_email || "System"} · {l.target_type || "—"} {l.target_id ? `· ${l.target_id.slice(0, 8)}` : ""}</p></div>
              <span className="text-xs text-ink-400">{formatDateTime(l.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
