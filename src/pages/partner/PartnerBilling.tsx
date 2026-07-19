import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { Loading, ErrorState } from "../../components/States";
import { formatCurrency, formatDate } from "../../lib/utils";
import type { Subscription, Plan } from "../../lib/types";

export function PartnerBilling() {
  const { profile } = useAuth();
  const [subscription, setSubscription] = useState<(Subscription & { plan: Plan }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      if (!profile?.id) return;
      const { data: member } = await supabase.from("organization_members").select("organization_id").eq("user_id", profile.id).maybeSingle();
      const oid = (member as any)?.organization_id;
      if (!oid) { setError("No organization found"); setLoading(false); return; }
      const { data, error } = await supabase.from("subscriptions").select("*, plan:plans(*)").eq("organization_id", oid).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (error) setError(error.message); else setSubscription(data as any);
      setLoading(false);
    })();
  }, [profile?.id]);

  if (loading) return <Loading message="Loading billing…" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-2xl font-bold text-ink-50">Billing</h1><p className="mt-1 text-sm text-ink-400">Subscription and billing details</p></div>
      {subscription ? (
        <div className="card space-y-4">
          <div className="flex items-center justify-between"><div><h2 className="font-display text-lg font-semibold text-ink-50">{subscription.plan?.name || "Custom Plan"}</h2><p className="text-sm text-ink-400">{subscription.plan?.description}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${subscription.status === "ACTIVE" ? "bg-emerald-500/15 text-emerald-300" : subscription.status === "TRIAL" ? "bg-amber-500/15 text-amber-300" : "bg-ink-700 text-ink-400"}`}>{subscription.status}</span></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div><p className="label">Billing Cycle</p><p className="text-ink-100">{subscription.billing_cycle}</p></div>
            <div><p className="label">Monthly Price</p><p className="text-ink-100">{formatCurrency(subscription.custom_monthly_price ?? subscription.plan?.monthly_price ?? 0)}</p></div>
            <div><p className="label">Setup Fee</p><p className="text-ink-100">{formatCurrency(subscription.custom_setup_fee ?? subscription.plan?.setup_fee ?? 0)}</p></div>
            <div><p className="label">Discount</p><p className="text-ink-100">{subscription.discount_percent}%</p></div>
            <div><p className="label">Trial Ends</p><p className="text-ink-100">{formatDate(subscription.trial_ends_at)}</p></div>
            <div><p className="label">Current Period</p><p className="text-ink-100">{formatDate(subscription.current_period_start)} → {formatDate(subscription.current_period_end)}</p></div>
          </div>
        </div>
      ) : <div className="card"><p className="text-sm text-ink-400">No active subscription. Contact RootNova to set up billing.</p></div>}
    </div>
  );
}
