import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner, EmptyState, PageHeader, Card, StatCard, Badge } from '../components/UI';
import { Star, MessageSquare, HelpCircle, QrCode, Clock } from 'lucide-react';

interface ReviewSession {
  id: string;
  rating: number;
  ai_generated_review: string | null;
  ai_status: string;
  created_at: string;
}

export default function OverviewModule({ businessId }: { businessId: string }) {
  const [loading, setLoading] = useState(true);
  const [totalReviews, setTotalReviews] = useState(0);
  const [avgRating, setAvgRating] = useState<string>('0.0');
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [qrCount, setQrCount] = useState(0);
  const [recentReviews, setRecentReviews] = useState<ReviewSession[]>([]);

  useEffect(() => {
    fetchOverview();
  }, [businessId]);

  async function fetchOverview() {
    setLoading(true);
    try {
      const [reviewsRes, avgRes, questionsRes, qrRes, recentRes] = await Promise.all([
        supabase.from('review_sessions').select('id', { count: 'exact', head: true }).eq('business_id', businessId),
        supabase.from('review_sessions').select('rating').eq('business_id', businessId),
        supabase.from('questions').select('id', { count: 'exact', head: true }).eq('business_id', businessId),
        supabase.from('qr_codes').select('id', { count: 'exact', head: true }).eq('business_id', businessId),
        supabase.from('review_sessions').select('id, rating, ai_generated_review, ai_status, created_at').eq('business_id', businessId).order('created_at', { ascending: false }).limit(5),
      ]);

      setTotalReviews(reviewsRes.count ?? 0);
      const ratings = avgRes.data?.map((r) => r.rating) ?? [];
      setAvgRating(ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : '0.0');
      setTotalQuestions(questionsRes.count ?? 0);
      setQrCount(qrRes.count ?? 0);
      setRecentReviews((recentRes.data ?? []) as ReviewSession[]);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingSpinner label="Loading overview..." />;

  return (
    <div>
      <PageHeader title="Overview" description="Business performance at a glance" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Reviews" value={totalReviews} icon={MessageSquare} color="blue" />
        <StatCard label="Avg Rating" value={avgRating} icon={Star} color="yellow" />
        <StatCard label="Questions" value={totalQuestions} icon={HelpCircle} color="green" />
        <StatCard label="QR Codes" value={qrCount} icon={QrCode} color="purple" />
      </div>

      <PageHeader title="Recent Reviews" description="Latest 5 review sessions" />
      {recentReviews.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No reviews yet" description="Reviews will appear here once customers start submitting feedback." />
      ) : (
        <div className="space-y-3">
          {recentReviews.map((review) => (
            <Card key={review.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`w-4 h-4 ${s <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'}`} />
                      ))}
                    </div>
                    <Badge color={review.ai_status === 'completed' ? 'green' : review.ai_status === 'pending' ? 'yellow' : 'gray'}>
                      {review.ai_status}
                    </Badge>
                  </div>
                  <p className="text-sm text-zinc-300 line-clamp-2">{review.ai_generated_review || 'No AI-generated review'}</p>
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
