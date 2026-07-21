import { useEffect, useState } from 'react';
import { Star, MessageSquare, Clock, CheckCircle2, AlertCircle, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge } from '../components/UI';
import { useToast } from '../context/ToastContext';

interface ReviewSession {
  id: string;
  rating: number;
  ai_generated_review: string | null;
  ai_status: string;
  created_at: string;
  completed_at: string | null;
}

export default function ReviewsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<ReviewSession[]>([]);
  const [stats, setStats] = useState({ total: 0, avgRating: 0, positivePct: 0 });

  async function fetchReviews() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('review_sessions')
        .select('id, rating, ai_generated_review, ai_status, created_at, completed_at')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const list = (data as ReviewSession[]) ?? [];
      setReviews(list);

      const ratings = list.map((r) => r.rating).filter((r) => r != null);
      const avg = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
      const positive = ratings.filter((r) => r >= 4).length;
      const positivePct = ratings.length > 0 ? Math.round((positive / ratings.length) * 100) : 0;

      setStats({ total: list.length, avgRating: avg, positivePct });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load reviews';
      showToast('error', msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  function renderStars(rating: number) {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} className={`w-4 h-4 ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-700'}`} />
        ))}
      </div>
    );
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function statusBadge(status: string) {
    const color = status === 'completed' ? 'green' : status === 'pending' ? 'yellow' : status === 'failed' ? 'red' : 'gray';
    const Icon = status === 'completed' ? CheckCircle2 : status === 'pending' ? Loader : status === 'failed' ? AlertCircle : AlertCircle;
    return (
      <Badge color={color}>
        <span className="flex items-center gap-1">
          <Icon className="w-3 h-3" /> {status}
        </span>
      </Badge>
    );
  }

  if (loading) return <LoadingSpinner label="Loading reviews..." />;

  return (
    <div>
      <PageHeader title="Reviews" description="All customer review sessions" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <p className="text-xs text-zinc-500 mb-1">Total Reviews</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-zinc-500 mb-1">Avg Rating</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold text-white">{stats.avgRating.toFixed(1)}</p>
            {renderStars(Math.round(stats.avgRating))}
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-zinc-500 mb-1">Positive (4-5 ★)</p>
          <p className="text-2xl font-bold text-emerald-400">{stats.positivePct}%</p>
        </Card>
      </div>

      {reviews.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No reviews yet" description="Customer review sessions will appear here once they start submitting feedback." />
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <Card key={review.id} className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    {renderStars(review.rating)}
                    {statusBadge(review.ai_status)}
                    <span className="flex items-center gap-1 text-xs text-zinc-500">
                      <Clock className="w-3 h-3" /> {formatDate(review.created_at)}
                    </span>
                  </div>
                  {review.ai_generated_review ? (
                    <p className="text-sm text-zinc-300">{review.ai_generated_review}</p>
                  ) : (
                    <p className="text-sm text-zinc-600 italic">No AI-generated review yet</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
