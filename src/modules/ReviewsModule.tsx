import { useEffect, useState } from 'react';
import { Star, MessageSquare, Clock, TrendingUp } from 'lucide-react';
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
  const [stats, setStats] = useState({ total: 0, avgRating: 0, positivePct: 0 });

  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      const list = data || [];
      const rated = list.filter((r) => r.rating != null);
      const avg = rated.length > 0 ? rated.reduce((a, r) => a + r.rating, 0) / rated.length : 0;
      const positive = rated.filter((r) => r.rating >= 4).length;
      const positivePct = rated.length > 0 ? (positive / rated.length) * 100 : 0;

      setReviews(list);
      setStats({ total: list.length, avgRating: avg, positivePct });
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function renderStars(rating: number) {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            className={`w-4 h-4 ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-700'}`}
          />
        ))}
      </div>
    );
  }

  function aiStatusColor(status: string): string {
    if (status === 'completed') return 'green';
    if (status === 'failed') return 'red';
    if (status === 'processing') return 'blue';
    return 'yellow';
  }

  if (loading) return <LoadingSpinner label="Loading reviews..." />;

  return (
    <div>
      <PageHeader
        title="Reviews"
        description="All review sessions collected for this business"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Reviews" value={stats.total} icon={MessageSquare} color="blue" />
        <StatCard
          label="Avg Rating"
          value={stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '—'}
          icon={Star}
          color="yellow"
        />
        <StatCard
          label="Positive (4-5★)"
          value={`${stats.positivePct.toFixed(0)}%`}
          icon={TrendingUp}
          color="green"
        />
      </div>

      {reviews.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No reviews yet"
          description="Reviews will appear here once customers start submitting feedback."
        />
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <Card key={review.id} className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="flex-shrink-0">
                  {review.rating != null ? (
                    <div className="flex flex-col items-center gap-1">
                      {renderStars(review.rating)}
                      <span className="text-xs text-zinc-500">{review.rating}/5</span>
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-600">No rating</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge color={aiStatusColor(review.ai_status)}>{review.ai_status}</Badge>
                    <div className="flex items-center gap-1 text-xs text-zinc-500">
                      <Clock className="w-3 h-3" />
                      {formatDate(review.created_at)}
                    </div>
                  </div>
                  <p className="text-sm text-zinc-300">
                    {review.ai_generated_review || 'No AI-generated review yet.'}
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
