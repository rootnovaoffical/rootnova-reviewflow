import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { SpatialBackground, GlowOrb } from '../../components/SpatialBackground'
import { FadeIn } from '../../components/Animations'
import { Loader2, AlertCircle, Check } from 'lucide-react'

export function SignupPage() {
  const navigate = useNavigate()
  const { session, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => { if (!loading && session?.user) navigate('/login') }, [session?.user, loading, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true); setError(null)
    try {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } })
      if (error) throw error
      if (data.user) { setSuccess(true); setTimeout(() => navigate('/login'), 1500) }
    } catch (e) { setError(e instanceof Error ? e.message : 'Sign up failed') }
    finally { setSubmitting(false) }
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4 bg-ink-950">
      <SpatialBackground />
      <GlowOrb color="#6366f1" size={500} className="-top-40 -right-40" />
      <GlowOrb color="#8b5cf6" size={400} className="-bottom-40 -left-40" />
      <FadeIn className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-brand-500/30"><span className="text-white font-bold text-2xl">R</span></div>
          <h1 className="text-2xl font-bold text-ink-100">Create Account</h1>
          <p className="text-ink-400 text-sm mt-1">ReviewFlow by RootNova</p>
        </div>
        {success ? <div className="glass-card p-8 text-center"><Check className="mx-auto text-success-400 mb-3" size={32} /><h2 className="text-lg font-semibold text-ink-100">Account created!</h2><p className="text-ink-400 text-sm mt-1">Redirecting to login...</p></div> : (
          <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
            <div><label className="text-sm font-medium text-ink-200 mb-1.5 block">Full Name</label><input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="glass-input w-full" placeholder="Your name" /></div>
            <div><label className="text-sm font-medium text-ink-200 mb-1.5 block">Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="glass-input w-full" placeholder="you@business.com" /></div>
            <div><label className="text-sm font-medium text-ink-200 mb-1.5 block">Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="glass-input w-full" placeholder="At least 6 characters" /></div>
            {error && <div className="flex items-center gap-2 text-error-400 text-sm bg-error-500/10 border border-error-500/20 rounded-lg px-3 py-2"><AlertCircle size={16} /> {error}</div>}
            <button type="submit" disabled={submitting} className="btn-primary w-full flex items-center justify-center gap-2">{submitting && <Loader2 size={18} className="animate-spin" />}{submitting ? 'Creating...' : 'Sign Up'}</button>
          </form>
        )}
        <p className="text-center text-ink-400 text-sm mt-4">Already have an account? <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">Sign in</Link></p>
      </FadeIn>
    </div>
  )
}
