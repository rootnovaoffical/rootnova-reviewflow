import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import type { Subscription, Plan } from "../../lib/types";
import { Loading, EmptyState } from "../../components/States";
import { formatCurrency, formatDate } from "../../lib/utils";

export default function PartnerBilling() {
  const { profile } = useAuth();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    supabase.from("organization_members").select("organization_id").eq("user_id", profile.id).single()
      .then(({ data: mem }) => {
        if (!mem?.organization_id) { setLoading(false); return; }
        Promise.all([
          supabase.from("subscriptions").select("*").eq("organization_id", mem.organization_id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
          supabase.from("plans").select("*").eq("is_active", true).order("sort_order"),
        ]).then(([s, p]) => {
          setSub(s.data as Subscription);
          setPlans((p.data || []) as Plan[]);
          setLoading(false);
        });
      });
  }, [profile]);

  if (loading) return <Layout title="Billing"><Loading /></Layout>;

  return (
    <Layout title="Billing & Subscription">
      {sub ? (
        <div className="glass rounded-2xl p-6 mb-6">
          <h3 className="text-sm font-medium text-slate-400 mb-4">Current Subscription</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Plan ID</dt><dd className="text-white">{sub.plan_id}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd><span className={`px-2 py-1 rounded-full text-xs ${sub.status === "ACTIVE" ? "bg-success-500/20 text-success-400" : "bg-slate-500/20 text-slate-400"}`}>{sub.status}</span></dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Billing Cycle</dt><dd className="text-white">{sub.billing_cycle}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Current Period</dt><dd className="text-white">{formatDate(sub.current_period_start)} — {formatDate(sub.current_period_end)}</dd></div>
            {sub.trial_ends_at && <div className="flex justify-between"><dt className="text-slate-500">Trial Ends</dt><dd className="text-white">{formatDate(sub.trial_ends_at)}</dd></div>}
            {sub.is_founding_partner && <div className="flex justify-between"><dt className="text-slate-500">Founding Partner</dt><dd className="text-success-400">Yes</dd></div>}
          </dl>
        </div>
      ) : (
        <div className="glass rounded-2xl p-6 mb-6"><EmptyState title="No active subscription" subtitle="Contact support to set up your subscription." /></div>
      )}
      <div>
        <h3 className="text-sm font-medium text-slate-400 mb-4">Available Plans</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((p) => (
            <div key={p.id} className="glass rounded-2xl p-6">
              <h4 className="text-lg font-bold text-white">{p.name}</h4>
              <p className="text-sm text-slate-400 mb-4">{p.description || ""}</p>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between"><dt className="text-slate-500">Monthly</dt><dd className="text-white">{formatCurrency(p.monthly_price)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Annual</dt><dd className="text-white">{formatCurrency(p.annual_price)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Max Businesses</dt><dd className="text-white">{p.max_businesses}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Max Team</dt><dd className="text-white">{p.max_team_members}</dd></div>
              </dl>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
