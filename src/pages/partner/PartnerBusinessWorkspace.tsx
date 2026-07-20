import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Loader2, AlertCircle, Star, ExternalLink, Plus, Trash2 } from 'lucide-react'
import { getBusinessById, updateBusiness, getQuestions, createQuestion, updateQuestion, deleteQuestion, getReviewSessions, getAnalyticsEvents, logAudit } from '../../lib/db'
import { useAuth } from '../../context/AuthContext'
import type { Business, Question, ReviewSession, AnalyticsEvent } from '../../lib/types'
import { FadeIn, StaggerContainer, StaggerItem } from '../../components/Animations'
import { googleReviewUrl, timeAgo } from '../../lib/utils'

export function PartnerBusinessWorkspace() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { organization } = useAuth()
  const [business, setBusiness] = useState<Business | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [sessions, setSessions] = useState<ReviewSession[]>([])
  const [, setEvents] = useState<AnalyticsEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Partial<Business>>({})
  const [newQuestion, setNewQuestion] = useState({ question_text: '', question_type: 'multiple_choice' as const, sort_order: 0 })

  useEffect(() => {
    if (!id) return
    let m = true
    ;(async () => {
      try {
        const [b, q, s, e] = await Promise.all([getBusinessById(id), getQuestions(id), getReviewSessions(id), getAnalyticsEvents(id)])
        if (!m) return
        setBusiness(b); setQuestions(q); setSessions(s); setEvents(e)
        if (b) setForm({ name: b.name, slug: b.slug, google_place_id: b.google_place_id, primary_color: b.primary_color, secondary_color: b.secondary_color, welcome_message: b.welcome_message, logo_url: b.logo_url })
      } catch (e) { if (m) setError(e instanceof Error ? e.message : 'Failed') }
      finally { if (m) setLoading(false) }
    })()
    return () => { m = false }
  }, [id])

  const handleSave = async () => {
    if (!business || !id) return
    setSaving(true); setError(null)
    try { const updated = await updateBusiness(id, form); setBusiness(updated); await logAudit('BUSINESS_UPDATED', 'BUSINESS', id, organization?.id, { name: form.name }) }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
    finally { setSaving(false) }
  }

  const handleAddQuestion = async () => {
    if (!id || !newQuestion.question_text.trim()) return
    try { const q = await createQuestion(id, { business_id: id, ...newQuestion, is_required: true, flow_type: 'ALWAYS', options: [], is_active: true }); setQuestions((p) => [...p, q].sort((a, b) => a.sort_order - b.sort_order)); setNewQuestion({ question_text: '', question_type: 'multiple_choice', sort_order: questions.length }); await logAudit('QUESTION_CREATED', 'QUESTION', q.id, organization?.id) }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
  }

  const handleDeleteQuestion = async (qid: string) => {
    try { await deleteQuestion(qid); setQuestions((p) => p.filter((q) => q.id !== qid)); await logAudit('QUESTION_DELETED', 'QUESTION', qid, organization?.id) }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
  }

  const reviewUrl = useMemo(() => business ? googleReviewUrl(business) : null, [business])
  const avgRating = useMemo(() => sessions.length > 0 ? sessions.reduce((s, r) => s + r.rating, 0) / sessions.length : 0, [sessions])

  if (loading) return <div className="p-8 text-ink-400">Loading...</div>
  if (!business) return <div className="p-8 text-center text-ink-400">Business not found</div>

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      <FadeIn><button onClick={() => navigate('/partner/businesses')} className="flex items-center gap-2 text-sm text-ink-400 hover:text-ink-200 mb-4"><ArrowLeft size={16} /> Back to businesses</button></FadeIn>
      {error && <div className="flex items-center gap-2 text-error-400 text-sm bg-error-500/10 border border-error-500/20 rounded-lg px-3 py-2 mb-4"><AlertCircle size={16} /> {error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <FadeIn className="glass-card p-4"><div className="text-xs text-ink-400 mb-1">Public URL</div><a href={`/r/${business.slug}`} target="_blank" rel="noreferrer" className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1">/r/{business.slug} <ExternalLink size={12} /></a></FadeIn>
        <FadeIn delay={0.05} className="glass-card p-4"><div className="text-xs text-ink-400 mb-1">Reviews</div><div className="text-2xl font-bold text-ink-100">{sessions.length}</div></FadeIn>
        <FadeIn delay={0.1} className="glass-card p-4"><div className="text-xs text-ink-400 mb-1">Avg Rating</div><div className="text-2xl font-bold text-ink-100 flex items-center gap-1">{avgRating.toFixed(1)} <Star size={18} className="text-amber-400 fill-amber-400" /></div></FadeIn>
      </div>

      <FadeIn delay={0.15} className="glass-card p-5 mb-4"><h3 className="text-sm font-semibold text-ink-200 mb-4">Business Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><label className="text-xs text-ink-400 mb-1 block">Name</label><input value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className="glass-input w-full" /></div>
          <div><label className="text-xs text-ink-400 mb-1 block">Slug</label><input value={form.slug ?? ''} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="glass-input w-full" /></div>
          <div><label className="text-xs text-ink-400 mb-1 block">Google Place ID</label><input value={form.google_place_id ?? ''} onChange={(e) => setForm({ ...form, google_place_id: e.target.value })} className="glass-input w-full" placeholder="ChIJ..." /></div>
          <div><label className="text-xs text-ink-400 mb-1 block">Logo URL</label><input value={form.logo_url ?? ''} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} className="glass-input w-full" placeholder="https://..." /></div>
          <div><label className="text-xs text-ink-400 mb-1 block">Welcome Message</label><input value={form.welcome_message ?? ''} onChange={(e) => setForm({ ...form, welcome_message: e.target.value })} className="glass-input w-full" placeholder="Welcome!" /></div>
          <div><label className="text-xs text-ink-400 mb-1 block">Primary Color</label><input type="color" value={form.primary_color ?? '#6366f1'} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} className="w-full h-10 rounded-lg bg-transparent border border-ink-600" /></div>
          <div><label className="text-xs text-ink-400 mb-1 block">Secondary Color</label><input type="color" value={form.secondary_color ?? '#8b5cf6'} onChange={(e) => setForm({ ...form, secondary_color: e.target.value })} className="w-full h-10 rounded-lg bg-transparent border border-ink-600" /></div>
        </div>

        {reviewUrl && <div className="mt-3 text-xs text-ink-400">Google Review URL: <a href={reviewUrl} target="_blank" rel="noreferrer" className="text-brand-400 hover:text-brand-300">{reviewUrl}</a></div>}
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 mt-4 text-sm">{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Changes</button>
      </FadeIn>

      <FadeIn delay={0.2} className="glass-card p-5 mb-4"><h3 className="text-sm font-semibold text-ink-200 mb-4">Questions</h3>
        <div className="flex gap-2 mb-4"><input value={newQuestion.question_text} onChange={(e) => setNewQuestion({ ...newQuestion, question_text: e.target.value })} placeholder="New question..." className="glass-input flex-1" /><button onClick={handleAddQuestion} className="btn-primary p-2"><Plus size={16} /></button></div>
        <StaggerContainer className="space-y-2">{questions.map((q) => (
          <StaggerItem key={q.id} className="flex items-center gap-2 p-3 rounded-xl bg-ink-700/30 border border-ink-600/30"><div className="flex-1"><input defaultValue={q.question_text} onBlur={(e) => updateQuestion(q.id, { question_text: e.target.value })} className="glass-input w-full text-sm" /></div><span className="text-xs text-ink-400">{q.question_type}</span><button onClick={() => handleDeleteQuestion(q.id)} className="btn-danger p-2"><Trash2 size={12} /></button></StaggerItem>
        ))}</StaggerContainer>
      </FadeIn>

      <FadeIn delay={0.25} className="glass-card p-5"><h3 className="text-sm font-semibold text-ink-200 mb-4">Recent Reviews</h3>
        {sessions.length === 0 ? <p className="text-ink-400 text-sm">No reviews yet</p> : (
          <StaggerContainer className="space-y-2">{sessions.slice(0, 10).map((s) => (
            <StaggerItem key={s.id} className="p-3 rounded-xl bg-ink-700/30 border border-ink-600/30"><div className="flex items-center justify-between mb-1"><div className="flex items-center gap-1">{[1,2,3,4,5].map((i) => <Star key={i} size={12} className={i <= s.rating ? 'text-amber-400 fill-amber-400' : 'text-ink-600'} />)}</div><span className="text-xs text-ink-500">{timeAgo(s.created_at)}</span></div>{s.ai_generated_review && <p className="text-xs text-ink-300 mt-1 line-clamp-2">{s.ai_generated_review}</p>}</StaggerItem>
          ))}</StaggerContainer>
        )}
      </FadeIn>
    </div>
  )
}
