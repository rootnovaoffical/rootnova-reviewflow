import DataManager from '../components/DataManager';
import type { ColumnDef } from '../components/DataManager';

// feature_flags: id, key, label, description, is_enabled, category, created_at, updated_at
// NOTE: feature_flags has NO business_id or organization_id - it's a global platform table
const flagColumns: ColumnDef[] = [
  { key: 'key', label: 'Flag Key', type: 'text', required: true, showInTable: true },
  { key: 'label', label: 'Label', type: 'text', required: true, showInTable: true },
  { key: 'description', label: 'Description', type: 'textarea', showInTable: true },
  { key: 'is_enabled', label: 'Enabled', type: 'boolean', showInTable: true },
  { key: 'category', label: 'Category', type: 'select', options: ['core', 'ai', 'billing', 'integrations', 'experimental'], showInTable: true },
];

// audit_logs: id, actor_id, actor_email, action, target_type, target_id, organization_id, metadata, created_at
// NOTE: audit_logs has organization_id, NOT business_id
const auditColumns: ColumnDef[] = [
  { key: 'actor_email', label: 'Actor', type: 'text', showInTable: true, editable: false },
  { key: 'action', label: 'Action', type: 'text', showInTable: true, editable: false },
  { key: 'target_type', label: 'Target Type', type: 'text', showInTable: true, editable: false },
  { key: 'metadata', label: 'Metadata', type: 'json', showInTable: false, editable: false },
  { key: 'created_at', label: 'Timestamp', type: 'date', showInTable: true, editable: false },
];

// usage_records: id, organization_id, period_start, period_end, reviews_generated, ai_requests, messages_sent, reports_generated, qr_scans, customers_stored, automation_executions, metadata, created_at, updated_at
// NOTE: usage_records has organization_id, NOT business_id
const usageColumns: ColumnDef[] = [
  { key: 'period_start', label: 'Period Start', type: 'date', required: true, showInTable: true },
  { key: 'period_end', label: 'Period End', type: 'date', required: true, showInTable: true },
  { key: 'reviews_generated', label: 'Reviews', type: 'number', showInTable: true },
  { key: 'ai_requests', label: 'AI Requests', type: 'number', showInTable: true },
  { key: 'messages_sent', label: 'Messages', type: 'number', showInTable: true },
  { key: 'qr_scans', label: 'QR Scans', type: 'number', showInTable: true },
  { key: 'customers_stored', label: 'Customers', type: 'number', showInTable: true },
  { key: 'automation_executions', label: 'Automations', type: 'number', showInTable: true },
];

// Feature flags: global table, no business/org filter
export function FeatureFlagsModule({ businessId: _businessId }: { businessId: string }) { return <DataManager table="feature_flags" columns={flagColumns} defaultValues={{ is_enabled: false, category: 'core' }} />; }

// Audit logs: uses organization_id
export function AuditLogsModule({ organizationId }: { organizationId: string }) { return <DataManager table="audit_logs" organizationId={organizationId} columns={auditColumns} pageSize={50} />; }

// Usage records: uses organization_id
export function UsageRecordsModule({ organizationId }: { organizationId: string }) { return <DataManager table="usage_records" organizationId={organizationId} columns={usageColumns} defaultValues={{ reviews_generated: 0, ai_requests: 0, messages_sent: 0, reports_generated: 0, qr_scans: 0, customers_stored: 0, automation_executions: 0, metadata: {} }} />; }
