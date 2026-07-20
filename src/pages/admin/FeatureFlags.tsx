import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth, isRootNovaSuperAdmin } from "../../lib/auth";
import { LoadingSpinner, ErrorState, EmptyState, PageHeader } from "../../components/ui";
import type { FeatureFlag } from "../../lib/types";

export default function FeatureFlags() {
  const { profile } = useAuth();
  const canEdit = isRootNovaSuperAdmin(profile?.role);
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from("feature_flags")
      .select("*")
      .order("category", { ascending: true })
      .order("label", { ascending: true });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    setFlags((data ?? []) as FeatureFlag[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleToggle(flag: FeatureFlag) {
    setToggling(flag.id);

    const { error: err } = await supabase
      .from("feature_flags")
      .update({ is_enabled: !flag.is_enabled })
      .eq("id", flag.id);

    setToggling(null);
    if (err) {
      setError(err.message);
      return;
    }
    load();
  }

  if (loading) return <LoadingSpinner size={32} />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const grouped = flags.reduce<Record<string, FeatureFlag[]>>((acc, flag) => {
    if (!acc[flag.category]) acc[flag.category] = [];
    acc[flag.category].push(flag);
    return acc;
  }, {});

  const categories = Object.keys(grouped).sort();

  return (
    <div>
      <PageHeader title="Feature Flags" subtitle="Toggle platform features on and off" />

      {flags.length === 0 ? (
        <EmptyState message="No feature flags configured" />
      ) : (
        <div className="space-y-6">
          {categories.map((cat) => (
            <div key={cat} className="card p-6">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">{cat}</h2>
              <div className="space-y-3">
                {grouped[cat].map((flag) => (
                  <div key={flag.id} className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{flag.label}</p>
                      {flag.description && <p className="text-xs text-slate-500">{flag.description}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`badge ${flag.is_enabled ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                        {flag.is_enabled ? "Enabled" : "Disabled"}
                      </span>
                      {canEdit && (
                        <button
                          className="btn-secondary px-3 py-1 text-xs"
                          disabled={toggling === flag.id}
                          onClick={() => handleToggle(flag)}
                        >
                          {toggling === flag.id ? "..." : flag.is_enabled ? "Disable" : "Enable"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
