import DataManager from '../components/DataManager';

const templateColumns = [
  { key: 'name', label: 'Name', type: 'text' as const, required: true, showInTable: true },
  { key: 'type', label: 'Type', type: 'select' as const, options: ['weekly', 'monthly', 'quarterly', 'custom'], showInTable: true },
  { key: 'config', label: 'Config', type: 'json' as const, showInTable: false },
];

const scheduledColumns = [
  { key: 'template_id', label: 'Template ID', type: 'text' as const, showInTable: true },
  { key: 'frequency', label: 'Frequency', type: 'select' as const, options: ['daily', 'weekly', 'monthly', 'quarterly'], showInTable: true },
  { key: 'next_run', label: 'Next Run', type: 'date' as const, showInTable: true },
];

export function ReportTemplatesModule({ businessId }: { businessId: string }) {
  return <DataManager table="report_templates" businessId={businessId} columns={templateColumns} defaultValues={{ type: 'weekly' }} />;
}

export function ScheduledReportsModule({ businessId }: { businessId: string }) {
  return <DataManager table="scheduled_reports" businessId={businessId} columns={scheduledColumns} defaultValues={{ frequency: 'weekly' }} />;
}
