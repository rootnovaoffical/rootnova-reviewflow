import DataManager from '../components/DataManager';
import type { ColumnDef } from '../components/DataManager';

const planColumns: ColumnDef[] = [
  { key: 'name', label: 'Plan Name', type: 'text', required: true, showInTable: true },
  { key: 'slug', label: 'Slug', type: 'text', required: true, showInTable: true },
  { key: 'tier', label: 'Tier', type: 'select', options: ['free', 'starter', 'pro', 'business', 'enterprise'], required: true, showInTable: true },
  { key: 'monthly_price', label: 'Monthly Price', type: 'number', required: true, showInTable: true },
  { key: 'annual_price', label: 'Annual Price', type: 'number', required: true, showInTable: true },
  { key: 'features', label: 'Features (one per line)', type: 'array', showInTable: false },
  { key: 'limits', label: 'Limits (JSON)', type: 'json', showInTable: false },
  { key: 'is_active', label: 'Active', type: 'boolean', showInTable: true },
];
const subColumns: ColumnDef[] = [
  { key: 'status', label: 'Status', type: 'select', options: ['active', 'trialing', 'past_due', 'canceled', 'unpaid'], required: true, showInTable: true },
  { key: 'billing_cycle', label: 'Billing Cycle', type: 'select', options: ['monthly', 'annual'], required: true, showInTable: true },
  { key: 'current_period_start', label: 'Period Start', type: 'date', showInTable: true, editable: false },
  { key: 'current_period_end', label: 'Period End', type: 'date', showInTable: true, editable: false },
  { key: 'created_at', label: 'Created', type: 'date', showInTable: true, editable: false },
];
const paymentColumns: ColumnDef[] = [
  { key: 'amount', label: 'Amount', type: 'number', required: true, showInTable: true },
  { key: 'currency', label: 'Currency', type: 'text', required: true, showInTable: true },
  { key: 'status', label: 'Status', type: 'select', options: ['pending', 'succeeded', 'failed', 'refunded'], required: true, showInTable: true },
  { key: 'payment_method', label: 'Method', type: 'text', showInTable: true },
  { key: 'created_at', label: 'Date', type: 'date', showInTable: true, editable: false },
];
const invoiceColumns: ColumnDef[] = [
  { key: 'invoice_number', label: 'Invoice #', type: 'text', required: true, showInTable: true },
  { key: 'amount', label: 'Amount', type: 'number', required: true, showInTable: true },
  { key: 'currency', label: 'Currency', type: 'text', required: true, showInTable: true },
  { key: 'status', label: 'Status', type: 'select', options: ['draft', 'open', 'paid', 'void', 'uncollectible'], required: true, showInTable: true },
  { key: 'due_date', label: 'Due Date', type: 'date', showInTable: true },
  { key: 'paid_at', label: 'Paid At', type: 'date', showInTable: true, editable: false },
];
interface Props { businessId: string; }
export function PlansModule({ businessId }: Props) { return <DataManager table="plans" businessId={businessId} columns={planColumns} defaultValues={{ is_active: true, tier: 'free', monthly_price: 0, annual_price: 0, features: [], limits: {} }} />; }
export function SubscriptionsModule({ businessId }: Props) { return <DataManager table="subscriptions" businessId={businessId} columns={subColumns} defaultValues={{ status: 'active', billing_cycle: 'monthly' }} />; }
export function PaymentsModule({ businessId }: Props) { return <DataManager table="payments" businessId={businessId} columns={paymentColumns} defaultValues={{ currency: 'USD', status: 'pending' }} />; }
export function InvoicesModule({ businessId }: Props) { return <DataManager table="invoices" businessId={businessId} columns={invoiceColumns} defaultValues={{ currency: 'USD', status: 'draft' }} />; }
