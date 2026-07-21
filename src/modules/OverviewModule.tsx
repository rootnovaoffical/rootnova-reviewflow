import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Star, TrendingUp, MessageSquare, Users } from 'lucide-react';

interface Props {
  businessId: string;
}

export default function OverviewModule({ businessId }: Props) {
  const [stats, setStats] = useState({ total: 0, avgRating: 0, completed: 0, pending: 0 });
  const [recent, setRecent] = useState<{ id: string; rating: number | null; ai_generated_review: string | null; created_at: string; ai_status: string | null }[]>([]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('review_sessions')
        .select('id, rating, ai_generated_review, created_at, ai_status')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(100);

      const rows = (data || []) as typeof recent;
      const total = rows.length;
      const rated = rows.filter((r) => r.rating != null);
      const avg = rated.length ? rated.reduce((s, r) => s + (r.rating || 0), 0) / rated.length : 0;
      const completed = rows.filter((r) => r.ai_status === 'completed').length;
      const pending = rows.filter((r) => r.ai_status === 'pending' || r.ai_status === 'processing').length;

      setStats({ total, avgRating: avg, completed, pending });
      setRecent(rows.slice(0, 5));
    }
    load();
  }, [businessId]);

  const cards = [
    { label: 'Total Reviews', value: stats.total, icon: MessageSquare, color: 'text-blue-400' },
    { label: 'Avg Rating', value: stats.avgRating.toFixed(1), icon: Star, color: 'text-amber-400' },
    { label: 'Completed', value: stats.completed, icon: TrendingUp, color: 'text-emerald-400' },
    { label: 'Pending', value: stats.pending, icon: Users, color: 'text-orange-400' },
  ];

  const distribution = [5, 4, 3, 2, 1].map((rating) => {
    const count = recent.filter((r) => r.rating === rating).length;
    return { rating, count };
  });
  const maxDist = Math.max(...distribution.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl bg-white/[0.03] border border-white/10 p-5">
            <div className="flex items-center justify-between mb-3">
              <c.icon className={`w-5 h-5 ${c.color}`} />
            </div>
            <div className="text-2xl font-bold text-white">{c.value}</div>
            <div className="text-xs text-zinc-400 mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-xl bg-white/[0.03] border border-white/10 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Rating Distribution</h3>
          <div className="space-y-3">
            {distribution.map((d) => (
              <div key={d.rating} className="flex items-center gap-3">
                <span className="text-xs text-zinc-400 w-8">{d.rating}★</span>
                <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full transition-all" style={{ width: `${(d.count / maxDist) * 100}%` }} />
                </div>
                <span className="text-xs text-zinc-400 w-6 text-right">{d.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-white/[0.03] border border-white/10 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Recent Reviews</h3>
          {recent.length === 0 ? (
            <p className="text-sm text-zinc-500">No reviews yet.</p>
          ) : (
            <div className="space-y-3">
              {recent.map((r) => (
                <div key={r.id} className="flex items-start gap-3 pb-3 border-b border-white/5 last:border-0">
                  <Star className="w-4 h-4 text-zinc-500 mt-1 shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white font-medium">Review</span>
                      {r.rating != null && <span className="text-xs text-amber-400">{r.rating}★</span>}
                      {r.ai_status && <span className="text-xs text-zinc-500">· {r.ai_status}</span>}
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{r.ai_generated_review || 'No review text'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
