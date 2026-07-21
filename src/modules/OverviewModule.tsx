import { useEffect, useState } from 'react';
import { Star, HelpCircle, QrCode, MessageSquare, TrendingUp, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge } from '../components/UI';
import { useToast } from '../context/ToastContext';

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
  qrCount: number;
}

export default function OverviewModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<OverviewStats>({ totalReviews: 0, avgRating: 0, totalQuestions: 0, qrCount: 0 });
  const [recentReviews, setRecentReviews] = useState<ReviewSession[]>([]);

  async function fetchData() {
    setLoading(true);
    try {
      const [reviewsRes, questionsRes, qrRes] = await Promise.all([
        supabase.from('review_sessions').select('id, rating, ai_generated_review, ai_status, created_at').eq('business_id', businessId).order('created_at', { ascending: false }),
        supabase.from('questions').select('id', { count: 'exact', head: true }).eq('business_id', businessId),
        supabase.from('qr_codes').select('id', { count: 'exact', head: true }).eq('business_id', businessId),
      ]);

      if (reviewsRes.error) throw reviewsRes.error;
      if (questionsRes.error) throw questionsRes.error;
      if (qrRes.error) throw qrRes.error;

      const reviews = (reviewsRes.data as ReviewSession[]) ?? [];
      const ratings = reviews.map((r) => r.rating).filter((r) => r != null);
      const avg = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

      setStats({
        totalReviews: reviews.length,
        avgRating: avg,
        totalQuestions: questionsRes.count ?? 0,
        qrCount: qrRes.count ?? 0,
      });
      setRecentReviews(reviews.slice(0, 5));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load overview data';
      showToast('error', msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  function renderStars(rating: number) {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} className={`w-3.5 h-3.5 ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-700'}`} />
        ))}
      </div>
    );
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  if (loading) return <LoadingSpinner label="Loading overview..." />;

  return (
    <div>
      <PageHeader title="Overview" description="Your business at a glance" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-500 mb-1">Total Reviews</p>
              <p className="text-2xl font-bold text-white">{stats.totalReviews}</p>
            </div>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-blue-400 bg-blue-500/10">
              <Star className="w-5 h-5" />
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-500 mb-1">Avg Rating</p>
              <p className="text-2xl font-bold text-white">{stats.avgRating.toFixed(1)}</p>
            </div>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-amber-400 bg-amber-500/10">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-500 mb-1">Total Questions</p>
              <p className="text-2xl font-bold text-white">{stats.totalQuestions}</p>
            </div>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-emerald-400 bg-emerald-500/10">
              <HelpCircle className="w-5 h-5" />
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-500 mb-1">QR Codes</p>
              <p className="text-2xl font-bold text-white">{stats.qrCount}</p>
            </div>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-violet-400 bg-violet-500/10">
              <QrCode className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      <PageHeader title="Recent Reviews" description="Latest 5 review sessions" />
      {recentReviews.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No reviews yet" description="Reviews will appear here once customers start submitting feedback." />
      ) : (
        <div className="space-y-3">
          {recentReviews.map((review) => (
            <Card key={review.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {renderStars(review.rating)}
                    <Badge color={review.ai_status === 'completed' ? 'green' : review.ai_status === 'pending' ? 'yellow' : 'gray'}>
                      {review.ai_status}
                    </Badge>
                    <span className="flex items-center gap-1 text-xs text-zinc-500">
                      <Clock className="w-3 h-3" /> {formatDate(review.created_at)}
                    </span>
                  </div>
                  {review.ai_generated_review ? (
                    <p className="text-sm text-zinc-300 line-clamp-2">{review.ai_generated_review}</p>
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
