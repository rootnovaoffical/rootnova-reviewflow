import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import SpatialBackground from "../components/SpatialBackground";

export default function Invite() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token");
  const [invitation, setInvitation] = useState<{ email: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setError("Missing invitation token"); setLoading(false); return; }

    // Fetch invitation via edge function to bypass RLS (anon key can't read admin_invitations)
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accept-invitation`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
      body: JSON.stringify({ token, action: "lookup" }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || data.error) { setError(data.error || "Invalid or expired invitation"); setLoading(false); return; }
        setInvitation({ email: data.email, role: data.role });
        setLoading(false);
      })
      .catch(() => { setError("Failed to load invitation"); setLoading(false); });
  }, [token]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation || !token) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accept-invitation`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
        body: JSON.stringify({ token, password, fullName }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setError(data.error || "Failed to create account"); setSubmitting(false); return; }

      // If the edge function returned a session, set it in the client
      if (data.session?.access_token && data.session?.refresh_token) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      // Navigate to the role-appropriate page
      const role = data.role || invitation.role;
      const dest = role === "BUSINESS_ADMIN" ? "/business"
        : role.startsWith("PARTNER") ? "/partner"
        : "/admin";
      navigate(dest);
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  };

  if (loading) return (
    <>
      <SpatialBackground />
      <div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" /></div>
    </>
  );

  return (
    <>
      <SpatialBackground />
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-strong rounded-2xl p-8 w-full max-w-md animate-scale-in">
          <h1 className="text-2xl font-bold text-white mb-2">Accept Invitation</h1>
          <p className="text-sm text-slate-400 mb-6">You've been invited as <span className="text-primary-300 font-medium">{invitation?.role?.replace(/_/g, " ")}</span></p>
          {error && <div className="text-sm text-error-400 bg-error-500/10 border border-error-500/20 rounded-lg px-4 py-2 mb-4">{error}</div>}
          {invitation && (
            <form onSubmit={handleAccept} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                <input disabled value={invitation.email} className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-lg text-slate-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name</label>
                <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500 transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
                <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500 transition-colors" placeholder="Min 6 characters" />
              </div>
              <button type="submit" disabled={submitting} className="w-full py-3 bg-gradient-to-r from-primary-600 to-primary-500 disabled:opacity-50 text-white font-semibold rounded-lg transition-all">
                {submitting ? "Creating account..." : "Accept & Create Account"}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
