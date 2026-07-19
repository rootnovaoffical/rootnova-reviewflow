import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { PageHeader, Card, Badge } from "../../components/Shell";
import { useToast } from "../../context/ToastContext";
import { logAudit } from "../../lib/audit";
import { subscribe } from "../../lib/realtime";
import type { FeatureFlag } from "../../lib/types";

export default function SuperAdminFeatureFlags() {
  const { show } = useToast();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const load = async () => {
    const { data } = await supabase.from("feature_flags").select("*").order("category").order("key");
    setFlags((data as FeatureFlag[]) || []);
  };
  useEffect(() => {
    load();
    const unsub = subscribe<FeatureFlag>("feature_flags", undefined, () => { load(); });
    return unsub;
  }, []);
  const toggle = async (f: FeatureFlag) => {
    const next = !f.is_enabled;
    const { error } = await supabase.from("feature_flags").update({ is_enabled: next, updated_at: new Date().toISOString() }).eq("id", f.id);
    if (error) { show("Failed", "error"); return; }
    await logAudit("feature_flag.toggle", "feature_flag", f.id, null, { key: f.key, enabled: next });
    show(`${f.label} ${next ? "enabled" : "disabled"}`, "success"); load();
  };
  return (
    <div>
      <PageHeader title="Feature Flags" subtitle="Toggle platform features" />
      <div className="p-8 grid gap-3">
        {flags.map((f) => (
          <Card key={f.id}>
            <div className="flex items-center justify-between">
              <div><p className="text-white font-medium">{f.label}</p><p className="text-slate-400 text-xs">{f.description || f.key}</p><Badge color="blue">{f.category}</Badge></div>
              <button onClick={() => toggle(f)} className={`relative w-12 h-6 rounded-full transition-colors ${f.is_enabled ? "bg-brand-600" : "bg-slate-700"}`}><span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${f.is_enabled ? "translate-x-6" : ""}`} /></button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
