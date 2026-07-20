import { useEffect, useState, useRef } from "react";
import Layout from "../../components/Layout";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import type { Organization } from "../../lib/types";
import { Loading, ErrorState } from "../../components/States";
import { useToast } from "../../context/ToastContext";
import { updateProfile, insertAuditLog } from "../../lib/auth";
import { uploadOrgLogo, uploadAvatar } from "../../lib/storage";
import Avatar from "../../components/Avatar";

export default function PartnerSettings() {
  const { profile, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const [org, setOrg] = useState<Organization | null>(null);
  const [orgForm, setOrgForm] = useState({ name: "", contact_email: "", contact_phone: "" });
  const [profileForm, setProfileForm] = useState({ full_name: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!profile) return;
    setProfileForm({ full_name: profile.full_name });
    supabase.from("organization_members").select("organization_id").eq("user_id", profile.id).maybeSingle()
      .then(({ data: mem, error: memErr }) => {
        if (memErr) { setError(memErr.message); setLoading(false); return; }
        if (mem?.organization_id) {
          supabase.from("organizations").select("*").eq("id", mem.organization_id).maybeSingle().then(({ data, error: orgErr }) => {
            if (orgErr) { setError(orgErr.message); setLoading(false); return; }
            setOrg(data as Organization);
            setOrgForm({ name: (data as Organization).name, contact_email: (data as Organization).contact_email || "", contact_phone: (data as Organization).contact_phone || "" });
            setLoading(false);
          });
        } else { setLoading(false); }
      });
  }, [profile]);

  const saveOrg = async () => {
    if (!org || !profile) return;
    const { error } = await supabase.from("organizations").update({
      name: orgForm.name, contact_email: orgForm.contact_email || null, contact_phone: orgForm.contact_phone || null,
    }).eq("id", org.id);
    if (error) { showToast("Failed to save organization", "error"); return; }
    await insertAuditLog({ actor_id: profile.id, actor_email: profile.email, action: "org_updated", target_type: "organization", target_id: org.id, organization_id: org.id });
    showToast("Organization updated", "success");
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !org) return;
    const url = await uploadOrgLogo(org.id, file);
    if (url) {
      await supabase.from("organizations").update({ logo_url: url }).eq("id", org.id);
      if (profile) await insertAuditLog({ actor_id: profile.id, actor_email: profile.email, action: "org_logo_updated", target_type: "organization", target_id: org.id, organization_id: org.id });
      showToast("Logo updated", "success");
    } else { showToast("Upload failed", "error"); }
    if (logoRef.current) logoRef.current.value = "";
  };

  const saveProfile = async () => {
    if (!profile) return;
    await updateProfile(profile.id, { full_name: profileForm.full_name });
    await refreshProfile();
    showToast("Profile updated", "success");
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    const url = await uploadAvatar(profile.id, file);
    if (url) {
      await updateProfile(profile.id, { avatar_url: url });
      await refreshProfile();
      showToast("Avatar updated", "success");
    } else { showToast("Upload failed", "error"); }
    if (avatarRef.current) avatarRef.current.value = "";
  };

  if (loading) return <Layout title="Settings"><Loading /></Layout>;
  if (error) return <Layout title="Settings"><ErrorState message={error} /></Layout>;

  return (
    <Layout title="Settings">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-medium text-slate-400 mb-4">Organization Profile</h3>
          <div className="flex items-center gap-4 mb-4">
            {org?.logo_url ? <img src={org.logo_url} alt={org.name} className="w-14 h-14 rounded-xl object-cover" /> : <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-xl">{org?.name?.[0]}</div>}
            <input ref={logoRef} type="file" accept="image/*" onChange={handleLogoUpload} className="text-sm text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-600 file:text-white file:cursor-pointer" />
          </div>
          <div className="space-y-3">
            <div><label className="block text-xs text-slate-400 mb-1">Name</label><input value={orgForm.name} onChange={(e) => setOrgForm((f) => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm" /></div>
            <div><label className="block text-xs text-slate-400 mb-1">Contact Email</label><input value={orgForm.contact_email} onChange={(e) => setOrgForm((f) => ({ ...f, contact_email: e.target.value }))} className="w-full px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm" /></div>
            <div><label className="block text-xs text-slate-400 mb-1">Contact Phone</label><input value={orgForm.contact_phone} onChange={(e) => setOrgForm((f) => ({ ...f, contact_phone: e.target.value }))} className="w-full px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm" /></div>
          </div>
          <button onClick={saveOrg} className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium rounded-lg transition-colors">Save Organization</button>
        </div>
        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-medium text-slate-400 mb-4">My Profile</h3>
          <div className="flex items-center gap-4 mb-4">
            <Avatar url={profile?.avatar_url} name={profile?.full_name} size="lg" />
            <input ref={avatarRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="text-sm text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-600 file:text-white file:cursor-pointer" />
          </div>
          <div className="space-y-3">
            <div><label className="block text-xs text-slate-400 mb-1">Full Name</label><input value={profileForm.full_name} onChange={(e) => setProfileForm((f) => ({ ...f, full_name: e.target.value }))} className="w-full px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm" /></div>
            <div><label className="block text-xs text-slate-400 mb-1">Email</label><input disabled value={profile?.email || ""} className="w-full px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-slate-400 text-sm" /></div>
          </div>
          <button onClick={saveProfile} className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium rounded-lg transition-colors">Save Profile</button>
        </div>
      </div>
    </Layout>
  );
}
