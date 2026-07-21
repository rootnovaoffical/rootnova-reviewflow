import DataManager from '../components/DataManager';

const columns = [
  { key: 'name', label: 'Rule Name', type: 'text' as const, required: true, showInTable: true },
  { key: 'trigger_type', label: 'Trigger', type: 'text' as const, required: true, showInTable: true },
  { key: 'action_type', label: 'Action', type: 'text' as const, required: true, showInTable: true },
  { key: 'delay_hours', label: 'Delay (hrs)', type: 'number' as const, showInTable: true },
  { key: 'status', label: 'Status', type: 'select' as const, options: ['active', 'paused', 'draft'], showInTable: true },
  { key: 'trigger_config', label: 'Trigger Config', type: 'json' as const, showInTable: false },
  { key: 'action_config', label: 'Action Config', type: 'json' as const, showInTable: false },
];

export default function AutomationModule({ businessId }: { businessId: string }) {
  return <DataManager table="automation_rules" businessId={businessId} columns={columns} defaultValues={{ status: 'active', delay_hours: 0 }} />;
}
