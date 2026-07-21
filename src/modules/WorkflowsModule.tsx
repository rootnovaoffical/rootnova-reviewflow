import DataManager from '../components/DataManager';
import type { ColumnDef } from '../components/DataManager';

const columns: ColumnDef[] = [
  { key: 'name', label: 'Name', type: 'text', required: true, showInTable: true },
  { key: 'description', label: 'Description', type: 'textarea', showInTable: true },
  { key: 'status', label: 'Status', type: 'select', options: ['active', 'paused', 'draft', 'archived'], required: true, showInTable: true },
  { key: 'trigger_type', label: 'Trigger', type: 'select', options: ['manual', 'event', 'schedule', 'webhook'], required: true, showInTable: true },
  { key: 'created_at', label: 'Created', type: 'date', showInTable: true, editable: false },
];

interface Props { businessId: string; }

export default function WorkflowsModule({ businessId }: Props) {
  return <DataManager table="workflows" businessId={businessId} columns={columns} defaultValues={{ status: 'draft', trigger_type: 'manual' }} />;
}
