import DataManager, { ColumnDef } from "../components/DataManager";

const flagCols: ColumnDef[] = [
  { key: "key", label: "Key", type: "text", editable: true, required: true },
  { key: "name", label: "Name", type: "text", editable: true, required: true },
  { key: "description", label: "Description", type: "textarea", editable: true },
  { key: "enabled", label: "Enabled", type: "boolean", editable: true, defaultValue: false },
  { key: "rollout_percentage", label: "Rollout %", type: "number", editable: true, defaultValue: 0 },
  { key: "created_at", label: "Created" },
  { key: "updated_at", label: "Updated", hideInTable: true },
];

const auditCols: ColumnDef[] = [
  { key: "actor_email", label: "Actor", type: "text", editable: true },
  { key: "action", label: "Action", type: "text", editable: true, required: true },
  { key: "target_type", label: "Target Type", type: "text", editable: true },
  { key: "target_id", label: "Target ID", type: "text", hideInTable: true, editable: true },
  { key: "metadata", label: "Metadata", type: "json", hideInTable: true, editable: true },
  { key: "created_at", label: "Created" },
];

const usageCols: ColumnDef[] = [
  { key: "period_start", label: "Period Start", type: "date", editable: true, required: true },
  { key: "period_end", label: "Period End", type: "date", editable: true, required: true },
  { key: "reviews_generated", label: "Reviews", type: "number", editable: true, defaultValue: 0 },
  { key: "ai_requests", label: "AI Requests", type: "number", editable: true, defaultValue: 0 },
  { key: "messages_sent", label: "Messages", type: "number", editable: true, defaultValue: 0 },
  { key: "reports_generated", label: "Reports", type: "number", editable: true, defaultValue: 0 },
  { key: "qr_scans", label: "QR Scans", type: "number", editable: true, defaultValue: 0 },
  { key: "customers_stored", label: "Customers", type: "number", editable: true, defaultValue: 0 },
  { key: "automation_executions", label: "Automations", type: "number", editable: true, defaultValue: 0 },
  { key: "metadata", label: "Metadata", type: "json", hideInTable: true, editable: true },
  { key: "created_at", label: "Created" },
];

export function FeatureFlagsModule() {
  return <DataManager table="feature_flags" columns={flagCols} title="Feature Flags" subtitle="Control feature rollouts" defaultValues={{ enabled: false, rollout_percentage: 0 }} />;
}

export function AuditLogsModule() {
  return <DataManager table="audit_logs" columns={auditCols} title="Audit Logs" subtitle="System audit trail" defaultValues={{ metadata: {} }} />;
}

export function UsageRecordsModule({ organizationId }: { organizationId: string }) {
  return <DataManager table="usage_records" organizationId={organizationId} columns={usageCols} title="Usage Records" subtitle="Usage tracking and limits" defaultValues={{ reviews_generated: 0, ai_requests: 0, messages_sent: 0, reports_generated: 0, qr_scans: 0, customers_stored: 0, automation_executions: 0, metadata: {} }} />;
}
