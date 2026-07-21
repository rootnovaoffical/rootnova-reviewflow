// ============================================================
// MODULE 14 — MOBILE NOTIFICATION CENTER
// Unified notification center reusing engagement notifications
// ============================================================

import { useEffect, useState, useCallback } from "react";
import MobileShell from "../../components/MobileShell";
import { useMobile } from "../../context/MobileContext";
import { fetchNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification } from "../../lib/mobile-notifications";
import type { MobileNotification } from "../../lib/mobile-notifications";
import { timeAgo } from "../../lib/utils";

type CategoryFilter = "all" | "ai" | "reviews" | "campaigns" | "customers" | "enterprise" | "platform" | "security";

export default function MobileNotifications() {
  const { refreshUnread } = useMobile();
  const [notifications, setNotifications] = useState<MobileNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CategoryFilter>("all");

  const load = useCallback(async () => {
    const list = await fetchNotifications(50);
    setNotifications(list);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n));
    refreshUnread();
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true, read_at: n.read_at ?? new Date().toISOString() })));
    refreshUnread();
  };

  const handleDelete = async (id: string) => {
    await deleteNotification(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    refreshUnread();
  };

  const filtered = filter === "all" ? notifications : notifications.filter((n) => n.category === filter);

  const categories: CategoryFilter[] = ["all", "ai", "reviews", "campaigns", "customers", "enterprise", "platform", "security"];
  const categoryIcons: Record<string, string> = {
    ai: "🤖", reviews: "⭐", campaigns: "📣", customers: "👥", enterprise: "🏛️", platform: "🌐", security: "🔒",
  };
  const severityColors: Record<string, string> = {
    info: "text-slate-400", warning: "text-amber-400", critical: "text-rose-400", positive: "text-emerald-400",
  };

  if (loading) return <MobileShell title="Notifications">{skeleton()}</MobileShell>;

  return (
    <MobileShell title="Notifications">
      <div className="space-y-4 page-enter">
        {/* Mark all read */}
        {notifications.some((n) => !n.is_read) && (
          <button onClick={handleMarkAllRead} className="text-xs text-primary-400 hover:text-primary-300">Mark all as read</button>
        )}

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((c) => (
            <button key={c} onClick={() => setFilter(c)} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap capitalize transition-colors ${filter === c ? "bg-primary-500/20 text-primary-300 border border-primary-500/30" : "bg-white/5 text-slate-400 border border-transparent"}`}>{c}</button>
          ))}
        </div>

        {/* Notifications list */}
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-4xl">🔔</span>
            <p className="text-sm text-slate-500 mt-2">No notifications.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((n, i) => (
              <div key={n.id} className={`glass rounded-2xl p-3 animate-fade-up ${!n.is_read ? "border-l-2 border-primary-500/40" : "opacity-70"}`} style={{ animationDelay: `${i * 30}ms` }}>
                <div className="flex items-start gap-3">
                  <span className="text-lg shrink-0">{categoryIcons[n.category] ?? "📢"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="text-sm font-medium text-white truncate">{n.title}</h3>
                      <span className={`text-[10px] shrink-0 ${severityColors[n.severity] ?? "text-slate-400"}`}>{n.severity}</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-2">{n.message}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-600">{timeAgo(n.created_at)}</span>
                      <div className="flex gap-2">
                        {!n.is_read && <button onClick={() => handleMarkRead(n.id)} className="text-[10px] text-primary-400 hover:text-primary-300">Mark read</button>}
                        <button onClick={() => handleDelete(n.id)} className="text-[10px] text-slate-500 hover:text-rose-400">Delete</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MobileShell>
  );
}

function skeleton() {
  return (
    <div className="space-y-2 pt-4">
      {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 bg-white/5 rounded-2xl animate-pulse" />)}
    </div>
  );
}
