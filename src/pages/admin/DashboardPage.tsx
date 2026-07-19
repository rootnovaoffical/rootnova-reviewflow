import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, Star, MessageSquare, MousePointerClick, ArrowRight, Activity, Sparkles } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { isRootNovaAdmin } from '../../lib/auth-api'
import { listBusinesses, getReviewSessions, getAnalyticsEvents } from '../../lib/db'
import type { Business, ReviewSession, AnalyticsEvent } from '../../lib/types'
import { FadeIn, StaggerContainer, StaggerItem } from '../../components/Animations'
import { timeAgo } from '../../lib/utils'

interface HealthScore { businessId: string; score: number; ratingAvg: number; reviewCount: number; conversionRate: number; trend: 'up' | 'down' | 'stable' }

export function DashboardPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [sessions, setSessions] = useState<ReviewSession[]>([])
  const [events, setEvents] = useState<AnalyticsEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const biz = await listBusinesses()
        if (!mounted) return
        setBusinesses(biz)
        const allSessions: ReviewSession[] = []
        const allEvents: AnalyticsEvent[] = []
        for (const b of biz) {
          const [s, e] = await Promise.all([getReviewSessions(b.id), getAnalyticsEvents(b.id)])
          allSessions.push(...s); allEvents.push(...e)
        }
        if (!mounted) return
        setSessions(allSessions); setEvents(allEvents)
      } catch { /* ignore */ }
      finally { if (mounted) setLoading(false) }
    })()
    return () => { mounted = false }
  }, [])

  const stats = useMemo(() => {
    const totalReviews = sessions.length
    const avgRating = totalReviews > 0 ? sessions.reduce((sum, s) => sum + s.rating, 0) / totalReviews : 0
    const pageViews = events.filter((e) => e.event_type === 'REVIEW_PAGE_VIEWED').length
    const googleClicks = events.filter((e) => e.event_type === 'GOOGLE_REVIEW_CLICKED').length
    const conversionRate = pageViews > 0 ? (totalReviews / pageViews) * 100 : 0
    return { totalReviews, avgRating, pageViews, googleClicks, conversionRate }
  }, [sessions, events])

  const healthScores = useMemo<HealthScore[]>(() => {
    return businesses.map((b) => {
      const bSessions = sessions.filter((s) => s.business_id === b.id)
      const bEvents = events.filter((e) => e.business_id === b.id)
      const reviewCount = bSessions.length
      const ratingAvg = reviewCount > 0 ? bSessions.reduce((sum, s) => sum + s.rating, 0) / reviewCount : 0
      const views = bEvents.filter((e) => e.event_type === 'REVIEW_PAGE_VIEWED').length
      const conversion = views > 0 ? (reviewCount / views) * 100 : 0
      const ratingScore = (ratingAvg / 5) * 40
      const volumeScore = Math.min(reviewCount / 10, 1) * 30
      const conversionScore = Math.min(conversion / 50, 1) * 30
      const score = Math.round(ratingScore + volumeScore + conversionScore)
      const recent = bSessions.slice(0, 3)
      const older = bSessions.slice(3, 6)
      const recentAvg = recent.length > 0 ? recent.reduce((s, r) => s + r.rating, 0) / recent.length : 0
      const olderAvg = older.length > 0 ? older.reduce((s, r) => s + r.rating, 0) / older.length : 0
      const trend: HealthScore['trend'] = recentAvg > olderAvg ? 'up' : recentAvg < olderAvg ? 'down' : 'stable'
      return { businessId: b.id, score, ratingAvg, reviewCount, conversionRate: conversion, trend }
    })
  }, [businesses, sessions, events])

  const ratingDistribution = useMemo(() => [1, 2, 3, 4, 5].map((r) => ({ rating: `${r}\u2605`, count: sessions.filter((s) => s.rating === r).length })), [sessions])
  const eventBreakdown = useMemo(() => {
    const types = ['REVIEW_PAGE_VIEWED', 'RATING_SELECTED', 'SESSION_SUBMITTED', 'AI_REVIEW_GENERATED', 'GOOGLE_REVIEW_CLICKED', 'REVIEW_COPIED']
    const colors = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6']
    return types.map((t, i) => ({ name: t.replace(/_/g, ' '), value: events.filter((e) => e.event_type === t).length, color: colors[i] })).filter((d) => d.value > 0)
  }, [events])
  const recentReviews = useMemo(() => sessions.slice(0, 5), [sessions])

  if (loading) return <div className="p-8 text-ink-400">Loading dashboard...</div>

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <FadeIn>
        <h1 className="text-2xl font-bold text-ink-100 mb-1">Dashboard</h1>
        <p className="text-ink-400 text-sm mb-6">{isRootNovaAdmin(profile) ? 'Platform overview across all businesses' : 'Your business overview'}</p>
      </FadeIn>

      <StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <StaggerItem className="glass-card p-4">
          <div className="flex items-center justify-between mb-2"><Star size={18} className="text-amber-400" /><span className="text-xs text-ink-400">Avg Rating</span></div>
          <div className="text-2xl font-bold text-ink-100">{stats.avgRating.toFixed(1)}</div>
          <div className="text-xs text-ink-400 mt-1">across {stats.totalReviews} reviews</div>
        </StaggerItem>
        <StaggerItem className="glass-card p-4">
          <div className="flex items-center justify-between mb-2"><MessageSquare size={18} className="text-brand-400" /><span className="text-xs text-ink-400">Total Reviews</span></div>
          <div className="text-2xl font-bold text-ink-100">{stats.totalReviews}</div>
          <div className="text-xs text-ink-400 mt-1">AI-generated</div>
        </StaggerItem>
        <StaggerItem className="glass-card p-4">
          <div className="flex items-center justify-between mb-2"><MousePointerClick size={18} className="text-accent-400" /><span className="text-xs text-ink-400">Page Views</span></div>
          <div className="text-2xl font-bold text-ink-100">{stats.pageViews}</div>
          <div className="text-xs text-ink-400 mt-1">review page visits</div>
        </StaggerItem>
        <StaggerItem className="glass-card p-4">
          <div className="flex items-center justify-between mb-2"><TrendingUp size={18} className="text-success-400" /><span className="text-xs text-ink-400">Conversion</span></div>
          <div className="text-2xl font-bold text-ink-100">{stats.conversionRate.toFixed(0)}%</div>
          <div className="text-xs text-ink-400 mt-1">views to reviews</div>
        </StaggerItem>
      </StaggerContainer>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <FadeIn delay={0.1} className="glass-card p-5">
          <h3 className="text-sm font-semibold text-ink-200 mb-4">Rating Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ratingDistribution}>
              <XAxis dataKey="rating" stroke="#5a5a6e" fontSize={12} />
              <YAxis stroke="#5a5a6e" fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#1a1a24', border: '1px solid #252533', borderRadius: '8px' }} labelStyle={{ color: '#d8d8e5' }} />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </FadeIn>
        <FadeIn delay={0.15} className="glass-card p-5">
          <h3 className="text-sm font-semibold text-ink-200 mb-4">Event Breakdown</h3>
          {eventBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={eventBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                  {eventBreakdown.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1a1a24', border: '1px solid #252533', borderRadius: '8px' }} labelStyle={{ color: '#d8d8e5' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-[200px] flex items-center justify-center text-ink-400 text-sm">No events yet</div>}
        </FadeIn>
      </div>

      {isRootNovaAdmin(profile) && businesses.length > 0 && (
        <FadeIn delay={0.2} className="glass-card p-5 mb-6">
          <div className="flex items-center gap-2 mb-4"><Activity size={18} className="text-brand-400" /><h3 className="text-sm font-semibold text-ink-200">Business Health Scores</h3></div>
          <div className="space-y-3">
            {businesses.map((b) => {
              const health = healthScores.find((h) => h.businessId === b.id)
              if (!health) return null
              return (
                <button key={b.id} onClick={() => navigate(`/admin/business/${b.id}`)} className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-ink-700/40 transition-all text-left">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-ink-100 text-sm truncate">{b.name}</div>
                    <div className="text-xs text-ink-400">{health.reviewCount} reviews · {health.ratingAvg.toFixed(1)}\u2605 · {health.conversionRate.toFixed(0)}% conversion</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {health.trend === 'up' && <TrendingUp size={14} className="text-success-400" />}
                    {health.trend === 'down' && <TrendingUp size={14} className="text-error-400 rotate-180" />}
                    <div className="text-2xl font-bold" style={{ color: health.score >= 70 ? '#10b981' : health.score >= 40 ? '#f59e0b' : '#ef4444' }}>{health.score}</div>
                    <ArrowRight size={16} className="text-ink-400" />
                  </div>
                </button>
              )
            })}
          </div>
        </FadeIn>
      )}

      <FadeIn delay={0.25} className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4"><Sparkles size={18} className="text-brand-400" /><h3 className="text-sm font-semibold text-ink-200">Recent AI-Generated Reviews</h3></div>
        {recentReviews.length === 0 ? <p className="text-ink-400 text-sm">No reviews yet</p> : (
          <div className="space-y-3">
            {recentReviews.map((s) => {
              const biz = businesses.find((b) => b.id === s.business_id)
              return (
                <div key={s.id} className="border border-ink-600/30 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-ink-100">{biz?.name ?? 'Unknown'}</span>
                      <div className="flex">{[1, 2, 3, 4, 5].map((n) => <Star key={n} size={12} className={n <= s.rating ? 'fill-amber-400 text-amber-400' : 'text-ink-600'} />)}</div>
                    </div>
                    <span className="text-xs text-ink-400">{timeAgo(s.created_at)}</span>
                  </div>
                  {s.ai_generated_review && <p className="text-sm text-ink-300 line-clamp-2">{s.ai_generated_review}</p>}
                </div>
              )
            })}
          </div>
        )}
      </FadeIn>
    </div>
  )
}
