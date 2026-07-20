import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { LoadingSpinner, ErrorState, EmptyState, PageHeader, Pagination } from "../../components/ui";
import type { ReviewSession } from "../../lib/types";

const PAGE_SIZE = 20;

export default function Reviews() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<ReviewSession[]>([]);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [selected, setSelected] = useState<ReviewSession | null>(null);

  useEffect(() => {
    if (!profile) return;
    init();
  }, [profile]);

  async function init() {
    if (!profile) return;
    setLoading(true);
    setError(null);

    const { data: baData } = await supabase
      .from("business_admins")
      .select("business_id")
      .eq("user_id", profile.id)
      .maybeSingle();

    const bizId = baData?.business_id;
    if (!bizId) {
      setError("No business assigned to your account.");
      setLoading(false);
      return;
    }
    setBusinessId(bizId);
    await loadReviews(bizId, 1, null);
  }

  async function loadReviews(bizId: string, pageNum: number, rating: number | null) {
    setLoading(true);
    const from = (pageNum - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let countQuery = supabase
      .from("review_sessions")
      .select("id", { count: "exact", head: true })
      .eq("business_id", bizId);

    let dataQuery = supabase
      .from("review_sessions")
      .select("*")
      .eq("business_id", bizId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (rating !== null) {
      countQuery = countQuery.eq("rating", rating);
      dataQuery = dataQuery.eq("rating", rating);
    }

    const [{ count }, { data, error: dError }] = await Promise.all([countQuery, dataQuery]);

    if (dError) {
      setError(dError.message);
      setLoading(false);
      return;
    }

    setReviews((data ?? []) as ReviewSession[]);
    setTotal(count ?? 0);
    setPage(pageNum);
    setLoading(false);
  }

  function applyFilter(rating: number | null) {
    setRatingFilter(rating);
    if (businessId) loadReviews(businessId, 1, rating);
  }

  function changePage(p: number) {
    if (businessId) loadReviews(businessId, p, ratingFilter);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  if (loading && reviews.length === 0) return <LoadingSpinner size={40} />;
  if (error && reviews.length === 0) return <ErrorState message={error} onRetry={init} />;

  return (
    <div>
      <PageHeader title="Reviews" subtitle={`${total} total reviews`} />

      <div className="mb-4 flex items-center gap-2">
        <button
          className={`btn-secondary text-xs ${ratingFilter === null ? "ring-2 ring-primary-300" : ""}`}
          onClick={() => applyFilter(null)}
        >
          All
        </button>
        {[5, 4, 3, 2, 1].map((r) => (
          <button
            key={r}
            className={`btn-secondary text-xs ${ratingFilter === r ? "ring-2 ring-primary-300" : ""}`}
            onClick={() => applyFilter(r)}
          >
            {r} ★
          </button>
        ))}
      </div>

      {reviews.length === 0 ? (
        <EmptyState message="No reviews found." />
      ) : (
        <>
          <div className="space-y-3">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="card cursor-pointer p-4 transition-shadow hover:shadow-md"
                onClick={() => setSelected(review)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <span
                            key={s}
                            className={s <= review.rating ? "text-amber-400" : "text-slate-200"}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      <span className="text-xs text-slate-400">
                        {new Date(review.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                      {review.ai_generated_review || "AI review not generated yet."}
                    </p>
                  </div>
                  <span
                    className={`badge whitespace-nowrap ${
                      review.ai_status === "completed"
                        ? "bg-green-100 text-green-700"
                        : review.ai_status === "failed"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {review.ai_status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <Pagination page={page} totalPages={totalPages} onPageChange={changePage} />
        </>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="card max-h-[80vh] w-full max-w-2xl overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span
                      key={s}
                      className={s <= selected.rating ? "text-amber-400" : "text-slate-200"}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <span
                  className={`badge ${
                    selected.ai_status === "completed"
                      ? "bg-green-100 text-green-700"
                      : selected.ai_status === "failed"
                      ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {selected.ai_status}
                </span>
              </div>
              <button className="btn-ghost px-2 py-1" onClick={() => setSelected(null)}>
                ✕
              </button>
            </div>

            <div className="mb-4 text-xs text-slate-400">
              {new Date(selected.created_at).toLocaleString()}
              {selected.completed_at && ` · Completed ${new Date(selected.completed_at).toLocaleString()}`}
            </div>

            <div className="mb-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-700">AI-Generated Review</h3>
              <p className="whitespace-pre-wrap text-sm text-slate-600">
                {selected.ai_generated_review || "No AI review was generated."}
              </p>
            </div>

            {selected.answers && Object.keys(selected.answers).length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-700">Answers</h3>
                <pre className="overflow-x-auto rounded-lg bg-slate-50 p-4 text-xs text-slate-600">
                  {JSON.stringify(selected.answers, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
