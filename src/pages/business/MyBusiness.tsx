import { useEffect, useState, useRef } from "react";
import BusinessShell from "./BusinessShell";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import type { Business } from "../../lib/types";
import { Loading, ErrorState } from "../../components/States";
import { useToast } from "../../context/ToastContext";
import { insertAuditLog } from "../../lib/auth";
import { uploadBusinessLogo } from "../../lib/storage";
import { useQRCode, downloadQR } from "../../lib/qr";

export default function BusinessMyBusiness() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", welcome_message: "", google_review_url: "", primary_color: "#6366f1", secondary_color: "#a855f7", public_review_enabled: true });
  const logoRef = useRef<HTMLInputElement>(null);
  const reviewUrl = business ? `${window.location.origin}/r/${business.slug}` : null;
  const qrUrl = useQRCode(reviewUrl);

  useEffect(() => {
    if (!profile) return;
    supabase.from("business_admins").select("business_id").eq("user_id", profile.id).single()
      .then(({ data }) => {
        if (!data?.business_id) { setLoading(false); return; }
        supabase.from("businesses").select("*").eq("id", data.business_id).single().then(({ data: b }) => {
          setBusiness(b as Business);
          setEditForm({ name: (b as Business).name, welcome_message: (b as Business).welcome_message, google_review_url: (b as Business).google_review_url || "", primary_color: (b as Business).primary_color, secondary_color: (b as Business).secondary_color, public_review_enabled: (b as Business).public_review_enabled });
          setLoading(false);
        });
      });
  }, [profile]);

  const saveEdit = async () => {
    if (!business || !profile) return;
    const { error } = await supabase.from("businesses").update({
      name: editForm.name, welcome_message: editForm.welcome_message, google_review_url: editForm.google_review_url || null,
      primary_color: editForm.primary_color, secondary_color: editForm.secondary_color, public_review_enabled: editForm.public_review_enabled,
    }).eq("id", business.id);
    if (error) { showToast("Failed to save", "error"); return; }
    await insertAuditLog({ actor_id: profile.id, actor_email: profile.email, action: "business_updated", target_type: "business", target_id: business.id });
    showToast("Business updated", "success");
    setEditing(false);
    supabase.from("businesses").select("*").eq("id", business.id).single().then(({ data }) => setBusiness(data as Business));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !business) return;
    const url = await uploadBusinessLogo(business.id, file);
    if (url) {
      await supabase.from("businesses").update({ logo_url: url }).eq("id", business.id);
      if (profile) await insertAuditLog({ actor_id: profile.id, actor_email: profile.email, action: "business_logo_updated", target_type: "business", target_id: business.id });
      showToast("Logo updated", "success");
      supabase.from("businesses").select("*").eq("id", business.id).single().then(({ data }) => setBusiness(data as Business));
    } else { showToast("Upload failed", "error"); }
    if (logoRef.current) logoRef.current.value = "";
  };

  if (loading) return <BusinessShell title="My Business"><Loading /></BusinessShell>;
  if (!business) return <BusinessShell title="My Business"><ErrorState message="No business assigned to your account." /></BusinessShell>;

  return (
    <BusinessShell title={business.name}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-4">
            {business.logo_url ? <img src={business.logo_url} alt={business.name} className="w-14 h-14 rounded-xl object-cover" /> : <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-xl">{business.name[0]}</div>}
            <div><h2 className="text-lg font-bold text-white">{business.name}</h2><p className="text-sm text-slate-400">{business.status}</p></div>
          </div>
          {editing ? (
            <div className="space-y-3">
              <input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm" />
              <textarea value={editForm.welcome_message} onChange={(e) => setEditForm((f) => ({ ...f, welcome_message: e.target.value }))} className="w-full px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm" rows={2} />
              <input value={editForm.google_review_url} onChange={(e) => setEditForm((f) => ({ ...f, google_review_url: e.target.value }))} placeholder="Google Review URL" className="w-full px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm" />
              <div className="flex gap-3">
                <div><label className="block text-xs text-slate-400 mb-1">Primary Color</label><input type="color" value={editForm.primary_color} onChange={(e) => setEditForm((f) => ({ ...f, primary_color: e.target.value }))} className="w-12 h-8 rounded" /></div>
                <div><label className="block text-xs text-slate-400 mb-1">Secondary Color</label><input type="color" value={editForm.secondary_color} onChange={(e) => setEditForm((f) => ({ ...f, secondary_color: e.target.value }))} className="w-12 h-8 rounded" /></div>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={editForm.public_review_enabled} onChange={(e) => setEditForm((f) => ({ ...f, public_review_enabled: e.target.checked }))} /> Public reviews enabled</label>
              <div className="flex gap-2"><button onClick={saveEdit} className="flex-1 py-2 bg-primary-600 text-white text-sm rounded-lg">Save</button><button onClick={() => setEditing(false)} className="flex-1 py-2 glass text-white text-sm rounded-lg">Cancel</button></div>
            </div>
          ) : (
            <div>
              <dl className="space-y-2 text-sm">
                <div><dt className="text-slate-500">Welcome Message</dt><dd className="text-white">{business.welcome_message}</dd></div>
                <div><dt className="text-slate-500">Google Review URL</dt><dd className="text-white truncate">{business.google_review_url || "—"}</dd></div>
                <div><dt className="text-slate-500">Public Reviews</dt><dd className="text-white">{business.public_review_enabled ? "Enabled" : "Disabled"}</dd></div>
                <div className="flex gap-3"><div><dt className="text-slate-500">Primary</dt><dd><div className="w-6 h-6 rounded" style={{ background: business.primary_color }} /></dd></div><div><dt className="text-slate-500">Secondary</dt><dd><div className="w-6 h-6 rounded" style={{ background: business.secondary_color }} /></dd></div></div>
              </dl>
              <button onClick={() => setEditing(true)} className="mt-4 w-full py-2 glass text-white text-sm font-medium rounded-lg hover:bg-white/10 transition-colors">Edit</button>
            </div>
          )}
          <div className="mt-4">
            <input ref={logoRef} type="file" accept="image/*" onChange={handleLogoUpload} className="block w-full text-sm text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-600 file:text-white file:cursor-pointer" />
          </div>
        </div>
        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-medium text-slate-400 mb-4">ReviewFlow QR</h3>
          {qrUrl && <img src={qrUrl} alt="QR" className="w-48 h-48 rounded-xl mb-4" />}
          <p className="text-xs text-slate-500 mb-3 break-all">{reviewUrl}</p>
          {qrUrl && <button onClick={() => downloadQR(qrUrl, `${business.slug}-qr.png`)} className="w-full py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium rounded-lg transition-colors">Download QR</button>}
        </div>
        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-medium text-slate-400 mb-4">Review Link</h3>
          <p className="text-xs text-slate-500 mb-3 break-all">{reviewUrl}</p>
          <button onClick={() => { if (reviewUrl) navigator.clipboard.writeText(reviewUrl); showToast("Link copied", "success"); }} className="w-full py-2 glass text-white text-sm font-medium rounded-lg hover:bg-white/10 transition-colors">Copy Link</button>
          {business.google_review_url && <a href={business.google_review_url} target="_blank" rel="noreferrer" className="mt-2 block text-center py-2 bg-success-600 hover:bg-success-500 text-white text-sm font-medium rounded-lg transition-colors">Open Google Review</a>}
        </div>
      </div>
    </BusinessShell>
  );
}
