import { useEffect, useState, useRef } from "react";
import Layout from "../../components/Layout";
import { supabase } from "../../lib/supabase";
import type { PlatformAsset } from "../../lib/types";
import { Loading } from "../../components/States";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { useBranding } from "../../context/BrandingContext";
import { insertAuditLog } from "../../lib/auth";
import { uploadPlatformAsset, upsertPlatformAsset } from "../../lib/storage";

export default function AdminBranding() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const { refresh } = useBranding();
  const [assets, setAssets] = useState<PlatformAsset[] | null>(null);
  const [upiId, setUpiId] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadKey, setUploadKey] = useState<string>("");

  const load = () => supabase.from("platform_assets").select("*").order("key").then(({ data }) => setAssets(data as PlatformAsset[] || []));
  useEffect(() => { load(); }, []);

  const saveUpi = async () => {
    await upsertPlatformAsset("upi_id", "UPI ID", "TEXT", null, null, { upi_id: upiId });
    if (profile) await insertAuditLog({ actor_id: profile.id, actor_email: profile.email, action: "branding_upi_updated", target_type: "platform_asset" });
    showToast("UPI ID saved", "success");
    refresh(); load();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadKey) return;
    const url = await uploadPlatformAsset(uploadKey, file);
    if (url) {
      await upsertPlatformAsset(uploadKey, uploadKey.replace(/_/g, " "), "IMAGE", url, `branding/${uploadKey}`);
      if (profile) await insertAuditLog({ actor_id: profile.id, actor_email: profile.email, action: "branding_asset_uploaded", target_type: "platform_asset", metadata: { key: uploadKey } });
      showToast("Asset uploaded", "success");
      refresh(); load();
    } else { showToast("Upload failed", "error"); }
    if (fileRef.current) fileRef.current.value = "";
  };

  if (!assets) return <Layout title="Branding"><Loading /></Layout>;

  return (
    <Layout title="Platform Branding">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-medium text-slate-400 mb-4">UPI Configuration</h3>
          <label className="block text-xs text-slate-400 mb-1">UPI ID</label>
          <input value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="partner@upi" className="w-full px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm mb-3 focus:outline-none focus:border-primary-500" />
          <button onClick={saveUpi} className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium rounded-lg transition-colors">Save UPI ID</button>
        </div>
        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-medium text-slate-400 mb-4">Upload Branding Asset</h3>
          <label className="block text-xs text-slate-400 mb-1">Asset Key</label>
          <input value={uploadKey} onChange={(e) => setUploadKey(e.target.value)} placeholder="upi_qr, logo, etc." className="w-full px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm mb-3 focus:outline-none focus:border-primary-500" />
          <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} disabled={!uploadKey} className="block w-full text-sm text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-600 file:text-white file:cursor-pointer disabled:opacity-50" />
        </div>
      </div>
      <div className="glass rounded-2xl p-6 mt-6">
        <h3 className="text-sm font-medium text-slate-400 mb-4">Platform Assets</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {assets.map((a) => (
            <div key={a.id} className="glass rounded-xl p-4">
              <p className="text-sm font-medium text-white mb-2">{a.label}</p>
              {a.asset_type === "IMAGE" && a.public_url ? <img src={a.public_url} alt={a.label} className="w-full h-24 object-cover rounded-lg" /> : <p className="text-xs text-slate-500">{String(a.metadata?.upi_id || a.public_url || "—")}</p>}
              <p className="text-xs text-slate-500 mt-2">{a.key}</p>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
