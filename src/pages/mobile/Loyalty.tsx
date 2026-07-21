// ============================================================
// MODULE 14 — MOBILE LOYALTY
// Reuses Module 6 loyalty services
// ============================================================

import { useEffect, useState, useCallback } from "react";
import MobileShell from "../../components/MobileShell";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import type { LoyaltyProgram, CustomerLoyalty } from "../../lib/types";

export default function MobileLoyalty() {
  const { profile } = useAuth();
  const [programs, setPrograms] = useState<LoyaltyProgram[]>([]);
  const [loyalty, setLoyalty] = useState<CustomerLoyalty[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) return;
    const { data: bizData } = await supabase
      .from("business_admins")
      .select("business_id")
      .eq("user_id", profile.id)
      .maybeSingle();
    if (!bizData?.business_id) { setLoading(false); return; }

    const [progRes, loyaltyRes] = await Promise.all([
      supabase.from("loyalty_programs").select("*").eq("business_id", bizData.business_id).order("created_at", { ascending: false }),
      supabase.from("customer_loyalty").select("*").eq("business_id", bizData.business_id).order("created_at", { ascending: false }).limit(50),
    ]);

    setPrograms((progRes.data ?? []) as LoyaltyProgram[]);
    setLoyalty((loyaltyRes.data ?? []) as CustomerLoyalty[]);
    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <MobileShell title="Loyalty" backTo="/mobile">{skeleton()}</MobileShell>;

  const unlockedCount = loyalty.filter((l) => l.reward_unlocked).length;

  return (
    <MobileShell title="Loyalty" backTo="/mobile">
      <div className="space-y-4 page-enter">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass rounded-xl p-3">
            <p className="text-2xl font-bold text-white">{programs.length}</p>
            <p className="text-xs text-slate-500">Programs</p>
          </div>
          <div className="glass rounded-xl p-3">
            <p className="text-2xl font-bold text-white">{unlockedCount}</p>
            <p className="text-xs text-slate-500">Rewards Unlocked</p>
          </div>
        </div>

        {/* Programs */}
        {programs.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-4xl">🎁</span>
            <p className="text-sm text-slate-500 mt-2">No loyalty programs yet.</p>
            <p className="text-xs text-slate-600 mt-1">Create programs from the desktop app.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {programs.map((p, i) => (
              <div key={p.id} className="glass rounded-2xl p-4 animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-medium text-white">{p.name}</h3>
                    <p className="text-xs text-slate-500">{p.program_type} • Target: {p.target_count}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${p.status === "active" ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-500/20 text-slate-400"}`}>{p.status}</span>
                </div>
                <p className="text-xs text-slate-400 mb-2">{p.reward_description}</p>
                <p className="text-xs text-slate-500">{p.redeemed_count} redeemed</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </MobileShell>
  );
}

function skeleton() {
  return <div className="space-y-3 pt-4"><div className="grid grid-cols-2 gap-3">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)}</div>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-white/5 rounded-2xl animate-pulse" />)}</div>;
}
