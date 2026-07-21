import { useEffect, useState } from "react";
import AdminShell from "./AdminShell";
import { Loading, EmptyState } from "../../components/States";
import { listMonitoringEvents, listIncidents, getSystemHealth } from "../../lib/monitoring";
import type { MonitoringEvent, Incident } from "../../lib/types";
import type { SystemHealthSummary } from "../../lib/monitoring";

const severityColors: Record<string, string> = {
  info: "bg-primary-500/20 text-primary-400",
  warning: "bg-warning-500/20 text-warning-400",
  critical: "bg-error-500/20 text-error-400",
};

const incidentStatusColors: Record<string, string> = {
  active: "bg-error-500/20 text-error-400",
  investigating: "bg-warning-500/20 text-warning-400",
  monitoring: "bg-primary-500/20 text-primary-400",
  resolved: "bg-success-500/20 text-success-400",
};

export default function AdminMonitoring() {
  const [events, setEvents] = useState<MonitoringEvent[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [health, setHealth] = useState<SystemHealthSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listMonitoringEvents(50), listIncidents(), getSystemHealth().catch(() => null)])
      .then(([e, i, h]) => {
        setEvents(e);
        setIncidents(i);
        setHealth(h);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminShell title="System Monitoring">
      {loading ? (
        <Loading />
      ) : (
        <div className="space-y-8">
          {health && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="glass rounded-2xl p-6">
                <p className="text-xs text-slate-400 mb-1">Total Events</p>
                <p className="text-3xl font-bold text-slate-200">{health.totalEvents}</p>
              </div>
              <div className="glass rounded-2xl p-6">
                <p className="text-xs text-slate-400 mb-1">Unresolved</p>
                <p className={`text-3xl font-bold ${health.unresolvedEvents > 0 ? "text-warning-400" : "text-success-400"}`}>{health.unresolvedEvents}</p>
              </div>
              <div className="glass rounded-2xl p-6">
                <p className="text-xs text-slate-400 mb-1">Active Incidents</p>
                <p className={`text-3xl font-bold ${health.activeIncidents > 0 ? "text-error-400" : "text-success-400"}`}>{health.activeIncidents}</p>
              </div>
              <div className="glass rounded-2xl p-6">
                <p className="text-xs text-slate-400 mb-1">Recent Failures</p>
                <p className={`text-3xl font-bold ${health.recentFailures > 5 ? "text-warning-400" : "text-slate-200"}`}>{health.recentFailures}</p>
              </div>
            </div>
          )}

          {health && health.services.length > 0 && (
            <div className="glass rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-slate-200 mb-4">Service Status</h2>
              <div className="space-y-2">
                {health.services.map((s: { name: string; status: "healthy" | "degraded" | "down"; lastEvent: string }) => (
                  <div key={s.name} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                    <span className="text-sm text-slate-300">{s.name}</span>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${s.status === "healthy" ? "bg-success-500/20 text-success-400" : s.status === "degraded" ? "bg-warning-500/20 text-warning-400" : "bg-error-500/20 text-error-400"}`}>
                      {s.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="text-lg font-semibold text-slate-200 mb-4">Incidents</h2>
            {incidents.length === 0 ? (
              <EmptyState title="No incidents" message="Production incidents will be tracked here." />
            ) : (
              <div className="space-y-3">
                {incidents.map((inc) => (
                  <div key={inc.id} className="glass rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-slate-200">{inc.title}</h3>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${incidentStatusColors[inc.status]}`}>
                        {inc.status.toUpperCase()}
                      </span>
                    </div>
                    {inc.description && <p className="text-xs text-slate-500 mb-2">{inc.description}</p>}
                    <div className="flex gap-4 text-xs text-slate-500">
                      <span>Severity: <span className="text-slate-300">{inc.severity}</span></span>
                      <span>Started: <span className="text-slate-300">{new Date(inc.started_at).toLocaleString()}</span></span>
                      {inc.resolved_at && <span>Resolved: <span className="text-slate-300">{new Date(inc.resolved_at).toLocaleString()}</span></span>}
                    </div>
                    {inc.affected_services.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {inc.affected_services.map((s) => (
                          <span key={s} className="text-xs px-2 py-0.5 rounded bg-slate-700/50 text-slate-400">{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-lg font-semibold text-slate-200 mb-4">Recent Events</h2>
            {events.length === 0 ? (
              <EmptyState title="No monitoring events" message="System events will appear here." />
            ) : (
              <div className="glass rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/50 text-left text-slate-400">
                      <th className="px-4 py-3 font-medium">Service</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Severity</th>
                      <th className="px-4 py-3 font-medium">Message</th>
                      <th className="px-4 py-3 font-medium">Time</th>
                      <th className="px-4 py-3 font-medium">Resolved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((e) => (
                      <tr key={e.id} className="border-b border-slate-700/30 hover:bg-slate-800/30">
                        <td className="px-4 py-3 text-slate-300">{e.service_name}</td>
                        <td className="px-4 py-3 text-slate-400">{e.event_type}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${severityColors[e.severity]}`}>
                            {e.severity.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 max-w-xs truncate">{e.message}</td>
                        <td className="px-4 py-3 text-slate-500">{new Date(e.created_at).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          {e.is_resolved ? (
                            <span className="text-xs text-success-400">Yes</span>
                          ) : (
                            <span className="text-xs text-warning-400">No</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminShell>
  );
}
