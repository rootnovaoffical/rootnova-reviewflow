import DataManager from '../components/DataManager';

const planColumns = [
  { key: 'name', label: 'Plan Name', type: 'text' as const, required: true, showInTable: true },
  { key: 'price_monthly', label: 'Monthly Price', type: 'number' as const, required: true, showInTable: true },
  { key: 'price_yearly', label: 'Yearly Price', type: 'number' as const, showInTable: true },
  { key: 'features', label: 'Features', type: 'array' as const, showInTable: true },
  { key: 'is_active', label: 'Active', type: 'boolean' as const, showInTable: true },
];

const subColumns = [
  { key: 'plan_id', label: 'Plan ID', type: 'text' as const, showInTable: true },
  { key: 'status', label: 'Status', type: 'select' as const, options: ['active', 'trialing', 'past_due', 'cancelled', 'expired'], showInTable: true },
  { key: 'current_period_end', label: 'Period End', type: 'date' as const, showInTable: true },
];

const paymentColumns = [
  { key: 'amount', label: 'Amount', type: 'number' as const, required: true, showInTable: true },
  { key: 'currency', label: 'Currency', type: 'select' as const, options: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'], showInTable: true },
  { key: 'status', label: 'Status', type: 'select' as const, options: ['pending', 'completed', 'failed', 'refunded'], showInTable: true },
];

const invoiceColumns = [
  { key: 'amount', label: 'Amount', type: 'number' as const, required: true, showInTable: true },
  { key: 'status', label: 'Status', type: 'select' as const, options: ['draft', 'sent', 'paid', 'overdue', 'void'], showInTable: true },
  { key: 'due_date', label: 'Due Date', type: 'date' as const, showInTable: true },
];

export function PlansModule({ businessId }: { businessId: string }) {
  return <DataManager table="plans" businessId={businessId} columns={planColumns} defaultValues={{ is_active: true, price_monthly: 0, price_yearly: 0 }} />;
}

export function SubscriptionsModule({ businessId }: { businessId: string }) {
  return <DataManager table="subscriptions" businessId={businessId} columns={subColumns} defaultValues={{ status: 'active' }} />;
}

export function PaymentsModule({ businessId }: { businessId: string }) {
  return <DataManager table="payments" businessId={businessId} columns={paymentColumns} defaultValues={{ amount: 0, currency: 'USD', status: 'pending' }} />;
}

export function InvoicesModule({ businessId }: { businessId: string }) {
  return <DataManager table="invoices" businessId={businessId} columns={invoiceColumns} defaultValues={{ amount: 0, status: 'draft' }} />;
}
