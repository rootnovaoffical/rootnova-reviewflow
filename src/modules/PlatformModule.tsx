import DataManager from '../components/DataManager';
import type { ColumnDef } from '../components/DataManager';

const flagColumns: ColumnDef[] = [
  { key: 'flag_key', label: 'Flag Key', type: 'text', required: true, showInTable: true },
  { key: 'name', label: 'Name', type: 'text', required: true, showInTable: true },
  { key: 'description', label: 'Description', type: 'textarea', showInTable: true },
  { key: 'is_enabled', label: 'Enabled', type: 'boolean', showInTable: true },
  { key: 'rollout_percentage', label: 'Rollout %', type: 'number', showInTable: true },
];
const auditColumns: ColumnDef[] = [
  { key: 'actor_email', label: 'Actor', type: 'text', showInTable: true, editable: false },
  { key: 'action', label: 'Action', type: 'text', showInTable: true, editable: false },
  { key: 'target_type', label: 'Target Type', type: 'text', showInTable: true, editable: false },
  { key: 'metadata', label: 'Metadata', type: 'json', showInTable: false, editable: false },
  { key: 'created_at', label: 'Timestamp', type: 'date', showInTable: true, editable: false },
];
const usageColumns: ColumnDef[] = [
  { key: 'metric', label: 'Metric', type: 'text', required: true, showInTable: true },
  { key: 'value', label: 'Value', type: 'number', required: true, showInTable: true },
  { key: 'period', label: 'Period', type: 'text', required: true, showInTable: true },
  { key: 'recorded_at', label: 'Recorded At', type: 'date', showInTable: true, editable: false },
];
interface Props { businessId: string; }
export function FeatureFlagsModule({ businessId }: Props) { return <DataManager table="feature_flags" businessId={businessId} columns={flagColumns} defaultValues={{ is_enabled: false, rollout_percentage: 0 }} />; }
export function AuditLogsModule({ businessId }: Props) { return <DataManager table="audit_logs" businessId={businessId} columns={auditColumns} pageSize={50} />; }
export function UsageRecordsModule({ businessId }: Props) { return <DataManager table="usage_records" businessId={businessId} columns={usageColumns} defaultValues={{ period: 'daily' }} />; }
