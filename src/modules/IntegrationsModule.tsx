import DataManager, { ColumnDef } from "../components/DataManager";

const installedCols: ColumnDef[] = [
  { key: "status", label: "Status", type: "select", options: ["active", "paused", "error", "disconnected"], editable: true, defaultValue: "active" },
  { key: "sync_frequency", label: "Sync Frequency", type: "select", options: ["realtime", "hourly", "daily", "weekly"], editable: true, defaultValue: "daily" },
  { key: "last_sync_at", label: "Last Sync", hideInTable: false },
  { key: "last_sync_status", label: "Sync Status", type: "select", options: ["success", "failed", "partial", "pending"], editable: true, hideInTable: true },
  { key: "last_error", label: "Last Error", type: "text", hideInTable: true, editable: true },
  { key: "health_score", label: "Health", type: "number", editable: true, defaultValue: 100 },
  { key: "enabled_features", label: "Features", type: "array", hideInTable: true, editable: true },
  { key: "config", label: "Config", type: "json", hideInTable: true, editable: true },
  { key: "provider_id", label: "Provider", type: "text", editable: true, required: true },
  { key: "created_at", label: "Created" },
];

const providerCols: ColumnDef[] = [
  { key: "name", label: "Name", type: "text", editable: true, required: true },
  { key: "slug", label: "Slug", type: "text", editable: true, required: true },
  { key: "category", label: "Category", type: "select", options: ["communication", "crm", "analytics", "payment", "marketing", "social"], editable: true, defaultValue: "communication" },
  { key: "description", label: "Description", type: "textarea", editable: true },
  { key: "logo_url", label: "Logo URL", type: "text", hideInTable: true, editable: true },
  { key: "is_active", label: "Active", type: "boolean", editable: true, defaultValue: true },
  { key: "created_at", label: "Created" },
];

export function InstalledIntegrationsModule({ businessId }: { businessId: string }) {
  return <DataManager table="installed_integrations" businessId={businessId} columns={installedCols} title="Installed Integrations" subtitle="Manage your active integrations" defaultValues={{ status: "active", sync_frequency: "daily", health_score: 100, config: {}, enabled_features: [] }} />;
}

export function IntegrationProvidersModule() {
  return <DataManager table="integration_providers" columns={providerCols} title="Integration Providers" subtitle="Available integration providers" defaultValues={{ category: "communication", is_active: true }} />;
}
