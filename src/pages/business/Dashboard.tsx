import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { LoadingSpinner, ErrorState, EmptyState, PageHeader } from "../../components/ui";
import type { ReviewSession } from "../../lib/types";

export default function Dashboard() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [totalReviews, setTotalReviews] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [recentReviews, setRecentReviews] = useState<ReviewSession[]>([]);
  const [distribution, setDistribution] = useState<Record<number, number>>({
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0,
  });

  useEffect(() => {
    if (!profile) return;
    loadDashboard();
  }, [profile]);

  async function loadDashboard() {
    if (!profile) return;
    setLoading(true);
    setError(null);

    const { data: baData } = await supabase
      .from("business_admins")
      .select("business_id")
      .eq("user_id", profile.id)
      .maybeSingle();

    const businessId = baData?.business_id;
    if (!businessId) {
      setError("No business assigned to your account.");
      setLoading(false);
      return;
    }

    const { data: bizData } = await supabase
      .from("businesses")
      .select("name")
      .eq("id", businessId)
      .maybeSingle();
    if (bizData) setBusinessName(bizData.name);

    const { data: sessions, error: sessError } = await supabase
      .from("review_sessions")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });

    if (sessError) {
      setError(sessError.message);
      setLoading(false);
      return;
    }

    const all = sessions ?? [];
    setTotalReviews(all.length);
    setRecentReviews(all.slice(0, 5));

    if (all.length > 0) {
      const sum = all.reduce((acc, s) => acc + (s.rating || 0), 0);
      setAvgRating(Math.round((sum / all.length) * 10) / 10);
    }

    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    all.forEach((s) => {
      const r = s.rating;
      if (r >= 1 && r <= 5) dist[r]++;
    });
    setDistribution(dist);
    setLoading(false);
  }

  if (loading) return <LoadingSpinner size={40} />;
  if (error) return <ErrorState message={error} onRetry={loadDashboard} />;

  const maxDist = Math.max(...Object.values(distribution), 1);

  return (
    <div>
      <PageHeader title="Dashboard" subtitle={businessName ? `Overview for ${businessName}` : "Business overview"} />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="card p-6">
          <p className="text-sm font-medium text-slate-500">Total Reviews</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{totalReviews}</p>
        </div>
        <div className="card p-6">
          <p className="text-sm font-medium text-slate-500">Average Rating</p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-bold text-slate-900">{avgRating.toFixed(1)}</span>
            <span className="text-lg text-slate-400">/ 5</span>
          </div>
        </div>
        <div className="card p-6">
          <p className="text-sm font-medium text-slate-500">Rating Distribution</p>
          <div className="mt-3 space-y-2">
            {[5, 4, 3, 2, 1].map((star) => (
              <div key={star} className="flex items-center gap-2">
                <span className="w-4 text-xs font-medium text-slate-500">{star}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-amber-400"
                    style={{ width: `${(distribution[star] / maxDist) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right text-xs text-slate-500">{distribution[star]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Recent Reviews</h2>
        {recentReviews.length === 0 ? (
          <EmptyState message="No reviews yet." />
        ) : (
          <div className="space-y-3">
            {recentReviews.map((review) => (
              <div key={review.id} className="card p-4">
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
                        {new Date(review.created_at).toLocaleDateString()}
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
        )}
      </div>
    </div>
  );
}
