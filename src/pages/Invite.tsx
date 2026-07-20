import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import SpatialBackground from "../components/SpatialBackground";

export default function Invite() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token");
  const [invitation, setInvitation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);

  useEffect(() => {
    if (!token) { setError("Missing invitation token"); setLoading(false); return; }

    (async () => {
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Not authenticated — redirect to login with return path
        setNeedsAuth(true);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accept-invitation`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ token, action: "lookup" }),
          },
        );
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Invalid or expired invitation");
          setLoading(false);
          return;
        }
        setInvitation(data);
        setLoading(false);
      } catch {
        setError("Failed to load invitation");
        setLoading(false);
      }
    })();
  }, [token]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation) return;
    setSubmitting(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Your session has expired. Please log in again.");
        setSubmitting(false);
        return;
      }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accept-invitation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ token, action: "accept", fullName }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to accept invitation");
        setSubmitting(false);
        return;
      }

      // Sign out so the user re-logs in with their new role
      await supabase.auth.signOut();
      navigate("/login");
    } catch {
      setError("Failed to accept invitation");
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
          {needsAuth && (
            <div className="space-y-4">
              <p className="text-sm text-slate-300">Please log in or sign up with the email that received the invitation, then return to this page.</p>
              <button
                onClick={() => navigate(`/login?redirect=/invite?token=${token}`)}
                className="w-full py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold rounded-lg transition-all"
              >
                Go to Login
              </button>
            </div>
          )}
          {invitation && !needsAuth && (
            <form onSubmit={handleAccept} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                <input disabled value={invitation.email} className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-lg text-slate-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name</label>
                <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500 transition-colors" />
              </div>
              <button type="submit" disabled={submitting} className="w-full py-3 bg-gradient-to-r from-primary-600 to-primary-500 disabled:opacity-50 text-white font-semibold rounded-lg transition-all">
                {submitting ? "Accepting..." : "Accept Invitation"}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
