import DataManager from '../components/DataManager';
import type { ColumnDef } from '../components/DataManager';

// plans: id, name, slug, description, monthly_price, annual_price, setup_fee, max_businesses, max_review_sessions, max_team_members, ai_usage_allowance, trial_duration_days, features, is_active, sort_order, created_at, updated_at
const planColumns: ColumnDef[] = [
  { key: 'name', label: 'Plan Name', type: 'text', required: true, showInTable: true },
  { key: 'slug', label: 'Slug', type: 'text', required: true, showInTable: true },
  { key: 'description', label: 'Description', type: 'textarea', showInTable: true },
  { key: 'monthly_price', label: 'Monthly Price', type: 'number', required: true, showInTable: true },
  { key: 'annual_price', label: 'Annual Price', type: 'number', required: true, showInTable: true },
  { key: 'setup_fee', label: 'Setup Fee', type: 'number', showInTable: true },
  { key: 'max_businesses', label: 'Max Businesses', type: 'number', showInTable: true },
  { key: 'max_team_members', label: 'Max Team', type: 'number', showInTable: true },
  { key: 'is_active', label: 'Active', type: 'boolean', showInTable: true },
];

// subscriptions: id, organization_id, plan_id, status, billing_cycle, custom_monthly_price, custom_setup_fee, discount_percent, discount_duration_months, is_founding_partner, pricing_lock_months, pricing_lock_until, contract_start_date, contract_end_date, trial_ends_at, current_period_start, current_period_end, grace_period_ends_at, created_at, updated_at
const subColumns: ColumnDef[] = [
  { key: 'status', label: 'Status', type: 'select', options: ['active', 'trialing', 'past_due', 'canceled', 'unpaid'], required: true, showInTable: true },
  { key: 'billing_cycle', label: 'Billing Cycle', type: 'select', options: ['monthly', 'annual'], required: true, showInTable: true },
  { key: 'is_founding_partner', label: 'Founding Partner', type: 'boolean', showInTable: true },
  { key: 'current_period_start', label: 'Period Start', type: 'date', showInTable: true, editable: false },
  { key: 'current_period_end', label: 'Period End', type: 'date', showInTable: true, editable: false },
  { key: 'created_at', label: 'Created', type: 'date', showInTable: true, editable: false },
];

// payments: id, organization_id, subscription_id, amount, payment_purpose, payment_method, upi_id, screenshot_path, utr_reference, payment_date, status, rejection_reason, reviewed_by, reviewed_at, approved_by, approved_at, metadata, submitted_by, created_at, updated_at, plan_id, billing_cycle
const paymentColumns: ColumnDef[] = [
  { key: 'amount', label: 'Amount', type: 'number', required: true, showInTable: true },
  { key: 'payment_purpose', label: 'Purpose', type: 'text', showInTable: true },
  { key: 'payment_method', label: 'Method', type: 'text', showInTable: true },
  { key: 'status', label: 'Status', type: 'select', options: ['pending', 'under_review', 'approved', 'rejected', 'refunded'], required: true, showInTable: true },
  { key: 'payment_date', label: 'Payment Date', type: 'date', showInTable: true },
  { key: 'utr_reference', label: 'UTR Reference', type: 'text', showInTable: true },
  { key: 'created_at', label: 'Created', type: 'date', showInTable: true, editable: false },
];

// invoices: id, organization_id, subscription_id, invoice_number, billing_cycle, period_start, period_end, line_items, subtotal, tax_amount, discount_amount, total_amount, status, payment_id, paid_at, due_date, notes, created_at, updated_at
const invoiceColumns: ColumnDef[] = [
  { key: 'invoice_number', label: 'Invoice #', type: 'text', required: true, showInTable: true },
  { key: 'billing_cycle', label: 'Billing Cycle', type: 'select', options: ['monthly', 'annual'], showInTable: true },
  { key: 'total_amount', label: 'Total Amount', type: 'number', required: true, showInTable: true },
  { key: 'status', label: 'Status', type: 'select', options: ['draft', 'open', 'paid', 'void', 'uncollectible'], required: true, showInTable: true },
  { key: 'due_date', label: 'Due Date', type: 'date', showInTable: true },
  { key: 'paid_at', label: 'Paid At', type: 'date', showInTable: true, editable: false },
  { key: 'period_start', label: 'Period Start', type: 'date', showInTable: false },
  { key: 'period_end', label: 'Period End', type: 'date', showInTable: false },
];

interface Props { businessId: string; organizationId?: string; }

// Plans are global (no business_id or organization_id) - super admin manages them
export function PlansModule({ businessId: _businessId }: Props) { return <DataManager table="plans" columns={planColumns} defaultValues={{ is_active: true, monthly_price: 0, annual_price: 0, setup_fee: 0, max_businesses: 1, max_review_sessions: 100, max_team_members: 5, ai_usage_allowance: 100, trial_duration_days: 14, features: [], sort_order: 0 }} />; }

// Subscriptions, Payments, Invoices use organization_id
export function SubscriptionsModule({ organizationId }: { organizationId: string }) { return <DataManager table="subscriptions" organizationId={organizationId} columns={subColumns} defaultValues={{ status: 'active', billing_cycle: 'monthly', is_founding_partner: false, discount_percent: 0, discount_duration_months: 0, pricing_lock_months: 0 }} />; }
export function PaymentsModule({ organizationId }: { organizationId: string }) { return <DataManager table="payments" organizationId={organizationId} columns={paymentColumns} defaultValues={{ status: 'pending', amount: 0, metadata: {} }} />; }
export function InvoicesModule({ organizationId }: { organizationId: string }) { return <DataManager table="invoices" organizationId={organizationId} columns={invoiceColumns} defaultValues={{ status: 'draft', billing_cycle: 'monthly', subtotal: 0, tax_amount: 0, discount_amount: 0, total_amount: 0, line_items: [] }} />; }
