import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth, isRootNovaSuperAdmin } from "../../lib/auth";
import { LoadingSpinner, ErrorState, EmptyState, PageHeader } from "../../components/ui";
import type { PlatformAsset } from "../../lib/types";

export default function Branding() {
  const { profile } = useAuth();
  const canEdit = isRootNovaSuperAdmin(profile?.role);
  const [assets, setAssets] = useState<PlatformAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from("platform_assets")
      .select("*")
      .order("asset_type", { ascending: true });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    setAssets((data ?? []) as PlatformAsset[]);

    const initial: Record<string, string> = {};
    (data ?? []).forEach((a) => {
      const asset = a as PlatformAsset;
      if (asset.asset_type === "COLOR") {
        initial[asset.id] = (asset.metadata.value as string) ?? "";
      } else if (asset.asset_type === "CONFIG") {
        initial[asset.id] = (asset.metadata.upi_id as string) ?? "";
        initial[`${asset.id}_instructions`] = (asset.metadata.instructions as string) ?? "";
      }
    });
    setEditValues(initial);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>, asset: PlatformAsset) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const ext = file.name.split(".").pop();
    const path = `${asset.key}.${ext}`;
    const { error: upErr } = await supabase.storage.from("platform-assets").upload(path, file, { upsert: true });

    if (upErr) {
      setError(upErr.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("platform-assets").getPublicUrl(path);
    const publicUrl = urlData.publicUrl;

    const { error: updErr } = await supabase
      .from("platform_assets")
      .update({ storage_path: path, public_url: publicUrl })
      .eq("id", asset.id);

    setUploading(false);
    if (updErr) {
      setError(updErr.message);
      return;
    }
    load();
  }

  async function handleSaveColor(asset: PlatformAsset) {
    setSaving(asset.id);
    const value = editValues[asset.id] ?? "";

    const { error: err } = await supabase
      .from("platform_assets")
      .update({ metadata: { ...asset.metadata, value } })
      .eq("id", asset.id);

    setSaving(null);
    if (err) {
      setError(err.message);
      return;
    }
    load();
  }

  async function handleSaveConfig(asset: PlatformAsset) {
    setSaving(asset.id);
    const upiId = editValues[asset.id] ?? "";
    const instructions = editValues[`${asset.id}_instructions`] ?? "";

    const { error: err } = await supabase
      .from("platform_assets")
      .update({ metadata: { ...asset.metadata, upi_id: upiId, instructions } })
      .eq("id", asset.id);

    setSaving(null);
    if (err) {
      setError(err.message);
      return;
    }
    load();
  }

  if (loading) return <LoadingSpinner size={32} />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const images = assets.filter((a) => a.asset_type === "IMAGE");
  const colors = assets.filter((a) => a.asset_type === "COLOR");
  const configs = assets.filter((a) => a.asset_type === "CONFIG");

  return (
    <div>
      <PageHeader title="Branding" subtitle="Manage platform logos, colors, and configuration" />

      {assets.length === 0 ? (
        <EmptyState message="No platform assets configured" />
      ) : (
        <div className="space-y-6">
          {images.length > 0 && (
            <div className="card p-6">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Logos & Images</h2>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {images.map((a) => (
                  <div key={a.id} className="rounded-lg border border-slate-200 p-4">
                    <p className="mb-2 text-sm font-medium text-slate-700">{a.label}</p>
                    {a.public_url && (
                      <img src={a.public_url} alt={a.label} className="mb-3 h-24 w-full rounded border border-slate-100 object-contain" />
                    )}
                    {canEdit && (
                      <label className="btn-secondary cursor-pointer text-xs">
                        {uploading ? "Uploading..." : "Upload"}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e, a)} />
                      </label>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {colors.length > 0 && (
            <div className="card p-6">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Colors</h2>
              <div className="grid grid-cols-2 gap-4">
                {colors.map((a) => (
                  <div key={a.id}>
                    <label className="mb-1 block text-sm font-medium text-slate-700">{a.label}</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        className="input h-10 w-16 p-1"
                        value={editValues[a.id] ?? (a.metadata.value as string) ?? "#000000"}
                        onChange={(e) => setEditValues({ ...editValues, [a.id]: e.target.value })}
                        disabled={!canEdit}
                      />
                      <input
                        className="input flex-1"
                        value={editValues[a.id] ?? (a.metadata.value as string) ?? ""}
                        onChange={(e) => setEditValues({ ...editValues, [a.id]: e.target.value })}
                        disabled={!canEdit}
                      />
                      {canEdit && (
                        <button className="btn-primary" disabled={saving === a.id} onClick={() => handleSaveColor(a)}>
                          {saving === a.id ? "..." : "Save"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {configs.length > 0 && (
            <div className="card p-6">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">UPI Configuration</h2>
              {configs.map((a) => (
                <div key={a.id} className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">UPI ID</label>
                    <input
                      className="input"
                      value={editValues[a.id] ?? (a.metadata.upi_id as string) ?? ""}
                      onChange={(e) => setEditValues({ ...editValues, [a.id]: e.target.value })}
                      disabled={!canEdit}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Instructions</label>
                    <textarea
                      className="input"
                      rows={3}
                      value={editValues[`${a.id}_instructions`] ?? (a.metadata.instructions as string) ?? ""}
                      onChange={(e) => setEditValues({ ...editValues, [`${a.id}_instructions`]: e.target.value })}
                      disabled={!canEdit}
                    />
                  </div>
                  {canEdit && (
                    <button className="btn-primary" disabled={saving === a.id} onClick={() => handleSaveConfig(a)}>
                      {saving === a.id ? "Saving..." : "Save Config"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
