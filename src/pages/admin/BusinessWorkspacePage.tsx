import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, Star, MessageSquare, QrCode, Upload, Loader2, Check, Plus, Trash2, Save, Eye, AlertCircle } from 'lucide-react'
import { getBusinessById, updateBusiness, getQuestions, createQuestion, updateQuestion, deleteQuestion, getReviewSessions, getAnalyticsEvents } from '../../lib/db'
import { supabase } from '../../lib/supabase'
import { slugify, publicReviewUrl, googleReviewUrl } from '../../lib/utils'
import type { Business, Question, ReviewSession, AnalyticsEvent } from '../../lib/types'
import { FadeIn } from '../../components/Animations'

type Tab = 'profile' | 'questions' | 'reviews' | 'analytics'

export function BusinessWorkspacePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [business, setBusiness] = useState<Business | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [sessions, setSessions] = useState<ReviewSession[]>([])
  const [events, setEvents] = useState<AnalyticsEvent[]>([])
  const [tab, setTab] = useState<Tab>('profile')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<Business>>({})
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null)
  const [newQuestion, setNewQuestion] = useState<Partial<Question> | null>(null)

  useEffect(() => {
    if (!id) return
    let mounted = true
    ;(async () => {
      try {
        const [biz, qs, ss, evs] = await Promise.all([getBusinessById(id), getQuestions(id), getReviewSessions(id), getAnalyticsEvents(id)])
        if (!mounted) return
        setBusiness(biz); setForm(biz ?? {}); setQuestions(qs); setSessions(ss); setEvents(evs)
      } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load') }
      finally { if (mounted) setLoading(false) }
    })()
    return () => { mounted = false }
  }, [id])

  const handleSave = async () => {
    if (!business || !id) return
    setSaving(true); setError(null)
    try {
      const updates: Partial<Business> = {
        name: form.name, slug: slugify(form.slug ?? form.name ?? business.slug),
        primary_color: form.primary_color, secondary_color: form.secondary_color,
        welcome_message: form.welcome_message, google_place_id: form.google_place_id,
        google_maps_url: form.google_maps_url, google_review_url: form.google_review_url,
        public_review_enabled: form.public_review_enabled, status: form.status,
      }
      const updated = await updateBusiness(id, updates)
      setBusiness(updated); setSaved(true); setTimeout(() => setSaved(false), 2000)
    } catch (e) { setError(e instanceof Error ? e.message : 'Save failed') }
    finally { setSaving(false) }
  }

  const handleLogoUpload = async (file: File) => {
    if (!business || !id) return
    setUploadingLogo(true); setError(null)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png'
      const path = `${id}/logo-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('business-logos').upload(path, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from('business-logos').getPublicUrl(path)
      const updated = await updateBusiness(id, { logo_url: urlData.publicUrl })
      setBusiness(updated); setForm({ ...form, logo_url: urlData.publicUrl })
    } catch (e) { setError(e instanceof Error ? e.message : 'Logo upload failed') }
    finally { setUploadingLogo(false) }
  }

  const handleSaveQuestion = async (q: Partial<Question>) => {
    if (!id || !q.question_text) return
    try {
      if (q.id) {
        const updated = await updateQuestion(q.id, { question_text: q.question_text, flow_type: q.flow_type, options: q.options, is_required: q.is_required, is_active: q.is_active, sort_order: q.sort_order })
        setQuestions((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      } else {
        const created = await createQuestion({ business_id: id, question_text: q.question_text, question_type: 'multiple_choice', flow_type: q.flow_type ?? 'ALWAYS', options: q.options ?? [], is_required: q.is_required ?? true, is_active: q.is_active ?? true, sort_order: q.sort_order ?? questions.length })
        setQuestions((prev) => [...prev, created])
      }
      setEditingQuestion(null); setNewQuestion(null)
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to save question') }
  }

  const handleDeleteQuestion = async (qid: string) => {
    try { await deleteQuestion(qid); setQuestions((prev) => prev.filter((p) => p.id !== qid)) }
    catch (e) { setError(e instanceof Error ? e.message : 'Delete failed') }
  }

  if (loading) return <div className="p-8 text-ink-400">Loading...</div>
  if (!business) return <div className="p-8 text-error-400">Business not found</div>

  const tabs: { key: Tab; label: string; icon: typeof Settings }[] = [
    { key: 'profile', label: 'Profile', icon: Settings },
    { key: 'questions', label: 'Questions', icon: MessageSquare },
    { key: 'reviews', label: 'Reviews', icon: Star },
    { key: 'analytics', label: 'Analytics', icon: Eye },
  ]

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto">
      <FadeIn>
        <div className="flex items-center gap-3 mb-6">
          {business.logo_url ? (
            <img src={business.logo_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${business.primary_color}, ${business.secondary_color})` }}>
              <span className="text-white font-bold">{business.name.charAt(0)}</span>
            </div>
          )}
          <div><h1 className="text-xl font-bold text-ink-100">{business.name}</h1><p className="text-xs text-ink-400">/{business.slug}</p></div>
        </div>
      </FadeIn>

      {error && <div className="flex items-center gap-2 text-error-400 text-sm bg-error-500/10 border border-error-500/20 rounded-lg px-3 py-2 mb-4"><AlertCircle size={16} /> {error}</div>}

      <div className="flex gap-1 mb-6 overflow-x-auto no-scrollbar">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${tab === t.key ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30' : 'text-ink-300 hover:text-ink-100 hover:bg-ink-700/40'}`}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'profile' && (
          <motion.div key="profile" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="glass-card p-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-ink-200 mb-2 block">Business Logo</label>
                <div className="flex items-center gap-4">
                  {form.logo_url ? <img src={form.logo_url} alt="Logo" className="w-16 h-16 rounded-xl object-cover" /> : <div className="w-16 h-16 rounded-xl bg-ink-700/50 border border-ink-600/50 flex items-center justify-center"><Upload size={20} className="text-ink-400" /></div>}
                  <label className="btn-secondary cursor-pointer flex items-center gap-2">
                    {uploadingLogo ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                    {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f) }} />
                  </label>
                </div>
              </div>
              <div><label className="text-sm font-medium text-ink-200 mb-1.5 block">Business Name</label><input value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className="glass-input w-full" /></div>
              <div><label className="text-sm font-medium text-ink-200 mb-1.5 block">Slug (URL)</label><input value={form.slug ?? ''} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="glass-input w-full" /><p className="text-xs text-ink-400 mt-1">Review URL: {publicReviewUrl(slugify(form.slug ?? business.slug))}</p></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium text-ink-200 mb-1.5 block">Primary Color</label><input type="color" value={form.primary_color ?? '#6366f1'} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} className="w-full h-10 rounded-xl bg-ink-700/50 border border-ink-600/50 cursor-pointer" /></div>
                <div><label className="text-sm font-medium text-ink-200 mb-1.5 block">Secondary Color</label><input type="color" value={form.secondary_color ?? '#a855f7'} onChange={(e) => setForm({ ...form, secondary_color: e.target.value })} className="w-full h-10 rounded-xl bg-ink-700/50 border border-ink-600/50 cursor-pointer" /></div>
              </div>
              <div><label className="text-sm font-medium text-ink-200 mb-1.5 block">Welcome Message</label><textarea value={form.welcome_message ?? ''} onChange={(e) => setForm({ ...form, welcome_message: e.target.value })} className="glass-input w-full resize-none" rows={2} /></div>
              <div><label className="text-sm font-medium text-ink-200 mb-1.5 block">Google Place ID</label><input value={form.google_place_id ?? ''} onChange={(e) => setForm({ ...form, google_place_id: e.target.value })} className="glass-input w-full" placeholder="ChIJ..." />{form.google_place_id && <p className="text-xs text-success-400 mt-1">Auto-derives: https://search.google.com/local/writereview?placeid={form.google_place_id}</p>}</div>
              <div><label className="text-sm font-medium text-ink-200 mb-1.5 block">Google Maps URL</label><input value={form.google_maps_url ?? ''} onChange={(e) => setForm({ ...form, google_maps_url: e.target.value })} className="glass-input w-full" placeholder="https://maps.app.goo.gl/..." /></div>
              <div><label className="text-sm font-medium text-ink-200 mb-1.5 block">Custom Google Review URL (optional)</label><input value={form.google_review_url ?? ''} onChange={(e) => setForm({ ...form, google_review_url: e.target.value })} className="glass-input w-full" placeholder="Overrides Place ID derivation" /></div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.public_review_enabled ?? true} onChange={(e) => setForm({ ...form, public_review_enabled: e.target.checked })} className="rounded" /><span className="text-sm text-ink-200">Public review enabled</span></label>
                <select value={form.status ?? 'active'} onChange={(e) => setForm({ ...form, status: e.target.value as Business['status'] })} className="glass-input"><option value="active">Active</option><option value="inactive">Inactive</option></select>
              </div>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">{saved ? <Check size={16} /> : saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{saved ? 'Saved!' : saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-ink-200 mb-4">Live Preview</h3>
              <div className="rounded-2xl bg-ink-900/60 p-6 border border-ink-600/30">
                <div className="text-center mb-6">
                  {form.logo_url ? <img src={form.logo_url} alt="" className="w-14 h-14 rounded-2xl object-cover mx-auto mb-3" /> : <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${form.primary_color}, ${form.secondary_color})` }}><span className="text-white font-bold text-xl">{(form.name ?? business.name).charAt(0)}</span></div>}
                  <h2 className="text-lg font-bold text-ink-100">{form.name ?? business.name}</h2>
                </div>
                <p className="text-ink-300 text-sm text-center mb-4">{form.welcome_message}</p>
                <div className="rounded-xl py-2.5 text-center text-white text-sm font-semibold" style={{ background: form.primary_color }}>Start Review</div>
                {googleReviewUrl(form as Business) && <p className="text-xs text-ink-400 text-center mt-3">Google review destination: configured</p>}
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => window.open(publicReviewUrl(business.slug), '_blank')} className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm"><Eye size={14} /> Open</button>
                <button onClick={() => navigate(`/admin/business/${business.id}/qr`)} className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm"><QrCode size={14} /> QR</button>
              </div>
            </div>
          </motion.div>
        )}

        {tab === 'questions' && (
          <motion.div key="questions" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-3">
            {questions.map((q, i) => (
              <QuestionEditor key={q.id} question={q} index={i} editing={editingQuestion === q.id} onEdit={() => setEditingQuestion(q.id)} onCancel={() => setEditingQuestion(null)} onSave={handleSaveQuestion} onDelete={() => handleDeleteQuestion(q.id)} />
            ))}
            {newQuestion ? (
              <QuestionEditor question={newQuestion} index={questions.length} editing={true} onEdit={() => {}} onCancel={() => setNewQuestion(null)} onSave={handleSaveQuestion} onDelete={() => {}} />
            ) : (
              <button onClick={() => setNewQuestion({ question_text: '', flow_type: 'ALWAYS', options: [], is_required: true, is_active: true, sort_order: questions.length })} className="btn-secondary w-full flex items-center justify-center gap-2"><Plus size={16} /> Add Question</button>
            )}
          </motion.div>
        )}

        {tab === 'reviews' && (
          <motion.div key="reviews" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-3">
            {sessions.length === 0 ? <div className="glass-card p-8 text-center text-ink-400">No reviews yet</div> : sessions.map((s) => (
              <div key={s.id} className="glass-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex">{[1, 2, 3, 4, 5].map((n) => <Star key={n} size={14} className={n <= s.rating ? 'fill-amber-400 text-amber-400' : 'text-ink-600'} />)}</div>
                  <span className="text-xs text-ink-400">{new Date(s.created_at).toLocaleString()}</span>
                </div>
                {s.ai_generated_review && <p className="text-sm text-ink-200 mb-2">{s.ai_generated_review}</p>}
                {s.answers && Array.isArray(s.answers) && s.answers.length > 0 && (
                  <div className="text-xs text-ink-400 space-y-1">{s.answers.map((a, i) => <div key={i}><span className="text-ink-300">{a.question_text}:</span> {a.selected.join(', ')}</div>)}</div>
                )}
              </div>
            ))}
          </motion.div>
        )}

        {tab === 'analytics' && (
          <motion.div key="analytics" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-3">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {['REVIEW_PAGE_VIEWED', 'RATING_SELECTED', 'SESSION_SUBMITTED', 'AI_REVIEW_GENERATED', 'GOOGLE_REVIEW_CLICKED', 'REVIEW_COPIED'].map((t) => {
                const count = events.filter((e) => e.event_type === t).length
                return <div key={t} className="glass-card p-4"><div className="text-xs text-ink-400 mb-1">{t.replace(/_/g, ' ')}</div><div className="text-2xl font-bold text-ink-100">{count}</div></div>
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function QuestionEditor({ question, editing, onEdit, onCancel, onSave, onDelete }: {
  question: Partial<Question>; index: number; editing: boolean; onEdit: () => void; onCancel: () => void; onSave: (q: Partial<Question>) => void; onDelete: () => void
}) {
  const [q, setQ] = useState<Partial<Question>>(question)
  useEffect(() => setQ(question), [question])

  if (!editing) {
    return (
      <div className="glass-card p-4 flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="badge bg-ink-600/50 text-ink-300">{q.flow_type}</span>
            {q.is_active ? <span className="badge bg-success-500/15 text-success-400">Active</span> : <span className="badge bg-ink-600/50 text-ink-400">Inactive</span>}
          </div>
          <div className="text-sm font-medium text-ink-100">{q.question_text}</div>
          <div className="text-xs text-ink-400 mt-1">{(q.options ?? []).join(' · ')}</div>
        </div>
        <div className="flex gap-1">
          <button onClick={onEdit} className="btn-secondary px-3 py-1.5 text-xs">Edit</button>
          <button onClick={onDelete} className="btn-danger px-3 py-1.5 text-xs"><Trash2 size={14} /></button>
        </div>
      </div>
    )
  }
  return (
    <div className="glass-card p-4 space-y-3">
      <input value={q.question_text ?? ''} onChange={(e) => setQ({ ...q, question_text: e.target.value })} placeholder="Question text" className="glass-input w-full" />
      <div><label className="text-xs text-ink-400 mb-1 block">Flow Type</label><select value={q.flow_type ?? 'ALWAYS'} onChange={(e) => setQ({ ...q, flow_type: e.target.value as Question['flow_type'] })} className="glass-input w-full"><option value="ALWAYS">Always show</option><option value="POSITIVE">Show if positive (4-5 stars)</option><option value="NEGATIVE">Show if negative (1-3 stars)</option></select></div>
      <div><label className="text-xs text-ink-400 mb-1 block">Options (one per line)</label><textarea value={(q.options ?? []).join('\n')} onChange={(e) => setQ({ ...q, options: e.target.value.split('\n').filter((s) => s.trim()) })} className="glass-input w-full resize-none" rows={4} placeholder="Option 1&#10;Option 2&#10;Option 3" /></div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={q.is_required ?? true} onChange={(e) => setQ({ ...q, is_required: e.target.checked })} /><span className="text-sm text-ink-200">Required</span></label>
        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={q.is_active ?? true} onChange={(e) => setQ({ ...q, is_active: e.target.checked })} /><span className="text-sm text-ink-200">Active</span></label>
      </div>
      <div className="flex gap-2"><button onClick={() => onSave(q)} className="btn-primary text-sm flex items-center gap-2"><Save size={14} /> Save</button><button onClick={onCancel} className="btn-secondary text-sm">Cancel</button></div>
    </div>
  )
}
