// ============================================================
// MODULE 14 — MOBILE QR MANAGEMENT
// Reuses Module 3 QR services
// ============================================================

import { useEffect, useState, useCallback } from "react";
import MobileShell from "../../components/MobileShell";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { cacheGet, cacheSet } from "../../lib/mobile-offline";
import type { QRCode } from "../../lib/types";

export default function MobileQR() {
  const { profile } = useAuth();
  const [qrCodes, setQrCodes] = useState<QRCode[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) return;
    const cacheKey = `mobile-qr-${profile.id}`;
    const cached = cacheGet<QRCode[]>(cacheKey);
    if (cached) setQrCodes(cached);

    const { data: bizData } = await supabase
      .from("business_admins")
      .select("business_id")
      .eq("user_id", profile.id)
      .maybeSingle();
    if (!bizData?.business_id) { setLoading(false); return; }

    const { data } = await supabase
      .from("qr_codes")
      .select("*")
      .eq("business_id", bizData.business_id)
      .order("created_at", { ascending: false });

    const list = (data ?? []) as QRCode[];
    setQrCodes(list);
    cacheSet(cacheKey, list, 15);
    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const toggleQR = async (qr: QRCode) => {
    const newActive = !qr.is_active;
    await supabase.from("qr_codes").update({ is_active: newActive, status: newActive ? "active" : "inactive" }).eq("id", qr.id);
    setQrCodes((prev) => prev.map((q) => q.id === qr.id ? { ...q, is_active: newActive, status: newActive ? "active" : "inactive" } : q));
  };

  if (loading) return <MobileShell title="QR Codes" backTo="/mobile">{skeleton()}</MobileShell>;

  return (
    <MobileShell title="QR Codes" backTo="/mobile">
      <div className="space-y-3 page-enter">
        {qrCodes.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-4xl">📱</span>
            <p className="text-sm text-slate-500 mt-2">No QR codes yet.</p>
            <p className="text-xs text-slate-600 mt-1">Create QR codes from the desktop app.</p>
          </div>
        ) : (
          qrCodes.map((qr, i) => (
            <div key={qr.id} className="glass rounded-2xl p-4 animate-fade-up" style={{ animationDelay: `${i * 30}ms` }}>
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-white truncate">{qr.name}</h3>
                  <p className="text-xs text-slate-500">{qr.qr_type} • {qr.location_label ?? "No location"}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${qr.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-500/20 text-slate-400"}`}>{qr.is_active ? "Active" : "Inactive"}</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">{qr.scan_count} scans</p>
                  <p className="text-[10px] text-slate-600 truncate max-w-[200px]">{qr.destination_url}</p>
                </div>
                <button onClick={() => toggleQR(qr)} className={`px-3 py-1.5 text-xs font-medium rounded-lg ${qr.is_active ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                  {qr.is_active ? "Disable" : "Enable"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </MobileShell>
  );
}

function skeleton() {
  return <div className="space-y-3 pt-4">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />)}</div>;
}
