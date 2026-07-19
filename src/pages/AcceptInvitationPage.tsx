import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useToast } from "../context/ToastContext";
import { Loading, ErrorState } from "../components/States";

export default function AcceptInvitationPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { show } = useToast();
  const [state, setState] = useState<"loading" | "form" | "done" | "error">("loading");
  const [invitation, setInvitation] = useState<{ email: string; role: string } | null>(null);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (!token) { setState("error"); return; }
      const { data, error } = await supabase.from("admin_invitations").select("email, role, status, business_id").eq("id", token).maybeSingle();
      if (error || !data || (data as { status: string }).status !== "PENDING") { setState("error"); return; }
      setInvitation(data as { email: string; role: string });
      setState("form");
    })();
  }, [token]);

  const accept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation) return;
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: invitation.email, password,
      options: { data: { full_name: fullName, role: invitation.role } },
    });
    if (error) { setBusy(false); show(error.message, "error"); return; }
    const userId = data.user?.id;
    if (userId) {
      await supabase.from("profiles").upsert({ id: userId, email: invitation.email, full_name: fullName, role: invitation.role, account_status: "ACTIVE" });
      await supabase.from("admin_invitations").update({ status: "ACCEPTED", updated_at: new Date().toISOString() }).eq("id", token!);
    }
    setBusy(false);
    setState("done");
    show("Account created. Please sign in.", "success");
    setTimeout(() => navigate("/login"), 1500);
  };

  if (state === "loading") return <Loading label="Loading invitation…" />;
  if (state === "error") return <div className="min-h-screen flex items-center justify-center p-6"><ErrorState title="Invitation invalid" message="This invitation is no longer valid." /></div>;
  if (state === "done") return <div className="min-h-screen flex items-center justify-center p-6 text-white">Account created. Redirecting to sign in…</div>;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={accept} className="w-full max-w-sm bg-slate-900/70 backdrop-blur border border-slate-700 rounded-2xl p-8 space-y-4">
        <h1 className="text-xl font-bold text-white text-center">Accept invitation</h1>
        <p className="text-slate-400 text-sm text-center">You've been invited as <span className="text-brand-300 font-medium">{invitation?.role}</span></p>
        <input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        <input value={invitation?.email ?? ""} disabled className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-sm" />
        <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min 6 chars)" className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        <button type="submit" disabled={busy} className="w-full py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-medium text-sm transition-colors">{busy ? "Creating…" : "Create account & accept"}</button>
      </form>
    </div>
  );
}
