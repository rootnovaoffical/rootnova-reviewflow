import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge, StatCard } from '../components/UI';
import { Star, MessageSquare, Clock, TrendingUp } from 'lucide-react';

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
  const [avgRating, setAvgRating] = useState('0.0');
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
      const list = (data ?? []) as ReviewSession[];
      setReviews(list);
      setTotal(list.length);
      const ratings = list.map((r) => r.rating);
      setAvgRating(ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : '0.0');
      const positive = ratings.filter((r) => r >= 4).length;
      setPositivePct(ratings.length ? Math.round((positive / ratings.length) * 100) : 0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingSpinner label="Loading reviews..." />;

  return (
    <div>
      <PageHeader title="Reviews" description="All review sessions for this business" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Reviews" value={total} icon={MessageSquare} color="blue" />
        <StatCard label="Avg Rating" value={avgRating} icon={Star} color="yellow" />
        <StatCard label="Positive" value={`${positivePct}%`} icon={TrendingUp} color="green" />
      </div>

      {reviews.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No reviews yet" description="Reviews will appear here once customers start submitting feedback." />
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <Card key={review.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`w-4 h-4 ${s <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'}`} />
                      ))}
                    </div>
                    <span className="text-sm text-zinc-400">{review.rating}/5</span>
                    <Badge color={review.ai_status === 'completed' ? 'green' : review.ai_status === 'pending' ? 'yellow' : 'gray'}>
                      {review.ai_status}
                    </Badge>
                  </div>
                  <p className="text-sm text-zinc-300">{review.ai_generated_review || 'No AI-generated review'}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-zinc-500 whitespace-nowrap">
                  <Clock className="w-3 h-3" />
                  {new Date(review.created_at).toLocaleDateString()}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
