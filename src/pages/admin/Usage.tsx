import { useEffect, useState } from "react";
import AdminShell from "./AdminShell";
import { Loading, EmptyState } from "../../components/States";
import { listAllUsageRecords } from "../../lib/usage";
import type { UsageRecord } from "../../lib/types";

type UsageWithOrg = UsageRecord & { organization: { name: string } | null };

const metricLabels: Record<string, string> = {
  reviews_generated: "Reviews",
  ai_requests: "AI Requests",
  messages_sent: "Messages",
  reports_generated: "Reports",
  qr_scans: "QR Scans",
  customers_stored: "Customers",
  automation_executions: "Automations",
};

export default function AdminUsage() {
  const [records, setRecords] = useState<UsageWithOrg[]>([]);
  void records;
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listAllUsageRecords()
      .then(setRecords)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminShell title="Usage & Limits">
      {loading ? (
        <Loading />
      ) : records.length === 0 ? (
        <EmptyState title="No usage data" message="Usage records will appear as customers use the platform." />
      ) : (
        <div className="space-y-4">
          {records.map((rec) => {
            const metrics = ["reviews_generated", "ai_requests", "messages_sent", "reports_generated", "qr_scans", "customers_stored", "automation_executions"];
            return (
              <div key={rec.id} className="glass rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">{rec.organization?.name ?? "Unknown"}</h3>
                    <p className="text-xs text-slate-500">
                      {new Date(rec.period_start).toLocaleDateString()} — {new Date(rec.period_end).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                  {metrics.map((m) => (
                    <div key={m} className="text-center p-3 rounded-xl bg-slate-800/50">
                      <p className="text-xs text-slate-500 mb-1">{metricLabels[m] ?? m}</p>
                      <p className="text-xl font-bold text-slate-200">{rec[m as keyof UsageRecord] as number}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}
