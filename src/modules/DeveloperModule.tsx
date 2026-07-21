import DataManager from '../components/DataManager';

const apiKeyColumns = [
  { key: 'name', label: 'Key Name', type: 'text' as const, required: true, showInTable: true },
  { key: 'key_prefix', label: 'Prefix', type: 'text' as const, showInTable: true },
  { key: 'scopes', label: 'Scopes', type: 'array' as const, showInTable: true },
  { key: 'is_active', label: 'Active', type: 'boolean' as const, showInTable: true },
];

const appColumns = [
  { key: 'name', label: 'App Name', type: 'text' as const, required: true, showInTable: true },
  { key: 'description', label: 'Description', type: 'textarea' as const, showInTable: true },
  { key: 'redirect_url', label: 'Redirect URL', type: 'text' as const, showInTable: true },
  { key: 'is_active', label: 'Active', type: 'boolean' as const, showInTable: true },
];

const webhookColumns = [
  { key: 'url', label: 'URL', type: 'text' as const, required: true, showInTable: true },
  { key: 'events', label: 'Events', type: 'array' as const, showInTable: true },
  { key: 'is_active', label: 'Active', type: 'boolean' as const, showInTable: true },
];

export function ApiKeysModule({ businessId }: { businessId: string }) {
  return <DataManager table="api_keys" businessId={businessId} columns={apiKeyColumns} defaultValues={{ is_active: true }} />;
}

export function DeveloperAppsModule({ businessId }: { businessId: string }) {
  return <DataManager table="developer_apps" businessId={businessId} columns={appColumns} defaultValues={{ is_active: true }} />;
}

export function WebhooksModule({ businessId }: { businessId: string }) {
  return <DataManager table="webhooks" businessId={businessId} columns={webhookColumns} defaultValues={{ is_active: true }} />;
}
