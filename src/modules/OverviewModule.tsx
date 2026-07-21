import { useEffect, useState } from 'react';
import { Star, MessageSquare, HelpCircle, QrCode, TrendingUp, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge, StatCard } from '../components/UI';

interface ReviewSession {
  id: string;
  rating: number;
  ai_generated_review: string | null;
  ai_status: string;
  created_at: string;
}

interface OverviewStats {
  totalReviews: number;
  avgRating: number;
  totalQuestions: number;
  qrCodesCount: number;
}

export default function OverviewModule({ businessId }: { businessId: string }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<OverviewStats>({
    totalReviews: 0,
    avgRating: 0,
    totalQuestions: 0,
    qrCodesCount: 0,
  });
  const [recentReviews, setRecentReviews] = useState<ReviewSession[]>([]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  async function fetchData() {
    setLoading(true);
    try {
      const [reviewsRes, questionsRes, qrRes] = await Promise.all([
        supabase
          .from('review_sessions')
          .select('id, rating, ai_generated_review, ai_status, created_at')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false }),
        supabase
          .from('questions')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', businessId),
        supabase
          .from('qr_codes')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', businessId),
      ]);

      const reviews = reviewsRes.data || [];
      const ratings = reviews.filter((r) => r.rating != null).map((r) => r.rating);
      const avg = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

      setStats({
        totalReviews: reviews.length,
        avgRating: avg,
        totalQuestions: questionsRes.count || 0,
        qrCodesCount: qrRes.count || 0,
      });
      setRecentReviews(reviews.slice(0, 5));
    } catch (err) {
      console.error('Error fetching overview data:', err);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
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

  if (loading) return <LoadingSpinner label="Loading overview..." />;

  return (
    <div>
      <PageHeader
        title="Dashboard Overview"
        description="A snapshot of your review collection performance"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Reviews" value={stats.totalReviews} icon={MessageSquare} color="blue" />
        <StatCard
          label="Avg Rating"
          value={stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '—'}
          icon={Star}
          color="yellow"
        />
        <StatCard label="Questions" value={stats.totalQuestions} icon={HelpCircle} color="purple" />
        <StatCard label="QR Codes" value={stats.qrCodesCount} icon={QrCode} color="green" />
      </div>

      <PageHeader title="Recent Reviews" description="The 5 most recent review sessions" />

      {recentReviews.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No reviews yet"
          description="Reviews will appear here once customers start submitting feedback."
        />
      ) : (
        <div className="space-y-3">
          {recentReviews.map((review) => (
            <Card key={review.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    {review.rating != null && renderStars(review.rating)}
                    <Badge
                      color={
                        review.ai_status === 'completed'
                          ? 'green'
                          : review.ai_status === 'failed'
                            ? 'red'
                            : 'yellow'
                      }
                    >
                      {review.ai_status}
                    </Badge>
                  </div>
                  <p className="text-sm text-zinc-300 line-clamp-2">
                    {review.ai_generated_review || 'No AI-generated review yet.'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-zinc-500">
                    <Clock className="w-3 h-3" />
                    {formatDate(review.created_at)}
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
