import DataManager from '../components/DataManager';

const columns = [
  { key: 'name', label: 'Name', type: 'text' as const, required: true, showInTable: true },
  { key: 'description', label: 'Description', type: 'textarea' as const, showInTable: true },
  { key: 'status', label: 'Status', type: 'select' as const, options: ['active', 'paused', 'draft', 'archived'], showInTable: true },
  { key: 'trigger_type', label: 'Trigger', type: 'text' as const, showInTable: true },
  { key: 'canvas_data', label: 'Canvas Data', type: 'json' as const, showInTable: false },
  { key: 'trigger_config', label: 'Trigger Config', type: 'json' as const, showInTable: false },
];

export default function WorkflowsModule({ businessId }: { businessId: string }) {
  return <DataManager table="workflows" businessId={businessId} columns={columns} defaultValues={{ status: 'draft' }} />;
}
