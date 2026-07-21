import DataManager from '../components/DataManager';

const orgColumns = [
  { key: 'name', label: 'Name', type: 'text' as const, required: true, showInTable: true },
  { key: 'slug', label: 'Slug', type: 'text' as const, required: true, showInTable: true },
  { key: 'description', label: 'Description', type: 'textarea' as const, showInTable: true },
];

const memberColumns = [
  { key: 'user_id', label: 'User ID', type: 'text' as const, required: true, showInTable: true },
  { key: 'role', label: 'Role', type: 'select' as const, options: ['owner', 'admin', 'manager', 'viewer'], showInTable: true },
];

const branchColumns = [
  { key: 'business_id', label: 'Business ID', type: 'text' as const, required: true, showInTable: true },
  { key: 'name', label: 'Branch Name', type: 'text' as const, required: true, showInTable: true },
  { key: 'region', label: 'Region', type: 'text' as const, showInTable: true },
];

const regionColumns = [
  { key: 'name', label: 'Region Name', type: 'text' as const, required: true, showInTable: true },
];

const policyColumns = [
  { key: 'name', label: 'Policy Name', type: 'text' as const, required: true, showInTable: true },
  { key: 'description', label: 'Description', type: 'textarea' as const, showInTable: true },
];

export function OrganizationsModule({ organizationId }: { organizationId: string }) {
  return <DataManager table="organizations" organizationId={organizationId} columns={orgColumns} />;
}

export function OrganizationMembersModule({ organizationId }: { organizationId: string }) {
  return <DataManager table="organization_members" organizationId={organizationId} columns={memberColumns} defaultValues={{ role: 'viewer' }} />;
}

export function EnterpriseBranchesModule({ organizationId }: { organizationId: string }) {
  return <DataManager table="enterprise_branches" organizationId={organizationId} columns={branchColumns} />;
}

export function EnterpriseRegionsModule({ organizationId }: { organizationId: string }) {
  return <DataManager table="enterprise_regions" organizationId={organizationId} columns={regionColumns} />;
}

export function OrganizationPoliciesModule({ organizationId }: { organizationId: string }) {
  return <DataManager table="organization_policies" organizationId={organizationId} columns={policyColumns} />;
}
