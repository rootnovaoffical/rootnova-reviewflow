import DataManager from '../components/DataManager';
import type { ColumnDef } from '../components/DataManager';

// api_keys: id, business_id, key_name, key_prefix, key_hash, scopes, rate_limit_per_hour, last_used_at, expires_at, is_active, created_by, created_at, updated_at
const apiKeyColumns: ColumnDef[] = [
  { key: 'key_name', label: 'Key Name', type: 'text', required: true, showInTable: true },
  { key: 'key_prefix', label: 'Prefix', type: 'text', showInTable: true, editable: false },
  { key: 'scopes', label: 'Scopes (one per line)', type: 'array', showInTable: true },
  { key: 'rate_limit_per_hour', label: 'Rate Limit/hr', type: 'number', showInTable: true },
  { key: 'is_active', label: 'Active', type: 'boolean', showInTable: true },
  { key: 'expires_at', label: 'Expires', type: 'date', showInTable: true },
  { key: 'last_used_at', label: 'Last Used', type: 'date', showInTable: true, editable: false },
];

// developer_apps: id, business_id, app_name, description, client_id, client_secret_hash, redirect_uris, scopes, is_active, created_at, updated_at
const appColumns: ColumnDef[] = [
  { key: 'app_name', label: 'App Name', type: 'text', required: true, showInTable: true },
  { key: 'description', label: 'Description', type: 'textarea', showInTable: true },
  { key: 'client_id', label: 'Client ID', type: 'text', showInTable: true, editable: false },
  { key: 'scopes', label: 'Scopes (one per line)', type: 'array', showInTable: false },
  { key: 'redirect_uris', label: 'Redirect URIs (one per line)', type: 'array', showInTable: false },
  { key: 'is_active', label: 'Active', type: 'boolean', showInTable: true },
];

// webhooks: id, business_id, name, url, events, secret, is_active, created_at, updated_at
const webhookColumns: ColumnDef[] = [
  { key: 'name', label: 'Webhook Name', type: 'text', required: true, showInTable: true },
  { key: 'url', label: 'URL', type: 'text', required: true, showInTable: true },
  { key: 'events', label: 'Events (one per line)', type: 'array', showInTable: true },
  { key: 'is_active', label: 'Active', type: 'boolean', showInTable: true },
];

interface Props { businessId: string; }
export function ApiKeysModule({ businessId }: Props) { return <DataManager table="api_keys" businessId={businessId} columns={apiKeyColumns} defaultValues={{ is_active: true, scopes: [], rate_limit_per_hour: 1000 }} />; }
export function DeveloperAppsModule({ businessId }: Props) { return <DataManager table="developer_apps" businessId={businessId} columns={appColumns} defaultValues={{ is_active: true, scopes: [], redirect_uris: [] }} />; }
export function WebhooksModule({ businessId }: Props) { return <DataManager table="webhooks" businessId={businessId} columns={webhookColumns} defaultValues={{ is_active: true, events: [] }} />; }
