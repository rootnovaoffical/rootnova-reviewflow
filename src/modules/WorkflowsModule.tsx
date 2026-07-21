import DataManager from '../components/DataManager';
import type { ColumnDef } from '../components/DataManager';

// workflows: id, business_id, name, description, status, trigger_type, trigger_config, canvas_data, variables, version, is_ai_generated, ai_explanation, execution_count, success_count, failure_count, last_executed_at, created_at, updated_at
const columns: ColumnDef[] = [
  { key: 'name', label: 'Name', type: 'text', required: true, showInTable: true },
  { key: 'description', label: 'Description', type: 'textarea', showInTable: true },
  { key: 'status', label: 'Status', type: 'select', options: ['active', 'paused', 'draft', 'archived'], required: true, showInTable: true },
  { key: 'trigger_type', label: 'Trigger', type: 'select', options: ['manual', 'event', 'schedule', 'webhook'], required: true, showInTable: true },
  { key: 'execution_count', label: 'Executions', type: 'number', showInTable: true, editable: false },
  { key: 'created_at', label: 'Created', type: 'date', showInTable: true, editable: false },
];
interface Props { businessId: string; }
export default function WorkflowsModule({ businessId }: Props) { return <DataManager table="workflows" businessId={businessId} columns={columns} defaultValues={{ status: 'draft', trigger_type: 'manual', execution_count: 0, success_count: 0, failure_count: 0, variables: {}, canvas_data: {}, version: 1 }} />; }
