import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import {
  LoadingSpinner, EmptyState, PageHeader, Card, Badge,
} from '../components/UI';
import { CreditCard, FileText, Receipt, CheckCircle2, Building2 } from 'lucide-react';

function formatDate(value: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return value;
  }
}

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return value;
  }
}

function formatMoney(value: number | null): string {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value));
}

function statusColor(status: string | null): string {
  if (!status) return 'gray';
  const s = status.toLowerCase();
  if (['active', 'paid', 'succeeded', 'completed'].includes(s)) return 'green';
  if (['pending', 'trialing', 'processing'].includes(s)) return 'yellow';
  if (['failed', 'overdue', 'cancelled', 'void'].includes(s)) return 'red';
  return 'gray';
}

/* ============================================================
 * PlansModule — Read-only global plans grid
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
  created_at: string;
  updated_at: string;
}

export function PlansModule() {
  const { showToast } = useToast();
  const [items, setItems] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) {
        showToast('error', `Failed to load plans: ${error.message}`);
      } else {
        setItems((data as Plan[]) || []);
      }
      setLoading(false);
    }
    load();
  }, [useToast]);

  if (loading) return <LoadingSpinner label="Loading plans…" />;

  return (
    <div>
      <PageHeader title="Plans" description="Available subscription plans" />

      {items.length === 0 ? (
        <EmptyState icon={CreditCard} title="No plans configured" description="Plans will appear here once they are set up." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <Card key={p.id} className="p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <CreditCard className="w-4.5 h-4.5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{p.name}</h3>
                    <p className="text-xs text-zinc-500">{p.slug}</p>
                  </div>
                </div>
                <Badge color={p.is_active ? 'green' : 'gray'}>{p.is_active ? 'Active' : 'Inactive'}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-zinc-500">Monthly</p>
                  <p className="text-white font-semibold">{formatMoney(p.monthly_price)}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Annual</p>
                  <p className="text-white font-semibold">{formatMoney(p.annual_price)}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Setup Fee</p>
                  <p className="text-zinc-300">{formatMoney(p.setup_fee)}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Max Businesses</p>
                  <p className="text-zinc-300">{p.max_businesses ?? '—'}</p>
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
 * SubscriptionsModule — Read-only list filtered by organization
 * ============================================================ */

interface Subscription {
  id: string;
  organization_id: string;
  plan_id: string;
  status: string | null;
  billing_cycle: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

interface PlanLookup {
  id: string;
  name: string;
}

export function SubscriptionsModule({ organizationId }: { organizationId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: subData, error: subError }, { data: planData }] = await Promise.all([
        supabase.from('subscriptions').select('*').eq('organization_id', organizationId).order('created_at', { ascending: false }),
        supabase.from('plans').select('id, name'),
      ]);
      if (subError) throw subError;
      const planMap = new Map<string, string>();
      (planData as PlanLookup[] | null)?.forEach((p) => planMap.set(p.id, p.name));
      setPlans(planMap);
      setItems((subData as Subscription[]) || []);
    } catch (e) {
      showToast('error', `Failed to load subscriptions: ${(e as Error).message}`);
    }
    setLoading(false);
  }, [organizationId, showToast]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner label="Loading subscriptions…" />;

  return (
    <div>
      <PageHeader title="Subscriptions" description="Subscription records for this organization" />

      {items.length === 0 ? (
        <EmptyState icon={CreditCard} title="No subscriptions" description="Subscription records will appear here." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-zinc-400">
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Billing Cycle</th>
                  <th className="px-4 py-3 font-medium">Period Start</th>
                  <th className="px-4 py-3 font-medium">Period End</th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 text-white font-medium">{plans.get(s.plan_id) ?? 'Unknown Plan'}</td>
                    <td className="px-4 py-3"><Badge color={statusColor(s.status)}>{s.status ?? '—'}</Badge></td>
                    <td className="px-4 py-3 text-zinc-300">{s.billing_cycle ?? '—'}</td>
                    <td className="px-4 py-3 text-zinc-300">{formatDateTime(s.current_period_start)}</td>
                    <td className="px-4 py-3 text-zinc-300">{formatDateTime(s.current_period_end)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ============================================================
 * PaymentsModule — Read-only list filtered by organization
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
  created_at: string;
  updated_at: string;
}

export function PaymentsModule({ organizationId }: { organizationId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('error', `Failed to load payments: ${error.message}`);
    } else {
      setItems((data as Payment[]) || []);
    }
    setLoading(false);
  }, [organizationId, showToast]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner label="Loading payments…" />;

  return (
    <div>
      <PageHeader title="Payments" description="Payment records for this organization" />

      {items.length === 0 ? (
        <EmptyState icon={Receipt} title="No payments" description="Payment records will appear here." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-zinc-400">
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Purpose</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 font-medium">UTR Reference</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Payment Date</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 text-white font-medium">{formatMoney(p.amount)}</td>
                    <td className="px-4 py-3 text-zinc-300">{p.payment_purpose ?? '—'}</td>
                    <td className="px-4 py-3 text-zinc-300">{p.payment_method ?? '—'}</td>
                    <td className="px-4 py-3 text-zinc-300">{p.utr_reference ?? '—'}</td>
                    <td className="px-4 py-3"><Badge color={statusColor(p.status)}>{p.status ?? '—'}</Badge></td>
                    <td className="px-4 py-3 text-zinc-300">{formatDate(p.payment_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ============================================================
 * InvoicesModule — Read-only list filtered by organization
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
  created_at: string;
  updated_at: string;
}

export function InvoicesModule({ organizationId }: { organizationId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('error', `Failed to load invoices: ${error.message}`);
    } else {
      setItems((data as Invoice[]) || []);
    }
    setLoading(false);
  }, [organizationId, showToast]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner label="Loading invoices…" />;

  return (
    <div>
      <PageHeader title="Invoices" description="Invoice records for this organization" />

      {items.length === 0 ? (
        <EmptyState icon={FileText} title="No invoices" description="Invoice records will appear here." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-zinc-400">
                  <th className="px-4 py-3 font-medium">Invoice #</th>
                  <th className="px-4 py-3 font-medium">Billing Cycle</th>
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
                    <td className="px-4 py-3 text-white font-medium">{inv.invoice_number}</td>
                    <td className="px-4 py-3 text-zinc-300">{inv.billing_cycle ?? '—'}</td>
                    <td className="px-4 py-3 text-zinc-300">{formatMoney(inv.subtotal)}</td>
                    <td className="px-4 py-3 text-zinc-300">{formatMoney(inv.tax_amount)}</td>
                    <td className="px-4 py-3 text-white font-medium">{formatMoney(inv.total_amount)}</td>
                    <td className="px-4 py-3"><Badge color={statusColor(inv.status)}>{inv.status ?? '—'}</Badge></td>
                    <td className="px-4 py-3 text-zinc-300">{formatDate(inv.due_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
