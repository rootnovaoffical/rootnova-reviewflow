import DataManager from '../components/DataManager';

const templateColumns = [
  { key: 'name', label: 'Name', type: 'text' as const, required: true, showInTable: true },
  { key: 'report_type', label: 'Type', type: 'select' as const, options: ['weekly', 'monthly', 'quarterly', 'custom'], showInTable: true },
  { key: 'description', label: 'Description', type: 'textarea' as const, showInTable: true },
  { key: 'date_range_preset', label: 'Date Range', type: 'text' as const, showInTable: true },
  { key: 'is_active', label: 'Active', type: 'boolean' as const, showInTable: true },
];

const scheduledColumns = [
  { key: 'name', label: 'Name', type: 'text' as const, required: true, showInTable: true },
  { key: 'frequency', label: 'Frequency', type: 'select' as const, options: ['daily', 'weekly', 'monthly', 'quarterly'], showInTable: true },
  { key: 'next_run_at', label: 'Next Run', type: 'date' as const, showInTable: true },
  { key: 'is_active', label: 'Active', type: 'boolean' as const, showInTable: true },
];

export function ReportTemplatesModule({ businessId }: { businessId: string }) {
  return <DataManager table="report_templates" businessId={businessId} columns={templateColumns} defaultValues={{ report_type: 'weekly', is_active: true }} />;
}

export function ScheduledReportsModule({ businessId }: { businessId: string }) {
  return <DataManager table="scheduled_reports" businessId={businessId} columns={scheduledColumns} defaultValues={{ frequency: 'weekly', is_active: true }} />;
}
