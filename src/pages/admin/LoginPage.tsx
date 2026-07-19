import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { isRootNovaStaff, isPartnerMember } from '../../lib/auth-api'
import { SpatialBackground, GlowOrb } from '../../components/SpatialBackground'
import { FadeIn } from '../../components/Animations'
import { Loader2, AlertCircle } from 'lucide-react'

export function LoginPage() {
  const navigate = useNavigate()
  const { session, profile, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && session.user && profile) {
      navigate(isRootNovaStaff(profile) ? '/admin/dashboard' : isPartnerMember(profile) ? '/partner/dashboard' : '/login')
    }
  }, [session.user, profile, loading, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true); setError(null)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    } catch (e) { setError(e instanceof Error ? e.message : 'Sign in failed') }
    finally { setSubmitting(false) }
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4 bg-ink-950">
      <SpatialBackground />
      <GlowOrb color="#6366f1" size={500} className="-top-40 -left-40" />
      <GlowOrb color="#8b5cf6" size={400} className="-bottom-40 -right-40" />
      <FadeIn className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-brand-500/30"><span className="text-white font-bold text-2xl">R</span></div>
          <h1 className="text-2xl font-bold text-ink-100">ReviewFlow</h1>
          <p className="text-ink-400 text-sm mt-1">by RootNova</p>
        </div>
        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
          <div><label className="text-sm font-medium text-ink-200 mb-1.5 block">Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className="glass-input w-full" placeholder="you@business.com" /></div>
          <div><label className="text-sm font-medium text-ink-200 mb-1.5 block">Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" className="glass-input w-full" placeholder="********" /></div>
          {error && <div className="flex items-center gap-2 text-error-400 text-sm bg-error-500/10 border border-error-500/20 rounded-lg px-3 py-2"><AlertCircle size={16} /> {error}</div>}
          <button type="submit" disabled={submitting} className="btn-primary w-full flex items-center justify-center gap-2">{submitting && <Loader2 size={18} className="animate-spin" />}{submitting ? 'Signing in...' : 'Sign In'}</button>
        </form>
        <p className="text-center text-ink-400 text-sm mt-4">Need an account? <Link to="/signup" className="text-brand-400 hover:text-brand-300 font-medium">Sign up</Link></p>
      </FadeIn>
    </div>
  )
}
