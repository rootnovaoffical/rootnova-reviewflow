import { useEffect, useState } from "react";
import AdminShell from "./AdminShell";
import { Loading, EmptyState } from "../../components/States";
import { listHealthScores, listAllAlerts, resolveAlert } from "../../lib/customer-success";
import type { CustomerHealthScore, CustomerSuccessAlert } from "../../lib/types";

type HealthWithOrg = CustomerHealthScore & { organization: { name: string } | null };
type AlertWithOrg = CustomerSuccessAlert & { organization: { name: string } | null };

const riskColors: Record<string, string> = {
  low: "bg-success-500/20 text-success-400",
  medium: "bg-warning-500/20 text-warning-400",
  high: "bg-error-500/20 text-error-400",
  critical: "bg-error-500/30 text-error-300",
};

const severityColors: Record<string, string> = {
  info: "bg-primary-500/20 text-primary-400",
  warning: "bg-warning-500/20 text-warning-400",
  critical: "bg-error-500/20 text-error-400",
};

export default function AdminCustomerSuccess() {
  const [scores, setScores] = useState<HealthWithOrg[]>([]);
  const [alerts, setAlerts] = useState<AlertWithOrg[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listHealthScores(), listAllAlerts()])
      .then(([s, a]) => {
        setScores(s);
        setAlerts(a);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleResolve = async (alertId: string) => {
    await resolveAlert(alertId, "Resolved by admin");
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  };

  return (
    <AdminShell title="Customer Success">
      {loading ? (
        <Loading />
      ) : (
        <div className="space-y-8">
          <div>
            <h2 className="text-lg font-semibold text-slate-200 mb-4">Health Scores</h2>
            {scores.length === 0 ? (
              <EmptyState title="No health scores" message="Health scores are calculated as customers use the platform." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {scores.map((s) => (
                  <div key={s.id} className="glass rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-slate-200">{s.organization?.name ?? "Unknown"}</h3>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${riskColors[s.churn_risk]}`}>
                        {s.churn_risk.toUpperCase()} RISK
                      </span>
                    </div>
                    <div className="flex items-end gap-2 mb-3">
                      <span className={`text-4xl font-bold ${s.health_score >= 70 ? "text-success-400" : s.health_score >= 40 ? "text-warning-400" : "text-error-400"}`}>
                        {s.health_score}
                      </span>
                      <span className="text-sm text-slate-500 mb-1">/ 100</span>
                    </div>
                    <div className="flex gap-4 text-xs text-slate-500">
                      <span>Engagement: <span className="text-slate-300">{s.engagement_level}</span></span>
                      <span>Trend: <span className="text-slate-300">{s.usage_trend}</span></span>
                    </div>
                    <p className="text-xs text-slate-600 mt-2">
                      Last calculated: {new Date(s.last_calculated_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-lg font-semibold text-slate-200 mb-4">Alerts</h2>
            {alerts.length === 0 ? (
              <EmptyState title="No alerts" message="Customer success alerts will appear here." />
            ) : (
              <div className="space-y-3">
                {alerts.map((a) => (
                  <div key={a.id} className="glass rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${severityColors[a.severity]}`}>
                        {a.severity.toUpperCase()}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-slate-200">{a.title}</p>
                        <p className="text-xs text-slate-500">
                          {a.organization?.name ?? "Unknown"} — {a.alert_type.replace(/_/g, " ")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500">{new Date(a.created_at).toLocaleDateString()}</span>
                      {a.status !== "resolved" && (
                        <button
                          onClick={() => handleResolve(a.id)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-success-500/20 text-success-400 hover:bg-success-500/30 transition-colors"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AdminShell>
  );
}
