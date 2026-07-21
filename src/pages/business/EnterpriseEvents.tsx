import { useEffect, useState } from "react";
import BusinessShell from "./BusinessShell";
import { Card, PageHeader, Badge } from "../../components/Shell";
import { Loading, EmptyState } from "../../components/States";
import { fetchEvents, getUserOrgId, eventSeverityMeta, type EnterpriseEvent } from "../../lib/enterprise";

export default function EnterpriseEvents() {
  const [events, setEvents] = useState<EnterpriseEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    (async () => {
      const orgId = await getUserOrgId();
      if (!orgId) { setLoading(false); return; }
      const data = await fetchEvents(orgId, 100);
      setEvents(data);
      setLoading(false);
    })();
  }, []);

  if (loading) return <BusinessShell title="Events"><Loading /></BusinessShell>;

  const categories = ["all", "branch", "manager", "policy", "campaign", "performance", "review", "risk", "compliance", "system"];
  const filtered = filter === "all" ? events : events.filter((e) => e.event_category === filter);

  return (
    <BusinessShell title="Enterprise Events">
      <PageHeader title="Enterprise Events" subtitle="Platform event log across all locations" />

      <div className="px-4 md:px-8 pb-8 space-y-6">
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${filter === cat ? "bg-primary-600 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState title="No Events" message="No events recorded yet." />
        ) : (
          <div className="space-y-2">
            {filtered.map((event) => {
              const meta = eventSeverityMeta[event.severity] ?? { label: event.severity, color: "slate" };
              return (
                <Card key={event.id}>
                  <div className="flex items-start gap-3">
                    <Badge color={meta.color as "slate" | "blue" | "amber" | "rose" | "emerald"}>{meta.label}</Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm">{event.title}</p>
                      {event.description && <p className="text-slate-400 text-xs mt-1">{event.description}</p>}
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        <span className="capitalize">{event.event_category}</span>
                        <span>·</span>
                        <span className="font-mono">{event.event_type}</span>
                        {event.branch && (<><span>·</span><span>🏪 {event.branch.name}</span></>)}
                        {event.region && (<><span>·</span><span>📍 {event.region.name}</span></>)}
                      </div>
                    </div>
                    <span className="text-slate-500 text-xs whitespace-nowrap">{new Date(event.created_at).toLocaleString()}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </BusinessShell>
  );
}
