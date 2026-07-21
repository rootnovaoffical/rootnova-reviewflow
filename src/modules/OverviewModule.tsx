import { useState, useEffect } from 'react';
import { Star, HelpCircle, QrCode, MessageSquare, TrendingUp, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge, StatCard } from '../components/UI';

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
  const [avgRating, setAvgRating] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [qrCodesCount, setQrCodesCount] = useState(0);
  const [recentReviews, setRecentReviews] = useState<ReviewSession[]>([]);

  useEffect(() => {
    fetchData();
  }, [businessId]);

  async function fetchData() {
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
      setAvgRating(ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0);
      setTotalQuestions(questionsRes.count ?? 0);
      setQrCodesCount(qrRes.count ?? 0);
      setRecentReviews((recentRes.data as ReviewSession[]) ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  function renderStars(rating: number) {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} className={`w-3.5 h-3.5 ${i <= rating ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'}`} />
        ))}
      </div>
    );
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  if (loading) return <LoadingSpinner label="Loading overview..." />;

  return (
    <div>
      <PageHeader title="Overview" description="Your business at a glance" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Reviews" value={totalReviews} icon={Star} color="blue" />
        <StatCard label="Avg Rating" value={avgRating.toFixed(1)} icon={TrendingUp} color="yellow" />
        <StatCard label="Questions" value={totalQuestions} icon={HelpCircle} color="green" />
        <StatCard label="QR Codes" value={qrCodesCount} icon={QrCode} color="purple" />
      </div>

      <PageHeader title="Recent Reviews" description="Latest 5 reviews" />

      {recentReviews.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No reviews yet" description="Reviews will appear here once customers start submitting feedback." />
      ) : (
        <div className="space-y-3">
          {recentReviews.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    {renderStars(r.rating)}
                    <Badge color={r.ai_status === 'completed' ? 'green' : r.ai_status === 'pending' ? 'yellow' : 'gray'}>
                      {r.ai_status}
                    </Badge>
                  </div>
                  <p className="text-sm text-zinc-300 line-clamp-2">
                    {r.ai_generated_review || <span className="text-zinc-600 italic">No AI review generated yet</span>}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-zinc-500 shrink-0">
                  <Clock className="w-3 h-3" />
                  {formatDate(r.created_at)}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
