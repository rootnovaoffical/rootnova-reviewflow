import DataManager from '../components/DataManager';

const installedColumns = [
  { key: 'provider_id', label: 'Provider ID', type: 'text' as const, showInTable: true },
  { key: 'config', label: 'Config', type: 'json' as const, showInTable: false },
  { key: 'is_active', label: 'Active', type: 'boolean' as const, showInTable: true },
];

const providerColumns = [
  { key: 'name', label: 'Provider Name', type: 'text' as const, required: true, showInTable: true },
  { key: 'category', label: 'Category', type: 'select' as const, options: ['crm', 'marketing', 'analytics', 'payment', 'communication', 'other'], showInTable: true },
  { key: 'description', label: 'Description', type: 'textarea' as const, showInTable: true },
  { key: 'logo_url', label: 'Logo URL', type: 'text' as const, showInTable: false },
  { key: 'is_active', label: 'Active', type: 'boolean' as const, showInTable: true },
];

export function InstalledIntegrationsModule({ businessId }: { businessId: string }) {
  return <DataManager table="installed_integrations" businessId={businessId} columns={installedColumns} defaultValues={{ is_active: true }} />;
}

export function IntegrationProvidersModule({ businessId }: { businessId: string }) {
  return <DataManager table="integration_providers" businessId={businessId} columns={providerColumns} defaultValues={{ is_active: true, category: 'other' }} />;
}
