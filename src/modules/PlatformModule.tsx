import DataManager from '../components/DataManager';

const flagColumns = [
  { key: 'key', label: 'Key', type: 'text' as const, required: true, showInTable: true },
  { key: 'name', label: 'Name', type: 'text' as const, required: true, showInTable: true },
  { key: 'description', label: 'Description', type: 'textarea' as const, showInTable: true },
  { key: 'is_enabled', label: 'Enabled', type: 'boolean' as const, showInTable: true },
];

const auditColumns = [
  { key: 'action', label: 'Action', type: 'text' as const, required: true, showInTable: true },
  { key: 'entity_type', label: 'Entity', type: 'text' as const, showInTable: true },
  { key: 'entity_id', label: 'Entity ID', type: 'text' as const, showInTable: true },
  { key: 'metadata', label: 'Metadata', type: 'json' as const, showInTable: false },
];

const usageColumns = [
  { key: 'metric', label: 'Metric', type: 'text' as const, required: true, showInTable: true },
  { key: 'value', label: 'Value', type: 'number' as const, required: true, showInTable: true },
  { key: 'recorded_at', label: 'Recorded At', type: 'date' as const, showInTable: true },
];

export function FeatureFlagsModule({ businessId }: { businessId: string }) {
  return <DataManager table="feature_flags" businessId={businessId} columns={flagColumns} defaultValues={{ is_enabled: false }} />;
}

export function AuditLogsModule({ businessId }: { businessId: string }) {
  return <DataManager table="audit_logs" businessId={businessId} columns={auditColumns} />;
}

export function UsageRecordsModule({ businessId }: { businessId: string }) {
  return <DataManager table="usage_records" businessId={businessId} columns={usageColumns} defaultValues={{ value: 0 }} />;
}
