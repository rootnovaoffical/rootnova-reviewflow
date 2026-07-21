import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  Card, Badge,
  PageHeader, LoadingSpinner, EmptyState,
} from '../components/UI';
import { useToast } from '../context/ToastContext';
import {
  CreditCard, Receipt, FileText, Layers,
} from 'lucide-react';

function fmtDate(s: string | null) {
  if (!s) return '—';
  try { return new Date(s).toLocaleDateString(); } catch { return s; }
}

function fmtMoney(v: number | null) {
  if (v === null) return '—';
  return `${Number(v).toFixed(2)}`;
}

function statusColor(status: string | null) {
  if (!status) return 'gray';
  const s = status.toLowerCase();
  if (['active', 'paid', 'succeeded'].includes(s)) return 'green';
  if (['pending', 'processing'].includes(s)) return 'yellow';
  if (['failed', 'overdue', 'void'].includes(s)) return 'red';
  return 'gray';
}

/* ------------------------------------------------------------------ */
/* PlansModule                                                        */
/* ------------------------------------------------------------------ */

type Plan = {
  id: string;
  name: string;
  slug: string;
  monthly_price: number | null;
  annual_price: number | null;
  setup_fee: number | null;
  max_businesses: number | null;
  is_active: boolean | null;
};

export function PlansModule() {
  const { showToast } = useToast();
  const [items, setItems] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('id, name, slug, monthly_price, annual_price, setup_fee, max_businesses, is_active')
        .order('monthly_price', { ascending: true });
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      showToast('error', `Failed to load plans: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner label="Loading plans…" />;

  return (
    <div>
      <PageHeader title="Plans" description="Available subscription plans" />
      {items.length === 0 ? (
        <EmptyState icon={Layers} title="No plans configured" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <Card key={p.id} className="p-5 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-bold text-white">{p.name}</h3>
                  <p className="text-sm text-zinc-500 font-mono">{p.slug}</p>
                </div>
                {p.is_active ? <Badge color="green">Active</Badge> : <Badge color="gray">Inactive</Badge>}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-zinc-500">Monthly</span><span className="text-white font-semibold">{fmtMoney(p.monthly_price)}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Annual</span><span className="text-white font-semibold">{fmtMoney(p.annual_price)}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Setup Fee</span><span className="text-white">{fmtMoney(p.setup_fee)}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Max Businesses</span><span className="text-white">{p.max_businesses ?? '—'}</span></div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* SubscriptionsModule                                               */
/* ------------------------------------------------------------------ */

type Subscription = {
  id: string;
  plan_id: string;
  status: string | null;
  billing_cycle: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
};

type PlanLookup = { id: string; name: string };

export function SubscriptionsModule({ organizationId }: { organizationId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<Record<string, PlanLookup>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [subRes, planRes] = await Promise.all([
        supabase
          .from('subscriptions')
          .select('id, plan_id, status, billing_cycle, current_period_start, current_period_end')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false }),
        supabase.from('plans').select('id, name'),
      ]);
      if (subRes.error) throw subRes.error;
      if (planRes.error) throw planRes.error;
      setItems(subRes.data || []);
      const map: Record<string, PlanLookup> = {};
      (planRes.data || []).forEach((p: PlanLookup) => { map[p.id] = p; });
      setPlans(map);
    } catch (err) {
      showToast('error', `Failed to load subscriptions: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [organizationId, showToast]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner label="Loading subscriptions…" />;

  return (
    <div>
      <PageHeader title="Subscriptions" description="Subscription history for this organization" />
      {items.length === 0 ? (
        <EmptyState icon={CreditCard} title="No subscriptions" />
      ) : (
        <div className="grid gap-3">
          {items.map((s) => (
            <Card key={s.id} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-semibold text-white mb-1">{plans[s.plan_id]?.name || s.plan_id}</h3>
                  <div className="flex flex-wrap gap-2 text-sm text-zinc-400">
                    {s.billing_cycle && <Badge color="blue">{s.billing_cycle}</Badge>}
                    <span>Start: {fmtDate(s.current_period_start)}</span>
                    <span>End: {fmtDate(s.current_period_end)}</span>
                  </div>
                </div>
                <Badge color={statusColor(s.status)}>{s.status}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PaymentsModule                                                    */
/* ------------------------------------------------------------------ */

type Payment = {
  id: string;
  amount: number | null;
  payment_purpose: string | null;
  payment_method: string | null;
  utr_reference: string | null;
  status: string | null;
  payment_date: string | null;
};

export function PaymentsModule({ organizationId }: { organizationId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('id, amount, payment_purpose, payment_method, utr_reference, status, payment_date')
        .eq('organization_id', organizationId)
        .order('payment_date', { ascending: false });
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      showToast('error', `Failed to load payments: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [organizationId, showToast]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner label="Loading payments…" />;

  return (
    <div>
      <PageHeader title="Payments" description="Payment history for this organization" />
      {items.length === 0 ? (
        <EmptyState icon={CreditCard} title="No payments recorded" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-zinc-500">
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Purpose</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">UTR Reference</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3 font-semibold text-white">{fmtMoney(p.amount)}</td>
                  <td className="px-4 py-3 text-zinc-300">{p.payment_purpose || '—'}</td>
                  <td className="px-4 py-3 text-zinc-300">{p.payment_method || '—'}</td>
                  <td className="px-4 py-3 text-zinc-400 font-mono">{p.utr_reference || '—'}</td>
                  <td className="px-4 py-3"><Badge color={statusColor(p.status)}>{p.status}</Badge></td>
                  <td className="px-4 py-3 text-zinc-400">{fmtDate(p.payment_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* InvoicesModule                                                    */
/* ------------------------------------------------------------------ */

type Invoice = {
  id: string;
  invoice_number: string;
  billing_cycle: string | null;
  subtotal: number | null;
  tax_amount: number | null;
  total_amount: number | null;
  status: string | null;
  due_date: string | null;
};

export function InvoicesModule({ organizationId }: { organizationId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, billing_cycle, subtotal, tax_amount, total_amount, status, due_date')
        .eq('organization_id', organizationId)
        .order('due_date', { ascending: false });
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      showToast('error', `Failed to load invoices: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [organizationId, showToast]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner label="Loading invoices…" />;

  return (
    <div>
      <PageHeader title="Invoices" description="Invoice history for this organization" />
      {items.length === 0 ? (
        <EmptyState icon={Receipt} title="No invoices" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-zinc-500">
                <th className="px-4 py-3 font-medium">Invoice #</th>
                <th className="px-4 py-3 font-medium">Cycle</th>
                <th className="px-4 py-3 font-medium">Subtotal</th>
                <th className="px-4 py-3 font-medium">Tax</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Due Date</th>
              </tr>
            </thead>
            <tbody>
              {items.map((inv) => (
                <tr key={inv.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3 font-mono text-white">{inv.invoice_number}</td>
                  <td className="px-4 py-3 text-zinc-300">{inv.billing_cycle || '—'}</td>
                  <td className="px-4 py-3 text-zinc-300">{fmtMoney(inv.subtotal)}</td>
                  <td className="px-4 py-3 text-zinc-300">{fmtMoney(inv.tax_amount)}</td>
                  <td className="px-4 py-3 font-semibold text-white">{fmtMoney(inv.total_amount)}</td>
                  <td className="px-4 py-3"><Badge color={statusColor(inv.status)}>{inv.status}</Badge></td>
                  <td className="px-4 py-3 text-zinc-400">{fmtDate(inv.due_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
