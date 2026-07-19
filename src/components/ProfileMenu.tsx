import { useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { supabase } from "../lib/supabase";
import { uploadAvatar } from "../lib/storage";
import { logAudit } from "../lib/audit";
import Avatar from "./Avatar";

export default function ProfileMenu() {
  const { profile, signOut, refreshProfile } = useAuth();
  const { show } = useToast();
  const [open, setOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(profile?.full_name || "");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  if (!profile) return null;

  const onUpload = async (file: File) => {
    setBusy(true);
    const url = await uploadAvatar(profile.id, file);
    setBusy(false);
    if (!url) { show("Upload failed", "error"); return; }
    await supabase.from("profiles").update({ avatar_url: url }).eq("id", profile.id);
    await logAudit("profile.avatar_update", "profile", profile.id, null, {});
    await refreshProfile();
    show("Avatar updated", "success");
  };

  const removeAvatar = async () => {
    await supabase.from("profiles").update({ avatar_url: null }).eq("id", profile.id);
    await logAudit("profile.avatar_remove", "profile", profile.id, null, {});
    await refreshProfile();
    show("Avatar removed", "success");
    setOpen(false);
  };

  const saveName = async () => {
    await supabase.from("profiles").update({ full_name: name }).eq("id", profile.id);
    await refreshProfile();
    setEditingName(false);
    show("Name updated", "success");
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-lg hover:bg-slate-800 px-2 py-1.5 transition">
        <Avatar name={profile.full_name} src={profile.avatar_url} size="sm" />
        <div className="text-left hidden sm:block">
          <p className="text-white text-sm font-medium leading-tight">{profile.full_name}</p>
          <p className="text-slate-400 text-xs leading-tight capitalize">{profile.role.replace(/_/g, " ").toLowerCase()}</p>
        </div>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden slide-up-fade">
            <div className="p-4 border-b border-slate-800 flex items-center gap-3">
              <Avatar name={profile.full_name} src={profile.avatar_url} size="lg" />
              <div>
                <p className="text-white font-medium text-sm">{profile.full_name}</p>
                <p className="text-slate-400 text-xs">{profile.email}</p>
                <p className="text-brand-400 text-xs mt-0.5 capitalize">{profile.role.replace(/_/g, " ").toLowerCase()}</p>
              </div>
            </div>
            <div className="p-3 space-y-1">
              {editingName ? (
                <div className="flex gap-2 px-2">
                  <input value={name} onChange={(e) => setName(e.target.value)} className="flex-1 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white text-sm" />
                  <button onClick={saveName} className="px-2 py-1 rounded bg-brand-600 text-white text-xs">Save</button>
                </div>
              ) : (
                <button onClick={() => setEditingName(true)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 text-sm">Edit name</button>
              )}
              <button onClick={() => fileRef.current?.click()} disabled={busy} className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 text-sm disabled:opacity-50">{busy ? "Uploading…" : "Upload avatar"}</button>
              {profile.avatar_url && <button onClick={removeAvatar} className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-rose-400 text-sm">Remove avatar</button>}
              <button onClick={signOut} className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-rose-400 text-sm">Sign out</button>
            </div>
          </div>
        </>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
    </div>
  );
}
