import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import {
  LoadingSpinner,
  ErrorState,
  EmptyState,
  Badge,
  PageHeader,
} from "../../components/ui";
import type { Business, Payment, Subscription, Plan } from "../../lib/types";

interface DashboardData {
  businesses: Business[];
  businessCount: number;
  reviewSessionCount: number;
  subscription: Subscription | null;
  plan: Plan | null;
  pendingPayments: Payment[];
}

export default function Dashboard() {
  const { profile } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);

    const { data: memberData, error: memberError } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", profile.id)
      .maybeSingle();

    if (memberError) {
      setError(memberError.message);
      setLoading(false);
      return;
    }
    const orgId = memberData?.organization_id;
    if (!orgId) {
      setError("You are not a member of any organization.");
      setLoading(false);
      return;
    }

    const [bizRes, subRes, paymentsRes] = await Promise.all([
      supabase.from("businesses").select("*").eq("organization_id", orgId),
      supabase
        .from("subscriptions")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .maybeSingle(),
      supabase
        .from("payments")
        .select("*")
        .eq("organization_id", orgId)
        .eq("status", "PENDING")
        .order("created_at", { ascending: false }),
    ]);

    if (bizRes.error) {
      setError(bizRes.error.message);
      setLoading(false);
      return;
    }
    if (subRes.error) {
      setError(subRes.error.message);
      setLoading(false);
      return;
    }
    if (paymentsRes.error) {
      setError(paymentsRes.error.message);
      setLoading(false);
      return;
    }

    const businesses = (bizRes.data ?? []) as Business[];
    const subscription = (subRes.data as Subscription) ?? null;
    let plan: Plan | null = null;
    if (subscription?.plan_id) {
      const { data: planData, error: planError } = await supabase
        .from("plans")
        .select("*")
        .eq("id", subscription.plan_id)
        .maybeSingle();
      if (planError) {
        setError(planError.message);
        setLoading(false);
        return;
      }
      plan = (planData as Plan) ?? null;
    }

    let reviewSessionCount = 0;
    if (businesses.length > 0) {
      const businessIds = businesses.map((b) => b.id);
      const { count, error: countError } = await supabase
        .from("review_sessions")
        .select("*", { count: "exact", head: true })
        .in("business_id", businessIds);
      if (countError) {
        setError(countError.message);
        setLoading(false);
        return;
      }
      reviewSessionCount = count ?? 0;
    }

    setData({
      businesses,
      businessCount: businesses.length,
      reviewSessionCount,
      subscription,
      plan,
      pendingPayments: (paymentsRes.data ?? []) as Payment[],
    });
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <EmptyState message="No dashboard data available." />;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your organization's activity"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Businesses</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{data.businessCount}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Review Sessions</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{data.reviewSessionCount}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Subscription</p>
          <div className="mt-2 flex items-center gap-2">
            {data.subscription ? (
              <>
                <Badge status={data.subscription.status} />
                <span className="text-sm text-slate-600">{data.plan?.name ?? "—"}</span>
              </>
            ) : (
              <span className="text-sm text-slate-400">No active plan</span>
            )}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Pending Payments</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{data.pendingPayments.length}</p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Recent Businesses</h2>
            <Link to="/businesses" className="text-sm font-medium text-primary-600 hover:text-primary-700">
              View all
            </Link>
          </div>
          {data.businesses.length === 0 ? (
            <EmptyState message="No businesses yet." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.businesses.slice(0, 5).map((b) => (
                <li key={b.id} className="py-3">
                  <Link to={`/businesses/${b.id}`} className="flex items-center justify-between hover:bg-slate-50">
                    <span className="font-medium text-slate-800">{b.name}</span>
                    <Badge status={b.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Pending Payments</h2>
            <Link to="/payments" className="text-sm font-medium text-primary-600 hover:text-primary-700">
              View all
            </Link>
          </div>
          {data.pendingPayments.length === 0 ? (
            <EmptyState message="No pending payments." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.pendingPayments.slice(0, 5).map((p) => (
                <li key={p.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-slate-800">₹{p.amount.toLocaleString()}</p>
                    <p className="text-xs text-slate-500">{p.payment_purpose}</p>
                  </div>
                  <Badge status={p.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <Link to="/billing" className="btn-primary">Manage Billing</Link>
        <Link to="/businesses" className="btn-secondary">Manage Businesses</Link>
      </div>
    </div>
  );
}
