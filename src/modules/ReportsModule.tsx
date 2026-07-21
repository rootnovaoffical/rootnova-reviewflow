import DataManager from '../components/DataManager';
import type { ColumnDef } from '../components/DataManager';

const templateColumns: ColumnDef[] = [
  { key: 'name', label: 'Template Name', type: 'text', required: true, showInTable: true },
  { key: 'report_type', label: 'Report Type', type: 'select', options: ['summary', 'reviews', 'customers', 'campaigns', 'goals', 'custom'], required: true, showInTable: true },
  { key: 'description', label: 'Description', type: 'textarea', showInTable: true },
  { key: 'config', label: 'Config (JSON)', type: 'json', showInTable: false },
  { key: 'is_active', label: 'Active', type: 'boolean', showInTable: true },
];

const scheduledColumns: ColumnDef[] = [
  { key: 'name', label: 'Report Name', type: 'text', required: true, showInTable: true },
  { key: 'frequency', label: 'Frequency', type: 'select', options: ['daily', 'weekly', 'monthly', 'quarterly'], required: true, showInTable: true },
  { key: 'format', label: 'Format', type: 'select', options: ['pdf', 'excel', 'csv', 'json'], required: true, showInTable: true },
  { key: 'recipients', label: 'Recipients (one per line)', type: 'array', showInTable: true },
  { key: 'status', label: 'Status', type: 'select', options: ['active', 'paused', 'error'], showInTable: true },
  { key: 'next_run', label: 'Next Run', type: 'date', showInTable: true, editable: false },
  { key: 'last_run', label: 'Last Run', type: 'date', showInTable: true, editable: false },
];

interface Props { businessId: string; }

export function ReportTemplatesModule({ businessId }: Props) {
  return <DataManager table="report_templates" businessId={businessId} columns={templateColumns} defaultValues={{ is_active: true, report_type: 'summary', config: {} }} />;
}

export function ScheduledReportsModule({ businessId }: Props) {
  return <DataManager table="scheduled_reports" businessId={businessId} columns={scheduledColumns} defaultValues={{ frequency: 'weekly', format: 'pdf', status: 'active', recipients: [] }} />;
}
