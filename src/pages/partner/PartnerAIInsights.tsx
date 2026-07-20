import { useEffect, useState, useMemo } from 'react'
import { Sparkles, AlertCircle, Star, TrendingUp, TrendingDown, Lightbulb } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { listBusinessesByOrg, getReviewSessions } from '../../lib/db'
import type { Business, ReviewSession } from '../../lib/types'
import { FadeIn, StaggerContainer, StaggerItem } from '../../components/Animations'
import { timeAgo } from '../../lib/utils'

export function PartnerAIInsights() {
  const { organization } = useAuth()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [sessions, setSessions] = useState<ReviewSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const orgId = organization?.id

  useEffect(() => {
    if (!orgId) return
    let m = true
    ;(async () => {
      try { const b = await listBusinessesByOrg(orgId); if (!m) return; setBusinesses(b); const all: ReviewSession[] = []; for (const biz of b) { const s = await getReviewSessions(biz.id); all.push(...s) }; if (m) setSessions(all) }
      catch (e) { if (m) setError(e instanceof Error ? e.message : 'Failed') }
      finally { if (m) setLoading(false) }
    })()
    return () => { m = false }
  }, [orgId])

  const insights = useMemo(() => {
    if (sessions.length === 0) return null
    const avgRating = sessions.reduce((s, r) => s + r.rating, 0) / sessions.length
    const last7 = sessions.filter((s) => Date.now() - new Date(s.created_at).getTime() < 7 * 86400000)
    const prev7 = sessions.filter((s) => { const t = Date.now() - new Date(s.created_at).getTime(); return t >= 7 * 86400000 && t < 14 * 86400000 })
    const trend = last7.length > prev7.length ? 'up' : last7.length < prev7.length ? 'down' : 'flat'
    const lowRatings = sessions.filter((s) => s.rating <= 2)
    const highRatings = sessions.filter((s) => s.rating >= 4)
    const responseRate = sessions.filter((s) => s.ai_generated_review).length / sessions.length * 100

    const byBusiness: Record<string, { id: string; name: string; avg: number; count: number }> = {}
    for (const s of sessions) { const b = businesses.find((x) => x.id === s.business_id); if (!b) continue; (byBusiness[b.id] ??= { id: b.id, name: b.name, avg: 0, count: 0 }).avg += s.rating; byBusiness[b.id].count++ }
    const ranked = Object.values(byBusiness).map((b) => ({ ...b, avg: b.avg / b.count })).sort((a, b) => b.avg - a.avg)
    const best = ranked[0]; const worst = ranked[ranked.length - 1]

    return { avgRating, trend, last7Count: last7.length, prev7Count: prev7.length, lowRatings: lowRatings.length, highRatings: highRatings.length, responseRate, best, worst, total: sessions.length }
  }, [sessions, businesses])

  if (loading) return <div className="p-8 text-ink-400">Loading...</div>

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      <FadeIn><div className="flex items-center gap-2 mb-6"><Sparkles size={22} className="text-brand-400" /><h1 className="text-xl font-bold text-ink-100">AI Insights</h1></div></FadeIn>
      {error && <div className="flex items-center gap-2 text-error-400 text-sm bg-error-500/10 border border-error-500/20 rounded-lg px-3 py-2 mb-4"><AlertCircle size={16} /> {error}</div>}

      {!insights ? <FadeIn delay={0.05}><div className="glass-card p-8 text-center"><Sparkles size={32} className="text-ink-500 mx-auto mb-3" /><p className="text-ink-400">No insights yet. Collect some reviews to unlock AI-powered analysis.</p></div></FadeIn> : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <FadeIn className="glass-card p-4"><div className="flex items-center justify-between mb-2"><Star size={18} className="text-amber-400" /><span className="text-xs text-ink-400">Avg Rating</span></div><div className="text-2xl font-bold text-ink-100">{insights.avgRating.toFixed(1)}</div></FadeIn>
            <FadeIn delay={0.05} className="glass-card p-4"><div className="flex items-center justify-between mb-2">{insights.trend === 'up' ? <TrendingUp size={18} className="text-success-400" /> : insights.trend === 'down' ? <TrendingDown size={18} className="text-error-400" /> : <TrendingUp size={18} className="text-ink-500" />}<span className="text-xs text-ink-400">7-day Trend</span></div><div className="text-2xl font-bold text-ink-100">{insights.last7Count}</div><div className="text-xs text-ink-400">vs {insights.prev7Count} prev</div></FadeIn>
            <FadeIn delay={0.1} className="glass-card p-4"><div className="flex items-center justify-between mb-2"><Star size={18} className="text-success-400" /><span className="text-xs text-ink-400">High Ratings</span></div><div className="text-2xl font-bold text-success-400">{insights.highRatings}</div><div className="text-xs text-ink-400">4-5 stars</div></FadeIn>
            <FadeIn delay={0.15} className="glass-card p-4"><div className="flex items-center justify-between mb-2"><Star size={18} className="text-error-400" /><span className="text-xs text-ink-400">Low Ratings</span></div><div className="text-2xl font-bold text-error-400">{insights.lowRatings}</div><div className="text-xs text-ink-400">1-2 stars</div></FadeIn>
          </div>

          <StaggerContainer className="space-y-3 mb-4">
            {insights.best && insights.best.count > 0 && (
              <StaggerItem className="glass-card p-4 flex items-start gap-3"><div className="w-10 h-10 rounded-xl bg-success-500/20 flex items-center justify-center flex-shrink-0"><TrendingUp size={18} className="text-success-400" /></div><div><div className="text-sm font-medium text-ink-100">Top performer: {insights.best.name}</div><div className="text-xs text-ink-400 mt-1">Average rating {insights.best.avg.toFixed(1)} across {insights.best.count} reviews. This location is delivering excellent customer experience.</div></div></StaggerItem>
            )}
            {insights.worst && insights.worst.count > 0 && insights.worst.id !== insights.best?.id && (
              <StaggerItem className="glass-card p-4 flex items-start gap-3"><div className="w-10 h-10 rounded-xl bg-error-500/20 flex items-center justify-center flex-shrink-0"><TrendingDown size={18} className="text-error-400" /></div><div><div className="text-sm font-medium text-ink-100">Needs attention: {insights.worst.name}</div><div className="text-xs text-ink-400 mt-1">Average rating {insights.worst.avg.toFixed(1)} across {insights.worst.count} reviews. Consider staff training or operational review.</div></div></StaggerItem>
            )}
            {insights.lowRatings > 0 && (
              <StaggerItem className="glass-card p-4 flex items-start gap-3"><div className="w-10 h-10 rounded-xl bg-warning-500/20 flex items-center justify-center flex-shrink-0"><Lightbulb size={18} className="text-warning-400" /></div><div><div className="text-sm font-medium text-ink-100">Recovery opportunity</div><div className="text-xs text-ink-400 mt-1">{insights.lowRatings} low-rated review(s) detected. Reach out to these customers directly to resolve issues and turn detractors into promoters.</div></div></StaggerItem>
            )}
            <StaggerItem className="glass-card p-4 flex items-start gap-3"><div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center flex-shrink-0"><Sparkles size={18} className="text-brand-400" /></div><div><div className="text-sm font-medium text-ink-100">AI response coverage</div><div className="text-xs text-ink-400 mt-1">{insights.responseRate.toFixed(0)}% of reviews have AI-generated responses. {insights.responseRate < 100 ? 'Some reviews are missing AI responses — check edge function status.' : 'Full coverage achieved.'}</div></div></StaggerItem>
          </StaggerContainer>

          <FadeIn delay={0.2} className="glass-card p-5"><h3 className="text-sm font-semibold text-ink-200 mb-4">Recent Reviews</h3><div className="space-y-2">{sessions.slice(0, 8).map((s) => { const b = businesses.find((x) => x.id === s.business_id); return (
            <div key={s.id} className="p-3 rounded-xl bg-ink-700/30 border border-ink-600/30"><div className="flex items-center justify-between mb-1"><div className="flex items-center gap-2"><div className="flex">{[1,2,3,4,5].map((i) => <Star key={i} size={11} className={i <= s.rating ? 'text-amber-400 fill-amber-400' : 'text-ink-600'} />)}</div><span className="text-xs text-ink-400">{b?.name}</span></div><span className="text-xs text-ink-500">{timeAgo(s.created_at)}</span></div>{s.ai_generated_review && <p className="text-xs text-ink-300 mt-1 line-clamp-2">{s.ai_generated_review}</p>}</div>
          )})}</div></FadeIn>
        </>
      )}
    </div>
  )
}
