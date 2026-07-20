import { useEffect, useState, useCallback } from "react";
import Layout from "../../components/Layout";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import type { Subscription, Plan, Payment } from "../../lib/types";
import { Loading, EmptyState } from "../../components/States";
import { formatCurrency, formatDate, formatDateTime } from "../../lib/utils";
import { uploadPaymentProof } from "../../lib/storage";

type Stage = "viewing" | "selecting" | "paying" | "submitting";

export default function PartnerBilling() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState<Stage>("viewing");
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "ANNUAL">("MONTHLY");
  const [upiConfig, setUpiConfig] = useState<{ upi_id: string; instructions: string } | null>(null);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [utr, setUtr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data: mem } = await supabase.from("organization_members").select("organization_id").eq("user_id", profile.id).maybeSingle();
    const oid = mem?.organization_id ?? null;
    setOrgId(oid);
    if (!oid) { setLoading(false); return; }

    const [subRes, plansRes, payRes, upiRes] = await Promise.all([
      supabase.from("subscriptions").select("*").eq("organization_id", oid).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("plans").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("payments").select("*").eq("organization_id", oid).order("created_at", { ascending: false }),
      supabase.from("platform_assets").select("*").eq("key", "rootnova_upi_config").eq("is_active", true).maybeSingle(),
    ]);

    setSub(subRes.data as Subscription | null);
    setPlans((plansRes.data || []) as Plan[]);
    setPayments((payRes.data || []) as Payment[]);
    if (upiRes.data?.metadata) setUpiConfig(upiRes.data.metadata as { upi_id: string; instructions: string });

    if (subRes.data?.plan_id) {
      const { data: p } = await supabase.from("plans").select("*").eq("id", subRes.data.plan_id).maybeSingle();
      setPlan(p as Plan | null);
    }

    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const handleSelectPlan = (p: Plan) => {
    setSelectedPlan(p);
    setStage("paying");
  };

  const handleSubmitPayment = async () => {
    if (!orgId || !selectedPlan || !profile) return;
    if (!screenshotFile) { showToast("Please upload a payment screenshot", "error"); return; }
    if (!utr.trim()) { showToast("Please enter the UTR / transaction reference", "error"); return; }

    setSubmitting(true);
    try {
      const amount = billingCycle === "MONTHLY" ? selectedPlan.monthly_price : selectedPlan.annual_price;
      const tempId = `temp-${Date.now()}`;
      const { path, signedUrl } = await uploadPaymentProof(tempId, screenshotFile);
      if (!path) { showToast("Failed to upload screenshot", "error"); setSubmitting(false); return; }

      const { data: payment, error } = await supabase.from("payments").insert({
        organization_id: orgId,
        amount,
        payment_purpose: "SUBSCRIPTION",
        payment_method: "UPI",
        upi_id: upiConfig?.upi_id || null,
        screenshot_path: path,
        utr_reference: utr.trim(),
        payment_date: new Date().toISOString(),
        status: "PENDING",
        submitted_by: profile.id,
        metadata: { plan_id: selectedPlan.id, plan_name: selectedPlan.name, billing_cycle: billingCycle, signed_url: signedUrl },
      }).select().single();

      if (error) { showToast("Failed to submit payment", "error"); setSubmitting(false); return; }

      await supabase.from("audit_logs").insert({
        actor_id: profile.id, actor_email: profile.email, action: "payment_submitted",
        target_type: "payment", target_id: payment.id, organization_id: orgId,
        metadata: { amount, plan_id: selectedPlan.id, billing_cycle: billingCycle },
      });

      showToast("Payment submitted for review", "success");
      setStage("viewing");
      setSelectedPlan(null);
      setScreenshotFile(null);
      setUtr("");
      load();
    } catch {
      showToast("An error occurred", "error");
    }
    setSubmitting(false);
  };

  if (loading) return <Layout title="Billing"><Loading /></Layout>;

  return (
    <Layout title="Billing & Subscription">
      {sub && plan ? (
        <div className="glass rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-400">Current Subscription</h3>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${sub.status === "ACTIVE" ? "bg-success-500/20 text-success-400" : sub.status === "TRIAL" ? "bg-primary-500/20 text-primary-300" : sub.status === "EXPIRED" || sub.status === "CANCELLED" ? "bg-error-500/20 text-error-400" : "bg-slate-500/20 text-slate-400"}`}>{sub.status}</span>
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Plan</dt><dd className="text-white font-medium">{plan.name}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Billing Cycle</dt><dd className="text-white">{sub.billing_cycle}</dd></div>
            {sub.current_period_start && <div className="flex justify-between"><dt className="text-slate-500">Period Start</dt><dd className="text-white">{formatDate(sub.current_period_start)}</dd></div>}
            {sub.current_period_end && <div className="flex justify-between"><dt className="text-slate-500">Period End</dt><dd className="text-white">{formatDate(sub.current_period_end)}</dd></div>}
            {sub.trial_ends_at && <div className="flex justify-between"><dt className="text-slate-500">Trial Ends</dt><dd className="text-white">{formatDate(sub.trial_ends_at)}</dd></div>}
            {sub.is_founding_partner && <div className="flex justify-between"><dt className="text-slate-500">Founding Partner</dt><dd className="text-success-400">Yes</dd></div>}
          </dl>
        </div>
      ) : (
        <div className="glass rounded-2xl p-6 mb-6">
          <EmptyState title="No active subscription" subtitle="Select a plan below to get started." />
        </div>
      )}

      {stage === "viewing" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-400">Available Plans</h3>
            <button onClick={() => setStage("selecting")} className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium rounded-lg transition-colors">Select Plan</button>
          </div>
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
      )}

      {stage === "selecting" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-400">Choose a Plan</h3>
            <button onClick={() => setStage("viewing")} className="text-sm text-slate-400 hover:text-white transition-colors">Cancel</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((p) => (
              <button key={p.id} onClick={() => handleSelectPlan(p)} className="glass rounded-2xl p-6 text-left hover:border-primary-500/50 hover:bg-primary-600/10 transition-all">
                <h4 className="text-lg font-bold text-white">{p.name}</h4>
                <p className="text-sm text-slate-400 mb-2">{p.description || ""}</p>
                <p className="text-sm text-primary-300">{formatCurrency(p.monthly_price)}/mo or {formatCurrency(p.annual_price)}/yr</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {stage === "paying" && selectedPlan && (
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-medium text-slate-400">Payment for {selectedPlan.name}</h3>
            <button onClick={() => { setStage("selecting"); setSelectedPlan(null); }} className="text-sm text-slate-400 hover:text-white transition-colors">Back</button>
          </div>

          <div className="mb-6">
            <label className="block text-xs text-slate-400 mb-2">Billing Cycle</label>
            <div className="flex gap-2">
              <button onClick={() => setBillingCycle("MONTHLY")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${billingCycle === "MONTHLY" ? "bg-primary-600 text-white" : "glass text-slate-300 hover:text-white"}`}>Monthly — {formatCurrency(selectedPlan.monthly_price)}</button>
              <button onClick={() => setBillingCycle("ANNUAL")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${billingCycle === "ANNUAL" ? "bg-primary-600 text-white" : "glass text-slate-300 hover:text-white"}`}>Annual — {formatCurrency(selectedPlan.annual_price)}</button>
            </div>
          </div>

          {upiConfig && (
            <div className="glass rounded-xl p-5 mb-6">
              <h4 className="text-sm font-medium text-white mb-3">Payment Instructions</h4>
              <p className="text-sm text-slate-400 mb-3">{upiConfig.instructions}</p>
              <div className="flex items-center gap-3 bg-slate-900/50 rounded-lg px-4 py-3">
                <span className="text-xs text-slate-500">UPI ID</span>
                <code className="text-lg font-mono text-primary-300 select-all">{upiConfig.upi_id}</code>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Upload Payment Screenshot</label>
              <input type="file" accept="image/*" onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)} className="w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-600 file:text-white hover:file:bg-primary-500 file:cursor-pointer" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">UTR / Transaction Reference</label>
              <input value={utr} onChange={(e) => setUtr(e.target.value)} placeholder="Enter UTR or transaction reference number" className="w-full px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500" />
            </div>
            <button onClick={handleSubmitPayment} disabled={submitting || !screenshotFile || !utr.trim()} className="w-full py-3 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white font-medium rounded-lg transition-colors">
              {submitting ? "Submitting..." : `Submit Payment (${formatCurrency(billingCycle === "MONTHLY" ? selectedPlan.monthly_price : selectedPlan.annual_price)})`}
            </button>
          </div>
        </div>
      )}

      <div className="mt-8">
        <h3 className="text-sm font-medium text-slate-400 mb-4">Payment History</h3>
        {payments.length === 0 ? (
          <p className="text-sm text-slate-500">No payments yet.</p>
        ) : (
          <div className="glass rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Purpose</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">UTR</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-white font-medium">{formatCurrency(p.amount)}</td>
                    <td className="px-6 py-4 text-slate-400">{p.payment_purpose}</td>
                    <td className="px-6 py-4 text-slate-400">{p.utr_reference || "—"}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${p.status === "APPROVED" ? "bg-success-500/20 text-success-400" : p.status === "REJECTED" ? "bg-error-500/20 text-error-400" : p.status === "UNDER_REVIEW" ? "bg-warning-500/20 text-warning-400" : "bg-slate-500/20 text-slate-400"}`}>{p.status}</span>
                      {p.rejection_reason && <p className="text-xs text-error-400 mt-1">{p.rejection_reason}</p>}
                    </td>
                    <td className="px-6 py-4 text-slate-400">{formatDateTime(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
