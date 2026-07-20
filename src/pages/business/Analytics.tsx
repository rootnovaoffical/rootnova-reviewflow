import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { Loading, EmptyState, ErrorState } from "../../components/States";

export default function BusinessAnalytics() {
  const { profile } = useAuth();
  const [events, setEvents] = useState<Record<string, number> | null>(null);
  const [dailyData, setDailyData] = useState<{ date: string; count: number }[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    supabase.from("business_admins").select("business_id").eq("user_id", profile.id).maybeSingle()
      .then(({ data, error: baErr }) => {
        if (baErr) { setError(baErr.message); setEvents({}); return; }
        if (!data?.business_id) { setEvents({}); return; }
        supabase.from("analytics_events").select("event_type, created_at").eq("business_id", data.business_id).order("created_at", { ascending: false }).limit(500).then(({ data: rows, error: evErr }) => {
          if (evErr) setError(evErr.message);
          const counts: Record<string, number> = {};
          (rows || []).forEach((r) => { counts[r.event_type] = (counts[r.event_type] || 0) + 1; });
          setEvents(counts);
          const last14: { date: string; count: number }[] = [];
          for (let i = 13; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            const ds = d.toISOString().slice(0, 10);
            last14.push({ date: ds, count: (rows || []).filter((r) => r.created_at.slice(0, 10) === ds).length });
          }
          setDailyData(last14);
        });
      });
  }, [profile]);

  if (!events) return <Layout title="Analytics"><Loading /></Layout>;
  if (error) return <Layout title="Analytics"><ErrorState message={error} /></Layout>;

  const maxCount = Math.max(...dailyData.map((d) => d.count), 1);
  const eventTypes = ["page_view", "review_start", "rating_submitted", "questions_submitted", "ai_completion", "copy_event", "google_click"];

  return (
    <Layout title="Analytics">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {eventTypes.map((t) => (
          <div key={t} className="glass rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">{t.replace(/_/g, " ")}</p>
            <p className="text-2xl font-bold text-white">{events[t] || 0}</p>
          </div>
        ))}
      </div>
      <div className="glass rounded-2xl p-6">
        <h3 className="text-sm font-medium text-slate-400 mb-4">Last 14 Days</h3>
        {dailyData.every((d) => d.count === 0) ? <EmptyState title="No analytics data yet" /> : (
          <div className="flex items-end gap-1 h-48">
            {dailyData.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-gradient-to-t from-primary-600 to-primary-400 rounded-t transition-all" style={{ height: `${(d.count / maxCount) * 100}%`, minHeight: d.count > 0 ? "4px" : "0" }} />
                <span className="text-xs text-slate-500">{d.date.slice(5)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
