import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge } from '../components/UI';
import { useToast } from '../context/ToastContext';
import { CreditCard, Receipt, Wallet, FileText, DollarSign, Building2, Calendar, CheckCircle2 } from 'lucide-react';

function formatDate(d: string | null): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString(); } catch { return d; }
}

function formatDateTime(d: string | null): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleString(); } catch { return d; }
}

function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

/* ============================================================
 * PlansModule
 * No props. List plans (global table). Read-only. Card grid.
 * Show: name, slug, monthly_price, annual_price, setup_fee, max_businesses, is_active
 * ============================================================ */

interface Plan {
  id: string;
  name: string;
  slug: string | null;
  monthly_price: number | null;
  annual_price: number | null;
  setup_fee: number | null;
  max_businesses: number | null;
  is_active: boolean;
}

export function PlansModule() {
  const { showToast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('monthly_price', { ascending: true });
      if (error) {
        showToast('error', `Failed to load plans: ${error.message}`);
      } else {
        setPlans(data || []);
      }
      setLoading(false);
    })();
  }, [showToast]);

  return (
    <div>
      <PageHeader title="Plans" description="Available subscription plans" />
      {loading ? (
        <LoadingSpinner label="Loading plans..." />
      ) : plans.length === 0 ? (
        <EmptyState icon={CreditCard} title="No plans available" description="Subscription plans will appear here." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {plans.map((p) => (
            <Card key={p.id} className="p-5 flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{p.name}</h3>
                    {p.slug && <p className="text-xs text-zinc-500 font-mono">{p.slug}</p>}
                  </div>
                </div>
                {p.is_active ? <Badge color="green">Active</Badge> : <Badge color="gray">Inactive</Badge>}
              </div>
              <div className="space-y-2 flex-1">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Monthly</span>
                  <span className="text-white font-medium">{formatCurrency(p.monthly_price)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Annual</span>
                  <span className="text-white font-medium">{formatCurrency(p.annual_price)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Setup Fee</span>
                  <span className="text-white font-medium">{formatCurrency(p.setup_fee)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Max Businesses</span>
                  <span className="text-white font-medium">{p.max_businesses !== null ? p.max_businesses : '—'}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
 * SubscriptionsModule
 * List subscriptions filtered by organization_id. Read-only.
 * Show: plan_id (lookup name), status, billing_cycle, current_period_start, current_period_end
 * ============================================================ */

interface Subscription {
  id: string;
  organization_id: string;
  plan_id: string;
  status: string | null;
  billing_cycle: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
}

interface PlanRef { id: string; name: string; }

export function SubscriptionsModule({ organizationId }: { organizationId: string }) {
  const { showToast } = useToast();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<PlanRef[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [subRes, planRes] = await Promise.all([
      supabase.from('subscriptions').select('*').eq('organization_id', organizationId).order('current_period_start', { ascending: false }),
      supabase.from('plans').select('id, name'),
    ]);
    if (subRes.error) showToast('error', `Failed to load subscriptions: ${subRes.error.message}`);
    else setSubscriptions(subRes.data || []);
    if (planRes.error) showToast('error', `Failed to load plans: ${planRes.error.message}`);
    else setPlans(planRes.data || []);
    setLoading(false);
  }, [organizationId, showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const planName = (pid: string) => plans.find((p) => p.id === pid)?.name || pid;

  const statusColor = (s: string | null): string => {
    if (!s) return 'gray';
    if (['active', 'trialing'].includes(s)) return 'green';
    if (['past_due', 'unpaid', 'canceled'].includes(s)) return 'red';
    return 'gray';
  };

  return (
    <div>
      <PageHeader title="Subscriptions" description="Subscription history for this organization" />
      {loading ? (
        <LoadingSpinner label="Loading subscriptions..." />
      ) : subscriptions.length === 0 ? (
        <EmptyState icon={CreditCard} title="No subscriptions" description="Subscriptions will appear here once created." />
      ) : (
        <div className="grid gap-3">
          {subscriptions.map((s) => (
            <Card key={s.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="w-4 h-4 text-blue-400 shrink-0" />
                    <h3 className="font-semibold text-white truncate">{planName(s.plan_id)}</h3>
                    {s.status && <Badge color={statusColor(s.status)}>{s.status}</Badge>}
                    {s.billing_cycle && <Badge color="purple">{s.billing_cycle}</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-400">
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Start: <span className="text-zinc-200">{formatDate(s.current_period_start)}</span></span>
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> End: <span className="text-zinc-200">{formatDate(s.current_period_end)}</span></span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
 * PaymentsModule
 * List payments filtered by organization_id. Read-only.
 * Show: amount, payment_purpose, payment_method, utr_reference, status, payment_date
 * ============================================================ */

interface Payment {
  id: string;
  organization_id: string;
  amount: number | null;
  payment_purpose: string | null;
  payment_method: string | null;
  utr_reference: string | null;
  status: string | null;
  payment_date: string | null;
}

export function PaymentsModule({ organizationId }: { organizationId: string }) {
  const { showToast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('organization_id', organizationId)
      .order('payment_date', { ascending: false });
    if (error) {
      showToast('error', `Failed to load payments: ${error.message}`);
    } else {
      setPayments(data || []);
    }
    setLoading(false);
  }, [organizationId, showToast]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const statusColor = (s: string | null): string => {
    if (!s) return 'gray';
    if (['success', 'completed', 'paid'].includes(s)) return 'green';
    if (['failed', 'declined', 'refunded'].includes(s)) return 'red';
    if (['pending', 'processing'].includes(s)) return 'yellow';
    return 'gray';
  };

  return (
    <div>
      <PageHeader title="Payments" description="Payment history for this organization" />
      {loading ? (
        <LoadingSpinner label="Loading payments..." />
      ) : payments.length === 0 ? (
        <EmptyState icon={Wallet} title="No payments" description="Payments will appear here once processed." />
      ) : (
        <div className="grid gap-3">
          {payments.map((p) => (
            <Card key={p.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="w-4 h-4 text-blue-400 shrink-0" />
                    <h3 className="font-semibold text-white">{formatCurrency(p.amount)}</h3>
                    {p.status && <Badge color={statusColor(p.status)}>{p.status}</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-400">
                    {p.payment_purpose && <span>Purpose: <span className="text-zinc-200">{p.payment_purpose}</span></span>}
                    {p.payment_method && <span>Method: <span className="text-zinc-200">{p.payment_method}</span></span>}
                    {p.utr_reference && <span className="font-mono">UTR: <span className="text-zinc-200">{p.utr_reference}</span></span>}
                    {p.payment_date && <span>Date: <span className="text-zinc-200">{formatDate(p.payment_date)}</span></span>}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
 * InvoicesModule
 * List invoices filtered by organization_id. Read-only.
 * Show: invoice_number, billing_cycle, subtotal, tax_amount, total_amount, status, due_date
 * ============================================================ */

interface Invoice {
  id: string;
  organization_id: string;
  invoice_number: string | null;
  billing_cycle: string | null;
  subtotal: number | null;
  tax_amount: number | null;
  total_amount: number | null;
  status: string | null;
  due_date: string | null;
}

export function InvoicesModule({ organizationId }: { organizationId: string }) {
  const { showToast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('organization_id', organizationId)
      .order('due_date', { ascending: false });
    if (error) {
      showToast('error', `Failed to load invoices: ${error.message}`);
    } else {
      setInvoices(data || []);
    }
    setLoading(false);
  }, [organizationId, showToast]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const statusColor = (s: string | null): string => {
    if (!s) return 'gray';
    if (['paid', 'completed'].includes(s)) return 'green';
    if (['overdue', 'void'].includes(s)) return 'red';
    if (['open', 'sent', 'draft'].includes(s)) return 'yellow';
    return 'gray';
  };

  return (
    <div>
      <PageHeader title="Invoices" description="Invoice history for this organization" />
      {loading ? (
        <LoadingSpinner label="Loading invoices..." />
      ) : invoices.length === 0 ? (
        <EmptyState icon={Receipt} title="No invoices" description="Invoices will appear here once generated." />
      ) : (
        <div className="grid gap-3">
          {invoices.map((inv) => (
            <Card key={inv.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Receipt className="w-4 h-4 text-blue-400 shrink-0" />
                    <h3 className="font-semibold text-white truncate">{inv.invoice_number || '—'}</h3>
                    {inv.status && <Badge color={statusColor(inv.status)}>{inv.status}</Badge>}
                    {inv.billing_cycle && <Badge color="purple">{inv.billing_cycle}</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-400">
                    <span>Subtotal: <span className="text-zinc-200">{formatCurrency(inv.subtotal)}</span></span>
                    <span>Tax: <span className="text-zinc-200">{formatCurrency(inv.tax_amount)}</span></span>
                    <span>Total: <span className="text-white font-medium">{formatCurrency(inv.total_amount)}</span></span>
                    <span>Due: <span className="text-zinc-200">{formatDate(inv.due_date)}</span></span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
