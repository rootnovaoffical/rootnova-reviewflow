import { useEffect, useState } from "react";
import AdminShell from "./AdminShell";
import { supabase } from "../../lib/supabase";
import { Loading } from "../../components/States";
import { getSystemHealth } from "../../lib/monitoring";
import type { SystemHealthSummary } from "../../lib/monitoring";

interface SaaSKPIs {
  orgs: number;
  businesses: number;
  payments: number;
  reviews: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  cancelledSubscriptions: number;
  totalRevenue: number;
  monthlyRevenue: number;
  paidInvoices: number;
  pendingInvoices: number;
  openAlerts: number;
  health: SystemHealthSummary | null;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<SaaSKPIs | null>(null);

  useEffect(() => {
    (async () => {
      const [
        orgsR, businessesR, paymentsR, reviewsR,
        activeSubsR, trialSubsR, cancelledSubsR,
        revenueR, monthlyRevenueR,
        paidInvoicesR, pendingInvoicesR,
        openAlertsR, healthR,
      ] = await Promise.all([
        supabase.from("organizations").select("id", { count: "exact", head: true }),
        supabase.from("businesses").select("id", { count: "exact", head: true }),
        supabase.from("payments").select("id", { count: "exact", head: true }),
        supabase.from("review_sessions").select("id", { count: "exact", head: true }),
        supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "trial"),
        supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "cancelled"),
        supabase.from("payments").select("amount").eq("status", "APPROVED"),
        supabase.from("payments").select("amount, created_at").eq("status", "APPROVED").gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
        supabase.from("invoices").select("id", { count: "exact", head: true }).eq("status", "paid"),
        supabase.from("invoices").select("id", { count: "exact", head: true }).in("status", ["draft", "sent", "overdue"]),
        supabase.from("customer_success_alerts").select("id", { count: "exact", head: true }).eq("status", "open"),
        getSystemHealth().catch(() => null),
      ]);

      const totalRevenue = (revenueR.data || []).reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0);
      const monthlyRevenue = (monthlyRevenueR.data || []).reduce((sum: number, p: { amount: number; created_at: string }) => sum + Number(p.amount), 0);

      setStats({
        orgs: orgsR.count || 0,
        businesses: businessesR.count || 0,
        payments: paymentsR.count || 0,
        reviews: reviewsR.count || 0,
        activeSubscriptions: activeSubsR.count || 0,
        trialSubscriptions: trialSubsR.count || 0,
        cancelledSubscriptions: cancelledSubsR.count || 0,
        totalRevenue,
        monthlyRevenue,
        paidInvoices: paidInvoicesR.count || 0,
        pendingInvoices: pendingInvoicesR.count || 0,
        openAlerts: openAlertsR.count || 0,
        health: healthR,
      });
    })();
  }, []);

  if (!stats) return <AdminShell title="Dashboard"><Loading /></AdminShell>;

  const kpiCards = [
    { label: "Organizations", value: stats.orgs, color: "from-primary-500 to-primary-600" },
    { label: "Businesses", value: stats.businesses, color: "from-accent-500 to-accent-600" },
    { label: "Active Subscriptions", value: stats.activeSubscriptions, color: "from-success-500 to-success-600" },
    { label: "Trial Subscriptions", value: stats.trialSubscriptions, color: "from-warning-500 to-warning-600" },
    { label: "Total Revenue", value: `₹${stats.totalRevenue.toLocaleString()}`, color: "from-success-500 to-success-600" },
    { label: "Monthly Revenue", value: `₹${stats.monthlyRevenue.toLocaleString()}`, color: "from-primary-500 to-primary-600" },
    { label: "Paid Invoices", value: stats.paidInvoices, color: "from-success-500 to-success-600" },
    { label: "Pending Invoices", value: stats.pendingInvoices, color: "from-warning-500 to-warning-600" },
    { label: "Open CS Alerts", value: stats.openAlerts, color: "from-error-500 to-error-600" },
    { label: "Cancelled Subs", value: stats.cancelledSubscriptions, color: "from-slate-500 to-slate-600" },
    { label: "Review Sessions", value: stats.reviews, color: "from-accent-500 to-accent-600" },
    { label: "Payments", value: stats.payments, color: "from-primary-500 to-primary-600" },
  ];

  const churnRate = stats.activeSubscriptions + stats.cancelledSubscriptions > 0
    ? Math.round((stats.cancelledSubscriptions / (stats.activeSubscriptions + stats.cancelledSubscriptions)) * 100)
    : 0;

  const trialConversion = stats.trialSubscriptions + stats.activeSubscriptions > 0
    ? Math.round((stats.activeSubscriptions / (stats.trialSubscriptions + stats.activeSubscriptions)) * 100)
    : 0;

  return (
    <AdminShell title="Dashboard">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpiCards.map((c) => (
          <div key={c.label} className="glass rounded-2xl p-6 animate-slide-up">
            <p className="text-sm text-slate-400 mb-1">{c.label}</p>
            <p className={`text-3xl font-bold bg-gradient-to-r ${c.color} bg-clip-text text-transparent`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Churn Rate</h3>
          <p className={`text-4xl font-bold ${churnRate > 10 ? "text-error-400" : "text-success-400"}`}>{churnRate}%</p>
          <p className="text-xs text-slate-500 mt-2">{stats.cancelledSubscriptions} cancelled / {stats.activeSubscriptions + stats.cancelledSubscriptions} total</p>
        </div>
        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Trial Conversion</h3>
          <p className={`text-4xl font-bold ${trialConversion >= 50 ? "text-success-400" : "text-warning-400"}`}>{trialConversion}%</p>
          <p className="text-xs text-slate-500 mt-2">{stats.activeSubscriptions} active / {stats.trialSubscriptions + stats.activeSubscriptions} total</p>
        </div>
        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Deployment Readiness</h3>
          {stats.health ? (
            <>
              <p className={`text-4xl font-bold ${stats.health.deploymentReadiness.ready ? "text-success-400" : "text-warning-400"}`}>
                {stats.health.deploymentReadiness.ready ? "READY" : "PENDING"}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                {stats.health.deploymentReadiness.passed} passed, {stats.health.deploymentReadiness.failed} failed, {stats.health.deploymentReadiness.pending} pending
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-500">No deployment checks configured</p>
          )}
        </div>
      </div>

      {stats.health && stats.health.services.length > 0 && (
        <div className="glass rounded-2xl p-6 mb-8">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Service Health</h3>
          <div className="space-y-2">
            {stats.health.services.map((s) => (
              <div key={s.name} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                <span className="text-sm text-slate-300">{s.name}</span>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${s.status === "healthy" ? "bg-success-500/20 text-success-400" : s.status === "degraded" ? "bg-warning-500/20 text-warning-400" : "bg-error-500/20 text-error-400"}`}>
                  {s.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.health && stats.health.activeIncidents > 0 && (
        <div className="glass rounded-2xl p-6 border border-error-500/30">
          <h3 className="text-sm font-semibold text-error-400 mb-2">Active Incidents: {stats.health.activeIncidents}</h3>
          <p className="text-xs text-slate-500">Unresolved monitoring events: {stats.health.unresolvedEvents}</p>
        </div>
      )}
    </AdminShell>
  );
}
