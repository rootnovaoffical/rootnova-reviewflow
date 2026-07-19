import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Star, Copy, ExternalLink, Check, Loader2, AlertCircle, Sparkles } from 'lucide-react'
import { getBusinessBySlug, getQuestions, createReviewSession } from '../../lib/db'
import { generateReview } from '../../lib/ai'
import { trackEvent, EventType } from '../../lib/analytics'
import { googleReviewUrl, copyToClipboard } from '../../lib/utils'
import type { Business, Question, AnswerEntry } from '../../lib/types'
import { SpatialBackground, GlowOrb } from '../../components/SpatialBackground'
import { FadeIn } from '../../components/Animations'

type Step = 'loading' | 'welcome' | 'rating' | 'questions' | 'generating' | 'result' | 'error'

export function PublicReviewPage() {
  const { slug } = useParams<{ slug: string }>()
  const reduced = useReducedMotion()
  const [business, setBusiness] = useState<Business | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [step, setStep] = useState<Step>('loading')
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string[]>>({})
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [aiReview, setAiReview] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!slug) return
    let mounted = true
    ;(async () => {
      try {
        const biz = await getBusinessBySlug(slug)
        if (!mounted) return
        if (!biz) { setError('Business not found'); setStep('error'); return }
        if (!biz.public_review_enabled || biz.status !== 'active') { setError('This review page is currently unavailable'); setStep('error'); return }
        setBusiness(biz)
        const qs = await getQuestions(biz.id)
        if (!mounted) return
        setQuestions(qs.filter((q) => q.is_active))
        setStep('welcome')
        trackEvent(EventType.REVIEW_PAGE_VIEWED, biz.id, null, { slug })
      } catch (e) { if (mounted) { setError(e instanceof Error ? e.message : 'Failed to load'); setStep('error') } }
    })()
    return () => { mounted = false }
  }, [slug])

  const flowQuestions = questions.filter((q) => {
    if (q.flow_type === 'ALWAYS') return true
    if (q.flow_type === 'POSITIVE') return rating >= 4
    if (q.flow_type === 'NEGATIVE') return rating <= 3
    return false
  })

  const handleRatingSelect = useCallback((value: number) => {
    setRating(value)
    trackEvent(EventType.RATING_SELECTED, business?.id, null, { rating: value })
    setStep('questions')
  }, [business?.id])

  const handleAnswerToggle = (qid: string, opt: string) => {
    setAnswers((prev) => {
      const cur = prev[qid] ?? []
      if (cur.includes(opt)) return { ...prev, [qid]: cur.filter((o) => o !== opt) }
      return { ...prev, [qid]: [...cur, opt] }
    })
  }

  const handleSubmit = async () => {
    if (!business || !slug || submitting) return
    setSubmitting(true)
    setStep('generating')
    try {
      const entries: AnswerEntry[] = flowQuestions.map((q) => ({ question_id: q.id, question_text: q.question_text, flow_type: q.flow_type, selected: answers[q.id] ?? [] }))
      trackEvent(EventType.QUESTION_ANSWERED, business.id, null, { question_count: flowQuestions.length })
      const session = await createReviewSession({ business_id: business.id, rating, answers: entries, google_place_id_snapshot: business.google_place_id })
      setSessionId(session.id)
      trackEvent(EventType.SESSION_SUBMITTED, business.id, session.id, { rating })
      const result = await generateReview({ sessionId: session.id, businessName: business.name, rating, answers: entries.map((a) => ({ question_text: a.question_text, selected: a.selected })) })
      setAiReview(result.review)
      trackEvent(EventType.AI_REVIEW_GENERATED, business.id, session.id, { success: true })
      setStep('result')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate review')
      trackEvent(EventType.ERROR, business.id, sessionId, { error: String(e) })
      setStep('error')
    } finally { setSubmitting(false) }
  }

  const handleCopy = async () => {
    if (!aiReview) return
    const ok = await copyToClipboard(aiReview)
    if (ok) { setCopied(true); trackEvent(EventType.REVIEW_COPIED, business?.id, sessionId); setTimeout(() => setCopied(false), 2000) }
  }

  const handleGoogleReview = () => {
    if (!business) return
    const url = googleReviewUrl(business)
    if (url) { trackEvent(EventType.GOOGLE_REVIEW_CLICKED, business?.id, sessionId); window.open(url, '_blank', 'noopener,noreferrer') }
  }

  if (step === 'loading') return <div className="min-h-screen flex items-center justify-center bg-ink-950"><Loader2 className="animate-spin text-brand-500" size={32} /></div>
  if (step === 'error' || !business) return (
    <div className="min-h-screen flex items-center justify-center bg-ink-950 px-4">
      <div className="glass-card p-8 max-w-md text-center"><AlertCircle className="mx-auto text-error-400 mb-4" size={32} /><h2 className="text-lg font-semibold text-ink-100 mb-2">Something went wrong</h2><p className="text-ink-400 text-sm">{error}</p></div>
    </div>
  )

  const primary = business.primary_color || '#6366f1'
  const secondary = business.secondary_color || '#a855f7'

  return (
    <div className="min-h-screen relative overflow-hidden bg-ink-950">
      <SpatialBackground primary={primary} secondary={secondary} />
      <GlowOrb color={primary} size={500} className="-top-40 -right-40" />
      <GlowOrb color={secondary} size={400} className="-bottom-40 -left-40" />
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          <FadeIn className="text-center mb-8">
            {business.logo_url ? <img src={business.logo_url} alt={business.name} className="w-16 h-16 rounded-2xl object-cover mx-auto mb-4 shadow-lg" /> : <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}><span className="text-white font-bold text-2xl">{business.name.charAt(0)}</span></div>}
            <h1 className="text-xl font-bold text-ink-100">{business.name}</h1>
          </FadeIn>
          <AnimatePresence mode="wait">
            {step === 'welcome' && <motion.div key="welcome" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: reduced ? 0 : 0.3 }} className="glass-card p-8 text-center"><p className="text-lg text-ink-100 mb-6">{business.welcome_message}</p><button onClick={() => setStep('rating')} className="btn-primary w-full" style={{ background: primary }}>Start Review</button></motion.div>}
            {step === 'rating' && <motion.div key="rating" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: reduced ? 0 : 0.3 }} className="glass-card p-8"><h2 className="text-lg font-semibold text-ink-100 mb-2 text-center">How was your experience?</h2><p className="text-ink-400 text-sm text-center mb-6">Tap to rate</p><div className="flex justify-center gap-3 mb-6">{[1,2,3,4,5].map((n) => <button key={n} onClick={() => handleRatingSelect(n)} onMouseEnter={() => setHoverRating(n)} onMouseLeave={() => setHoverRating(0)} className="transition-all duration-200 hover:scale-110 active:scale-95" aria-label={`${n} stars`}><Star size={40} className={(hoverRating || rating) >= n ? 'fill-amber-400 text-amber-400' : 'text-ink-500'} /></button>)}</div></motion.div>}
            {step === 'questions' && <motion.div key="questions" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: reduced ? 0 : 0.3 }} className="glass-card p-6"><div className="flex items-center gap-2 mb-4">{[1,2,3,4,5].map((n) => <Star key={n} size={16} className={n <= rating ? 'fill-amber-400 text-amber-400' : 'text-ink-600'} />)}</div>{flowQuestions.length === 0 ? <button onClick={handleSubmit} disabled={submitting} className="btn-primary w-full" style={{ background: primary }}>Submit Review</button> : <><div className="space-y-5">{flowQuestions.map((q, i) => <div key={q.id}><div className="text-sm font-medium text-ink-200 mb-2.5">{i+1}. {q.question_text}</div><div className="flex flex-wrap gap-2">{q.options.map((opt) => { const sel = (answers[q.id] ?? []).includes(opt); return <button key={opt} onClick={() => handleAnswerToggle(q.id, opt)} className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 active:scale-95 ${sel ? 'text-white border-transparent shadow-lg' : 'bg-ink-700/50 text-ink-200 border border-ink-600/50 hover:border-ink-500'}`} style={sel ? { background: primary } : undefined}>{opt}</button> })}</div></div>)}</div><button onClick={handleSubmit} disabled={submitting} className="btn-primary w-full mt-6" style={{ background: primary }}>{submitting ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Generate Review'}</button></>}</motion.div>}
            {step === 'generating' && <motion.div key="gen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass-card p-10 text-center"><Sparkles className="mx-auto mb-4 text-brand-400 animate-pulse" size={32} /><h2 className="text-lg font-semibold text-ink-100 mb-2">Writing your review...</h2><p className="text-ink-400 text-sm mb-4">Our AI is crafting a personalized review</p><Loader2 className="animate-spin text-brand-400 mx-auto" size={24} /></motion.div>}
            {step === 'result' && aiReview && <motion.div key="result" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : 0.4 }} className="glass-card p-6"><div className="flex items-center gap-2 mb-4"><Sparkles size={18} className="text-brand-400" /><h2 className="text-sm font-semibold text-ink-200">Your AI-generated review</h2></div><div className="bg-ink-700/30 rounded-xl p-4 mb-4 border border-ink-600/30"><p className="text-ink-100 text-sm leading-relaxed">{aiReview}</p></div><div className="flex gap-2.5 mb-3"><button onClick={handleCopy} className="btn-secondary flex-1 flex items-center justify-center gap-2">{copied ? <Check size={16} className="text-success-400" /> : <Copy size={16} />}{copied ? 'Copied!' : 'Copy'}</button>{googleReviewUrl(business) && <button onClick={handleGoogleReview} className="btn-primary flex-1 flex items-center justify-center gap-2" style={{ background: primary }}><ExternalLink size={16} /> Post on Google</button>}</div><p className="text-xs text-ink-400 text-center">Copy your review and paste it on Google, or click to open the review page.</p></motion.div>}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
