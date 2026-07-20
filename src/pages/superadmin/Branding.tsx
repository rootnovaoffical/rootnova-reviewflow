import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { PageHeader, Card } from "../../components/Shell";
import { useToast } from "../../context/ToastContext";
import { useBranding } from "../../context/BrandingContext";
import { logAudit } from "../../lib/audit";
import { uploadPlatformAsset, upsertPlatformAsset } from "../../lib/storage";
import { cacheBustUrl } from "../../lib/utils";

export default function SuperAdminBranding() {
  const { show } = useToast();
  const { assets, upiId, upiQrUrl, refresh } = useBranding();
  const [upiInput, setUpiInput] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { setUpiInput(upiId ?? ""); }, [upiId]);

  const uploadLogo = async (file: File) => {
    setBusy(true);
    const { url, error } = await uploadPlatformAsset("logo_primary", file);
    if (error || !url) { show("Upload failed", "error"); setBusy(false); return; }
    await upsertPlatformAsset("logo_primary", "Logo Primary", "IMAGE", url, `branding/logo_primary-${Date.now()}.${file.name.split(".").pop()}`);
    await logAudit("branding.logo.update", "platform_asset", null);
    setBusy(false); show("Logo updated", "success"); refresh();
  };

  const uploadUpiQr = async (file: File) => {
    setBusy(true);
    const { url, error } = await uploadPlatformAsset("rootnova_upi_qr", file);
    if (error || !url) { show("Upload failed", "error"); setBusy(false); return; }
    await upsertPlatformAsset("rootnova_upi_qr", "UPI QR Code", "IMAGE", url, `branding/rootnova_upi_qr-${Date.now()}.${file.name.split(".").pop()}`);
    await logAudit("branding.upi_qr.update", "platform_asset", null);
    setBusy(false); show("UPI QR updated", "success"); refresh();
  };

  const saveUpi = async () => {
    setBusy(true);
    await upsertPlatformAsset("rootnova_upi_config", "UPI Payment Configuration", "CONFIG", "", "");
    const { error } = await supabase.from("platform_assets").update({ metadata: { upi_id: upiInput } }).eq("key", "rootnova_upi_config");
    if (error) { show("Failed", "error"); setBusy(false); return; }
    await logAudit("branding.upi_id.update", "platform_asset", null, null, { upi_id: upiInput });
    setBusy(false); show("UPI ID saved", "success"); refresh();
  };

  const logoUrl = assets["logo_primary"]?.public_url;
  return (
    <div>
      <PageHeader title="Branding" subtitle="Platform logo, colors, and payment configuration" />
      <div className="p-8 grid lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-white font-semibold mb-4">Platform logo</h3>
          <div className="flex items-center gap-4 mb-4">
            {logoUrl ? <img src={cacheBustUrl(logoUrl) ?? undefined} alt="Logo" className="h-16 w-16 rounded-xl object-cover" /> : <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold text-2xl">R</div>}
            <label className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium cursor-pointer">Upload logo<input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} /></label>
          </div>
        </Card>
        <Card>
          <h3 className="text-white font-semibold mb-4">UPI payment configuration</h3>
          <div className="space-y-3">
            <input value={upiInput} onChange={(e) => setUpiInput(e.target.value)} placeholder="UPI ID (e.g. rootnova@upi)" className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm" />
            <button onClick={saveUpi} disabled={busy} className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm">{busy ? "Saving…" : "Save UPI ID"}</button>
            <div className="pt-3">
              <p className="text-slate-300 text-sm mb-2">UPI QR code</p>
              {upiQrUrl ? <img src={upiQrUrl} alt="UPI QR" className="h-40 w-40 rounded-xl bg-white p-2" /> : <div className="h-40 w-40 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500 text-sm">No QR</div>}
              <label className="inline-block mt-2 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium cursor-pointer">Upload QR<input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadUpiQr(e.target.files[0])} /></label>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
