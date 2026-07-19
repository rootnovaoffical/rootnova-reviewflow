import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { PageHeader, Card, Badge } from "../../components/Shell";
import { Modal } from "../../components/Modal";
import { useToast } from "../../context/ToastContext";
import { logAudit } from "../../lib/audit";
import { uploadOrgLogo } from "../../lib/storage";
import Avatar from "../../components/Avatar";
import type { Organization, OrganizationMember, Profile, OrgMemberRole } from "../../lib/types";

export default function SuperAdminOrganizationDetail() {
  const { id } = useParams<{ id: string }>();
  const { show } = useToast();
  const [org, setOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<(OrganizationMember & { profile?: Profile | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgMemberRole>("TEAM_MEMBER");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const { data: o } = await supabase.from("organizations").select("*").eq("id", id).maybeSingle();
    setOrg(o as Organization | null);
    if (o) { setName((o as Organization).name); setContactEmail((o as Organization).contact_email ?? ""); }
    const { data: m } = await supabase.from("organization_members").select("*, profiles!organization_members_user_id_fkey(*)").eq("organization_id", id);
    setMembers((m as (OrganizationMember & { profile?: Profile | null })[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [id]);

  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from("organizations").update({ name, contact_email: contactEmail, updated_at: new Date().toISOString() }).eq("id", id!);
    setBusy(false);
    if (error) { show("Save failed", "error"); return; }
    await logAudit("organization.update", "organization", id!);
    show("Organization updated", "success");
    setEditOpen(false); load();
  };

  const uploadLogo = async (file: File) => {
    const { url, error } = await uploadOrgLogo(id!, file);
    if (error || !url) { show("Upload failed", "error"); return; }
    const { error: uErr } = await supabase.from("organizations").update({ logo_url: url }).eq("id", id!);
    if (uErr) { show("Failed to save", "error"); return; }
    await logAudit("organization.logo.update", "organization", id!);
    show("Logo updated", "success"); load();
  };

  const invite = async () => {
    setBusy(true);
    const { data: userData } = await supabase.auth.admin.inviteUserByEmail(inviteEmail, { data: { role: "PARTNER_TEAM_MEMBER", organization_id: id } });
    if (userData?.user) {
      await supabase.from("organization_members").insert({ organization_id: id, user_id: userData.user.id, role: inviteRole, status: "INVITED" });
      await logAudit("organization.member.invite", "organization", id!, null, { email: inviteEmail, role: inviteRole });
    }
    setBusy(false); setInviteOpen(false); setInviteEmail("");
    show("Invitation sent", "success"); load();
  };

  const changeRole = async (m: OrganizationMember, role: OrgMemberRole) => {
    const { error } = await supabase.from("organization_members").update({ role }).eq("id", m.id);
    if (error) { show("Failed", "error"); return; }
    await logAudit("organization.member.role_change", "organization", id!, null, { user_id: m.user_id, role });
    show("Role updated", "success"); load();
  };

  const removeMember = async (m: OrganizationMember) => {
    const { error } = await supabase.from("organization_members").delete().eq("id", m.id);
    if (error) { show("Failed", "error"); return; }
    await logAudit("organization.member.remove", "organization", id!, null, { user_id: m.user_id });
    show("Member removed", "success"); load();
  };

  if (loading) return <div className="p-8 text-slate-400">Loading…</div>;
  if (!org) return <div className="p-8 text-rose-400">Organization not found.</div>;

  return (
    <div>
      <PageHeader title={org.name} subtitle={org.slug}
        actions={<>
          <button onClick={() => setEditOpen(true)} className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm">Edit</button>
          <button onClick={() => setInviteOpen(true)} className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm">Invite member</button>
        </>} />
      <div className="p-8 space-y-6">
        <Card>
          <div className="flex items-center gap-4">
            {org.logo_url ? <img src={org.logo_url} alt={org.name} className="h-16 w-16 rounded-xl object-cover" /> : <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold text-2xl">{org.name.slice(0, 1)}</div>}
            <div><p className="text-white font-semibold">{org.name}</p><p className="text-slate-400 text-sm">{org.contact_email}</p><Badge color={org.status === "ACTIVE" ? "green" : "amber"}>{org.status}</Badge></div>
            <label className="ml-auto px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium cursor-pointer">Change logo<input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} /></label>
          </div>
        </Card>
        <Card>
          <h3 className="text-white font-semibold mb-4">Team members</h3>
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800/50">
                <div className="flex items-center gap-3"><Avatar name={m.profile?.full_name} src={m.profile?.avatar_url} size="sm" /><div><p className="text-white text-sm">{m.profile?.full_name || "Unnamed"}</p><p className="text-slate-400 text-xs">{m.profile?.email}</p></div></div>
                <div className="flex items-center gap-2">
                  <select value={m.role} onChange={(e) => changeRole(m, e.target.value as OrgMemberRole)} className="bg-slate-800 border border-slate-700 text-white text-xs rounded px-2 py-1"><option value="OWNER">Owner</option><option value="ADMIN">Admin</option><option value="TEAM_MEMBER">Team Member</option></select>
                  <Badge color={m.status === "ACTIVE" ? "green" : "amber"}>{m.status}</Badge>
                  <button onClick={() => removeMember(m)} className="text-rose-400 hover:text-rose-300 text-xs">Remove</button>
                </div>
              </div>
            ))}
            {members.length === 0 && <p className="text-slate-500 text-sm">No members yet.</p>}
          </div>
        </Card>
      </div>
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit organization">
        <div className="space-y-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm" />
          <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="Contact email" className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm" />
          <div className="flex justify-end gap-3 pt-2"><button onClick={() => setEditOpen(false)} className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800">Cancel</button><button onClick={save} disabled={busy} className="px-4 py-2 rounded-lg text-sm bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white">{busy ? "Saving…" : "Save"}</button></div>
        </div>
      </Modal>
      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite team member">
        <div className="space-y-3">
          <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="Email" className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm" />
          <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as OrgMemberRole)} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm"><option value="OWNER">Owner</option><option value="ADMIN">Admin</option><option value="TEAM_MEMBER">Team Member</option></select>
          <div className="flex justify-end gap-3 pt-2"><button onClick={() => setInviteOpen(false)} className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800">Cancel</button><button onClick={invite} disabled={busy} className="px-4 py-2 rounded-lg text-sm bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white">{busy ? "Sending…" : "Send invite"}</button></div>
        </div>
      </Modal>
    </div>
  );
}
