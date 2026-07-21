import { useEffect, useState } from "react";
import AdminShell from "./AdminShell";
import { Loading, EmptyState } from "../../components/States";
import { listDeploymentChecks, upsertDeploymentCheck } from "../../lib/monitoring";
import type { DeploymentCheck, DeploymentCheckStatus } from "../../lib/types";

const statusColors: Record<string, string> = {
  pass: "bg-success-500/20 text-success-400",
  fail: "bg-error-500/20 text-error-400",
  pending: "bg-slate-500/20 text-slate-400",
  warning: "bg-warning-500/20 text-warning-400",
};

const defaultChecks = [
  { category: "Environment", name: "Supabase URL configured" },
  { category: "Environment", name: "Anon key configured" },
  { category: "Environment", name: "Service role key configured" },
  { category: "Database", name: "All migrations applied" },
  { category: "Database", name: "RLS enabled on all tables" },
  { category: "Edge Functions", name: "All edge functions deployed" },
  { category: "Storage", name: "Storage buckets configured" },
  { category: "Security", name: "Authentication enforced" },
  { category: "Security", name: "RBAC roles configured" },
  { category: "Security", name: "Audit logging active" },
  { category: "API", name: "API endpoints secured" },
  { category: "Frontend", name: "TypeScript 0 errors" },
  { category: "Frontend", name: "Production build passes" },
];

export default function AdminDeployment() {
  const [checks, setChecks] = useState<DeploymentCheck[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listDeploymentChecks()
      .then(setChecks)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const checksByCategory = checks.reduce<Record<string, DeploymentCheck[]>>((acc, c) => {
    (acc[c.check_category] ||= []).push(c);
    return acc;
  }, {});

  const passed = checks.filter((c) => c.status === "pass").length;
  const failed = checks.filter((c) => c.status === "fail").length;
  const pending = checks.filter((c) => c.status === "pending").length;
  const warnings = checks.filter((c) => c.status === "warning").length;
  const ready = checks.length > 0 && failed === 0 && pending === 0;

  const handleStatusChange = async (check: DeploymentCheck, newStatus: DeploymentCheckStatus) => {
    const updated = await upsertDeploymentCheck({
      check_category: check.check_category,
      check_name: check.check_name,
      status: newStatus,
    });
    setChecks((prev) => {
      const exists = prev.find((c) => c.id === updated.id);
      if (exists) return prev.map((c) => (c.id === updated.id ? updated : c));
      return [...prev, updated];
    });
  };

  const handleInitDefaults = async () => {
    for (const dc of defaultChecks) {
      await upsertDeploymentCheck({
        check_category: dc.category,
        check_name: dc.name,
        status: "pending" as DeploymentCheckStatus,
      });
    }
    const refreshed = await listDeploymentChecks();
    setChecks(refreshed);
  };

  return (
    <AdminShell title="Deployment Readiness">
      {loading ? (
        <Loading />
      ) : checks.length === 0 ? (
        <div className="text-center py-12">
          <EmptyState title="No deployment checks" message="Initialize the default deployment checklist to get started." />
          <button
            onClick={handleInitDefaults}
            className="mt-4 px-6 py-2.5 rounded-xl bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 transition-colors"
          >
            Initialize Checklist
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-200">Readiness Summary</h2>
              <span className={`text-lg font-bold px-4 py-2 rounded-full ${ready ? "bg-success-500/20 text-success-400" : "bg-warning-500/20 text-warning-400"}`}>
                {ready ? "READY TO DEPLOY" : "NOT READY"}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-success-400">{passed}</p>
                <p className="text-xs text-slate-500">Passed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-error-400">{failed}</p>
                <p className="text-xs text-slate-500">Failed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-warning-400">{warnings}</p>
                <p className="text-xs text-slate-500">Warnings</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-400">{pending}</p>
                <p className="text-xs text-slate-500">Pending</p>
              </div>
            </div>
          </div>

          {Object.entries(checksByCategory).map(([category, items]) => (
            <div key={category} className="glass rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-slate-200 mb-4">{category}</h3>
              <div className="space-y-3">
                {items.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-2 border-b border-slate-700/30 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusColors[c.status]}`}>
                        {c.status.toUpperCase()}
                      </span>
                      <span className="text-sm text-slate-300">{c.check_name}</span>
                      {c.notes && <span className="text-xs text-slate-500">— {c.notes}</span>}
                    </div>
                    <div className="flex gap-1">
                      {(["pass", "fail", "warning", "pending"] as DeploymentCheckStatus[]).map((s) => (
                        <button
                          key={s}
                          onClick={() => handleStatusChange(c, s)}
                          className={`text-xs px-2 py-1 rounded transition-colors ${c.status === s ? statusColors[s] : "text-slate-600 hover:text-slate-400"}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
