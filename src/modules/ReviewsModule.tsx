import { useState, useEffect } from 'react';
import { Star, MessageSquare, TrendingUp, Smile } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge, StatCard } from '../components/UI';

interface ReviewSession {
  id: string;
  rating: number;
  ai_generated_review: string | null;
  ai_status: string | null;
  created_at: string;
}

interface ReviewsModuleProps {
  businessId: string;
}

export default function ReviewsModule({ businessId }: ReviewsModuleProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<ReviewSession[]>([]);
  const [stats, setStats] = useState({ total: 0, avgRating: 0, positivePct: 0 });

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  async function fetchData() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('review_sessions')
        .select('id, rating, ai_generated_review, ai_status, created_at')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const allReviews = data ?? [];
      const total = allReviews.length;
      const avgRating = total > 0 ? allReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / total : 0;
      const positiveCount = allReviews.filter((r) => r.rating >= 4).length;
      const positivePct = total > 0 ? Math.round((positiveCount / total) * 100) : 0;

      setReviews(allReviews as ReviewSession[]);
      setStats({
        total,
        avgRating: parseFloat(avgRating.toFixed(1)),
        positivePct,
      });
    } catch (err) {
      showToast('error', `Failed to load reviews: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  function renderStars(rating: number) {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} className={`w-4 h-4 ${i <= rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-700'}`} />
        ))}
      </div>
    );
  }

  function statusColor(status: string | null): string {
    if (!status) return 'gray';
    if (status === 'completed') return 'green';
    if (status === 'pending') return 'yellow';
    if (status === 'failed') return 'red';
    return 'blue';
  }

  if (loading) return <LoadingSpinner label="Loading reviews..." />;

  return (
    <div>
      <PageHeader title="Reviews" description="Customer review sessions and AI-generated reviews" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Reviews" value={stats.total} icon={MessageSquare} color="blue" />
        <StatCard label="Avg Rating" value={stats.avgRating || '—'} icon={TrendingUp} color="yellow" />
        <StatCard label="Positive (4-5★)" value={`${stats.positivePct}%`} icon={Smile} color="green" />
      </div>

      {reviews.length === 0 ? (
        <Card className="p-5">
          <EmptyState icon={MessageSquare} title="No reviews yet" description="Customer review sessions will appear here once they start flowing in." />
        </Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <Card key={review.id} className="p-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  {renderStars(review.rating)}
                  <p className="text-xs text-zinc-500 mt-1 text-center">{review.rating}/5</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-200 leading-relaxed">
                    {review.ai_generated_review || <span className="text-zinc-500 italic">No AI review generated</span>}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {review.ai_status && (
                      <Badge color={statusColor(review.ai_status)}>
                        AI: {review.ai_status}
                      </Badge>
                    )}
                    <span className="text-xs text-zinc-500">
                      {new Date(review.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
