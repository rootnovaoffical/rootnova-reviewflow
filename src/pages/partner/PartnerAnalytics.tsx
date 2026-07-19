import { useEffect, useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, PieChart, Pie, Cell } from 'recharts'
import { BarChart3, Loader2, AlertCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { listBusinessesByOrg, getReviewSessions, getAnalyticsEvents } from '../../lib/db'
import type { Business, ReviewSession, AnalyticsEvent } from '../../lib/types'
import { FadeIn } from '../../components/Animations'
import { formatDate } from '../../lib/utils'

export function PartnerAnalytics() {
  const { organization } = useAuth()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [sessions, setSessions] = useState<ReviewSession[]>([])
  const [events, setEvents] = useState<AnalyticsEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const orgId = organization?.id

  useEffect(() => {
    if (!orgId) return
    let m = true
    ;(async () => {
      try {
        const b = await listBusinessesByOrg(orgId)
        if (!m) return
        setBusinesses(b)
        const allSessions: ReviewSession[] = []; for (const biz of b) { const s = await getReviewSessions(biz.id); allSessions.push(...s) }
        if (m) setSessions(allSessions)
        const e = await getAnalyticsEvents(); if (m) setEvents(e)
      } catch (e) { if (m) setError(e instanceof Error ? e.message : 'Failed') }
      finally { if (m) setLoading(false) }
    })()
    return () => { m = false }
  }, [orgId])

  const reviewsByBusiness = useMemo(() => businesses.map((b) => ({ name: b.name.length > 12 ? b.name.slice(0, 12) + '…' : b.name, reviews: sessions.filter((s) => s.business_id === b.id).length })).filter((d) => d.reviews > 0), [businesses, sessions])

  const eventTrend = useMemo(() => {
    const byDate: Record<string, { date: string; views: number; submissions: number }> = {}
    for (const e of events) { const d = new Date(e.created_at).toISOString().slice(0, 10); (byDate[d] ??= { date: d, views: 0, submissions: 0 }); if (e.event_type === 'REVIEW_PAGE_VIEWED') byDate[d].views++; if (e.event_type === 'SESSION_SUBMITTED') byDate[d].submissions++ }
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)).slice(-14).map((d) => ({ ...d, date: d.date.slice(5) }))
  }, [events])

  const eventTypeBreakdown = useMemo(() => {
    const types = ['REVIEW_PAGE_VIEWED', 'RATING_SELECTED', 'SESSION_SUBMITTED', 'AI_REVIEW_GENERATED', 'GOOGLE_REVIEW_CLICKED', 'REVIEW_COPIED']
    const colors = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6']
    return types.map((t, i) => ({ name: t.replace(/_/g, ' '), value: events.filter((e) => e.event_type === t).length, color: colors[i] })).filter((d) => d.value > 0)
  }, [events])

  const conversionRate = useMemo(() => { const views = events.filter((e) => e.event_type === 'REVIEW_PAGE_VIEWED').length; const submits = events.filter((e) => e.event_type === 'SESSION_SUBMITTED').length; return views > 0 ? (submits / views) * 100 : 0 }, [events])

  if (loading) return <div className="p-8 text-ink-400">Loading...</div>

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto">
      <FadeIn><div className="flex items-center gap-2 mb-6"><BarChart3 size={22} className="text-brand-400" /><h1 className="text-xl font-bold text-ink-100">Analytics</h1></div></FadeIn>
      {error && <div className="flex items-center gap-2 text-error-400 text-sm bg-error-500/10 border border-error-500/20 rounded-lg px-3 py-2 mb-4"><AlertCircle size={16} /> {error}</div>}

      <div className="grid grid-cols-3 gap-3 mb-4">
        <FadeIn className="glass-card p-4"><div className="text-xs text-ink-400 mb-1">Page Views</div><div className="text-xl font-bold text-ink-100">{events.filter((e) => e.event_type === 'REVIEW_PAGE_VIEWED').length}</div></FadeIn>
        <FadeIn delay={0.05} className="glass-card p-4"><div className="text-xs text-ink-400 mb-1">Reviews Submitted</div><div className="text-xl font-bold text-ink-100">{sessions.length}</div></FadeIn>
        <FadeIn delay={0.1} className="glass-card p-4"><div className="text-xs text-ink-400 mb-1">Conversion Rate</div><div className="text-xl font-bold text-success-400">{conversionRate.toFixed(1)}%</div></FadeIn>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <FadeIn delay={0.15} className="glass-card p-5"><h3 className="text-sm font-semibold text-ink-200 mb-4">Reviews by Business</h3>{reviewsByBusiness.length > 0 ? <ResponsiveContainer width="100%" height={220}><BarChart data={reviewsByBusiness}><CartesianGrid strokeDasharray="3 3" stroke="#252533" /><XAxis dataKey="name" stroke="#5a5a6e" fontSize={11} /><YAxis stroke="#5a5a6e" fontSize={11} allowDecimals={false} /><Tooltip contentStyle={{ background: '#1a1a24', border: '1px solid #252533', borderRadius: '8px' }} /><Bar dataKey="reviews" fill="#6366f1" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer> : <div className="h-[220px] flex items-center justify-center text-ink-400 text-sm">No data</div>}</FadeIn>
        <FadeIn delay={0.2} className="glass-card p-5"><h3 className="text-sm font-semibold text-ink-200 mb-4">Activity Trend (14 days)</h3>{eventTrend.length > 0 ? <ResponsiveContainer width="100%" height={220}><LineChart data={eventTrend}><CartesianGrid strokeDasharray="3 3" stroke="#252533" /><XAxis dataKey="date" stroke="#5a5a6e" fontSize={11} /><YAxis stroke="#5a5a6e" fontSize={11} allowDecimals={false} /><Tooltip contentStyle={{ background: '#1a1a24', border: '1px solid #252533', borderRadius: '8px' }} /><Line type="monotone" dataKey="views" stroke="#6366f1" strokeWidth={2} /><Line type="monotone" dataKey="submissions" stroke="#10b981" strokeWidth={2} /></LineChart></ResponsiveContainer> : <div className="h-[220px] flex items-center justify-center text-ink-400 text-sm">No data</div>}</FadeIn>
      </div>

      <FadeIn delay={0.25} className="glass-card p-5"><h3 className="text-sm font-semibold text-ink-200 mb-4">Event Breakdown</h3>{eventTypeBreakdown.length > 0 ? <ResponsiveContainer width="100%" height={240}><PieChart><Pie data={eventTypeBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e) => `${e.name}: ${e.value}`}>{eventTypeBreakdown.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><Tooltip contentStyle={{ background: '#1a1a24', border: '1px solid #252533', borderRadius: '8px' }} /></PieChart></ResponsiveContainer> : <div className="h-[240px] flex items-center justify-center text-ink-400 text-sm">No events</div>}</FadeIn>
    </div>
  )
}
