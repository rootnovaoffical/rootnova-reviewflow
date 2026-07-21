import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import BusinessShell from "./BusinessShell";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { SkeletonCard, SkeletonStatGrid, SkeletonList } from "../../components/Skeleton";
import { EmptyState, ErrorState } from "../../components/States";
import { StatTile } from "../../components/StatTile";
import { InfoDot } from "../../components/Tooltip";
import { timeAgo, formatDateTime } from "../../lib/utils";
import { insertAuditLog } from "../../lib/auth";
import {
  fetchMessages,
  fetchProviders,
  fetchProviderConfigs,
  fetchScheduledMessages,
  fetchMessageEvents,
  retryMessage,
  archiveMessage,
  computeAnalytics,
  statusMeta,
  channelMeta,
  eventTypeMeta,
  type CommunicationAnalytics,
} from "../../lib/communication";
import type { Message, CommunicationProvider, ProviderConfig, ScheduledMessage, MessageEvent, MessageStatus, CommunicationChannel } from "../../lib/types";

type StatusFilter = "all" | MessageStatus;
type ChannelFilter = "all" | CommunicationChannel;

export default function BusinessCommunicationHub() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [, setProviders] = useState<CommunicationProvider[]>([]);
  const [, setProviderConfigs] = useState<ProviderConfig[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Message | null>(null);
  const [events, setEvents] = useState<MessageEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    setError(null);
    setLoading(true);
    try {
      const { data: link, error: linkErr } = await supabase
        .from("business_admins")
        .select("business_id")
        .eq("user_id", profile.id)
        .maybeSingle();
      if (linkErr) throw linkErr;
      if (!link?.business_id) { setMessages([]); setLoading(false); return; }
      setBusinessId(link.business_id);

      const [msgRes, provRes, configRes, schedRes] = await Promise.all([
        fetchMessages(link.business_id, { limit: 200 }),
        fetchProviders(),
        fetchProviderConfigs(link.business_id),
        fetchScheduledMessages(link.business_id),
      ]);
      if (msgRes.error) throw new Error(msgRes.error);
      if (provRes.error) throw new Error(provRes.error);
      if (configRes.error) throw new Error(configRes.error);
      if (schedRes.error) throw new Error(schedRes.error);
      setMessages(msgRes.data || []);
      setProviders(provRes.data || []);
      setProviderConfigs(configRes.data || []);
      setScheduled(schedRes.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load communication hub");
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const analytics: CommunicationAnalytics = useMemo(() => computeAnalytics(messages), [messages]);

  const filtered = useMemo(() => {
    let result = messages;
    if (statusFilter !== "all") result = result.filter((m) => m.status === statusFilter);
    if (channelFilter !== "all") result = result.filter((m) => m.channel === channelFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((m) =>
        m.body.toLowerCase().includes(q) ||
        m.recipient_identifier.toLowerCase().includes(q) ||
        (m.recipient_name?.toLowerCase().includes(q) ?? false) ||
        (m.subject?.toLowerCase().includes(q) ?? false),
      );
    }
    return result;
  }, [messages, statusFilter, channelFilter, search]);

  const loadEvents = useCallback(async (messageId: string) => {
    if (!businessId) return;
    setEventsLoading(true);
    const { data } = await fetchMessageEvents(businessId, messageId);
    setEvents(data || []);
    setEventsLoading(false);
  }, [businessId]);

  const handleSelectMessage = (msg: Message) => {
    setSelected(msg);
    loadEvents(msg.id);
  };

  const handleRetry = async (msg: Message) => {
    const { error } = await retryMessage(msg.id);
    if (error) { showToast("Failed to retry message", "error"); return; }
    setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, status: "retrying", next_retry_at: new Date(Date.now() + 60000).toISOString() } : m));
    showToast("Message queued for retry", "success");
    if (profile && businessId) {
      await insertAuditLog({ actor_id: profile.id, actor_email: profile.email, action: "message_retried", target_type: "message", target_id: msg.id, metadata: { channel: msg.channel } });
    }
  };

  const handleArchive = async (msg: Message) => {
    const { error } = await archiveMessage(msg.id);
    if (error) { showToast("Failed to archive message", "error"); return; }
    setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, status: "archived" } : m));
    showToast("Message archived", "success");
  };

  if (loading) return (
    <BusinessShell title="Communication">
      <div className="p-4 md:p-8 space-y-6">
        <SkeletonStatGrid />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonList items={4} />
      </div>
    </BusinessShell>
  );

  if (error) return (
    <BusinessShell title="Communication">
      <div className="p-4 md:p-8"><ErrorState message={error} onRetry={load} /></div>
    </BusinessShell>
  );

  return (
    <BusinessShell title="Communication">
      <div className="p-4 md:p-8 space-y-6 page-enter">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-up">
          <div>
            <h2 className="text-xl font-bold text-white">Communication Hub</h2>
            <p className="text-sm text-slate-400 mt-1">One unified engine for every message, every channel, every customer.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate("/business/communication/templates")} className="btn-ghost px-4 py-2.5 text-slate-300 text-sm font-medium rounded-xl">
              📝 Templates
            </button>
            <button onClick={() => navigate("/business/communication/analytics")} className="btn-ghost px-4 py-2.5 text-slate-300 text-sm font-medium rounded-xl">
              📊 Analytics
            </button>
          </div>
        </div>

        {/* Overview stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-tile-3d">
            <StatTile label="Total Messages" value={analytics.total} icon="📨" accent="primary" delay={0} />
          </div>
          <div className="stat-tile-3d">
            <div className="relative">
              <StatTile label="Delivery Rate" value={analytics.deliveryRate} suffix="%" icon="✅" accent="success" delay={80} />
              <div className="absolute top-2 right-2"><InfoDot content="Percentage of messages successfully delivered" /></div>
            </div>
          </div>
          <div className="stat-tile-3d">
            <StatTile label="Read Rate" value={analytics.readRate} suffix="%" icon="👁️" accent="accent" delay={160} hint="Of delivered messages" />
          </div>
          <div className="stat-tile-3d">
            <StatTile label="Failed" value={analytics.failed} icon="❌" accent="error" delay={240} hint={`${analytics.retrying} retrying`} />
          </div>
        </div>

        {/* Channel performance + Scheduled */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Channel performance */}
          <div className="glass rounded-2xl p-6 animate-fade-up" style={{ animationDelay: "300ms" }}>
            <h3 className="text-sm font-medium text-slate-400 mb-4">Channel Performance</h3>
            {Object.keys(analytics.byChannel).length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center">No messages sent yet.</p>
            ) : (
              <div className="space-y-3">
                {(Object.keys(analytics.byChannel) as CommunicationChannel[]).map((ch) => {
                  const cm = channelMeta(ch);
                  const stats = analytics.byChannel[ch];
                  return (
                    <div key={ch} className="flex items-center gap-3">
                      <span className="text-sm text-slate-300 w-24 flex items-center gap-1.5 shrink-0">
                        <span>{cm.icon}</span> {cm.label}
                      </span>
                      <div className="flex-1 h-2.5 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-400 transition-all duration-700 ease-out" style={{ width: `${stats.rate}%` }} />
                      </div>
                      <span className="text-sm text-slate-400 w-20 text-right tabular-nums">{stats.delivered}/{stats.total}</span>
                      <span className="text-sm text-success-400 w-12 text-right tabular-nums">{stats.rate}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Scheduled messages */}
          <div className="glass rounded-2xl p-6 animate-fade-up" style={{ animationDelay: "360ms" }}>
            <h3 className="text-sm font-medium text-slate-400 mb-4">Scheduled & Pending</h3>
            {scheduled.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center">No scheduled messages.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {scheduled.slice(0, 8).map((s) => {
                  const msg = (s as any).message as Message | null;
                  return (
                    <div key={s.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/40 border border-white/5">
                      <span className="text-lg shrink-0">{channelMeta(msg?.channel || "in_app").icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{msg?.body?.slice(0, 60) || "Message"}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{formatDateTime(s.scheduled_for)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 animate-fade-up" style={{ animationDelay: "420ms" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search messages..."
            className="input-field flex-1 px-4 py-2 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="input-field px-4 py-2 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="created">Created</option>
            <option value="queued">Queued</option>
            <option value="scheduled">Scheduled</option>
            <option value="sending">Sending</option>
            <option value="delivered">Delivered</option>
            <option value="read">Read</option>
            <option value="clicked">Clicked</option>
            <option value="failed">Failed</option>
            <option value="retrying">Retrying</option>
            <option value="archived">Archived</option>
          </select>
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value as ChannelFilter)}
            className="input-field px-4 py-2 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm"
          >
            <option value="all">All Channels</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="sms">SMS</option>
            <option value="email">Email</option>
            <option value="push">Push</option>
            <option value="in_app">In-App</option>
          </select>
        </div>

        {/* Message list */}
        {filtered.length === 0 ? (
          messages.length === 0 ? (
            <div className="glass rounded-2xl p-8 text-center animate-fade-up" style={{ animationDelay: "460ms" }}>
              <div className="text-4xl mb-3">📨</div>
              <h3 className="text-lg font-semibold text-white mb-2">No messages yet</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                Messages will appear here once you start sending through any channel. The communication engine tracks every message lifecycle automatically.
              </p>
            </div>
          ) : (
            <EmptyState title="No messages match your filters" subtitle="Try different filters or search terms." />
          )
        ) : (
          <div className="space-y-2">
            {filtered.slice(0, 50).map((msg, i) => {
              const sm = statusMeta(msg.status);
              const cm = channelMeta(msg.channel);
              return (
                <div
                  key={msg.id}
                  className="glass rounded-xl p-4 card-hover cursor-pointer animate-fade-up flex items-center gap-4"
                  style={{ animationDelay: `${i * 20}ms` }}
                  onClick={() => handleSelectMessage(msg)}
                >
                  <span className="text-lg shrink-0">{cm.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sm.bg} ${sm.color} shrink-0`}>{sm.label}</span>
                      <span className="text-xs text-slate-500 shrink-0">{cm.label}</span>
                    </div>
                    <p className="text-sm text-slate-200 line-clamp-1">{msg.subject ? `${msg.subject}: ` : ""}{msg.body}</p>
                    <p className="text-xs text-slate-600 mt-0.5">To: {msg.recipient_name || msg.recipient_identifier} · {timeAgo(msg.created_at)}</p>
                  </div>
                  {msg.retry_count > 0 && (
                    <span className="text-xs text-warning-400 shrink-0">↻ {msg.retry_count}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Message detail panel */}
      {selected && (
        <MessageDetailPanel
          message={selected}
          events={events}
          eventsLoading={eventsLoading}
          onClose={() => setSelected(null)}
          onRetry={() => handleRetry(selected)}
          onArchive={() => handleArchive(selected)}
        />
      )}
    </BusinessShell>
  );
}

function MessageDetailPanel({ message, events, eventsLoading, onClose, onRetry, onArchive }: {
  message: Message;
  events: MessageEvent[];
  eventsLoading: boolean;
  onClose: () => void;
  onRetry: () => void;
  onArchive: () => void;
}) {
  const sm = statusMeta(message.status);
  const cm = channelMeta(message.channel);
  const canRetry = message.status === "failed";
  const canArchive = message.status !== "archived";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
      <div className="glass-strong rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto page-enter" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sm.bg} ${sm.color}`}>{sm.icon} {sm.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cm.bg} ${cm.color}`}>{cm.icon} {cm.label}</span>
              {message.retry_count > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-warning-500/15 text-warning-400">↻ {message.retry_count} retries</span>
              )}
            </div>
            {message.subject && <h3 className="text-lg font-bold text-white mb-1">{message.subject}</h3>}
            <p className="text-xs text-slate-500">To: {message.recipient_name || message.recipient_identifier}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="bg-slate-900/50 rounded-xl p-4 mb-4 border border-white/5">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Message Body</p>
          <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{message.body}</p>
        </div>

        {/* Delivery info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <DeliveryInfo label="Created" value={formatDateTime(message.created_at)} />
          <DeliveryInfo label="Sent" value={message.sent_at ? formatDateTime(message.sent_at) : "—"} />
          <DeliveryInfo label="Delivered" value={message.delivered_at ? formatDateTime(message.delivered_at) : "—"} />
          <DeliveryInfo label="Read" value={message.read_at ? formatDateTime(message.read_at) : "—"} />
        </div>

        {/* Error */}
        {message.error_message && (
          <div className="bg-error-500/10 rounded-xl p-4 mb-4 border border-error-500/20">
            <p className="text-xs text-error-400 uppercase tracking-wide mb-2 font-medium">Error</p>
            <p className="text-slate-200 text-sm leading-relaxed">{message.error_message}</p>
          </div>
        )}

        {/* Provider response */}
        {Object.keys(message.provider_response || {}).length > 0 && (
          <div className="bg-slate-900/40 rounded-xl p-4 mb-4 border border-white/5">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Provider Response</p>
            <pre className="text-xs text-slate-400 overflow-x-auto">{JSON.stringify(message.provider_response, null, 2)}</pre>
          </div>
        )}

        {/* Lifecycle events */}
        <div className="mb-5">
          <h4 className="text-xs text-slate-500 uppercase tracking-wide mb-3">Message Lifecycle</h4>
          {eventsLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
            </div>
          ) : events.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">No lifecycle events recorded.</p>
          ) : (
            <div className="space-y-3">
              {events.map((event) => {
                const em = eventTypeMeta(event.event_type);
                return (
                  <div key={event.id} className="flex items-start gap-3 animate-fade-up">
                    <div className="w-8 h-8 rounded-full bg-slate-800/50 flex items-center justify-center text-sm shrink-0">{em.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${em.color}`}>{em.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{formatDateTime(event.created_at)}{event.latency_ms !== null && ` · ${event.latency_ms}ms`}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {canRetry && (
            <button onClick={onRetry} className="btn-primary px-5 py-2 text-white text-sm font-medium rounded-lg">🔄 Retry</button>
          )}
          {canArchive && (
            <button onClick={onArchive} className="btn-ghost px-5 py-2 text-slate-300 text-sm font-medium rounded-lg">📦 Archive</button>
          )}
        </div>
      </div>
    </div>
  );
}

function DeliveryInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-900/50 rounded-xl p-3 border border-white/5">
      <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-xs text-slate-300 mt-1">{value}</p>
    </div>
  );
}
