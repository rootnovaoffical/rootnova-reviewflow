import DataManager from '../components/DataManager';

const columns = [
  { key: 'name', label: 'Name', type: 'text' as const, required: true, showInTable: true },
  { key: 'description', label: 'Description', type: 'textarea' as const, showInTable: true },
  { key: 'steps', label: 'Steps', type: 'json' as const, showInTable: false },
  { key: 'is_active', label: 'Active', type: 'boolean' as const, showInTable: true },
];

export default function WorkflowsModule({ businessId }: { businessId: string }) {
  return <DataManager table="workflows" businessId={businessId} columns={columns} defaultValues={{ is_active: true }} />;
}
