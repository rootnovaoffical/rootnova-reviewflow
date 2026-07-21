import { useState, useEffect } from 'react';
import { Star, MessageSquare, TrendingUp, ThumbsUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge, StatCard } from '../components/UI';

interface ReviewSession {
  id: string;
  rating: number;
  ai_generated_review: string | null;
  ai_status: string;
  created_at: string;
}

export default function ReviewsModule({ businessId }: { businessId: string }) {
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<ReviewSession[]>([]);
  const [total, setTotal] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [positivePct, setPositivePct] = useState(0);

  useEffect(() => {
    fetchReviews();
  }, [businessId]);

  async function fetchReviews() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('review_sessions')
        .select('id, rating, ai_generated_review, ai_status, created_at')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const list = (data as ReviewSession[]) ?? [];
      setReviews(list);
      setTotal(list.length);
      const avg = list.length ? list.reduce((a, r) => a + r.rating, 0) / list.length : 0;
      setAvgRating(avg);
      const positive = list.filter((r) => r.rating >= 4).length;
      setPositivePct(list.length ? Math.round((positive / list.length) * 100) : 0);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }

  function renderStars(rating: number) {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} className={`w-4 h-4 ${i <= rating ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'}`} />
        ))}
        <span className="ml-1.5 text-sm font-semibold text-white">{rating}.0</span>
      </div>
    );
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  if (loading) return <LoadingSpinner label="Loading reviews..." />;

  return (
    <div>
      <PageHeader title="Reviews" description="All customer review sessions" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Reviews" value={total} icon={MessageSquare} color="blue" />
        <StatCard label="Avg Rating" value={avgRating.toFixed(1)} icon={TrendingUp} color="yellow" />
        <StatCard label="Positive" value={`${positivePct}%`} icon={ThumbsUp} color="green" />
      </div>

      {reviews.length === 0 ? (
        <EmptyState icon={Star} title="No reviews yet" description="Customer reviews will appear here once they start submitting feedback." />
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                <div className="shrink-0">
                  {renderStars(r.rating)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge color={r.ai_status === 'completed' ? 'green' : r.ai_status === 'pending' ? 'yellow' : r.ai_status === 'processing' ? 'blue' : 'gray'}>
                      {r.ai_status}
                    </Badge>
                    <span className="text-xs text-zinc-500">{formatDate(r.created_at)}</span>
                  </div>
                  <p className="text-sm text-zinc-300">
                    {r.ai_generated_review || <span className="text-zinc-600 italic">No AI review generated yet</span>}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
