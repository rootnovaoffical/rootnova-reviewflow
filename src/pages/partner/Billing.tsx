import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import {
  LoadingSpinner,
  ErrorState,
  EmptyState,
  Badge,
  PageHeader,
} from "../../components/ui";
import type { Subscription, Plan, Payment, PlatformAsset } from "../../lib/types";

interface UpiConfig {
  upi_id: string;
  instructions: string;
}

export default function Billing() {
  const { profile } = useAuth();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);
  const [orgError, setOrgError] = useState<string | null>(null);

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [upiConfig, setUpiConfig] = useState<UpiConfig | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "ANNUAL">("MONTHLY");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [utrReference, setUtrReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const loadOrg = useCallback(async () => {
    if (!profile) return;
    setOrgLoading(true);
    const { data, error } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", profile.id)
      .maybeSingle();
    if (error) setOrgError(error.message);
    else if (!data?.organization_id) setOrgError("You are not a member of any organization.");
    else setOrgId(data.organization_id);
    setOrgLoading(false);
  }, [profile]);

  useEffect(() => {
    loadOrg();
  }, [loadOrg]);

  const loadData = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);

    const [subRes, plansRes, paymentsRes, upiRes] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .maybeSingle(),
      supabase.from("plans").select("*").eq("is_active", true).order("sort_order", { ascending: true }),
      supabase
        .from("payments")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false }),
      supabase.from("platform_assets").select("*").eq("key", "rootnova_upi_config").maybeSingle(),
    ]);

    if (subRes.error) { setError(subRes.error.message); setLoading(false); return; }
    if (plansRes.error) { setError(plansRes.error.message); setLoading(false); return; }
    if (paymentsRes.error) { setError(paymentsRes.error.message); setLoading(false); return; }
    if (upiRes.error) { setError(upiRes.error.message); setLoading(false); return; }

    const sub = (subRes.data as Subscription) ?? null;
    setSubscription(sub);
    setPlans((plansRes.data ?? []) as Plan[]);
    setPayments((paymentsRes.data ?? []) as Payment[]);

    const upiAsset = upiRes.data as PlatformAsset | null;
    if (upiAsset?.metadata) {
      setUpiConfig({
        upi_id: (upiAsset.metadata.upi_id as string) ?? "",
        instructions: (upiAsset.metadata.instructions as string) ?? "",
      });
    }

    if (sub?.plan_id) {
      const { data: planData } = await supabase.from("plans").select("*").eq("id", sub.plan_id).maybeSingle();
      setCurrentPlan((planData as Plan) ?? null);
    }
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function selectPlan(plan: Plan) {
    setSelectedPlan(plan);
    setSubmitError(null);
    setSubmitSuccess(null);
    setScreenshotFile(null);
    setUtrReference("");
  }

  const planPrice = selectedPlan
    ? billingCycle === "ANNUAL"
      ? selectedPlan.annual_price
      : selectedPlan.monthly_price
    : 0;

  async function handleSubmitPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !profile || !selectedPlan) return;
    if (!screenshotFile) { setSubmitError("Please upload a payment screenshot."); return; }
    if (!utrReference.trim()) { setSubmitError("Please enter the UTR/reference number."); return; }
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    const filePath = `${orgId}/${Date.now()}_${screenshotFile.name}`;
    const { error: uploadError } = await supabase.storage
      .from("payment-proofs")
      .upload(filePath, screenshotFile);
    if (uploadError) {
      setSubmitError(uploadError.message);
      setSubmitting(false);
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const { error: insertError } = await supabase.from("payments").insert({
      organization_id: orgId,
      amount: planPrice,
      payment_purpose: "SUBSCRIPTION",
      payment_method: "UPI",
      screenshot_path: filePath,
      utr_reference: utrReference.trim(),
      payment_date: today,
      status: "PENDING",
      submitted_by: profile.id,
      metadata: { plan_id: selectedPlan.id, billing_cycle: billingCycle },
    });

    setSubmitting(false);
    if (insertError) {
      setSubmitError(insertError.message);
      return;
    }
    setSubmitSuccess("Payment submitted successfully! It will be reviewed by our team shortly.");
    setSelectedPlan(null);
    setScreenshotFile(null);
    setUtrReference("");
    loadData();
  }

  if (orgLoading) return <LoadingSpinner />;
  if (orgError) return <ErrorState message={orgError} onRetry={loadOrg} />;
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={loadData} />;

  return (
    <div>
      <PageHeader title="Billing" subtitle="Manage your subscription and payments" />

      {submitSuccess && (
        <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{submitSuccess}</div>
      )}
      {submitError && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</div>
      )}

      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Current Subscription</h2>
        {subscription ? (
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div><dt className="text-sm font-medium text-slate-500">Plan</dt><dd className="text-slate-800">{currentPlan?.name ?? "—"}</dd></div>
            <div><dt className="text-sm font-medium text-slate-500">Status</dt><dd><Badge status={subscription.status} /></dd></div>
            <div><dt className="text-sm font-medium text-slate-500">Billing Cycle</dt><dd className="text-slate-800">{subscription.billing_cycle}</dd></div>
            {subscription.current_period_start && (
              <div><dt className="text-sm font-medium text-slate-500">Period Start</dt><dd className="text-slate-800">{new Date(subscription.current_period_start).toLocaleDateString()}</dd></div>
            )}
            {subscription.current_period_end && (
              <div><dt className="text-sm font-medium text-slate-500">Period End</dt><dd className="text-slate-800">{new Date(subscription.current_period_end).toLocaleDateString()}</dd></div>
            )}
            {subscription.trial_ends_at && (
              <div><dt className="text-sm font-medium text-slate-500">Trial Ends</dt><dd className="text-slate-800">{new Date(subscription.trial_ends_at).toLocaleDateString()}</dd></div>
            )}
          </dl>
        ) : (
          <EmptyState message="No active subscription. Select a plan below to get started." />
        )}
      </div>

      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Available Plans</h2>
        {plans.length === 0 ? (
          <EmptyState message="No plans available." />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <div key={plan.id} className="rounded-lg border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-900">{plan.name}</h3>
                {plan.description && <p className="mt-1 text-sm text-slate-500">{plan.description}</p>}
                <p className="mt-3 text-2xl font-bold text-slate-900">₹{plan.monthly_price.toLocaleString()}<span className="text-sm font-normal text-slate-500">/mo</span></p>
                <p className="text-sm text-slate-500">₹{plan.annual_price.toLocaleString()}/year</p>
                <ul className="mt-3 space-y-1 text-sm text-slate-600">
                  <li>Up to {plan.max_businesses} businesses</li>
                  <li>{plan.max_review_sessions} review sessions</li>
                  <li>{plan.max_team_members} team members</li>
                </ul>
                <button className="btn-primary mt-4 w-full" onClick={() => selectPlan(plan)}>Select Plan</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedPlan && (
        <form onSubmit={handleSubmitPayment} className="mb-6 rounded-lg border border-primary-200 bg-primary-50/30 p-5">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Payment for {selectedPlan.name}
          </h2>

          <div className="mb-4">
            <label className="label">Billing Cycle</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2">
                <input type="radio" checked={billingCycle === "MONTHLY"} onChange={() => setBillingCycle("MONTHLY")} />
                <span className="text-sm text-slate-700">Monthly (₹{selectedPlan.monthly_price.toLocaleString()})</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={billingCycle === "ANNUAL"} onChange={() => setBillingCycle("ANNUAL")} />
                <span className="text-sm text-slate-700">Annual (₹{selectedPlan.annual_price.toLocaleString()})</span>
              </label>
            </div>
          </div>

          {upiConfig && (
            <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900">UPI Payment Instructions</h3>
              <p className="mt-2 text-sm text-slate-700">UPI ID: <span className="font-mono font-semibold">{upiConfig.upi_id}</span></p>
              <p className="mt-2 text-sm text-slate-600">{upiConfig.instructions}</p>
              <p className="mt-2 text-sm font-medium text-slate-800">Amount to pay: ₹{planPrice.toLocaleString()}</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Payment Screenshot</label>
              <input
                type="file"
                accept="image/*"
                className="input"
                onChange={(e) => setScreenshotFile(e.target.files?.[0] ?? null)}
                required
              />
            </div>
            <div>
              <label className="label">UTR / Reference Number</label>
              <input
                className="input"
                value={utrReference}
                onChange={(e) => setUtrReference(e.target.value)}
                placeholder="Enter UTR reference"
                required
              />
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
              {submitting ? "Submitting..." : "Submit Payment"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setSelectedPlan(null)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Payment History</h2>
        {payments.length === 0 ? (
          <EmptyState message="No payments yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Purpose</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">UTR</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">₹{p.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{p.payment_purpose}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{p.utr_reference ?? "—"}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{p.payment_date ? new Date(p.payment_date).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3"><Badge status={p.status} /></td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {p.status === "REJECTED" && p.rejection_reason && (
                        <span className="text-red-600">Rejected: {p.rejection_reason}</span>
                      )}
                      {p.status === "APPROVED" && <span className="text-green-600">Approved</span>}
                      {p.status === "PENDING" && <span className="text-yellow-600">Awaiting review</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
