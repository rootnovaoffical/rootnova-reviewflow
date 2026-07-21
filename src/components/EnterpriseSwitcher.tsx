// ============================================================
// MODULE 14 — ENTERPRISE SWITCHER
// Switch between organization/business/branch without logout
// ============================================================

import { useEffect, useState } from "react";
import { useMobile } from "../context/MobileContext";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { getUserOrganization, getUserOrgId, fetchBranches } from "../lib/enterprise";
import type { Business, Organization } from "../lib/types";
import type { EnterpriseBranch } from "../lib/enterprise";

export default function EnterpriseSwitcher() {
  const { profile } = useAuth();
  const { selectedOrg, selectedBusiness, switchOrg, switchBusiness } = useMobile();
  const [open, setOpen] = useState(false);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [branches, setBranches] = useState<EnterpriseBranch[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setLoading(true);
    (async () => {
      const org = await getUserOrganization();
      if (org) {
        setOrgs([org]);
        if (!selectedOrg) switchOrg(org);
      }
      const { data: bizData } = await supabase
        .from("business_admins")
        .select("business:businesses!business_id(*)")
        .eq("user_id", profile.id);
      const bizList = (bizData ?? []).map((d) => (d as unknown as { business: Business }).business).filter(Boolean);
      setBusinesses(bizList);
      if (bizList.length > 0 && !selectedBusiness) switchBusiness(bizList[0]);
      setLoading(false);
    })();
  }, [profile]);

  useEffect(() => {
    if (!selectedOrg) { setBranches([]); return; }
    (async () => {
      const orgId = await getUserOrgId();
      if (!orgId) return;
      const b = await fetchBranches(orgId);
      setBranches(b);
    })();
  }, [selectedOrg]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 hover:bg-white/10 transition-colors"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="text-base shrink-0">🏛️</span>
          <span className="truncate">{selectedBusiness?.name ?? selectedOrg?.name ?? "Select scope"}</span>
        </span>
        <svg className={`w-4 h-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}>
          <div className="absolute left-0 right-0 top-0 bottom-0 bg-black/50 backdrop-blur-sm" />
          <div className="absolute left-0 right-0 bottom-0 max-w-md mx-auto bg-slate-900 border-t border-white/10 rounded-t-2xl p-4 pb-8 animate-fade-up max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Switch Scope</h3>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Organizations */}
            {orgs.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Organization</p>
                {orgs.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => { switchOrg(o); }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm mb-1 transition-colors ${selectedOrg?.id === o.id ? "bg-primary-500/20 text-primary-300 border border-primary-500/30" : "text-slate-300 hover:bg-white/5"}`}
                  >
                    🏛️ {o.name}
                  </button>
                ))}
              </div>
            )}

            {/* Businesses */}
            {businesses.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Business</p>
                {businesses.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => { switchBusiness(b); setOpen(false); }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm mb-1 transition-colors ${selectedBusiness?.id === b.id ? "bg-primary-500/20 text-primary-300 border border-primary-500/30" : "text-slate-300 hover:bg-white/5"}`}
                  >
                    🏪 {b.name}
                  </button>
                ))}
              </div>
            )}

            {/* Branches */}
            {branches.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Branches</p>
                {branches.slice(0, 10).map((br) => (
                  <div key={br.id} className="px-3 py-2.5 rounded-lg text-sm mb-1 text-slate-400 bg-white/5">
                    📍 {br.name}
                    <span className="text-xs text-slate-600 ml-2">{br.city ?? ""}</span>
                  </div>
                ))}
              </div>
            )}

            {loading && <p className="text-sm text-slate-500 text-center py-4">Loading...</p>}
            {!loading && orgs.length === 0 && businesses.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">No organizations or businesses found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
