import { useState, useRef } from "react";
import BusinessShell from "./BusinessShell";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { updateProfile } from "../../lib/auth";
import { uploadAvatar } from "../../lib/storage";
import Avatar from "../../components/Avatar";

export default function BusinessSettings() {
  const { profile, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState({ full_name: profile?.full_name || "" });
  const avatarRef = useRef<HTMLInputElement>(null);

  const saveProfile = async () => {
    if (!profile) return;
    await updateProfile(profile.id, { full_name: form.full_name });
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

  return (
    <BusinessShell title="Settings">
      <div className="glass rounded-2xl p-6 max-w-lg">
        <h3 className="text-sm font-medium text-slate-400 mb-4">My Profile</h3>
        <div className="flex items-center gap-4 mb-4">
          <Avatar url={profile?.avatar_url} name={profile?.full_name} size="lg" />
          <input ref={avatarRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="text-sm text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-600 file:text-white file:cursor-pointer" />
        </div>
        <div className="space-y-3">
          <div><label className="block text-xs text-slate-400 mb-1">Full Name</label><input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} className="w-full px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm" /></div>
          <div><label className="block text-xs text-slate-400 mb-1">Email</label><input disabled value={profile?.email || ""} className="w-full px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-slate-400 text-sm" /></div>
        </div>
        <button onClick={saveProfile} className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium rounded-lg transition-colors">Save Profile</button>
      </div>
    </BusinessShell>
  );
}
