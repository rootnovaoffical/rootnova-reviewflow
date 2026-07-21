import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import SpatialBackground from '../components/SpatialBackground';
import { Sparkles, Mail, Lock, ArrowRight, User } from 'lucide-react';

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const { showToast } = useToast();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    if (mode === 'signin') {
      const { error } = await signIn(email, password);
      if (error) { showToast('error', error); setLoading(false); }
      else { showToast('success', 'Welcome back!'); }
    } else {
      const { error } = await signUp(email, password, fullName);
      if (error) { showToast('error', error); setLoading(false); }
      else { showToast('success', 'Account created! Check your email.'); setLoading(false); }
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4">
      <SpatialBackground />
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-400/30 mb-4">
            <Sparkles className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">RootNova</h1>
          <p className="text-zinc-400 mt-2 text-sm">Business Review & Growth Platform</p>
        </div>
        <div className="rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-6">{mode === 'signin' ? 'Sign In' : 'Create Account'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-400/50 transition-colors"
                    placeholder="John Doe" />
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-400/50 transition-colors"
                  placeholder="you@business.com" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-400/50 transition-colors"
                  placeholder="••••••••" />
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 transition-all text-sm">
              {loading ? 'Please wait…' : <>{mode === 'signin' ? 'Sign In' : 'Create Account'} <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
          <div className="mt-5 text-center">
            <button onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')} className="text-xs text-zinc-400 hover:text-blue-400 transition-colors">
              {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
        <p className="text-center text-xs text-zinc-600 mt-6">Secure authentication powered by Supabase</p>
      </div>
    </div>
  );
}
