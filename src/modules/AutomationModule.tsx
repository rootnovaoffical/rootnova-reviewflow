import DataManager from '../components/DataManager';

const columns = [
  { key: 'name', label: 'Rule Name', type: 'text' as const, required: true, showInTable: true },
  { key: 'trigger', label: 'Trigger', type: 'text' as const, required: true, showInTable: true },
  { key: 'action', label: 'Action', type: 'text' as const, required: true, showInTable: true },
  { key: 'is_active', label: 'Active', type: 'boolean' as const, showInTable: true },
];

export default function AutomationModule({ businessId }: { businessId: string }) {
  return <DataManager table="automation_rules" businessId={businessId} columns={columns} defaultValues={{ is_active: true }} />;
}
