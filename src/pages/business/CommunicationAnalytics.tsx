import { useEffect, useState, useMemo, useCallback } from "react";
import BusinessShell from "./BusinessShell";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { SkeletonCard, SkeletonStatGrid } from "../../components/Skeleton";
import { EmptyState, ErrorState } from "../../components/States";
import { StatTile } from "../../components/StatTile";
import { InfoDot } from "../../components/Tooltip";
import { Sparkline } from "../../components/StatTile";
import {
  fetchMessages,
  fetchCommunicationAuditLogs,
  computeAnalytics,
  statusMeta,
  channelMeta,
  type CommunicationAnalytics,
} from "../../lib/communication";
import type { Message, CommunicationAuditLog, CommunicationChannel, MessageStatus } from "../../lib/types";

export default function CommunicationAnalyticsPage() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [auditLogs, setAuditLogs] = useState<CommunicationAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      const [msgRes, auditRes] = await Promise.all([
        fetchMessages(link.business_id, { limit: 500 }),
        fetchCommunicationAuditLogs(link.business_id, 30),
      ]);
      if (msgRes.error) throw new Error(msgRes.error);
      if (auditRes.error) throw new Error(auditRes.error);
      setMessages(msgRes.data || []);
      setAuditLogs(auditRes.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const analytics: CommunicationAnalytics = useMemo(() => computeAnalytics(messages), [messages]);

  // Daily message counts for last 14 days
  const dailyCounts = useMemo(() => {
    const counts: number[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      counts.push(messages.filter((m) => m.created_at.slice(0, 10) === ds).length);
    }
    return counts;
  }, [messages]);

  // Daily delivery counts
  const dailyDelivered = useMemo(() => {
    const counts: number[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      counts.push(messages.filter((m) => ["delivered", "read", "clicked"].includes(m.status) && m.delivered_at?.slice(0, 10) === ds).length);
    }
    return counts;
  }, [messages]);

  if (loading) return (
    <BusinessShell title="Analytics">
      <div className="p-4 md:p-8 space-y-6">
        <SkeletonStatGrid />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </BusinessShell>
  );

  if (error) return (
    <BusinessShell title="Analytics">
      <div className="p-4 md:p-8"><ErrorState message={error} onRetry={load} /></div>
    </BusinessShell>
  );

  if (messages.length === 0) return (
    <BusinessShell title="Analytics">
      <div className="p-4 md:p-8 page-enter">
        <EmptyState
          title="No communication data yet"
          subtitle="Once you start sending messages through any channel, analytics will show delivery rates, open rates, click rates, channel performance, and AI optimization scores."
        />
      </div>
    </BusinessShell>
  );

  return (
    <BusinessShell title="Analytics">
      <div className="p-4 md:p-8 space-y-6 page-enter">
        {/* Header */}
        <div className="animate-fade-up">
          <h2 className="text-xl font-bold text-white">Communication Analytics</h2>
          <p className="text-sm text-slate-400 mt-1">Delivery performance, channel comparison, and AI optimization insights.</p>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-tile-3d">
            <StatTile label="Delivery Rate" value={analytics.deliveryRate} suffix="%" icon="✅" accent="success" delay={0} />
          </div>
          <div className="stat-tile-3d">
            <div className="relative">
              <StatTile label="Read Rate" value={analytics.readRate} suffix="%" icon="👁️" accent="accent" delay={80} hint="Of delivered" />
              <div className="absolute top-2 right-2"><InfoDot content="Percentage of delivered messages that were read" /></div>
            </div>
          </div>
          <div className="stat-tile-3d">
            <StatTile label="Click Rate" value={analytics.clickRate} suffix="%" icon="🖱️" accent="primary" delay={160} hint="Of delivered" />
          </div>
          <div className="stat-tile-3d">
            <StatTile label="Failure Rate" value={analytics.failureRate} suffix="%" icon="❌" accent="error" delay={240} />
          </div>
        </div>

        {/* Activity charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass rounded-2xl p-6 animate-fade-up" style={{ animationDelay: "300ms" }}>
            <h3 className="text-sm font-medium text-slate-400 mb-4">Message Volume</h3>
            <p className="text-3xl font-bold text-white mb-2">{analytics.total} <span className="text-sm font-normal text-slate-500">total messages</span></p>
            <Sparkline data={dailyCounts} />
            <div className="flex justify-between text-xs text-slate-600 mt-2">
              <span>14 days ago</span>
              <span>Today</span>
            </div>
          </div>

          <div className="glass rounded-2xl p-6 animate-fade-up" style={{ animationDelay: "360ms" }}>
            <h3 className="text-sm font-medium text-slate-400 mb-4">Daily Deliveries</h3>
            <p className="text-3xl font-bold text-success-400 mb-2">{analytics.delivered} <span className="text-sm font-normal text-slate-500">delivered</span></p>
            <Sparkline data={dailyDelivered} />
            <div className="flex justify-between text-xs text-slate-600 mt-2">
              <span>14 days ago</span>
              <span>Today</span>
            </div>
          </div>
        </div>

        {/* Status breakdown */}
        <div className="glass rounded-2xl p-6 animate-fade-up" style={{ animationDelay: "420ms" }}>
          <h3 className="text-sm font-medium text-slate-400 mb-4">Status Breakdown</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {(Object.keys(analytics.byStatus) as MessageStatus[]).sort((a, b) => analytics.byStatus[b] - analytics.byStatus[a]).map((status) => {
              const sm = statusMeta(status);
              const count = analytics.byStatus[status];
              const pct = analytics.total > 0 ? Math.round((count / analytics.total) * 100) : 0;
              return (
                <div key={status} className="bg-slate-900/40 rounded-xl p-3 border border-white/5 text-center">
                  <div className="text-lg mb-1">{sm.icon}</div>
                  <p className="text-xs text-slate-500">{sm.label}</p>
                  <p className="text-lg font-bold text-white mt-1">{count}</p>
                  <p className="text-xs text-slate-600">{pct}%</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Channel comparison */}
        <div className="glass rounded-2xl p-6 animate-fade-up" style={{ animationDelay: "480ms" }}>
          <h3 className="text-sm font-medium text-slate-400 mb-4">Channel Comparison</h3>
          <div className="space-y-3">
            {(Object.keys(analytics.byChannel) as CommunicationChannel[]).map((ch) => {
              const cm = channelMeta(ch);
              const stats = analytics.byChannel[ch];
              return (
                <div key={ch} className="flex items-center gap-4">
                  <span className="text-sm text-slate-300 w-24 flex items-center gap-1.5 shrink-0">
                    <span>{cm.icon}</span> {cm.label}
                  </span>
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <p className="text-xs text-slate-500">Sent</p>
                      <p className="text-sm font-bold text-white">{stats.total}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-500">Delivered</p>
                      <p className="text-sm font-bold text-success-400">{stats.delivered}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-500">Failed</p>
                      <p className="text-sm font-bold text-error-400">{stats.failed}</p>
                    </div>
                  </div>
                  <div className="w-24 shrink-0">
                    <div className="h-2.5 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-400 transition-all duration-700" style={{ width: `${stats.rate}%` }} />
                    </div>
                    <p className="text-xs text-slate-500 text-right mt-1">{stats.rate}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent audit logs */}
        {auditLogs.length > 0 && (
          <div className="glass rounded-2xl p-6 animate-fade-up" style={{ animationDelay: "540ms" }}>
            <h3 className="text-sm font-medium text-slate-400 mb-4">Recent Audit Trail</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {auditLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-2 rounded-lg bg-slate-900/30 border border-white/5">
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${log.outcome === "success" ? "bg-success-500/15 text-success-400" : log.outcome === "failure" ? "bg-error-500/15 text-error-400" : "bg-slate-600/15 text-slate-400"}`}>
                    {log.outcome || "pending"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-300">{log.action.replace(/_/g, " ")}</p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {log.actor_type} · {log.channel || "system"} {log.ai_involved && " · AI"} {log.trigger_source && ` · ${log.trigger_source}`}
                    </p>
                  </div>
                  <span className="text-xs text-slate-600 shrink-0">{new Date(log.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </BusinessShell>
  );
}
