import { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { Loading, ErrorState, EmptyState } from "../../components/States";
import { useToast } from "../../components/Toast";
import { ConfirmDialog } from "../../components/Modal";
import { cacheBustUrl } from "../../lib/utils";
import type { PlatformAsset } from "../../lib/types";

export function SuperAdminBranding() {
  const { toast } = useToast();
  const [assets, setAssets] = useState<PlatformAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<PlatformAsset | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = async () => {
    const { data, error } = await supabase.from("platform_assets").select("*").order("key");
    if (error) setError(error.message); else setAssets((data as PlatformAsset[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (key: string, file: File) => {
    setUploading(key);
    const path = `branding/${key}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("platform-assets").upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) { toast(upErr.message, "error"); setUploading(null); return; }
    const { data: pub } = supabase.storage.from("platform-assets").getPublicUrl(path);
    const existing = assets.find((a) => a.key === key);
    if (existing) {
      const { error } = await supabase.from("platform_assets").update({ storage_path: path, public_url: pub.publicUrl, is_active: true }).eq("id", existing.id);
      if (error) toast(error.message, "error"); else toast("Asset updated instantly", "success");
    } else {
      const { error } = await supabase.from("platform_assets").insert({ key, label: key.replace(/_/g, " "), asset_type: "IMAGE", storage_path: path, public_url: pub.publicUrl, is_active: true });
      if (error) toast(error.message, "error"); else toast("Asset uploaded instantly", "success");
    }
    setUploading(null); load();
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    const { error } = await supabase.from("platform_assets").update({ is_active: false, public_url: null }).eq("id", removeTarget.id);
    if (error) toast(error.message, "error"); else toast("Asset removed", "success");
    setRemoveTarget(null); load();
  };

  if (loading) return <Loading message="Loading branding…" />;
  if (error) return <ErrorState message={error} />;

  const assetKeys = ["logo_primary", "logo_white", "favicon", "og_image"];
  const getAsset = (key: string) => assets.find((a) => a.key === key && a.is_active);

  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-2xl font-bold text-ink-50">Branding</h1><p className="mt-1 text-sm text-ink-400">Platform logos and visual identity — changes reflect instantly across the app</p></div>
      <div className="grid gap-4 sm:grid-cols-2">
        {assetKeys.map((key) => {
          const asset = getAsset(key);
          return (
            <div key={key} className="card space-y-3">
              <h3 className="font-display text-base font-semibold text-ink-50">{key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</h3>
              {asset?.public_url ? (
                <div className="flex items-center gap-4">
                  <img src={cacheBustUrl(asset.public_url)} alt={key} className="h-16 w-16 rounded-xl border border-white/10 object-contain bg-white/5" />
                  <div className="flex gap-2">
                    <label className="btn-secondary cursor-pointer text-xs">
                      {uploading === key ? "Uploading…" : "Replace"}
                      <input type="file" accept="image/*" className="hidden" ref={(el) => { fileInputRefs.current[key] = el; }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(key, f); e.currentTarget.value = ""; }} disabled={uploading === key} />
                    </label>
                    <button className="btn-danger text-xs" onClick={() => setRemoveTarget(asset)}>Remove</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-ink-500"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg></div>
                  <label className="btn-primary cursor-pointer text-xs">
                    {uploading === key ? "Uploading…" : "Upload"}
                    <input type="file" accept="image/*" className="hidden" ref={(el) => { fileInputRefs.current[key] = el; }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(key, f); e.currentTarget.value = ""; }} disabled={uploading === key} />
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {assets.length === 0 && <EmptyState title="No branding assets" message="Upload your logo and visual assets to customize the platform." />}
      <ConfirmDialog open={removeTarget !== null} onClose={() => setRemoveTarget(null)} onConfirm={handleRemove} title="Remove Asset?" message="The asset will be deactivated and no longer shown across the platform." confirmLabel="Remove" danger />
    </div>
  );
}
