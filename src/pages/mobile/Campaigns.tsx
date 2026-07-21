// ============================================================
// MODULE 14 — MOBILE CAMPAIGNS
// Reuses Module 8 campaign services
// ============================================================

import { useEffect, useState, useCallback } from "react";
import MobileShell from "../../components/MobileShell";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { cacheGet, cacheSet, enqueueAction } from "../../lib/mobile-offline";
import { timeAgo } from "../../lib/utils";
import { useToast } from "../../context/ToastContext";
import type { Campaign } from "../../lib/types";

export default function MobileCampaigns() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) return;
    const cacheKey = `mobile-campaigns-${profile.id}`;
    const cached = cacheGet<Campaign[]>(cacheKey);
    if (cached) setCampaigns(cached);

    const { data: bizData } = await supabase
      .from("business_admins")
      .select("business_id")
      .eq("user_id", profile.id)
      .maybeSingle();
    if (!bizData?.business_id) { setLoading(false); return; }

    const { data } = await supabase
      .from("campaigns")
      .select("*")
      .eq("business_id", bizData.business_id)
      .order("created_at", { ascending: false })
      .limit(30);

    const list = (data ?? []) as Campaign[];
    setCampaigns(list);
    cacheSet(cacheKey, list, 15);
    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const toggleCampaign = async (c: Campaign) => {
    const newStatus = c.status === "active" ? "paused" : "active";
    if (navigator.onLine) {
      await supabase.from("campaigns").update({ status: newStatus }).eq("id", c.id);
      showToast(`Campaign ${newStatus === "active" ? "resumed" : "paused"}`, "success");
    } else {
      enqueueAction("toggle_campaign", { campaignId: c.id, status: newStatus });
      showToast("Action queued — will sync when online", "success");
    }
    setCampaigns((prev) => prev.map((x) => x.id === c.id ? { ...x, status: newStatus } : x));
  };

  if (loading) return <MobileShell title="Campaigns" backTo="/mobile">{skeleton()}</MobileShell>;

  return (
    <MobileShell title="Campaigns" backTo="/mobile">
      <div className="space-y-3 page-enter">
        {campaigns.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-4xl">📣</span>
            <p className="text-sm text-slate-500 mt-2">No campaigns yet.</p>
            <p className="text-xs text-slate-600 mt-1">Create campaigns from the desktop app.</p>
          </div>
        ) : (
          campaigns.map((c, i) => {
            const conversionRate = c.reach_count > 0 ? ((c.conversion_count / c.reach_count) * 100).toFixed(0) : "0";
            return (
              <div key={c.id} className="glass rounded-2xl p-4 animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-white truncate">{c.name}</h3>
                    <p className="text-xs text-slate-500">{c.campaign_type} • {timeAgo(c.created_at)}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${c.status === "active" ? "bg-emerald-500/20 text-emerald-400" : c.status === "paused" ? "bg-amber-500/20 text-amber-400" : "bg-slate-500/20 text-slate-400"}`}>{c.status}</span>
                </div>
                {c.description && <p className="text-xs text-slate-400 mb-3 line-clamp-2">{c.description}</p>}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <MiniStat label="Reach" value={c.reach_count} />
                  <MiniStat label="Responses" value={c.response_count} />
                  <MiniStat label="Conversion" value={`${conversionRate}%`} />
                </div>
                {(c.status === "active" || c.status === "paused") && (
                  <button onClick={() => toggleCampaign(c)} className={`w-full py-2 text-xs font-medium rounded-lg ${c.status === "active" ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                    {c.status === "active" ? "Pause" : "Resume"}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </MobileShell>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return <div className="text-center"><p className="text-sm font-bold text-white">{value}</p><p className="text-[10px] text-slate-500">{label}</p></div>;
}

function skeleton() {
  return <div className="space-y-3 pt-4">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-28 bg-white/5 rounded-2xl animate-pulse" />)}</div>;
}
