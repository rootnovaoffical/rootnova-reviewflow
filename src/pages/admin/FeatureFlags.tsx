import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import { supabase } from "../../lib/supabase";
import type { FeatureFlag } from "../../lib/types";
import { Loading, EmptyState, ErrorState } from "../../components/States";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { insertAuditLog } from "../../lib/auth";

export default function AdminFeatureFlags() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [flags, setFlags] = useState<FeatureFlag[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => supabase.from("feature_flags").select("*").order("category").then(({ data, error: err }) => {
    if (err) setError(err.message);
    setFlags(data as FeatureFlag[] || []);
  });
  useEffect(() => { load(); }, []);

  const toggle = async (flag: FeatureFlag) => {
    const { error } = await supabase.from("feature_flags").update({ is_enabled: !flag.is_enabled }).eq("id", flag.id);
    if (error) { showToast("Failed to toggle flag", "error"); return; }
    if (profile) await insertAuditLog({ actor_id: profile.id, actor_email: profile.email, action: `flag_${!flag.is_enabled ? "enabled" : "disabled"}`, target_type: "feature_flag", target_id: flag.id, metadata: { key: flag.key } });
    showToast(`Flag ${!flag.is_enabled ? "enabled" : "disabled"}`, "success");
    load();
  };

  const create = async (flag: { key: string; label: string; description: string; category: string }) => {
    const { error } = await supabase.from("feature_flags").insert({ ...flag, is_enabled: true });
    if (error) { showToast("Failed to create flag", "error"); return; }
    showToast("Flag created", "success");
    setCreating(false); load();
  };

  if (!flags) return <Layout title="Feature Flags"><Loading /></Layout>;
  if (error) return <Layout title="Feature Flags"><ErrorState message={error} onRetry={load} /></Layout>;

  return (
    <Layout title="Feature Flags">
      <div className="flex justify-end mb-4">
        <button onClick={() => setCreating(true)} className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium rounded-lg transition-colors">New Flag</button>
      </div>
      {flags.length === 0 ? <EmptyState title="No feature flags" /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {flags.map((f) => (
            <div key={f.id} className="glass rounded-2xl p-6">
              <div className="flex items-start justify-between mb-2">
                <div><h3 className="text-sm font-bold text-white">{f.label}</h3><p className="text-xs text-slate-500">{f.key}</p></div>
                <button onClick={() => toggle(f)} className={`relative w-11 h-6 rounded-full transition-colors ${f.is_enabled ? "bg-success-500" : "bg-slate-700"}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${f.is_enabled ? "translate-x-5" : ""}`} />
                </button>
              </div>
              <p className="text-xs text-slate-400">{f.description || "No description"}</p>
              <p className="text-xs text-slate-500 mt-2">Category: {f.category}</p>
            </div>
          ))}
        </div>
      )}
      {creating && <FlagModal onClose={() => setCreating(false)} onSave={create} />}
    </Layout>
  );
}

function FlagModal({ onClose, onSave }: { onClose: () => void; onSave: (f: { key: string; label: string; description: string; category: string }) => void }) {
  const [form, setForm] = useState({ key: "", label: "", description: "", category: "GENERAL" });
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="glass-strong rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-white mb-4">New Feature Flag</h2>
        {Object.entries(form).map(([key, val]) => (
          <div key={key} className="mb-3">
            <label className="block text-xs text-slate-400 mb-1">{key}</label>
            <input value={val} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} className="w-full px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500" />
          </div>
        ))}
        <div className="flex gap-3 mt-4">
          <button onClick={() => onSave(form)} className="flex-1 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium rounded-lg transition-colors">Create</button>
          <button onClick={onClose} className="flex-1 py-2 glass text-white text-sm font-medium rounded-lg hover:bg-white/10 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}
