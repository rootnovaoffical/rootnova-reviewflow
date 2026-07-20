import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import type { OrganizationMember } from "../../lib/types";
import Avatar from "../../components/Avatar";
import { Loading, EmptyState } from "../../components/States";
import { useToast } from "../../context/ToastContext";
import { callManageAdmin, insertAuditLog } from "../../lib/auth";

export default function PartnerTeam() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [members, setMembers] = useState<OrganizationMember[] | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  const load = () => {
    if (!profile) return;
    supabase.from("organization_members").select("*, profile:profiles!user_id(*)").eq("user_id", profile.id).single()
      .then(({ data: myMembership }) => {
        if (myMembership?.organization_id) {
          setOrgId(myMembership.organization_id);
          supabase.from("organization_members").select("*, profile:profiles!user_id(*)").eq("organization_id", myMembership.organization_id)
            .then(({ data }) => setMembers((data || []) as unknown as OrganizationMember[]));
        } else { setMembers([]); }
      });
  };
  useEffect(() => { load(); }, [profile]);

  const invite = async (email: string, role: string) => {
    if (!profile || !orgId) return;
    const result = await callManageAdmin("invite", { email, role, organization_id: orgId });
    if (!result.ok) { showToast(result.error || "Failed to invite", "error"); return; }
    await insertAuditLog({ actor_id: profile.id, actor_email: profile.email, action: "team_member_invited", target_type: "admin_invitation", organization_id: orgId, metadata: { email, role } });
    showToast("Invitation sent", "success");
    setInviting(false); load();
  };

  const changeRole = async (member: OrganizationMember, newRole: string) => {
    const { error } = await supabase.from("organization_members").update({ role: newRole }).eq("id", member.id);
    if (error) { showToast("Failed to change role", "error"); return; }
    if (profile) await insertAuditLog({ actor_id: profile.id, actor_email: profile.email, action: "team_member_role_changed", target_type: "organization_member", target_id: member.id, organization_id: orgId || undefined, metadata: { new_role: newRole } });
    showToast("Role updated", "success"); load();
  };

  const removeMember = async (member: OrganizationMember) => {
    const { error } = await supabase.from("organization_members").delete().eq("id", member.id);
    if (error) { showToast("Failed to remove member", "error"); return; }
    if (profile) await insertAuditLog({ actor_id: profile.id, actor_email: profile.email, action: "team_member_removed", target_type: "organization_member", target_id: member.id, organization_id: orgId || undefined });
    showToast("Member removed", "success"); load();
  };

  if (!members) return <Layout title="Team"><Loading /></Layout>;

  return (
    <Layout title="Team Management">
      <div className="flex justify-end mb-4">
        <button onClick={() => setInviting(true)} className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium rounded-lg transition-colors">Invite Member</button>
      </div>
      {members.length === 0 ? <EmptyState title="No team members" /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {members.map((m) => (
            <div key={m.id} className="glass rounded-2xl p-6 flex items-center gap-4">
              <Avatar url={m.profile?.avatar_url} name={m.profile?.full_name} size="lg" />
              <div className="flex-1">
                <h3 className="text-sm font-bold text-white">{m.profile?.full_name || "Unknown"}</h3>
                <p className="text-xs text-slate-400">{m.profile?.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <select value={m.role} onChange={(e) => changeRole(m, e.target.value)} className="text-xs bg-slate-900/50 border border-white/10 rounded-lg text-white px-2 py-1" disabled={m.user_id === profile?.id}>
                    <option value="PARTNER_OWNER">Owner</option><option value="PARTNER_ADMIN">Admin</option><option value="PARTNER_TEAM_MEMBER">Team Member</option>
                  </select>
                  <span className={`px-2 py-1 rounded-full text-xs ${m.status === "ACTIVE" ? "bg-success-500/20 text-success-400" : "bg-slate-500/20 text-slate-400"}`}>{m.status}</span>
                </div>
              </div>
              {m.user_id !== profile?.id && <button onClick={() => removeMember(m)} className="px-3 py-2 text-sm text-error-400 hover:bg-error-500/10 rounded-lg transition-colors">Remove</button>}
            </div>
          ))}
        </div>
      )}
      {inviting && <InviteModal onClose={() => setInviting(false)} onInvite={invite} />}
    </Layout>
  );
}

function InviteModal({ onClose, onInvite }: { onClose: () => void; onInvite: (email: string, role: string) => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("PARTNER_TEAM_MEMBER");
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="glass-strong rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-white mb-4">Invite Team Member</h2>
        <div className="mb-3"><label className="block text-xs text-slate-400 mb-1">Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm" /></div>
        <div className="mb-4"><label className="block text-xs text-slate-400 mb-1">Role</label><select value={role} onChange={(e) => setRole(e.target.value)} className="w-full px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm"><option value="PARTNER_ADMIN">Partner Admin</option><option value="PARTNER_TEAM_MEMBER">Team Member</option></select></div>
        <div className="flex gap-3"><button onClick={() => onInvite(email, role)} className="flex-1 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium rounded-lg">Send Invite</button><button onClick={onClose} className="flex-1 py-2 glass text-white text-sm font-medium rounded-lg">Cancel</button></div>
      </div>
    </div>
  );
}
