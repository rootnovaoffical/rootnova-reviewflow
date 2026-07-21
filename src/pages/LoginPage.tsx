import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Mail, Lock, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import SpatialBackground from "../components/SpatialBackground";

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    const { error } = await signIn(email, password);
    if (error) { setError(error); setLoading(false); }
    else navigate("/dashboard");
  };

  return (
    <>
      <SpatialBackground />
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 mb-4 shadow-lg shadow-primary-500/40">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400">RootNova</h1>
            <p className="text-sm text-slate-400 mt-1">Complete Business Review & Growth Platform</p>
          </div>
          <form onSubmit={handleSubmit} className="glass-card rounded-3xl p-8 space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/50 border border-white/10 text-white text-sm focus:outline-none focus:border-primary-500" placeholder="you@business.com" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/50 border border-white/10 text-white text-sm focus:outline-none focus:border-primary-500" placeholder="••••••••" />
              </div>
            </div>
            {error && <p className="text-sm text-error-400 bg-error-500/10 border border-error-500/20 rounded-lg px-4 py-2">{error}</p>}
            <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary-600 via-primary-500 to-accent-500 text-white font-bold shadow-lg shadow-primary-500/40 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><span>Sign In</span><ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
          <p className="text-center text-xs text-slate-500 mt-6">Super Admin · Partner Admin · Business Admin</p>
        </div>
      </div>
    </>
  );
}
