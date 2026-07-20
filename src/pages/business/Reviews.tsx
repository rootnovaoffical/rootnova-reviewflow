import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import type { ReviewSession } from "../../lib/types";
import { Loading, EmptyState, ErrorState } from "../../components/States";
import { formatDateTime } from "../../lib/utils";

export default function BusinessReviews() {
  const { profile } = useAuth();
  const [reviews, setReviews] = useState<ReviewSession[] | null>(null);
  const [filter, setFilter] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    supabase.from("business_admins").select("business_id").eq("user_id", profile.id).maybeSingle()
      .then(({ data, error: baErr }) => {
        if (baErr) { setError(baErr.message); setReviews([]); return; }
        if (!data?.business_id) { setReviews([]); return; }
        supabase.from("review_sessions").select("*").eq("business_id", data.business_id).order("created_at", { ascending: false }).then(({ data: r, error: rErr }) => {
          if (rErr) setError(rErr.message);
          setReviews((r as ReviewSession[]) || []);
        });
      });
  }, [profile]);

  if (!reviews) return <Layout title="Reviews"><Loading /></Layout>;
  if (error) return <Layout title="Reviews"><ErrorState message={error} /></Layout>;

  const filtered = filter ? reviews.filter((r) => r.rating === filter) : reviews;

  return (
    <Layout title="Reviews">
      <div className="flex gap-2 mb-4">
        <button onClick={() => setFilter(null)} className={`px-3 py-1.5 transition-colors ${filter === null ? "bg-primary-600 text-white" : "glass text-slate-300"}`}>All</button>
        {[5, 4, 3, 2, 1].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 transition-colors ${filter === s ? "bg-primary-600 text-white" : "glass text-slate-300"}`}>{"\u2B50".repeat(s)}</button>
        ))}
      </div>
      {filtered.length === 0 ? <EmptyState title="No reviews" subtitle="Reviews will appear here once customers submit feedback." /> : (
        <div className="space-y-4">
          {filtered.map((r) => (
            <div key={r.id} className="glass rounded-2xl p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="text-2xl">{"\u2B50".repeat(r.rating)}</div>
                <span className={`px-2 py-1 rounded-full text-xs ${r.ai_status === "completed" ? "bg-success-500/20 text-success-400" : "bg-warning-500/20 text-warning-400"}`}>{r.ai_status}</span>
              </div>
              {r.ai_generated_review && <p className="text-slate-200 text-sm leading-relaxed mb-3">{r.ai_generated_review}</p>}
              <p className="text-xs text-slate-500">{formatDateTime(r.created_at)}</p>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
