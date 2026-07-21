import { useState, useEffect } from 'react';
import { Star, MessageSquare, HelpCircle, QrCode, TrendingUp } from 'lucide-react';
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

interface OverviewModuleProps {
  businessId: string;
}

export default function OverviewModule({ businessId }: OverviewModuleProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<ReviewSession[]>([]);
  const [stats, setStats] = useState({ totalReviews: 0, avgRating: 0, totalQuestions: 0, qrCount: 0 });

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  async function fetchData() {
    setLoading(true);
    try {
      const [reviewsRes, questionsRes, qrRes] = await Promise.all([
        supabase.from('review_sessions').select('id, rating, ai_generated_review, ai_status, created_at').eq('business_id', businessId).order('created_at', { ascending: false }).limit(5),
        supabase.from('review_sessions').select('rating').eq('business_id', businessId),
        supabase.from('questions').select('id', { count: 'exact', head: true }).eq('business_id', businessId),
        supabase.from('qr_codes').select('id', { count: 'exact', head: true }).eq('business_id', businessId),
      ]);

      const allRatings = reviewsRes.data ?? [];
      const recentReviews = allRatings.slice(0, 5);
      const totalReviews = allRatings.length;
      const avgRating = totalReviews > 0 ? allRatings.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews : 0;

      setReviews(recentReviews as ReviewSession[]);
      setStats({
        totalReviews,
        avgRating: parseFloat(avgRating.toFixed(1)),
        totalQuestions: questionsRes.count ?? 0,
        qrCount: qrRes.count ?? 0,
      });
    } catch (err) {
      showToast('error', `Failed to load overview: ${(err as Error).message}`);
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

  if (loading) return <LoadingSpinner label="Loading overview..." />;

  return (
    <div>
      <PageHeader title="Overview" description="Business performance at a glance" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Reviews" value={stats.totalReviews} icon={Star} color="blue" />
        <StatCard label="Avg Rating" value={stats.avgRating || '—'} icon={TrendingUp} color="yellow" />
        <StatCard label="Questions" value={stats.totalQuestions} icon={HelpCircle} color="green" />
        <StatCard label="QR Codes" value={stats.qrCount} icon={QrCode} color="purple" />
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-white">Recent Reviews</h3>
          <Badge color="blue">{reviews.length} of {stats.totalReviews}</Badge>
        </div>

        {reviews.length === 0 ? (
          <EmptyState icon={MessageSquare} title="No reviews yet" description="Reviews will appear here once customers start leaving feedback." />
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <div key={review.id} className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex-shrink-0 mt-0.5">
                  {renderStars(review.rating)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-200 line-clamp-2">
                    {review.ai_generated_review || <span className="text-zinc-500 italic">No AI review generated</span>}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    {review.ai_status && (
                      <Badge color={review.ai_status === 'completed' ? 'green' : review.ai_status === 'pending' ? 'yellow' : 'gray'}>
                        {review.ai_status}
                      </Badge>
                    )}
                    <span className="text-xs text-zinc-500">
                      {new Date(review.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
