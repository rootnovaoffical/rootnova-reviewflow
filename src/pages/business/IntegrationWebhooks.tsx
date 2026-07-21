import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import BusinessShell from "./BusinessShell";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { SkeletonCard, SkeletonList } from "../../components/Skeleton";
import { ErrorState } from "../../components/States";
import { StatTile } from "../../components/StatTile";
import { timeAgo } from "../../lib/utils";
import { insertAuditLog } from "../../lib/auth";
import {
  fetchWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  fetchWebhookEvents,
  replayWebhookEvent,
  webhookEventStatusMeta,
} from "../../lib/integrations";
import type { Webhook, WebhookEvent } from "../../lib/types";

const WEBHOOK_EVENTS = [
  "review.created", "review.updated", "review.responded",
  "customer.created", "customer.updated",
  "campaign.launched", "campaign.completed",
  "workflow.triggered", "workflow.completed",
  "message.sent", "message.delivered", "message.failed",
  "integration.connected", "integration.disconnected",
  "sync.completed", "sync.failed",
];

export default function IntegrationWebhooks() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null);

  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newEvents, setNewEvents] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      const { data: link, error: linkErr } = await supabase
        .from("business_admins")
        .select("business_id")
        .eq("user_id", profile.id)
        .maybeSingle();
      if (linkErr) throw linkErr;
      if (!link?.business_id) { setLoading(false); return; }
      setBusinessId(link.business_id);

      const [whRes, evRes] = await Promise.all([
        fetchWebhooks(link.business_id),
        fetchWebhookEvents(link.business_id, undefined, 100),
      ]);
      setWebhooks(whRes.data || []);
      setEvents(evRes.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load webhooks");
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!businessId || !profile || !newName.trim() || !newUrl.trim()) return;
    if (newEvents.length === 0) { showToast("Select at least one event", "error"); return; }
    setCreating(true);
    try {
      const { data, error: err } = await createWebhook(businessId, newName, newUrl, newEvents);
      if (err || !data) throw new Error(err || "Failed to create webhook");
      await insertAuditLog({
        actor_id: profile.id, actor_email: profile.email ?? undefined,
        action: "webhook_created", target_type: "webhook", target_id: data.id,
        metadata: { name: newName, url: newUrl, events: newEvents },
      });
      showToast("Webhook created", "success");
      setNewName(""); setNewUrl(""); setNewEvents([]);
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to create webhook", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (wh: Webhook) => {
    const { error } = await updateWebhook(wh.id, { is_active: !wh.is_active });
    if (error) { showToast("Failed to update", "error"); return; }
    setWebhooks((prev) => prev.map((w) => w.id === wh.id ? { ...w, is_active: !w.is_active } : w));
    showToast(`Webhook ${!wh.is_active ? "enabled" : "disabled"}`, "success");
  };

  const handleDelete = async (id: string) => {
    const { error } = await deleteWebhook(id);
    if (error) { showToast("Failed to delete", "error"); return; }
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
    if (selectedWebhook?.id === id) setSelectedWebhook(null);
    showToast("Webhook deleted", "success");
  };

  const handleReplay = async (eventId: string) => {
    const { error } = await replayWebhookEvent(eventId);
    if (error) { showToast("Failed to replay", "error"); return; }
    showToast("Event queued for replay", "success");
    load();
  };

  const filteredEvents = selectedWebhook ? events.filter((e) => e.webhook_id === selectedWebhook.id) : events;

  if (loading) return (
    <BusinessShell title="Webhooks">
      <div className="p-4 md:p-8 space-y-6">
        <SkeletonCard />
        <SkeletonList items={3} />
      </div>
    </BusinessShell>
  );

  if (error) return (
    <BusinessShell title="Webhooks">
      <div className="p-4 md:p-8"><ErrorState message={error} onRetry={load} /></div>
    </BusinessShell>
  );

  return (
    <BusinessShell title="Webhooks">
      <div className="p-4 md:p-8 space-y-6 page-enter">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-up">
          <div>
            <h2 className="text-xl font-bold text-white">Webhook Engine</h2>
            <p className="text-sm text-slate-400 mt-1">Incoming and outgoing webhooks with retry, dead letter queue, and delivery history.</p>
          </div>
          <button onClick={() => navigate("/business/integrations")} className="btn-ghost px-4 py-2.5 text-slate-300 text-sm font-medium rounded-xl">
            ← Back to Integrations
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatTile label="Total Webhooks" value={webhooks.length} icon="🪝" accent="primary" delay={0} />
          <StatTile label="Active" value={webhooks.filter((w) => w.is_active).length} icon="✅" accent="success" delay={80} />
          <StatTile label="Delivered" value={events.filter((e) => e.status === "delivered").length} icon="📦" accent="accent" delay={160} />
          <StatTile label="Failed" value={events.filter((e) => e.status === "failed" || e.status === "dead_letter").length} icon="❌" accent="error" delay={240} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Create webhook */}
          <div className="glass rounded-2xl p-5 animate-fade-up" style={{ animationDelay: "300ms" }}>
            <h3 className="text-sm font-semibold text-white mb-4">Register Webhook</h3>
            <div className="space-y-3">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Webhook name"
                className="input-field w-full px-4 py-2 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none"
              />
              <input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://your-app.com/webhook"
                className="input-field w-full px-4 py-2 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none"
              />
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wide">Events to Subscribe</label>
                <div className="flex flex-wrap gap-2 mt-2 max-h-32 overflow-y-auto">
                  {WEBHOOK_EVENTS.map((evt) => (
                    <button
                      key={evt}
                      onClick={() => setNewEvents((prev) => prev.includes(evt) ? prev.filter((e) => e !== evt) : [...prev, evt])}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${newEvents.includes(evt) ? "bg-primary-600 text-white" : "bg-slate-700 text-slate-400 hover:text-white"}`}
                    >
                      {evt}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={handleCreate} disabled={creating || !newName.trim() || !newUrl.trim()} className="btn-primary px-4 py-2 text-white text-sm font-medium rounded-xl disabled:opacity-50">
                {creating ? "Creating..." : "Register Webhook"}
              </button>
            </div>
          </div>

          {/* Webhook list */}
          <div className="space-y-2 animate-fade-up" style={{ animationDelay: "360ms" }}>
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">Registered Webhooks</h3>
            {webhooks.length === 0 ? (
              <div className="glass rounded-2xl p-6 text-center">
                <p className="text-sm text-slate-500">No webhooks registered yet.</p>
              </div>
            ) : (
              webhooks.map((wh, i) => (
                <div
                  key={wh.id}
                  onClick={() => setSelectedWebhook(selectedWebhook?.id === wh.id ? null : wh)}
                  className={`glass rounded-2xl p-4 cursor-pointer transition-all animate-fade-up ${selectedWebhook?.id === wh.id ? "border-primary-500/30" : ""}`}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-medium text-sm">{wh.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${wh.is_active ? "bg-success-500/15 text-success-400" : "bg-slate-600/15 text-slate-400"}`}>
                          {wh.is_active ? "Active" : "Disabled"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 truncate">{wh.url}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {wh.events.slice(0, 3).map((evt) => (
                          <span key={evt} className="text-xs px-2 py-0.5 rounded bg-primary-500/10 text-primary-300">{evt}</span>
                        ))}
                        {wh.events.length > 3 && <span className="text-xs text-slate-500">+{wh.events.length - 3} more</span>}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleToggle(wh)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors">
                        {wh.is_active ? "Disable" : "Enable"}
                      </button>
                      <button onClick={() => handleDelete(wh.id)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-error-600/20 text-error-400 hover:bg-error-600/30 transition-colors">
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Delivery History */}
        <div className="space-y-3 animate-fade-up" style={{ animationDelay: "420ms" }}>
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">
            Delivery History {selectedWebhook && `— ${selectedWebhook.name}`}
          </h3>
          {filteredEvents.length === 0 ? (
            <div className="glass rounded-2xl p-6 text-center">
              <p className="text-sm text-slate-500">No webhook events recorded.</p>
            </div>
          ) : (
            <div className="glass rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-xs text-slate-400 uppercase tracking-wide">
                      <th className="text-left p-3">Event Type</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Attempts</th>
                      <th className="text-left p-3">Response</th>
                      <th className="text-left p-3">Time</th>
                      <th className="text-left p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvents.map((ev) => {
                      const sm = webhookEventStatusMeta(ev.status);
                      return (
                        <tr key={ev.id} className="border-b border-white/5 hover:bg-white/5">
                          <td className="p-3 text-slate-300 font-mono text-xs">{ev.event_type}</td>
                          <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full ${sm.bg} ${sm.color}`}>{sm.icon} {sm.label}</span></td>
                          <td className="p-3 text-slate-400 tabular-nums">{ev.attempt_count}/{ev.max_attempts}</td>
                          <td className="p-3 text-slate-400">{ev.response_status || "—"}</td>
                          <td className="p-3 text-slate-500">{timeAgo(ev.created_at)}</td>
                          <td className="p-3">
                            {(ev.status === "failed" || ev.status === "dead_letter") && (
                              <button onClick={() => handleReplay(ev.id)} className="text-xs text-primary-300 hover:text-primary-200 font-medium">
                                Replay
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </BusinessShell>
  );
}
