import DataManager from '../components/DataManager';

const flagColumns = [
  { key: 'key', label: 'Key', type: 'text' as const, required: true, showInTable: true },
  { key: 'label', label: 'Label', type: 'text' as const, required: true, showInTable: true },
  { key: 'description', label: 'Description', type: 'textarea' as const, showInTable: true },
  { key: 'is_enabled', label: 'Enabled', type: 'boolean' as const, showInTable: true },
  { key: 'category', label: 'Category', type: 'text' as const, showInTable: true },
];

const auditColumns = [
  { key: 'actor_email', label: 'Actor', type: 'text' as const, showInTable: true },
  { key: 'action', label: 'Action', type: 'text' as const, required: true, showInTable: true },
  { key: 'target_type', label: 'Target Type', type: 'text' as const, showInTable: true },
  { key: 'target_id', label: 'Target ID', type: 'text' as const, showInTable: true },
  { key: 'metadata', label: 'Metadata', type: 'json' as const, showInTable: false },
];

const usageColumns = [
  { key: 'period_start', label: 'Period Start', type: 'date' as const, showInTable: true },
  { key: 'period_end', label: 'Period End', type: 'date' as const, showInTable: true },
  { key: 'reviews_generated', label: 'Reviews', type: 'number' as const, showInTable: true },
  { key: 'ai_requests', label: 'AI Requests', type: 'number' as const, showInTable: true },
  { key: 'messages_sent', label: 'Messages Sent', type: 'number' as const, showInTable: true },
  { key: 'qr_scans', label: 'QR Scans', type: 'number' as const, showInTable: true },
];

export function FeatureFlagsModule({ businessId }: { businessId: string }) {
  return <DataManager table="feature_flags" businessId={businessId} columns={flagColumns} defaultValues={{ is_enabled: false }} />;
}

export function AuditLogsModule({ businessId }: { businessId: string }) {
  return <DataManager table="audit_logs" businessId={businessId} columns={auditColumns} />;
}

export function UsageRecordsModule({ businessId }: { businessId: string }) {
  return <DataManager table="usage_records" businessId={businessId} columns={usageColumns} defaultValues={{ reviews_generated: 0, ai_requests: 0, messages_sent: 0, qr_scans: 0 }} />;
}
