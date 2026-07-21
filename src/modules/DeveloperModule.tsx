import DataManager, { ColumnDef } from "../components/DataManager";

const apiKeyCols: ColumnDef[] = [
  { key: "key_name", label: "Name", type: "text", editable: true, required: true },
  { key: "key_prefix", label: "Prefix", type: "text", editable: true },
  { key: "scopes", label: "Scopes", type: "array", editable: true },
  { key: "rate_limit_per_hour", label: "Rate Limit/hr", type: "number", editable: true, defaultValue: 1000 },
  { key: "is_active", label: "Active", type: "boolean", editable: true, defaultValue: true },
  { key: "last_used_at", label: "Last Used", hideInTable: false },
  { key: "expires_at", label: "Expires", type: "date", editable: true },
  { key: "key_hash", label: "Key Hash", type: "text", hideInTable: true, editable: true },
  { key: "created_at", label: "Created" },
];

const appCols: ColumnDef[] = [
  { key: "name", label: "App Name", type: "text", editable: true, required: true },
  { key: "description", label: "Description", type: "textarea", editable: true },
  { key: "status", label: "Status", type: "select", options: ["development", "review", "active", "suspended", "disabled"], editable: true, defaultValue: "development" },
  { key: "created_at", label: "Created" },
  { key: "updated_at", label: "Updated", hideInTable: true },
];

const webhookCols: ColumnDef[] = [
  { key: "name", label: "Name", type: "text", editable: true, required: true },
  { key: "url", label: "URL", type: "text", editable: true, required: true },
  { key: "events", label: "Events", type: "array", editable: true },
  { key: "is_active", label: "Active", type: "boolean", editable: true, defaultValue: true },
  { key: "secret", label: "Secret", type: "text", hideInTable: true, editable: true },
  { key: "created_at", label: "Created" },
];

export function ApiKeysModule({ businessId }: { businessId: string }) {
  return <DataManager table="api_keys" businessId={businessId} columns={apiKeyCols} title="API Keys" subtitle="Manage API keys for external access" defaultValues={{ rate_limit_per_hour: 1000, is_active: true, scopes: [] }} />;
}

export function DeveloperAppsModule({ businessId }: { businessId: string }) {
  return <DataManager table="developer_apps" businessId={businessId} columns={appCols} title="Developer Apps" subtitle="Registered developer applications" defaultValues={{ status: "development" }} />;
}

export function WebhooksModule({ businessId }: { businessId: string }) {
  return <DataManager table="webhooks" businessId={businessId} columns={webhookCols} title="Webhooks" subtitle="Configure webhook endpoints" defaultValues={{ is_active: true, events: [] }} />;
}
