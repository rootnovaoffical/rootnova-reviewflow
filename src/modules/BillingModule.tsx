import DataManager from '../components/DataManager';

const planColumns = [
  { key: 'name', label: 'Plan Name', type: 'text' as const, required: true, showInTable: true },
  { key: 'slug', label: 'Slug', type: 'text' as const, showInTable: true },
  { key: 'monthly_price', label: 'Monthly', type: 'number' as const, required: true, showInTable: true },
  { key: 'annual_price', label: 'Annual', type: 'number' as const, showInTable: true },
  { key: 'max_businesses', label: 'Max Businesses', type: 'number' as const, showInTable: true },
  { key: 'max_review_sessions', label: 'Max Reviews', type: 'number' as const, showInTable: true },
  { key: 'is_active', label: 'Active', type: 'boolean' as const, showInTable: true },
];

const subColumns = [
  { key: 'plan_id', label: 'Plan ID', type: 'text' as const, showInTable: true },
  { key: 'status', label: 'Status', type: 'select' as const, options: ['active', 'trialing', 'past_due', 'cancelled', 'expired'], showInTable: true },
  { key: 'billing_cycle', label: 'Billing Cycle', type: 'select' as const, options: ['monthly', 'annual'], showInTable: true },
  { key: 'current_period_end', label: 'Period End', type: 'date' as const, showInTable: true },
];

const paymentColumns = [
  { key: 'amount', label: 'Amount', type: 'number' as const, required: true, showInTable: true },
  { key: 'payment_method', label: 'Method', type: 'text' as const, showInTable: true },
  { key: 'status', label: 'Status', type: 'select' as const, options: ['pending', 'completed', 'failed', 'refunded'], showInTable: true },
  { key: 'utr_reference', label: 'UTR Reference', type: 'text' as const, showInTable: true },
  { key: 'payment_date', label: 'Payment Date', type: 'date' as const, showInTable: true },
];

const invoiceColumns = [
  { key: 'invoice_number', label: 'Invoice #', type: 'text' as const, showInTable: true },
  { key: 'total_amount', label: 'Amount', type: 'number' as const, required: true, showInTable: true },
  { key: 'status', label: 'Status', type: 'select' as const, options: ['draft', 'sent', 'paid', 'overdue', 'void'], showInTable: true },
  { key: 'due_date', label: 'Due Date', type: 'date' as const, showInTable: true },
  { key: 'billing_cycle', label: 'Billing Cycle', type: 'text' as const, showInTable: true },
];

export function PlansModule({ businessId }: { businessId: string }) {
  return <DataManager table="plans" businessId={businessId} columns={planColumns} defaultValues={{ is_active: true, monthly_price: 0, annual_price: 0, max_businesses: 1, max_review_sessions: 100 }} />;
}

export function SubscriptionsModule({ businessId }: { businessId: string }) {
  return <DataManager table="subscriptions" businessId={businessId} columns={subColumns} defaultValues={{ status: 'active', billing_cycle: 'monthly' }} />;
}

export function PaymentsModule({ businessId }: { businessId: string }) {
  return <DataManager table="payments" businessId={businessId} columns={paymentColumns} defaultValues={{ amount: 0, status: 'pending' }} />;
}

export function InvoicesModule({ businessId }: { businessId: string }) {
  return <DataManager table="invoices" businessId={businessId} columns={invoiceColumns} defaultValues={{ total_amount: 0, status: 'draft' }} />;
}
