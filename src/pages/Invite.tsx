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
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setError("Missing invitation token"); setLoading(false); return; }
    supabase.from("admin_invitations").select("*").eq("id", token).eq("status", "INVITED").maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) { setError("Invalid or expired invitation"); setLoading(false); return; }
        setInvitation(data);
        setLoading(false);
      });
  }, [token]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation) return;
    setSubmitting(true);
    setError(null);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: invitation.email, password,
      options: { data: { full_name: fullName } },
    });
    if (signUpError) { setError(signUpError.message); setSubmitting(false); return; }
    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id, email: invitation.email, full_name: fullName, role: invitation.role, account_status: "ACTIVE",
      }, { onConflict: "id" });
      if (invitation.role.startsWith("PARTNER")) {
        await supabase.from("organization_members").insert({
          organization_id: (await supabase.from("admin_invitations").select("organization_id").eq("id", token).single()).data?.organization_id || null,
          user_id: data.user.id,
          role: invitation.role === "PARTNER_OWNER" ? "OWNER" : invitation.role === "PARTNER_ADMIN" ? "ADMIN" : "TEAM_MEMBER",
          status: "ACTIVE",
        });
      }
      if (invitation.role === "BUSINESS_ADMIN" && invitation.business_id) {
        await supabase.from("business_admins").insert({ business_id: invitation.business_id, user_id: data.user.id });
      }
      await supabase.from("admin_invitations").update({ status: "ACCEPTED", updated_at: new Date().toISOString() }).eq("id", token);
    }
    setSubmitting(false);
    navigate("/login");
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
