import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge } from '../components/UI';
import { CreditCard, Receipt, DollarSign, FileText, Building2 } from 'lucide-react';

function formatDate(value: string | null): string {
  if (!value) return '—';
  try { return new Date(value).toLocaleDateString(); } catch { return value; }
}

function formatMoney(value: number | null): string {
  if (value === null) return '—';
  return `$${Number(value).toFixed(2)}`;
}

/* ============================================================
 * PlansModule
 * ============================================================ */

interface Plan {
  id: string;
  name: string;
  slug: string;
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
      const { data, error } = await supabase.from('plans').select('*').order('monthly_price', { ascending: true });
      if (error) showToast('error', `Failed to load plans: ${error.message}`);
      else setPlans((data as Plan[]) || []);
      setLoading(false);
    })();
  }, [showToast]);

  if (loading) return <LoadingSpinner label="Loading plans…" />;

  return (
    <div>
      <PageHeader title="Plans" description="Available subscription plans" />

      {plans.length === 0 ? (
        <EmptyState icon={CreditCard} title="No plans" description="Plans will appear here once configured." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((p) => (
            <Card key={p.id} className="p-5 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-bold text-white">{p.name}</h3>
                  <p className="text-xs text-zinc-500 font-mono">{p.slug}</p>
                </div>
                <Badge color={p.is_active ? 'green' : 'gray'}>{p.is_active ? 'Active' : 'Inactive'}</Badge>
              </div>
              <div className="space-y-2 text-sm flex-1">
                <div className="flex justify-between"><span className="text-zinc-500">Monthly</span><span className="text-white font-medium">{formatMoney(p.monthly_price)}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Annual</span><span className="text-white font-medium">{formatMoney(p.annual_price)}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Setup fee</span><span className="text-white font-medium">{formatMoney(p.setup_fee)}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Max businesses</span><span className="text-white font-medium">{p.max_businesses ?? '—'}</span></div>
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
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [subRes, planRes] = await Promise.all([
      supabase.from('subscriptions').select('*').eq('organization_id', organizationId).order('current_period_start', { ascending: false }),
      supabase.from('plans').select('*'),
    ]);
    if (subRes.error) showToast('error', `Failed to load subscriptions: ${subRes.error.message}`);
    else setSubs((subRes.data as Subscription[]) || []);
    if (planRes.error) showToast('error', `Failed to load plans: ${planRes.error.message}`);
    else setPlans((planRes.data as Plan[]) || []);
    setLoading(false);
  }, [organizationId, showToast]);

  useEffect(() => { load(); }, [load]);

  const planName = (pid: string) => plans.find((p) => p.id === pid)?.name || pid;

  if (loading) return <LoadingSpinner label="Loading subscriptions…" />;

  return (
    <div>
      <PageHeader title="Subscriptions" description="Subscription records for this organization" />

      {subs.length === 0 ? (
        <EmptyState icon={CreditCard} title="No subscriptions" description="Subscription records will appear here." />
      ) : (
        <div className="space-y-3">
          {subs.map((s) => (
            <Card key={s.id} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-4 h-4 text-blue-400" />
                    <h3 className="font-semibold text-white truncate">{planName(s.plan_id)}</h3>
                    {s.status && <Badge color={s.status === 'active' ? 'green' : s.status === 'canceled' ? 'red' : 'yellow'}>{s.status}</Badge>}
                    {s.billing_cycle && <Badge color="blue">{s.billing_cycle}</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
                    <span>Period start: {formatDate(s.current_period_start)}</span>
                    <span>Period end: {formatDate(s.current_period_end)}</span>
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

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('organization_id', organizationId)
      .order('payment_date', { ascending: false });
    if (error) showToast('error', `Failed to load payments: ${error.message}`);
    else setPayments((data as Payment[]) || []);
    setLoading(false);
  }, [organizationId, showToast]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner label="Loading payments…" />;

  return (
    <div>
      <PageHeader title="Payments" description="Payment records for this organization" />

      {payments.length === 0 ? (
        <EmptyState icon={DollarSign} title="No payments" description="Payment records will appear here." />
      ) : (
        <div className="space-y-3">
          {payments.map((p) => (
            <Card key={p.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <span className="text-lg font-bold text-white">{formatMoney(p.amount)}</span>
                    {p.status && <Badge color={p.status === 'succeeded' || p.status === 'completed' ? 'green' : p.status === 'failed' ? 'red' : 'yellow'}>{p.status}</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
                    {p.payment_purpose && <span>Purpose: {p.payment_purpose}</span>}
                    {p.payment_method && <span>Method: {p.payment_method}</span>}
                    {p.utr_reference && <span className="font-mono">UTR: {p.utr_reference}</span>}
                    <span>Date: {formatDate(p.payment_date)}</span>
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

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('organization_id', organizationId)
      .order('due_date', { ascending: false });
    if (error) showToast('error', `Failed to load invoices: ${error.message}`);
    else setInvoices((data as Invoice[]) || []);
    setLoading(false);
  }, [organizationId, showToast]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner label="Loading invoices…" />;

  return (
    <div>
      <PageHeader title="Invoices" description="Invoice records for this organization" />

      {invoices.length === 0 ? (
        <EmptyState icon={Receipt} title="No invoices" description="Invoice records will appear here." />
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => (
            <Card key={inv.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-blue-400" />
                    <h3 className="font-semibold text-white font-mono">{inv.invoice_number}</h3>
                    {inv.status && <Badge color={inv.status === 'paid' ? 'green' : inv.status === 'overdue' ? 'red' : 'yellow'}>{inv.status}</Badge>}
                    {inv.billing_cycle && <Badge color="blue">{inv.billing_cycle}</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
                    <span>Subtotal: {formatMoney(inv.subtotal)}</span>
                    <span>Tax: {formatMoney(inv.tax_amount)}</span>
                    <span className="text-white font-medium">Total: {formatMoney(inv.total_amount)}</span>
                    <span>Due: {formatDate(inv.due_date)}</span>
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
