import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../../components/Layout";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import type { Subscription, Plan, Payment } from "../../lib/types";
import { Loading, EmptyState } from "../../components/States";
import { formatCurrency, formatDate } from "../../lib/utils";

export default function PartnerBilling() {
  const { profile } = useAuth();
  const [sub, setSub] = useState<(Subscription & { plan: Plan }) | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    supabase.from("organization_members").select("organization_id").eq("user_id", profile.id).single()
      .then(({ data: mem }) => {
        if (!mem?.organization_id) { setLoading(false); return; }
        Promise.all([
          supabase.from("subscriptions").select("*, plan:plans(*)").eq("organization_id", mem.organization_id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
          supabase.from("plans").select("*").eq("is_active", true).order("sort_order"),
          supabase.from("payments").select("*").eq("organization_id", mem.organization_id).order("created_at", { ascending: false }).limit(5),
        ]).then(([s, p, pays]) => {
          setSub(s.data as any);
          setPlans((p.data || []) as Plan[]);
          setPayments((pays.data || []) as Payment[]);
          setLoading(false);
        });
      });
  }, [profile]);

  if (loading) return <Layout title="Billing"><Loading /></Layout>;

  const daysRemaining = sub?.current_period_end ? Math.max(0, Math.ceil((new Date(sub.current_period_end).getTime() - Date.now()) / 86400000)) : null;
  const isExpired = sub?.current_period_end && new Date(sub.current_period_end) < new Date();
  const hasPendingPayment = payments.some((p) => p.status === "PENDING" || p.status === "UNDER_REVIEW");

  return (
    <Layout title="Billing & Subscription">
      {sub ? (
        <div className="glass rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-slate-400">Current Subscription</h3>
              <p className="text-lg font-bold text-white mt-1">{sub.plan?.name || "Custom Plan"}</p>
              <p className="text-sm text-slate-400">{sub.plan?.description}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isExpired ? "bg-error-500/20 text-error-400" : sub.status === "ACTIVE" ? "bg-success-500/20 text-success-400" : sub.status === "TRIAL" ? "bg-warning-500/20 text-warning-400" : "bg-slate-500/20 text-slate-400"}`}>{isExpired ? "EXPIRED" : sub.status}</span>
          </div>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div><dt className="text-slate-500">Billing Cycle</dt><dd className="text-white">{sub.billing_cycle}</dd></div>
            <div><dt className="text-slate-500">Amount</dt><dd className="text-white">{formatCurrency(sub.custom_monthly_price ?? sub.plan?.monthly_price ?? 0)}</dd></div>
            <div><dt className="text-slate-500">Start Date</dt><dd className="text-white">{formatDate(sub.current_period_start || sub.contract_start_date)}</dd></div>
            <div><dt className="text-slate-500">Expiry Date</dt><dd className="text-white">{formatDate(sub.current_period_end || sub.contract_end_date)}</dd></div>
            {daysRemaining !== null && !isExpired && <div><dt className="text-slate-500">Days Remaining</dt><dd className="text-white">{daysRemaining} days</dd></div>}
            {sub.trial_ends_at && <div><dt className="text-slate-500">Trial Ends</dt><dd className="text-white">{formatDate(sub.trial_ends_at)}</dd></div>}
            {sub.is_founding_partner && <div><dt className="text-slate-500">Founding Partner</dt><dd className="text-success-400">Yes</dd></div>}
          </dl>
          {isExpired && !hasPendingPayment && (
            <Link to="/partner/payments" className="mt-4 inline-block px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium rounded-lg transition-colors">Renew Subscription</Link>
          )}
        </div>
      ) : (
        <div className="glass rounded-2xl p-6 mb-6">
          <EmptyState title="No active subscription" subtitle="Select a plan and submit payment to activate your subscription." />
          <Link to="/partner/payments" className="block w-full py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium rounded-lg text-center mt-4">Choose a Plan</Link>
        </div>
      )}

      {hasPendingPayment && (
        <div className="glass rounded-2xl p-6 mb-6 border-amber-500/30">
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300">Payment Under Review</span>
            <p className="text-sm text-slate-400">Your payment is being reviewed by RootNova admin.</p>
          </div>
        </div>
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
                <div className="flex justify-between"><dt className="text-slate-500">Review Sessions</dt><dd className="text-white">{p.max_review_sessions}</dd></div>
              </dl>
              <Link to="/partner/payments" className="mt-4 block w-full py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium rounded-lg text-center transition-colors">Select Plan</Link>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-slate-400">Recent Payments</h3>
          <Link to="/partner/payments" className="text-sm text-primary-300 hover:text-primary-200">View all →</Link>
        </div>
        {payments.length === 0 ? <EmptyState title="No payments yet" /> : (
          <div className="space-y-2">
            {payments.map((p) => (
              <div key={p.id} className="glass rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{formatCurrency(p.amount)}</p>
                  <p className="text-xs text-slate-400">{p.utr_reference || "No UTR"} · {formatDate(p.created_at)}</p>
                  {p.rejection_reason && <p className="text-xs text-error-400 mt-1">Rejected: {p.rejection_reason}</p>}
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${p.status === "APPROVED" ? "bg-success-500/20 text-success-400" : p.status === "REJECTED" ? "bg-error-500/20 text-error-400" : p.status === "UNDER_REVIEW" ? "bg-warning-500/20 text-warning-400" : "bg-slate-500/20 text-slate-400"}`}>{p.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
