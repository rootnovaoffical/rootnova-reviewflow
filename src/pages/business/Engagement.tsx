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
import { timeAgo } from "../../lib/utils";
import { insertAuditLog } from "../../lib/auth";
import {
  fetchCustomers,
  fetchEngagementNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  generateCustomerInsights,
  segmentMeta,
  severityMeta,
  type CustomerInsight,
} from "../../lib/engagement";
import type { Customer, ReviewSession, EngagementNotification, CustomerSegment } from "../../lib/types";

export default function BusinessEngagement() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [reviews, setReviews] = useState<ReviewSession[]>([]);
  const [notifications, setNotifications] = useState<EngagementNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [insights, setInsights] = useState<CustomerInsight[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setError(null);
    setLoading(true);
    try {
      const { data: link, error: linkErr } = await supabase
        .from("business_admins")
        .select("business_id, business:businesses!business_id(name)")
        .eq("user_id", profile.id)
        .maybeSingle();
      if (linkErr) throw linkErr;
      if (!link?.business_id) { setCustomers([]); setReviews([]); setLoading(false); return; }
      setBusinessId(link.business_id);

      const [custRes, revRes, notifRes] = await Promise.all([
        fetchCustomers(link.business_id),
        supabase.from("review_sessions").select("*").eq("business_id", link.business_id).order("created_at", { ascending: false }),
        fetchEngagementNotifications(link.business_id),
      ]);
      if (custRes.error) throw new Error(custRes.error);
      if (revRes.error) throw revRes.error;
      if (notifRes.error) throw new Error(notifRes.error);
      setCustomers(custRes.data || []);
      setReviews((revRes.data || []) as ReviewSession[]);
      setNotifications(notifRes.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load engagement center");
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const total = customers.length;
    const newCount = customers.filter((c) => c.segment === "new").length;
    const returning = customers.filter((c) => c.segment === "returning" || c.segment === "returning_after_long_time").length;
    const loyal = customers.filter((c) => c.segment === "loyal" || c.segment === "vip").length;
    const detractors = customers.filter((c) => c.segment === "detractor").length;
    const needsFollowup = customers.filter((c) => c.segment === "needs_followup").length;
    const unreadNotifs = notifications.filter((n) => !n.is_read).length;
    const reviewConversion = total > 0 ? Math.round((customers.reduce((s, c) => s + c.total_reviews, 0) / total) * 100) : 0;
    return { total, newCount, returning, loyal, detractors, needsFollowup, unreadNotifs, reviewConversion };
  }, [customers, notifications]);

  const segmentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    customers.forEach((c) => { counts[c.segment] = (counts[c.segment] || 0) + 1; });
    return counts;
  }, [customers]);

  const handleAnalyze = async () => {
    if (!businessId || customers.length === 0) return;
    setAnalyzing(true);
    setAnalyzeError(null);
    const result = await generateCustomerInsights({ businessId, customers, reviews });
    if (result.error) {
      setAnalyzeError(result.error);
      setInsights([]);
    } else {
      setInsights(result.insights);
      if (result.message) showToast(result.message, "info");
      else if (result.insights.length > 0) showToast(`${result.insights.length} insight${result.insights.length !== 1 ? "s" : ""} generated`, "success");
      if (profile) {
        await insertAuditLog({
          actor_id: profile.id,
          actor_email: profile.email,
          action: "customer_insights_generated",
          target_type: "business",
          target_id: businessId,
          metadata: { count: result.insights.length },
        });
      }
    }
    setAnalyzing(false);
  };

  const handleMarkNotifRead = async (id: string) => {
    const { error } = await markNotificationRead(id);
    if (error) { showToast("Failed to mark notification", "error"); return; }
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n));
  };

  const handleMarkAllRead = async () => {
    if (!businessId) return;
    const { error } = await markAllNotificationsRead(businessId);
    if (error) { showToast("Failed to mark all notifications", "error"); return; }
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
    showToast("All notifications marked as read", "success");
  };

  if (loading) return (
    <BusinessShell title="Engagement">
      <div className="p-4 md:p-8 space-y-6">
        <SkeletonStatGrid />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonList items={3} />
      </div>
    </BusinessShell>
  );

  if (error) return (
    <BusinessShell title="Engagement">
      <div className="p-4 md:p-8"><ErrorState message={error} onRetry={load} /></div>
    </BusinessShell>
  );

  if (reviews.length === 0 && customers.length === 0) return (
    <BusinessShell title="Engagement">
      <div className="p-4 md:p-8 page-enter">
        <EmptyState
          title="No customer data yet"
          subtitle="Once customers start leaving reviews, the Engagement Center will automatically build customer profiles, segment them, and surface intelligent insights."
          action={<button onClick={() => navigate("/business/qr-codes")} className="btn-primary px-6 py-2.5 text-white text-sm font-medium rounded-xl">Set up QR codes</button>}
        />
      </div>
    </BusinessShell>
  );

  return (
    <BusinessShell title="Engagement">
      <div className="p-4 md:p-8 space-y-6 page-enter">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-up">
          <div>
            <h2 className="text-xl font-bold text-white">Customer Engagement Center</h2>
            <p className="text-sm text-slate-400 mt-1">Understand your customers. Know who to engage. Act with intelligence.</p>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={analyzing || customers.length === 0}
            className="btn-primary px-5 py-2.5 text-white text-sm font-medium rounded-xl whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {analyzing ? "Analyzing..." : "✨ Generate AI Insights"}
          </button>
        </div>

        {/* Overview stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-tile-3d">
            <StatTile label="Total Customers" value={stats.total} icon="👥" accent="primary" delay={0} />
          </div>
          <div className="stat-tile-3d">
            <StatTile label="Loyal Customers" value={stats.loyal} icon="💎" accent="success" delay={80} hint="VIP + Loyal segments" />
          </div>
          <div className="stat-tile-3d">
            <div className="relative">
              <StatTile label="Need Follow-up" value={stats.needsFollowup + stats.detractors} icon="📨" accent="warning" delay={160} hint="Detractors + needs follow-up" />
              <div className="absolute top-2 right-2"><InfoDot content="Customers who left negative feedback or haven't returned" /></div>
            </div>
          </div>
          <div className="stat-tile-3d">
            <StatTile label="Unread Alerts" value={stats.unreadNotifs} icon="🔔" accent="error" delay={240} hint="Smart notifications" />
          </div>
        </div>

        {/* AI Insights panel */}
        {(insights.length > 0 || analyzing || analyzeError) && (
          <div className="glass-strong rounded-2xl p-6 animate-fade-up" style={{ animationDelay: "280ms" }}>
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-2">
                <span className="text-xl">🧠</span>
                <div>
                  <h3 className="text-base font-bold text-white">AI Customer Insights</h3>
                  <p className="text-xs text-slate-500">Based on your actual customer and review data</p>
                </div>
              </div>
            </div>

            {analyzing && (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-3 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
                  <p className="text-sm text-slate-400">Analyzing customer patterns...</p>
                </div>
              </div>
            )}

            {analyzeError && !analyzing && (
              <div className="py-8"><ErrorState message={analyzeError} /></div>
            )}

            {insights.length > 0 && !analyzing && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {insights.map((ins, i) => (
                  <InsightCard key={i} insight={ins} delay={i * 60} />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer segmentation */}
          <div className="glass rounded-2xl p-6 animate-fade-up" style={{ animationDelay: "340ms" }}>
            <h3 className="text-sm font-medium text-slate-400 mb-4">Customer Segmentation</h3>
            {customers.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center">No customers segmented yet.</p>
            ) : (
              <div className="space-y-2">
                {(Object.keys(segmentCounts) as CustomerSegment[]).sort((a, b) => segmentCounts[b] - segmentCounts[a]).map((seg) => {
                  const meta = segmentMeta(seg);
                  const count = segmentCounts[seg];
                  const pct = (count / stats.total) * 100;
                  return (
                    <div key={seg} className="flex items-center gap-3">
                      <span className="text-sm text-slate-300 w-32 flex items-center gap-1.5 shrink-0">
                        <span>{meta.icon}</span> {meta.label}
                      </span>
                      <div className="flex-1 h-2.5 rounded-full bg-white/5 overflow-hidden">
                        <div className={`h-full rounded-full ${meta.bg.replace("/15", "/60")} transition-all duration-700 ease-out`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-sm text-slate-400 w-8 text-right tabular-nums">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Smart notifications */}
          <div className="glass rounded-2xl p-6 animate-fade-up" style={{ animationDelay: "400ms" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-400">Smart Notifications</h3>
              {stats.unreadNotifs > 0 && (
                <button onClick={handleMarkAllRead} className="text-xs text-primary-400 hover:text-primary-300 transition-colors">
                  Mark all read
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-slate-500">No notifications. You're all caught up.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {notifications.slice(0, 10).map((n) => {
                  const sm = severityMeta(n.severity);
                  return (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border ${n.is_read ? "border-white/5 opacity-60" : `${sm.bg} border-white/10`} transition-all hover:scale-[1.01]`}
                    >
                      <span className="text-lg shrink-0">{sm.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">{n.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-xs text-slate-600 mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                      {!n.is_read && (
                        <button onClick={() => handleMarkNotifRead(n.id)} className="text-xs text-primary-400 hover:text-primary-300 shrink-0 transition-colors">
                          Mark read
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quick action cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up" style={{ animationDelay: "460ms" }}>
          <QuickActionCard icon="👥" title="Customers" desc="View customer profiles and timelines" onClick={() => navigate("/business/engagement/customers")} />
          <QuickActionCard icon="⚙️" title="Automations" desc="Create follow-up automation rules" onClick={() => navigate("/business/engagement/automations")} />
          <QuickActionCard icon="📣" title="Campaigns" desc="Launch and track campaigns" onClick={() => navigate("/business/engagement/campaigns")} />
          <QuickActionCard icon="💎" title="Loyalty" desc="Reward your loyal customers" onClick={() => navigate("/business/engagement/loyalty")} />
        </div>
      </div>
    </BusinessShell>
  );
}

function InsightCard({ insight, delay }: { insight: CustomerInsight; delay: number }) {
  const confMeta = insight.confidence === "high"
    ? { color: "text-success-400", bg: "bg-success-500/15" }
    : insight.confidence === "medium"
    ? { color: "text-warning-400", bg: "bg-warning-500/15" }
    : { color: "text-slate-400", bg: "bg-slate-600/15" };

  return (
    <div className="bg-slate-900/40 rounded-xl p-4 border border-white/5 animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between mb-2 gap-2">
        <h4 className="text-sm font-semibold text-white leading-snug">{insight.title}</h4>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${confMeta.bg} ${confMeta.color} shrink-0`}>
          {insight.confidence}
        </span>
      </div>
      <p className="text-slate-300 text-sm leading-relaxed mb-3">{insight.insight}</p>
      <div className="flex items-start gap-1.5 text-xs text-primary-300">
        <span className="shrink-0 mt-0.5">→</span>
        <p className="leading-relaxed">{insight.recommendation}</p>
      </div>
    </div>
  );
}

function QuickActionCard({ icon, title, desc, onClick }: { icon: string; title: string; desc: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="glass rounded-2xl p-5 card-hover text-left group animate-fade-up"
    >
      <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">{icon}</div>
      <h4 className="text-sm font-semibold text-white mb-1">{title}</h4>
      <p className="text-xs text-slate-400">{desc}</p>
    </button>
  );
}
