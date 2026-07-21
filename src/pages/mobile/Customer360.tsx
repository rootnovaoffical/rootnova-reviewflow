// ============================================================
// MODULE 14 — MOBILE CUSTOMER 360
// Reuses Module 10 customer360 services
// ============================================================

import { useEffect, useState, useCallback } from "react";
import MobileShell from "../../components/MobileShell";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { cacheGet, cacheSet } from "../../lib/mobile-offline";
import { timeAgo } from "../../lib/utils";
import type { Customer, CustomerEvent } from "../../lib/types";

export default function MobileCustomer360() {
  const { profile } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [events, setEvents] = useState<CustomerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    if (!profile) return;
    const cacheKey = `mobile-customers-${profile.id}`;
    const cached = cacheGet<Customer[]>(cacheKey);
    if (cached) setCustomers(cached);

    const { data: bizData } = await supabase
      .from("business_admins")
      .select("business_id")
      .eq("user_id", profile.id)
      .maybeSingle();
    if (!bizData?.business_id) { setLoading(false); return; }

    const { data } = await supabase
      .from("customers")
      .select("*")
      .eq("business_id", bizData.business_id)
      .order("updated_at", { ascending: false })
      .limit(50);

    const list = (data ?? []) as Customer[];
    setCustomers(list);
    cacheSet(cacheKey, list, 15);
    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const loadCustomerDetail = async (customer: Customer) => {
    setSelected(customer);
    const { data } = await supabase
      .from("customer_events")
      .select("*")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setEvents((data ?? []) as CustomerEvent[]);
  };

  const filtered = customers.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.display_name?.toLowerCase().includes(q) || c.identifier.toLowerCase().includes(q);
  });

  if (loading) return <MobileShell title="Customer 360" backTo="/mobile">{skeleton()}</MobileShell>;

  if (selected) {
    return (
      <MobileShell title="Customer 360" backTo="/mobile/customer-360">
        <div className="space-y-4 page-enter">
          {/* Customer header */}
          <div className="glass rounded-2xl p-4 animate-fade-up">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/30 to-accent-500/30 flex items-center justify-center text-lg font-bold text-white">
                {(selected.display_name ?? selected.identifier)[0].toUpperCase()}
              </div>
              <div>
                <h2 className="text-base font-bold text-white">{selected.display_name ?? selected.identifier}</h2>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${selected.segment === "vip" ? "bg-amber-500/20 text-amber-400" : selected.segment === "at_risk" ? "bg-rose-500/20 text-rose-400" : "bg-slate-500/20 text-slate-400"}`}>{selected.segment}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <MiniStat label="Visits" value={selected.total_visits} />
              <MiniStat label="Reviews" value={selected.total_reviews} />
              <MiniStat label="Avg Rating" value={selected.avg_rating?.toFixed(1) ?? "—"} />
            </div>
          </div>

          {/* Timeline */}
          <div className="glass rounded-2xl p-4 animate-fade-up" style={{ animationDelay: "80ms" }}>
            <h3 className="text-sm font-medium text-slate-300 mb-3">Activity Timeline</h3>
            {events.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">No activity recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {events.map((e) => (
                  <div key={e.id} className="flex items-start gap-2 py-1.5 border-b border-white/5 last:border-0">
                    <span className="text-xs text-slate-500 shrink-0 w-20">{timeAgo(e.created_at)}</span>
                    <span className="text-xs text-slate-300">{e.event_type.replace(/_/g, " ")}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Summary */}
          <div className="glass rounded-2xl p-4 animate-fade-up" style={{ animationDelay: "120ms" }}>
            <div className="flex items-center gap-2 mb-2">
              <span>🤖</span>
              <h3 className="text-sm font-medium text-slate-300">AI Summary</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {selected.segment === "vip" ? "VIP customer with strong engagement. Consider exclusive offers to maintain loyalty." :
               selected.segment === "at_risk" ? "At-risk customer. Immediate follow-up recommended to prevent churn." :
               selected.segment === "new" ? "New customer. Welcome campaign and first-visit follow-up recommended." :
               "Regular customer. Continue standard engagement and monitor for changes."}
            </p>
          </div>
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell title="Customer 360" backTo="/mobile">
      <div className="space-y-4 page-enter">
        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customers..."
          className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-primary-500/50 focus:outline-none"
        />

        {/* Customer list */}
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-4xl">👥</span>
            <p className="text-sm text-slate-500 mt-2">No customers found.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((c, i) => (
              <button key={c.id} onClick={() => loadCustomerDetail(c)} className="w-full glass rounded-xl p-3 flex items-center gap-3 text-left hover:bg-white/10 transition-colors animate-fade-up" style={{ animationDelay: `${i * 30}ms` }}>
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center text-sm font-bold text-white shrink-0">
                  {(c.display_name ?? c.identifier)[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{c.display_name ?? c.identifier}</p>
                  <p className="text-xs text-slate-500">{c.total_visits} visits • {c.total_reviews} reviews</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${c.segment === "vip" ? "bg-amber-500/20 text-amber-400" : c.segment === "at_risk" ? "bg-rose-500/20 text-rose-400" : "bg-slate-500/20 text-slate-400"}`}>{c.segment}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </MobileShell>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center">
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-[10px] text-slate-500">{label}</p>
    </div>
  );
}

function skeleton() {
  return (
    <div className="space-y-3 pt-4">
      <div className="h-10 bg-white/5 rounded-xl animate-pulse" />
      {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />)}
    </div>
  );
}
