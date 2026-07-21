import DataManager, { ColumnDef } from "../components/DataManager";

const templateCols: ColumnDef[] = [
  { key: "name", label: "Name", type: "text", editable: true, required: true },
  { key: "description", label: "Description", type: "textarea", editable: true },
  { key: "report_type", label: "Type", type: "select", options: ["summary", "detailed", "custom", "executive"], editable: true, defaultValue: "summary" },
  { key: "date_range_preset", label: "Date Range", type: "select", options: ["today", "week", "month", "quarter", "year", "custom"], editable: true, defaultValue: "month" },
  { key: "selected_kpis", label: "KPIs", type: "array", editable: true },
  { key: "selected_charts", label: "Charts", type: "array", editable: true },
  { key: "is_system_template", label: "System", type: "boolean", editable: true, defaultValue: false },
  { key: "is_active", label: "Active", type: "boolean", editable: true, defaultValue: true },
  { key: "custom_date_start", label: "Start Date", type: "date", hideInTable: true, editable: true },
  { key: "custom_date_end", label: "End Date", type: "date", hideInTable: true, editable: true },
  { key: "branch_ids", label: "Branches", type: "array", hideInTable: true, editable: true },
  { key: "employee_ids", label: "Employees", type: "array", hideInTable: true, editable: true },
  { key: "customer_segments", label: "Segments", type: "array", hideInTable: true, editable: true },
  { key: "branding_config", label: "Branding", type: "json", hideInTable: true, editable: true },
  { key: "layout_config", label: "Layout", type: "json", hideInTable: true, editable: true },
  { key: "created_at", label: "Created" },
];

const scheduledCols: ColumnDef[] = [
  { key: "name", label: "Name", type: "text", editable: true, required: true },
  { key: "frequency", label: "Frequency", type: "select", options: ["daily", "weekly", "monthly", "quarterly"], editable: true, required: true, defaultValue: "weekly" },
  { key: "delivery_channels", label: "Channels", type: "array", editable: true },
  { key: "delivery_emails", label: "Emails", type: "array", editable: true },
  { key: "delivery_phones", label: "Phones", type: "array", hideInTable: true, editable: true },
  { key: "is_active", label: "Active", type: "boolean", editable: true, defaultValue: true },
  { key: "next_run_at", label: "Next Run", hideInTable: false },
  { key: "last_run_at", label: "Last Run", hideInTable: false },
  { key: "retry_count", label: "Retries", type: "number", editable: false },
  { key: "max_retries", label: "Max Retries", type: "number", editable: true, defaultValue: 3 },
  { key: "custom_cron", label: "Cron", type: "text", hideInTable: true, editable: true },
  { key: "created_at", label: "Created", hideInTable: true },
];

export function ReportTemplatesModule({ businessId }: { businessId: string }) {
  return <DataManager table="report_templates" businessId={businessId} columns={templateCols} title="Report Templates" subtitle="Configure report templates" defaultValues={{ report_type: "summary", date_range_preset: "month", selected_kpis: [], selected_charts: [], is_system_template: false, is_active: true, branch_ids: [], employee_ids: [], customer_segments: [], branding_config: {}, layout_config: {} }} />;
}

export function ScheduledReportsModule({ businessId }: { businessId: string }) {
  return <DataManager table="scheduled_reports" businessId={businessId} columns={scheduledCols} title="Scheduled Reports" subtitle="Automated report delivery schedules" defaultValues={{ frequency: "weekly", delivery_channels: ["email"], delivery_emails: [], delivery_phones: [], is_active: true, retry_count: 0, max_retries: 3 }} />;
}
