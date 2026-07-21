import DataManager from '../components/DataManager';
import type { ColumnDef } from '../components/DataManager';

const columns: ColumnDef[] = [
  { key: 'name', label: 'Rule Name', type: 'text', required: true, showInTable: true },
  { key: 'trigger_type', label: 'Trigger', type: 'select', options: ['review_received', 'low_rating', 'new_customer', 'scheduled', 'qr_scan'], required: true, showInTable: true },
  { key: 'action_type', label: 'Action', type: 'select', options: ['send_message', 'create_task', 'send_email', 'webhook'], required: true, showInTable: true },
  { key: 'delay_hours', label: 'Delay (hrs)', type: 'number', showInTable: true },
  { key: 'status', label: 'Status', type: 'select', options: ['active', 'paused', 'draft'], required: true, showInTable: true },
  { key: 'trigger_count', label: 'Triggers', type: 'number', showInTable: true, editable: false },
  { key: 'trigger_config', label: 'Trigger Config', type: 'json', showInTable: false },
  { key: 'action_config', label: 'Action Config', type: 'json', showInTable: false },
];
interface Props { businessId: string; }
export default function AutomationModule({ businessId }: Props) { return <DataManager table="automation_rules" businessId={businessId} columns={columns} defaultValues={{ status: 'active', trigger_count: 0, trigger_config: {}, action_config: {} }} />; }
