import DataManager, { ColumnDef } from "../components/DataManager";

const planCols: ColumnDef[] = [
  { key: "name", label: "Plan Name", type: "text", editable: true, required: true },
  { key: "description", label: "Description", type: "textarea", editable: true },
  { key: "price_monthly", label: "Monthly Price", type: "number", editable: true, required: true, defaultValue: 0 },
  { key: "price_yearly", label: "Yearly Price", type: "number", editable: true, defaultValue: 0 },
  { key: "features", label: "Features", type: "array", editable: true },
  { key: "is_active", label: "Active", type: "boolean", editable: true, defaultValue: true },
  { key: "created_at", label: "Created" },
];

const subCols: ColumnDef[] = [
  { key: "status", label: "Status", type: "select", options: ["active", "trialing", "past_due", "canceled", "unpaid"], editable: true, defaultValue: "active" },
  { key: "current_period_start", label: "Period Start", type: "date", editable: true },
  { key: "current_period_end", label: "Period End", type: "date", editable: true },
  { key: "plan_id", label: "Plan", type: "text", editable: true, required: true },
  { key: "created_at", label: "Created" },
  { key: "updated_at", label: "Updated", hideInTable: true },
];

const paymentCols: ColumnDef[] = [
  { key: "amount", label: "Amount", type: "number", editable: true, required: true },
  { key: "currency", label: "Currency", type: "text", editable: true, defaultValue: "USD" },
  { key: "status", label: "Status", type: "select", options: ["pending", "completed", "failed", "refunded"], editable: true, defaultValue: "pending" },
  { key: "provider", label: "Provider", type: "select", options: ["stripe", "paypal", "razorpay", "manual"], editable: true, defaultValue: "stripe" },
  { key: "provider_payment_id", label: "Provider ID", type: "text", hideInTable: true, editable: true },
  { key: "created_at", label: "Created" },
];

const invoiceCols: ColumnDef[] = [
  { key: "amount", label: "Amount", type: "number", editable: true, required: true },
  { key: "currency", label: "Currency", type: "text", editable: true, defaultValue: "USD" },
  { key: "status", label: "Status", type: "select", options: ["draft", "sent", "paid", "overdue", "void"], editable: true, defaultValue: "draft" },
  { key: "due_date", label: "Due Date", type: "date", editable: true },
  { key: "paid_at", label: "Paid At", type: "date", hideInTable: true, editable: true },
  { key: "created_at", label: "Created" },
];

export function PlansModule() {
  return <DataManager table="plans" columns={planCols} title="Plans" subtitle="Subscription plans and pricing" defaultValues={{ price_monthly: 0, price_yearly: 0, features: [], is_active: true }} />;
}

export function SubscriptionsModule({ organizationId }: { organizationId: string }) {
  return <DataManager table="subscriptions" organizationId={organizationId} columns={subCols} title="Subscriptions" subtitle="Active subscriptions" defaultValues={{ status: "active" }} />;
}

export function PaymentsModule({ organizationId }: { organizationId: string }) {
  return <DataManager table="payments" organizationId={organizationId} columns={paymentCols} title="Payments" subtitle="Payment history and transactions" defaultValues={{ amount: 0, currency: "USD", status: "pending", provider: "stripe" }} />;
}

export function InvoicesModule({ organizationId }: { organizationId: string }) {
  return <DataManager table="invoices" organizationId={organizationId} columns={invoiceCols} title="Invoices" subtitle="Billing invoices" defaultValues={{ amount: 0, currency: "USD", status: "draft" }} />;
}
