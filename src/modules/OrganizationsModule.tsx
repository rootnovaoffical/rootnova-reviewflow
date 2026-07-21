import DataManager from '../components/DataManager';

const orgColumns = [
  { key: 'name', label: 'Name', type: 'text' as const, required: true, showInTable: true },
  { key: 'slug', label: 'Slug', type: 'text' as const, required: true, showInTable: true },
  { key: 'type', label: 'Type', type: 'text' as const, showInTable: true },
  { key: 'contact_email', label: 'Contact Email', type: 'text' as const, showInTable: true },
  { key: 'contact_phone', label: 'Contact Phone', type: 'text' as const, showInTable: true },
  { key: 'status', label: 'Status', type: 'select' as const, options: ['active', 'suspended', 'trial'], showInTable: true },
];

const memberColumns = [
  { key: 'user_id', label: 'User ID', type: 'text' as const, required: true, showInTable: true },
  { key: 'role', label: 'Role', type: 'select' as const, options: ['owner', 'admin', 'manager', 'viewer'], showInTable: true },
  { key: 'status', label: 'Status', type: 'select' as const, options: ['active', 'invited', 'removed'], showInTable: true },
];

const branchColumns = [
  { key: 'business_id', label: 'Business ID', type: 'text' as const, required: true, showInTable: true },
  { key: 'name', label: 'Branch Name', type: 'text' as const, required: true, showInTable: true },
  { key: 'branch_code', label: 'Code', type: 'text' as const, showInTable: true },
  { key: 'branch_type', label: 'Type', type: 'text' as const, showInTable: true },
  { key: 'city', label: 'City', type: 'text' as const, showInTable: true },
  { key: 'status', label: 'Status', type: 'select' as const, options: ['active', 'inactive', 'maintenance'], showInTable: true },
];

const regionColumns = [
  { key: 'name', label: 'Region Name', type: 'text' as const, required: true, showInTable: true },
  { key: 'slug', label: 'Slug', type: 'text' as const, showInTable: true },
  { key: 'region_type', label: 'Type', type: 'text' as const, showInTable: true },
  { key: 'code', label: 'Code', type: 'text' as const, showInTable: true },
  { key: 'status', label: 'Status', type: 'select' as const, options: ['active', 'inactive'], showInTable: true },
];

const policyColumns = [
  { key: 'policy_key', label: 'Key', type: 'text' as const, required: true, showInTable: true },
  { key: 'name', label: 'Name', type: 'text' as const, required: true, showInTable: true },
  { key: 'policy_type', label: 'Type', type: 'text' as const, showInTable: true },
  { key: 'description', label: 'Description', type: 'textarea' as const, showInTable: true },
  { key: 'status', label: 'Status', type: 'select' as const, options: ['active', 'inactive', 'draft'], showInTable: true },
];

export function OrganizationsModule({ organizationId }: { organizationId: string }) {
  return <DataManager table="organizations" organizationId={organizationId} columns={orgColumns} defaultValues={{ status: 'active' }} />;
}

export function OrganizationMembersModule({ organizationId }: { organizationId: string }) {
  return <DataManager table="organization_members" organizationId={organizationId} columns={memberColumns} defaultValues={{ role: 'viewer', status: 'active' }} />;
}

export function EnterpriseBranchesModule({ organizationId }: { organizationId: string }) {
  return <DataManager table="enterprise_branches" organizationId={organizationId} columns={branchColumns} defaultValues={{ status: 'active' }} />;
}

export function EnterpriseRegionsModule({ organizationId }: { organizationId: string }) {
  return <DataManager table="enterprise_regions" organizationId={organizationId} columns={regionColumns} defaultValues={{ status: 'active' }} />;
}

export function OrganizationPoliciesModule({ organizationId }: { organizationId: string }) {
  return <DataManager table="organization_policies" organizationId={organizationId} columns={policyColumns} defaultValues={{ status: 'active' }} />;
}
