// Settings — profile + (RootNova) platform info.

import { useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { supabase } from "../../lib/supabase";
import { Button, Card, Input, Badge } from "../../components/ui";
import { User, Shield, Sparkles } from "lucide-react";

export default function SettingsPage() {
  const { profile, role, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", profile!.id);
      if (error) throw error;
      await refreshProfile();
      setMessage("Profile updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-slate-400">Manage your account and platform preferences.</p>
      </header>

      <Card className="p-6 max-w-xl">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-indigo-400" />
          <h2 className="font-semibold text-white">Your profile</h2>
        </div>
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <Input label="Email" value={profile?.email || ""} disabled />
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Role:</span>
            <Badge color={role === "ROOTNOVA_ADMIN" ? "purple" : "blue"}>
              {role === "ROOTNOVA_ADMIN" ? "RootNova Admin" : "Business Admin"}
            </Badge>
          </div>
          {message && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-300">{message}</div>}
          {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">{error}</div>}
          <Button type="submit" loading={saving}>Save profile</Button>
        </form>
      </Card>

      <Card className="p-6 max-w-xl">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-indigo-400" />
          <h2 className="font-semibold text-white">Platform</h2>
        </div>
        <div className="space-y-3 text-sm text-slate-300">
          <div className="flex items-center justify-between">
            <span>Product</span>
            <span className="flex items-center gap-1.5 font-medium text-white"><Sparkles className="w-3.5 h-3.5 text-indigo-400" /> RootNova ReviewFlow</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Authentication</span>
            <Badge color="green">Supabase Auth</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Database</span>
            <Badge color="green">PostgreSQL + RLS</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>AI generation</span>
            <Badge color="blue">Server-side edge function</Badge>
          </div>
        </div>
      </Card>
    </div>
  );
}
