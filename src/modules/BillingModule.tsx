import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import {
  LoadingSpinner,
  EmptyState,
  PageHeader,
  Card,
  Badge,
} from '../components/UI';
import {
  CreditCard,
  Receipt,
  Wallet,
  FileText,
  Building2,
  Calendar,
} from 'lucide-react';

/* ============================================================
 * PlansModule
 * List plans (global, read-only) - card grid
 * ============================================================ */

interface Plan {
  id: string;
  name: string;
  slug: string;
  monthly_price: number | null;
  annual_price: number | null;
  setup_fee: number | null;
  max_businesses: number | null;
  is_active: boolean | null;
}

export function PlansModule() {
  const { showToast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('monthly_price', { ascending: true });
      if (error) {
        showToast('error', 'Failed to load plans');
      } else {
        setPlans((data as Plan[]) || []);
      }
      setLoading(false);
    };
    fetchPlans();
  }, [showToast]);

  const formatPrice = (p: number | null) => {
    if (p === null) return '—';
    return `$${Number(p).toFixed(2)}`;
  };

  return (
    <div>
      <PageHeader title="Plans" description="Available subscription plans" />

      {loading ? (
        <LoadingSpinner label="Loading plans..." />
      ) : plans.length === 0 ? (
        <EmptyState icon={CreditCard} title="No plans available" description="Plans will appear here once configured" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((p) => (
            <Card key={p.id} className="p-5 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-white text-lg">{p.name}</h3>
                  <code className="text-xs text-zinc-500 font-mono">{p.slug}</code>
                </div>
                {p.is_active ? <Badge color="green">Active</Badge> : <Badge color="gray">Inactive</Badge>}
              </div>
              <div className="space-y-2 flex-1">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Monthly</span>
                  <span className="text-white font-medium">{formatPrice(p.monthly_price)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Annual</span>
                  <span className="text-white font-medium">{formatPrice(p.annual_price)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Setup Fee</span>
                  <span className="text-white font-medium">{formatPrice(p.setup_fee)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Max Businesses</span>
                  <span className="text-white font-medium">{p.max_businesses ?? '—'}</span>
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
 * List subscriptions filtered by organization_id (read-only)
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

export function SubscriptionsModule({ organizationId }: { organizationId: string }) {
  const { showToast } = useToast();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [subRes, planRes] = await Promise.all([
      supabase.from('subscriptions').select('*').eq('organization_id', organizationId).order('current_period_start', { ascending: false }),
      supabase.from('plans').select('*'),
    ]);
    if (subRes.error) {
      showToast('error', 'Failed to load subscriptions');
    } else {
      setSubscriptions((subRes.data as Subscription[]) || []);
    }
    if (planRes.error) {
      showToast('error', 'Failed to load plans');
    } else {
      setPlans((planRes.data as Plan[]) || []);
    }
    setLoading(false);
  }, [organizationId, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const planName = (id: string) => plans.find((p) => p.id === id)?.name || 'Unknown Plan';

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString();
  };

  const statusColor = (s: string | null) => {
    if (!s) return 'gray';
    if (s === 'active' || s === 'trialing') return 'green';
    if (s === 'canceled' || s === 'past_due') return 'red';
    return 'yellow';
  };

  return (
    <div>
      <PageHeader title="Subscriptions" description="Subscription history for this organization" />

      {loading ? (
        <LoadingSpinner label="Loading subscriptions..." />
      ) : subscriptions.length === 0 ? (
        <EmptyState icon={CreditCard} title="No subscriptions" description="Subscriptions will appear here" />
      ) : (
        <div className="grid gap-3">
          {subscriptions.map((s) => (
            <Card key={s.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-white">{planName(s.plan_id)}</h3>
                    {s.status && <Badge color={statusColor(s.status)}>{s.status}</Badge>}
                    {s.billing_cycle && <Badge color="blue">{s.billing_cycle}</Badge>}
                  </div>
                  <div className="flex flex-col gap-1 text-sm text-zinc-400">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Period: {formatDate(s.current_period_start)} → {formatDate(s.current_period_end)}</span>
                    </div>
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
 * List payments filtered by organization_id (read-only)
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
      showToast('error', 'Failed to load payments');
    } else {
      setPayments((data as Payment[]) || []);
    }
    setLoading(false);
  }, [organizationId, showToast]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString();
  };

  const statusColor = (s: string | null) => {
    if (!s) return 'gray';
    if (s === 'completed' || s === 'success' || s === 'paid') return 'green';
    if (s === 'failed' || s === 'declined') return 'red';
    return 'yellow';
  };

  return (
    <div>
      <PageHeader title="Payments" description="Payment history for this organization" />

      {loading ? (
        <LoadingSpinner label="Loading payments..." />
      ) : payments.length === 0 ? (
        <EmptyState icon={Wallet} title="No payments" description="Payment history will appear here" />
      ) : (
        <div className="grid gap-3">
          {payments.map((p) => (
            <Card key={p.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg font-bold text-white">
                      {p.amount !== null ? `$${Number(p.amount).toFixed(2)}` : '—'}
                    </span>
                    {p.status && <Badge color={statusColor(p.status)}>{p.status}</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-2 mb-1">
                    {p.payment_purpose && <Badge color="purple">{p.payment_purpose}</Badge>}
                    {p.payment_method && <Badge color="blue">{p.payment_method}</Badge>}
                  </div>
                  {p.utr_reference && (
                    <p className="text-sm text-zinc-500">UTR: <code className="text-zinc-400 font-mono">{p.utr_reference}</code></p>
                  )}
                  <p className="text-sm text-zinc-500 mt-1">Date: {formatDate(p.payment_date)}</p>
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
 * List invoices filtered by organization_id (read-only)
 * ============================================================ */

interface Invoice {
  id: string;
  organization_id: string;
  invoice_number: string;
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
      showToast('error', 'Failed to load invoices');
    } else {
      setInvoices((data as Invoice[]) || []);
    }
    setLoading(false);
  }, [organizationId, showToast]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString();
  };

  const formatAmount = (a: number | null) => {
    if (a === null) return '—';
    return `$${Number(a).toFixed(2)}`;
  };

  const statusColor = (s: string | null) => {
    if (!s) return 'gray';
    if (s === 'paid' || s === 'completed') return 'green';
    if (s === 'overdue') return 'red';
    if (s === 'draft') return 'gray';
    return 'yellow';
  };

  return (
    <div>
      <PageHeader title="Invoices" description="Invoice history for this organization" />

      {loading ? (
        <LoadingSpinner label="Loading invoices..." />
      ) : invoices.length === 0 ? (
        <EmptyState icon={Receipt} title="No invoices" description="Invoices will appear here" />
      ) : (
        <div className="grid gap-3">
          {invoices.map((inv) => (
            <Card key={inv.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-white font-mono">{inv.invoice_number}</h3>
                    {inv.status && <Badge color={statusColor(inv.status)}>{inv.status}</Badge>}
                    {inv.billing_cycle && <Badge color="blue">{inv.billing_cycle}</Badge>}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-zinc-500">Subtotal</span>
                      <p className="text-white">{formatAmount(inv.subtotal)}</p>
                    </div>
                    <div>
                      <span className="text-zinc-500">Tax</span>
                      <p className="text-white">{formatAmount(inv.tax_amount)}</p>
                    </div>
                    <div>
                      <span className="text-zinc-500">Total</span>
                      <p className="text-white font-semibold">{formatAmount(inv.total_amount)}</p>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-500 mt-2">Due: {formatDate(inv.due_date)}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
