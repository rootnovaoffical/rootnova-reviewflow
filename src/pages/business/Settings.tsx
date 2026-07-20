import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { LoadingSpinner, ErrorState, PageHeader } from "../../components/ui";
import type { Business } from "../../lib/types";

export default function Settings() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);

  const [fullName, setFullName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    load();
  }, [profile]);

  async function load() {
    if (!profile) return;
    setLoading(true);
    setError(null);
    setFullName(profile.full_name);

    const { data: baData } = await supabase
      .from("business_admins")
      .select("business_id")
      .eq("user_id", profile.id)
      .maybeSingle();

    const bizId = baData?.business_id;
    if (!bizId) {
      setError("No business assigned to your account.");
      setLoading(false);
      return;
    }

    const { data: biz, error: bizError } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", bizId)
      .maybeSingle();

    if (bizError) {
      setError(bizError.message);
      setLoading(false);
      return;
    }
    setBusiness(biz as Business);
    setLoading(false);
  }

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSavingName(true);
    setError(null);
    setNameSuccess(false);

    const { error: uError } = await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", profile.id);

    if (uError) {
      setError(uError.message);
    } else {
      setNameSuccess(true);
      setTimeout(() => setNameSuccess(false), 3000);
    }
    setSavingName(false);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }
    setSavingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(false);

    const { error: aError } = await supabase.auth.updateUser({ password: newPassword });

    if (aError) {
      setPasswordError(aError.message);
    } else {
      setPasswordSuccess(true);
      setNewPassword("");
      setTimeout(() => setPasswordSuccess(false), 3000);
    }
    setSavingPassword(false);
  }

  if (loading) return <LoadingSpinner size={40} />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your profile and password" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <form onSubmit={handleSaveName} className="card space-y-4 p-6">
          <h2 className="text-lg font-semibold text-slate-900">Profile</h2>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input className="input bg-slate-50" value={profile?.email ?? ""} disabled />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Full Name</label>
            <input
              className="input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>
          )}
          {nameSuccess && (
            <div className="rounded-lg bg-green-50 px-4 py-2 text-sm text-green-600">
              Name updated successfully.
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={savingName}>
            {savingName ? "Saving..." : "Save Name"}
          </button>
        </form>

        <form onSubmit={handleChangePassword} className="card space-y-4 p-6">
          <h2 className="text-lg font-semibold text-slate-900">Change Password</h2>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">New Password</label>
            <input
              type="password"
              className="input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          {passwordError && (
            <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
              {passwordError}
            </div>
          )}
          {passwordSuccess && (
            <div className="rounded-lg bg-green-50 px-4 py-2 text-sm text-green-600">
              Password changed successfully.
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={savingPassword}>
            {savingPassword ? "Changing..." : "Change Password"}
          </button>
        </form>
      </div>

      {business && (
        <div className="card mt-6 p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Business Info (Read-Only)</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500">Name:</span>{" "}
              <span className="font-medium text-slate-900">{business.name}</span>
            </div>
            <div>
              <span className="text-slate-500">Slug:</span>{" "}
              <span className="font-medium text-slate-900">{business.slug}</span>
            </div>
            <div>
              <span className="text-slate-500">Status:</span>{" "}
              <span className="font-medium text-slate-900">{business.status}</span>
            </div>
            <div>
              <span className="text-slate-500">Public Review:</span>{" "}
              <span className="font-medium text-slate-900">
                {business.public_review_enabled ? "Enabled" : "Disabled"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Primary:</span>
              <span
                className="h-5 w-5 rounded border border-slate-200"
                style={{ background: business.primary_color }}
              />
              <span className="font-medium text-slate-900">{business.primary_color}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Secondary:</span>
              <span
                className="h-5 w-5 rounded border border-slate-200"
                style={{ background: business.secondary_color }}
              />
              <span className="font-medium text-slate-900">{business.secondary_color}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
