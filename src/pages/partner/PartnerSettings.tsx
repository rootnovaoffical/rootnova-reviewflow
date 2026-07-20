import { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { Loading, ErrorState } from "../../components/States";
import Avatar from "../../components/Avatar";
import { useToast } from "../../components/Toast";
import { cacheBustUrl } from "../../lib/utils";
import type { Organization } from "../../lib/types";

export function PartnerSettings() {
  const { profile, updateProfile } = useAuth();
  const { toast } = useToast();
  const [org, setOrg] = useState<Organization | null>(null);
  const [form, setForm] = useState<Partial<Organization>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [orgLogoUploading, setOrgLogoUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      if (!profile?.id) return;
      const { data: member } = await supabase.from("organization_members").select("organization_id").eq("user_id", profile.id).maybeSingle();
      const oid = (member as any)?.organization_id;
      if (!oid) { setError("No organization found"); setLoading(false); return; }
      const { data, error } = await supabase.from("organizations").select("*").eq("id", oid).maybeSingle();
      if (error) setError(error.message); else { setOrg(data as Organization); setForm(data as Organization); }
      setLoading(false);
    })();
  }, [profile?.id]);

  const handleSave = async () => {
    if (!org) return;
    setSaving(true);
    const { error } = await supabase.from("organizations").update({ name: form.name, contact_email: form.contact_email, contact_phone: form.contact_phone }).eq("id", org.id);
    if (error) toast(error.message, "error"); else { toast("Settings saved", "success"); setOrg({ ...org, ...form } as Organization); }
    setSaving(false);
  };

  const handleAvatarUpload = async (file: File) => {
    if (!profile) return;
    setAvatarUploading(true);
    try {
      const path = `${profile.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) { toast(upErr.message, "error"); setAvatarUploading(false); return; }
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const avatarUrl = cacheBustUrl(pub.publicUrl);
      await updateProfile({ avatar_url: avatarUrl });
      toast("Avatar updated instantly", "success");
    } catch (err) { toast(err instanceof Error ? err.message : "Upload failed", "error"); }
    setAvatarUploading(false);
  };

  const handleOrgLogoUpload = async (file: File) => {
    if (!org) return;
    setOrgLogoUploading(true);
    const path = `org-logos/${org.id}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("business-logos").upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) { toast(upErr.message, "error"); setOrgLogoUploading(false); return; }
    const { data: pub } = supabase.storage.from("business-logos").getPublicUrl(path);
    const { error: updErr } = await supabase.from("organizations").update({ logo_url: pub.publicUrl }).eq("id", org.id);
    if (updErr) toast(updErr.message, "error");
    else { toast("Organization logo updated", "success"); setOrg({ ...org, logo_url: cacheBustUrl(pub.publicUrl) }); }
    setOrgLogoUploading(false);
  };

  if (loading) return <Loading message="Loading settings…" />;
  if (error) return <ErrorState message={error} />;
  if (!org) return <ErrorState message="Organization not found" />;

  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-2xl font-bold text-ink-50">Settings</h1><p className="mt-1 text-sm text-ink-400">Manage your profile and organization</p></div>
      <div className="card space-y-4">
        <h3 className="font-display text-base font-semibold text-ink-50">Your Avatar</h3>
        <div className="flex items-center gap-4">
          <Avatar url={profile?.avatar_url ? cacheBustUrl(profile.avatar_url) : profile?.avatar_url} name={profile?.full_name || "?"} size="xl" ring />
          <label className="btn-secondary cursor-pointer">
            {avatarUploading ? "Uploading…" : "Upload Avatar"}
            <input type="file" accept="image/*" className="hidden" ref={avatarInputRef} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); e.currentTarget.value = ""; }} disabled={avatarUploading} />
          </label>
        </div>
        <p className="text-sm text-ink-400">Your avatar appears in the sidebar, team lists, and across the platform.</p>
      </div>
      <div className="card space-y-4">
        <h3 className="font-display text-base font-semibold text-ink-50">Organization Logo</h3>
        <div className="flex items-center gap-4">
          <Avatar url={org.logo_url ? cacheBustUrl(org.logo_url) : org.logo_url} name={org.name} size="xl" ring />
          <label className="btn-secondary cursor-pointer">
            {orgLogoUploading ? "Uploading…" : "Upload Logo"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleOrgLogoUpload(f); e.currentTarget.value = ""; }} disabled={orgLogoUploading} />
          </label>
        </div>
      </div>
      <div className="card max-w-2xl space-y-4">
        <h3 className="font-display text-base font-semibold text-ink-50">Organization Details</h3>
        <div><label className="label">Organization Name</label><input className="input" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><label className="label">Slug</label><input className="input" value={org.slug} disabled /></div>
        <div><label className="label">Contact Email</label><input type="email" className="input" value={form.contact_email || ""} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></div>
        <div><label className="label">Contact Phone</label><input className="input" value={form.contact_phone || ""} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} /></div>
        <div><label className="label">Status</label><input className="input" value={org.status} disabled /></div>
        <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save Settings"}</button>
      </div>
    </div>
  );
}
