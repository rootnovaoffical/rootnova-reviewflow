import DataManager from '../components/DataManager';

const columns = [
  { key: 'name', label: 'Name', type: 'text' as const, required: true, showInTable: true },
  { key: 'description', label: 'Description', type: 'textarea' as const, showInTable: true },
  { key: 'category', label: 'Category', type: 'text' as const, showInTable: true },
  { key: 'trigger_type', label: 'Trigger', type: 'text' as const, showInTable: true },
  { key: 'is_active', label: 'Active', type: 'boolean' as const, showInTable: true },
  { key: 'nodes', label: 'Nodes', type: 'json' as const, showInTable: false },
  { key: 'edges', label: 'Edges', type: 'json' as const, showInTable: false },
];

export default function WorkflowTemplatesModule({ businessId }: { businessId: string }) {
  return <DataManager table="workflow_templates" businessId={businessId} columns={columns} defaultValues={{ is_active: true, category: 'general' }} />;
}
