import { useEffect, useState, useCallback } from "react";
import Layout from "../../components/Layout";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import type { ReviewSession } from "../../lib/types";
import { Loading, EmptyState } from "../../components/States";
import { formatDateTime } from "../../lib/utils";

const PAGE_SIZE = 20;

export default function BusinessReviews() {
  const { profile } = useAuth();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<ReviewSession[] | null>(null);
  const [filter, setFilter] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  useEffect(() => {
    if (!profile) return;
    supabase.from("business_admins").select("business_id").eq("user_id", profile.id).maybeSingle()
      .then(({ data }) => {
        setBusinessId(data?.business_id ?? null);
        if (!data?.business_id) { setReviews([]); setLoading(false); }
      });
  }, [profile]);

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    let query = supabase.from("review_sessions")
      .select("*", { count: "exact" })
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });
    if (filter) query = query.eq("rating", filter);
    const { data, count } = await query.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    setReviews(data as ReviewSession[] || []);
    setTotal(count || 0);
    setLoading(false);
  }, [businessId, filter, page]);

  useEffect(() => { load(); }, [load]);

  if (loading && !reviews) return <Layout title="Reviews"><Loading /></Layout>;

  return (
    <Layout title="Reviews">
      <div className="flex gap-2 mb-4">
        <button onClick={() => { setFilter(null); setPage(0); }} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === null ? "bg-primary-600 text-white" : "glass text-slate-300 hover:text-white"}`}>All</button>
        {[5, 4, 3, 2, 1].map((s) => (
          <button key={s} onClick={() => { setFilter(s); setPage(0); }} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === s ? "bg-primary-600 text-white" : "glass text-slate-300 hover:text-white"}`}>{"\u2B50".repeat(s)}</button>
        ))}
      </div>
      {reviews && reviews.length === 0 ? <EmptyState title="No reviews" subtitle="Reviews will appear here once customers submit feedback." /> : (
        <>
          <div className="space-y-4">
            {reviews?.map((r) => (
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
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-4">
              <button disabled={page === 0} onClick={() => setPage(page - 1)} className="px-4 py-2 glass text-white text-sm rounded-lg disabled:opacity-40 hover:bg-white/10 transition-colors">Previous</button>
              <span className="text-sm text-slate-400">Page {page + 1} of {totalPages}</span>
              <button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="px-4 py-2 glass text-white text-sm rounded-lg disabled:opacity-40 hover:bg-white/10 transition-colors">Next</button>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
