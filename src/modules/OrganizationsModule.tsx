import DataManager from '../components/DataManager';
import type { ColumnDef } from '../components/DataManager';

const orgColumns: ColumnDef[] = [
  { key: 'name', label: 'Name', type: 'text', required: true, showInTable: true },
  { key: 'slug', label: 'Slug', type: 'text', required: true, showInTable: true },
  { key: 'type', label: 'Type', type: 'select', options: ['agency', 'franchise', 'chain', 'enterprise'], showInTable: true },
  { key: 'contact_email', label: 'Contact Email', type: 'text', showInTable: true },
  { key: 'contact_phone', label: 'Contact Phone', type: 'text', showInTable: true },
  { key: 'status', label: 'Status', type: 'select', options: ['active', 'suspended', 'trial'], showInTable: true },
];
const memberColumns: ColumnDef[] = [
  { key: 'role', label: 'Role', type: 'select', options: ['owner', 'admin', 'manager', 'staff'], required: true, showInTable: true },
  { key: 'created_at', label: 'Joined', type: 'date', showInTable: true, editable: false },
];
const branchColumns: ColumnDef[] = [
  { key: 'branch_name', label: 'Branch Name', type: 'text', required: true, showInTable: true },
  { key: 'branch_code', label: 'Code', type: 'text', showInTable: true },
  { key: 'is_active', label: 'Active', type: 'boolean', showInTable: true },
];
const regionColumns: ColumnDef[] = [
  { key: 'name', label: 'Region Name', type: 'text', required: true, showInTable: true },
  { key: 'description', label: 'Description', type: 'textarea', showInTable: true },
];
const policyColumns: ColumnDef[] = [
  { key: 'policy_key', label: 'Policy Key', type: 'text', required: true, showInTable: true },
  { key: 'policy_value', label: 'Policy Value', type: 'text', showInTable: true },
  { key: 'description', label: 'Description', type: 'textarea', showInTable: false },
  { key: 'is_enforced', label: 'Enforced', type: 'boolean', showInTable: true },
];
interface Props { organizationId: string; }
export function OrganizationsModule({ organizationId }: Props) { return <DataManager table="organizations" organizationId={organizationId} columns={orgColumns} defaultValues={{ status: 'active' }} />; }
export function OrganizationMembersModule({ organizationId }: Props) { return <DataManager table="organization_members" organizationId={organizationId} columns={memberColumns} defaultValues={{ role: 'staff' }} />; }
export function EnterpriseBranchesModule({ organizationId }: Props) { return <DataManager table="enterprise_branches" organizationId={organizationId} columns={branchColumns} defaultValues={{ is_active: true }} />; }
export function EnterpriseRegionsModule({ organizationId }: Props) { return <DataManager table="enterprise_regions" organizationId={organizationId} columns={regionColumns} />; }
export function OrganizationPoliciesModule({ organizationId }: Props) { return <DataManager table="organization_policies" organizationId={organizationId} columns={policyColumns} defaultValues={{ is_enforced: false }} />; }
