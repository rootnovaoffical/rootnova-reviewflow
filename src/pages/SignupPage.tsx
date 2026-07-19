import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useBranding } from "../context/BrandingContext";
import { useToast } from "../context/ToastContext";

export default function SignupPage() {
  const { signUp } = useAuth();
  const { logoPrimary } = useBranding();
  const { show } = useToast();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await signUp(email, password, fullName);
    setBusy(false);
    if (error) { show(error, "error"); return; }
    show("Account created. Please sign in.", "success");
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-slate-900/70 backdrop-blur border border-slate-700 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center justify-center mb-6">
          {logoPrimary ? (
            <img src={logoPrimary} alt="RootNova" className="h-12" />
          ) : (
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold text-xl">R</div>
          )}
        </div>
        <h1 className="text-xl font-bold text-white text-center mb-1">Create your account</h1>
        <p className="text-slate-400 text-sm text-center mb-6">Partner signup for RootNova ReviewFlow</p>
        <form onSubmit={submit} className="space-y-4">
          <input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min 6 chars)" className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <button type="submit" disabled={busy} className="w-full py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-medium text-sm transition-colors">{busy ? "Creating…" : "Create account"}</button>
        </form>
        <p className="text-slate-400 text-xs text-center mt-6">Already have an account? <Link to="/login" className="text-brand-400 hover:underline">Sign in</Link></p>
      </div>
    </div>
  );
}
