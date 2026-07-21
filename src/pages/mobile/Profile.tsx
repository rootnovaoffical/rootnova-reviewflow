// ============================================================
// MODULE 14 — MOBILE PROFILE
// User profile view and edit
// ============================================================

import { useState } from "react";
import MobileShell from "../../components/MobileShell";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

export default function MobileProfile() {
  const { profile, updateProfile, signOut } = useAuth();
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.full_name ?? "");

  const handleSave = async () => {
    const { error } = await updateProfile({ full_name: name });
    if (error) { showToast("Failed to update", "error"); return; }
    showToast("Profile updated", "success");
    setEditing(false);
  };

  return (
    <MobileShell title="Profile" backTo="/mobile">
      <div className="space-y-4 page-enter">
        {/* Avatar */}
        <div className="text-center py-6 animate-fade-up">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-2xl font-bold text-white mx-auto mb-3">
            {(profile?.full_name ?? "U")[0].toUpperCase()}
          </div>
          <h2 className="text-lg font-bold text-white">{profile?.full_name ?? "User"}</h2>
          <p className="text-sm text-slate-500">{profile?.email}</p>
          <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs bg-primary-500/20 text-primary-300">{profile?.role ?? "Unknown"}</span>
        </div>

        {/* Editable fields */}
        <div className="glass rounded-2xl p-4 animate-fade-up" style={{ animationDelay: "80ms" }}>
          <h3 className="text-sm font-medium text-slate-300 mb-3">Edit Profile</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-500">Full Name</label>
              {editing ? (
                <div className="flex gap-2 mt-1">
                  <input value={name} onChange={(e) => setName(e.target.value)} className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-primary-500/50 focus:outline-none" />
                  <button onClick={handleSave} className="btn-primary px-4 py-2 text-white text-xs font-medium rounded-lg">Save</button>
                </div>
              ) : (
                <div className="flex items-center justify-between mt-1">
                  <p className="text-sm text-white">{profile?.full_name ?? "Not set"}</p>
                  <button onClick={() => setEditing(true)} className="text-xs text-primary-400">Edit</button>
                </div>
              )}
            </div>
            <div>
              <label className="text-xs text-slate-500">Email</label>
              <p className="text-sm text-white mt-1">{profile?.email ?? "Not set"}</p>
            </div>
            <div>
              <label className="text-xs text-slate-500">Account Status</label>
              <p className="text-sm text-white mt-1">{profile?.account_status ?? "Unknown"}</p>
            </div>
          </div>
        </div>

        {/* Sign out */}
        <button onClick={signOut} className="w-full py-2.5 text-sm text-rose-400 bg-rose-500/10 rounded-xl hover:bg-rose-500/20 transition-colors animate-fade-up" style={{ animationDelay: "120ms" }}>
          Sign Out
        </button>
      </div>
    </MobileShell>
  );
}
