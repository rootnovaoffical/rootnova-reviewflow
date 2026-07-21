import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import SpatialBackground from '../components/SpatialBackground';
import { Loader2, Star, ArrowRight, AlertCircle } from 'lucide-react';

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
    try {
      const result = mode === 'signin' ? await signIn(email, password) : await signUp(email, password, fullName);
      if (result.error) showToast('error', result.error);
      else showToast('success', mode === 'signin' ? 'Welcome back!' : 'Account created! Please sign in.');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <SpatialBackground />
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center"><Star className="w-6 h-6 text-white" /></div>
            <span className="text-2xl font-bold text-white">RootNova</span>
          </div>
          <p className="text-zinc-400 text-sm">Business Growth & Review Platform</p>
        </div>
        <div className="rounded-2xl bg-zinc-900/80 backdrop-blur-xl border border-white/10 p-6 sm:p-8 shadow-2xl">
          <div className="flex gap-1 p-1 rounded-xl bg-white/5 mb-6">
            <button onClick={() => setMode('signin')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'signin' ? 'bg-blue-500/20 text-blue-200' : 'text-zinc-400 hover:text-white'}`}>Sign In</button>
            <button onClick={() => setMode('signup')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'signup' ? 'bg-blue-500/20 text-blue-200' : 'text-zinc-400 hover:text-white'}`}>Sign Up</button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div><label className="block text-xs font-medium text-zinc-400 mb-1.5">Full Name</label><input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-400/50" placeholder="John Doe" /></div>
            )}
            <div><label className="block text-xs font-medium text-zinc-400 mb-1.5">Email</label><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-400/50" placeholder="you@business.com" /></div>
            <div><label className="block text-xs font-medium text-zinc-400 mb-1.5">Password</label><input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-400/50" placeholder="••••••••" /></div>
            <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-500/20 border border-blue-400/30 text-blue-200 hover:bg-blue-500/30 font-medium transition-colors disabled:opacity-50">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>{mode === 'signin' ? 'Sign In' : 'Create Account'} <ArrowRight className="w-4 h-4" /></>}</button>
          </form>
        </div>
        <p className="text-center text-xs text-zinc-600 mt-4">By continuing, you agree to our Terms & Privacy Policy</p>
      </div>
    </div>
  );
}
