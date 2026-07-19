// Setup page — one-shot creation of the first ROOTNOVA_ADMIN account.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { claimInitialAdmin } from "../lib/auth-api";
import { Button, Input } from "../components/ui";
import { Sparkles, ShieldCheck, ArrowRight } from "lucide-react";

export default function SetupPage() {
  const { signUp, needsSetup } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<"form" | "done">("form");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      // 1. Create the auth user (handle_new_user trigger makes a BUSINESS_ADMIN profile).
      await signUp(email.trim(), password, fullName.trim());
      // 2. Promote this user to ROOTNOVA_ADMIN via the RPC.
      await claimInitialAdmin(fullName.trim());
      setStage("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setLoading(false);
    }
  }

  if (!needsSetup && stage === "form") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <ShieldCheck className="w-12 h-12 mx-auto text-emerald-400 mb-4" />
          <h1 className="text-xl font-semibold text-white">Setup already complete</h1>
          <p className="mt-2 text-sm text-slate-400">A RootNova admin account already exists.</p>
          <Button className="mt-6" onClick={() => navigate("/login")}>Go to sign in</Button>
        </div>
      </div>
    );
  }

  if (stage === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md text-center animate-fade-in">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg mb-4">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Admin account created</h1>
          <p className="mt-2 text-sm text-slate-400">You can now sign in to the RootNova admin dashboard.</p>
          <Button className="mt-6" size="lg" onClick={() => navigate("/login")}>
            Continue to sign in
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-purple-600/20 blur-[120px]" />
      </div>

      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-900/50 mb-4">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Welcome to RootNova</h1>
          <p className="mt-1.5 text-sm text-slate-400">Create the first RootNova admin account.</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm p-6 shadow-2xl">
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
            This one-time setup creates the platform owner account with full RootNova admin access. Keep these credentials safe.
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Full name" name="full_name" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane RootNova" />
            <Input label="Email" type="email" name="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@rootnova.com" />
            <Input label="Password" type="password" name="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" hint="Minimum 8 characters." />
            {error && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">{error}</div>
            )}
            <Button type="submit" loading={loading} className="w-full" size="lg">
              Create admin account
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
