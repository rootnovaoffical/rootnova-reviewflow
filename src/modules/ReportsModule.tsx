import DataManager from '../components/DataManager';
import type { ColumnDef } from '../components/DataManager';

// report_templates: id, business_id, user_id, name, description, report_type, selected_kpis, selected_charts, date_range_preset, custom_date_start, custom_date_end, branch_ids, employee_ids, customer_segments, branding_config, layout_config, is_system_template, is_active, cloned_from, created_at, updated_at
const templateColumns: ColumnDef[] = [
  { key: 'name', label: 'Template Name', type: 'text', required: true, showInTable: true },
  { key: 'report_type', label: 'Report Type', type: 'select', options: ['summary', 'reviews', 'customers', 'campaigns', 'goals', 'custom'], required: true, showInTable: true },
  { key: 'description', label: 'Description', type: 'textarea', showInTable: true },
  { key: 'date_range_preset', label: 'Date Range', type: 'select', options: ['7d', '30d', '90d', 'ytd', 'all', 'custom'], showInTable: true },
  { key: 'is_active', label: 'Active', type: 'boolean', showInTable: true },
];

// scheduled_reports: id, business_id, user_id, template_id, name, frequency, custom_cron, delivery_channels, delivery_emails, delivery_phones, next_run_at, last_run_at, is_active, retry_count, max_retries, created_at, updated_at
const scheduledColumns: ColumnDef[] = [
  { key: 'name', label: 'Report Name', type: 'text', required: true, showInTable: true },
  { key: 'frequency', label: 'Frequency', type: 'select', options: ['daily', 'weekly', 'monthly', 'quarterly'], required: true, showInTable: true },
  { key: 'delivery_channels', label: 'Channels (one per line)', type: 'array', showInTable: true },
  { key: 'delivery_emails', label: 'Emails (one per line)', type: 'array', showInTable: true },
  { key: 'is_active', label: 'Active', type: 'boolean', showInTable: true },
  { key: 'next_run_at', label: 'Next Run', type: 'date', showInTable: true, editable: false },
  { key: 'last_run_at', label: 'Last Run', type: 'date', showInTable: true, editable: false },
];

interface Props { businessId: string; }
export function ReportTemplatesModule({ businessId }: Props) { return <DataManager table="report_templates" businessId={businessId} columns={templateColumns} defaultValues={{ is_active: true, report_type: 'summary', date_range_preset: '30d', selected_kpis: [], selected_charts: [], branch_ids: [], employee_ids: [], customer_segments: [], branding_config: {}, layout_config: {}, is_system_template: false }} />; }
export function ScheduledReportsModule({ businessId }: Props) { return <DataManager table="scheduled_reports" businessId={businessId} columns={scheduledColumns} defaultValues={{ frequency: 'weekly', is_active: true, delivery_channels: [], delivery_emails: [], delivery_phones: [], retry_count: 0, max_retries: 3 }} />; }
