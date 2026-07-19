import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Loading, ErrorState, EmptyState } from "../../components/States";
import { useToast } from "../../components/Toast";
import type { FeatureFlag } from "../../lib/types";

export function SuperAdminFeatureFlags() {
  const { toast } = useToast();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    const { data, error } = await supabase.from("feature_flags").select("*").order("category").order("label");
    if (error) setError(error.message); else setFlags((data as FeatureFlag[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = async (flag: FeatureFlag) => {
    const { error } = await supabase.from("feature_flags").update({ is_enabled: !flag.is_enabled }).eq("id", flag.id);
    if (error) toast(error.message, "error"); else { toast(`${flag.label} ${!flag.is_enabled ? "enabled" : "disabled"}`, "success"); load(); }
  };

  if (loading) return <Loading message="Loading feature flags…" />;
  if (error) return <ErrorState message={error} />;

  const categories = [...new Set(flags.map((f) => f.category))];

  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-2xl font-bold text-ink-50">Feature Flags</h1><p className="mt-1 text-sm text-ink-400">Toggle platform features on and off</p></div>
      {flags.length === 0 ? <EmptyState title="No feature flags" /> : categories.map((cat) => (
        <div key={cat} className="space-y-2">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-ink-400">{cat}</h2>
          {flags.filter((f) => f.category === cat).map((f) => (
            <div key={f.id} className="card flex items-center justify-between">
              <div><p className="font-medium text-ink-50">{f.label}</p>{f.description && <p className="text-xs text-ink-400">{f.description}</p>}</div>
              <button onClick={() => toggle(f)} className={`relative h-6 w-11 rounded-full transition-colors ${f.is_enabled ? "bg-indigo-500" : "bg-ink-700"}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${f.is_enabled ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
