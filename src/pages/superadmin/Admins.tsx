import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { PageHeader, Card, Badge } from "../../components/Shell";
import { Modal } from "../../components/Modal";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { logAudit } from "../../lib/audit";
import Avatar from "../../components/Avatar";
import type { Profile, Role } from "../../lib/types";

const ROLE_LABELS: Record<Role, string> = {
  ROOTNOVA_SUPER_ADMIN: "Super Admin", ROOTNOVA_ADMIN: "Admin",
  PARTNER_OWNER: "Partner Owner", PARTNER_ADMIN: "Partner Admin",
  PARTNER_TEAM_MEMBER: "Team Member", BUSINESS_ADMIN: "Business Admin",
};

export default function SuperAdminAdmins() {
  const { show } = useToast();
  const { profile: me } = useAuth();
  const [admins, setAdmins] = useState<Profile[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("ROOTNOVA_ADMIN");
  const [busy, setBusy] = useState(false);
  const load = async () => {
    const { data } = await supabase.from("profiles").select("*").in("role", ["ROOTNOVA_SUPER_ADMIN", "ROOTNOVA_ADMIN"]).order("created_at");
    setAdmins((data as Profile[]) || []);
  };
  useEffect(() => { load(); }, []);
  const invite = async () => {
    setBusy(true);
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, { data: { full_name: fullName, role } });
    if (error) { show("Invite failed: " + error.message, "error"); setBusy(false); return; }
    const userId = data.user?.id;
    if (userId) {
      await supabase.from("profiles").upsert({ id: userId, email, full_name: fullName, role, account_status: "ACTIVE" });
      await supabase.from("admin_invitations").insert({ email, role, status: "PENDING", invited_by: me?.id });
      await logAudit("admin.invite", "profile", userId, null, { email, role });
    }
    setBusy(false); setInviteOpen(false); setEmail(""); setFullName("");
    show("Invitation sent", "success"); load();
  };
  const setStatus = async (p: Profile, status: string) => {
    const { error } = await supabase.from("profiles").update({ account_status: status }).eq("id", p.id);
    if (error) { show("Failed", "error"); return; }
    await logAudit("admin.status_change", "profile", p.id, null, { status });
    show("Status updated", "success"); load();
  };
  return (
    <div>
      <PageHeader title="Admins" subtitle="Manage RootNova administrators" actions={<button onClick={() => setInviteOpen(true)} className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm">Invite admin</button>} />
      <div className="p-8 grid gap-3">
        {admins.map((p) => (
          <Card key={p.id}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3"><Avatar name={p.full_name} src={p.avatar_url} size="md" /><div><p className="text-white font-medium">{p.full_name || "Unnamed"}</p><p className="text-slate-400 text-xs">{p.email}</p></div></div>
              <div className="flex items-center gap-3">
                <Badge color={p.role === "ROOTNOVA_SUPER_ADMIN" ? "brand" : "blue"}>{ROLE_LABELS[p.role]}</Badge>
                <Badge color={p.account_status === "ACTIVE" ? "green" : "amber"}>{p.account_status}</Badge>
                {p.id !== me?.id && <button onClick={() => setStatus(p, p.account_status === "ACTIVE" ? "SUSPENDED" : "ACTIVE")} className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs">{p.account_status === "ACTIVE" ? "Suspend" : "Activate"}</button>}
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite admin">
        <div className="space-y-3">
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm" />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm" />
          <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm"><option value="ROOTNOVA_ADMIN">RootNova Admin</option><option value="ROOTNOVA_SUPER_ADMIN">RootNova Super Admin</option></select>
          <div className="flex justify-end gap-3 pt-2"><button onClick={() => setInviteOpen(false)} className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800">Cancel</button><button onClick={invite} disabled={busy} className="px-4 py-2 rounded-lg text-sm bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white">{busy ? "Sending…" : "Send invite"}</button></div>
        </div>
      </Modal>
    </div>
  );
}
