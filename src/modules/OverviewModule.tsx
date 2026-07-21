import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Star, TrendingUp, Users, MessageSquare, QrCode, Zap, Brain } from 'lucide-react';

interface Props { businessId: string; }

export default function OverviewModule({ businessId }: Props) {
  const [stats, setStats] = useState({ reviews: 0, customers: 0, messages: 0, qrCodes: 0, avgRating: 0, automations: 0 });
  const [recentReviews, setRecentReviews] = useState<{ id?: string; rating: number | null; created_at: string; ai_generated_review: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [reviews, customers, messages, qrCodes, automations] = await Promise.all([
          supabase.from('review_sessions').select('rating, created_at, ai_generated_review').eq('business_id', businessId).order('created_at', { ascending: false }).limit(50),
          supabase.from('customers').select('id', { count: 'exact', head: true }).eq('business_id', businessId),
          supabase.from('messages').select('id', { count: 'exact', head: true }).eq('business_id', businessId),
          supabase.from('qr_codes').select('id', { count: 'exact', head: true }).eq('business_id', businessId),
          supabase.from('automation_rules').select('id', { count: 'exact', head: true }).eq('business_id', businessId),
        ]);
        const reviewData = reviews.data ?? [];
        const ratedReviews = reviewData.filter((r) => r.rating != null);
        const avg = ratedReviews.length > 0 ? ratedReviews.reduce((s, r) => s + (r.rating ?? 0), 0) / ratedReviews.length : 0;
        setStats({ reviews: reviewData.length, customers: customers.count ?? 0, messages: messages.count ?? 0, qrCodes: qrCodes.count ?? 0, avgRating: Math.round(avg * 10) / 10, automations: automations.count ?? 0 });
        setRecentReviews(reviewData.slice(0, 5));
      } catch { /* ignore */ } finally { setLoading(false); }
    }
    load();
  }, [businessId]);

  const cards = [
    { label: 'Total Reviews', value: stats.reviews, icon: Star, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Avg Rating', value: stats.avgRating || '—', icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Customers', value: stats.customers, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Messages', value: stats.messages, icon: MessageSquare, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { label: 'QR Codes', value: stats.qrCodes, icon: QrCode, color: 'text-violet-400', bg: 'bg-violet-500/10' },
    { label: 'Automations', value: stats.automations, icon: Zap, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  ];

  if (loading) return <div className="text-center py-12 text-zinc-500">Loading dashboard…</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl bg-white/[0.03] border border-white/10 p-4">
            <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center mb-3`}><c.icon className={`w-5 h-5 ${c.color}`} /></div>
            <p className="text-2xl font-bold text-white">{c.value}</p><p className="text-xs text-zinc-400 mt-1">{c.label}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl bg-white/[0.03] border border-white/10 p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Brain className="w-4 h-4 text-blue-400" /> Recent Reviews</h3>
        {recentReviews.length === 0 ? <p className="text-sm text-zinc-500">No reviews yet.</p> : (
          <div className="space-y-3">{recentReviews.map((r, i) => (
            <div key={r.id ?? i} className="flex items-start gap-3 pb-3 border-b border-white/5 last:border-0">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${r.rating && r.rating >= 4 ? 'bg-emerald-500/10 text-emerald-400' : r.rating && r.rating <= 2 ? 'bg-red-500/10 text-red-400' : 'bg-zinc-500/10 text-zinc-400'}`}>{r.rating ?? '—'}</div>
              <div className="flex-1 min-w-0"><p className="text-sm text-zinc-300 truncate">{r.ai_generated_review ?? 'No AI review generated'}</p><p className="text-xs text-zinc-500 mt-0.5">{new Date(r.created_at).toLocaleDateString()}</p></div>
            </div>
          ))}</div>
        )}
      </div>
    </div>
  );
}
