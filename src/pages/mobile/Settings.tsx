// ============================================================
// MODULE 14 — MOBILE SETTINGS
// App settings, business settings, offline management
// ============================================================

import { useState } from "react";
import MobileShell from "../../components/MobileShell";
import { useAuth } from "../../context/AuthContext";
import { useMobile } from "../../context/MobileContext";
import { cacheClear } from "../../lib/mobile-offline";
import { useToast } from "../../context/ToastContext";

export default function MobileSettings() {
  const { profile, signOut, updateProfile } = useAuth();
  const { isOnline, pendingActions, syncQueue } = useMobile();
  const { showToast } = useToast();
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(profile?.full_name ?? "");

  const handleSaveName = async () => {
    const { error } = await updateProfile({ full_name: name });
    if (error) { showToast("Failed to update", "error"); return; }
    showToast("Profile updated", "success");
    setEditingName(false);
  };

  const handleClearCache = () => {
    cacheClear();
    showToast("Cache cleared", "success");
  };

  const handleSync = async () => {
    await syncQueue();
    showToast("Sync complete", "success");
  };

  return (
    <MobileShell title="Settings" backTo="/mobile">
      <div className="space-y-4 page-enter">
        {/* Profile section */}
        <div className="glass rounded-2xl p-4 animate-fade-up">
          <h3 className="text-sm font-medium text-slate-300 mb-3">Profile</h3>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-slate-500">Name</label>
              {editingName ? (
                <div className="flex gap-2 mt-1">
                  <input value={name} onChange={(e) => setName(e.target.value)} className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-primary-500/50 focus:outline-none" />
                  <button onClick={handleSaveName} className="btn-primary px-4 py-2 text-white text-xs font-medium rounded-lg">Save</button>
                </div>
              ) : (
                <div className="flex items-center justify-between mt-1">
                  <p className="text-sm text-white">{profile?.full_name ?? "Not set"}</p>
                  <button onClick={() => setEditingName(true)} className="text-xs text-primary-400">Edit</button>
                </div>
              )}
            </div>
            <div>
              <label className="text-xs text-slate-500">Email</label>
              <p className="text-sm text-white mt-1">{profile?.email ?? "Not set"}</p>
            </div>
            <div>
              <label className="text-xs text-slate-500">Role</label>
              <p className="text-sm text-white mt-1">{profile?.role ?? "Unknown"}</p>
            </div>
          </div>
        </div>

        {/* Offline & Sync */}
        <div className="glass rounded-2xl p-4 animate-fade-up" style={{ animationDelay: "80ms" }}>
          <h3 className="text-sm font-medium text-slate-300 mb-3">Offline & Sync</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white">Connection</p>
                <p className="text-xs text-slate-500">{isOnline ? "Online" : "Offline"}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${isOnline ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>{isOnline ? "Connected" : "Disconnected"}</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white">Pending Actions</p>
                <p className="text-xs text-slate-500">{pendingActions} queued</p>
              </div>
              <button onClick={handleSync} disabled={!isOnline || pendingActions === 0} className="text-xs text-primary-400 disabled:opacity-40">Sync Now</button>
            </div>
            <button onClick={handleClearCache} className="w-full py-2 text-xs text-slate-400 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">Clear Cache</button>
          </div>
        </div>

        {/* Notifications */}
        <div className="glass rounded-2xl p-4 animate-fade-up" style={{ animationDelay: "120ms" }}>
          <h3 className="text-sm font-medium text-slate-300 mb-3">Notifications</h3>
          <p className="text-xs text-slate-500">Push notifications are managed through your device settings. You'll receive alerts for new reviews, AI recommendations, and campaign updates.</p>
        </div>

        {/* Account */}
        <div className="glass rounded-2xl p-4 animate-fade-up" style={{ animationDelay: "160ms" }}>
          <h3 className="text-sm font-medium text-slate-300 mb-3">Account</h3>
          <button onClick={signOut} className="w-full py-2.5 text-sm text-rose-400 bg-rose-500/10 rounded-lg hover:bg-rose-500/20 transition-colors">Sign Out</button>
        </div>

        <p className="text-xs text-slate-600 text-center pt-2">RootNova ReviewFlow v1.0 — Module 14</p>
      </div>
    </MobileShell>
  );
}
