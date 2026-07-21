import DataManager from '../components/DataManager';
import type { ColumnDef } from '../components/DataManager';

// organizations: id, name, slug, type, contact_email, contact_phone, status, metadata, created_at, updated_at, logo_url
const orgColumns: ColumnDef[] = [
  { key: 'name', label: 'Name', type: 'text', required: true, showInTable: true },
  { key: 'slug', label: 'Slug', type: 'text', required: true, showInTable: true },
  { key: 'type', label: 'Type', type: 'select', options: ['agency', 'franchise', 'chain', 'enterprise'], showInTable: true },
  { key: 'contact_email', label: 'Contact Email', type: 'text', showInTable: true },
  { key: 'contact_phone', label: 'Contact Phone', type: 'text', showInTable: true },
  { key: 'status', label: 'Status', type: 'select', options: ['active', 'suspended', 'trial'], showInTable: true },
  { key: 'logo_url', label: 'Logo URL', type: 'text', showInTable: false },
];

// organization_members: id, organization_id, user_id, role, status, created_at, updated_at
const memberColumns: ColumnDef[] = [
  { key: 'role', label: 'Role', type: 'select', options: ['owner', 'admin', 'manager', 'staff'], required: true, showInTable: true },
  { key: 'status', label: 'Status', type: 'select', options: ['active', 'invited', 'suspended'], showInTable: true },
  { key: 'created_at', label: 'Joined', type: 'date', showInTable: true, editable: false },
];

// enterprise_branches: id, organization_id, region_id, business_id, name, slug, branch_code, branch_type, address, city, state, country, timezone, currency, language, phone, email, operating_hours, status, health_score, metadata, created_at, updated_at
const branchColumns: ColumnDef[] = [
  { key: 'name', label: 'Branch Name', type: 'text', required: true, showInTable: true },
  { key: 'branch_code', label: 'Code', type: 'text', showInTable: true },
  { key: 'branch_type', label: 'Type', type: 'select', options: ['main', 'satellite', 'express', 'kiosk'], showInTable: true },
  { key: 'city', label: 'City', type: 'text', showInTable: true },
  { key: 'phone', label: 'Phone', type: 'text', showInTable: true },
  { key: 'status', label: 'Status', type: 'select', options: ['active', 'inactive', 'planned'], showInTable: true },
];

// enterprise_regions: id, organization_id, parent_id, name, slug, region_type, code, metadata, status, created_at, updated_at
const regionColumns: ColumnDef[] = [
  { key: 'name', label: 'Region Name', type: 'text', required: true, showInTable: true },
  { key: 'region_type', label: 'Type', type: 'select', options: ['country', 'state', 'city', 'zone'], showInTable: true },
  { key: 'code', label: 'Code', type: 'text', showInTable: true },
  { key: 'status', label: 'Status', type: 'select', options: ['active', 'inactive'], showInTable: true },
];

// organization_policies: id, organization_id, region_id, branch_id, policy_key, policy_type, name, description, rules, is_inherited, is_overridable, status, created_by, created_at, updated_at
const policyColumns: ColumnDef[] = [
  { key: 'name', label: 'Policy Name', type: 'text', required: true, showInTable: true },
  { key: 'policy_key', label: 'Policy Key', type: 'text', required: true, showInTable: true },
  { key: 'policy_type', label: 'Type', type: 'select', options: ['security', 'compliance', 'operational', 'branding'], showInTable: true },
  { key: 'description', label: 'Description', type: 'textarea', showInTable: true },
  { key: 'is_overridable', label: 'Overridable', type: 'boolean', showInTable: true },
  { key: 'status', label: 'Status', type: 'select', options: ['active', 'draft', 'archived'], showInTable: true },
];

interface Props { organizationId: string; }

// Organizations module - no organization_id filter since we're listing ALL organizations
export function OrganizationsModule({ organizationId: _organizationId }: Props) { return <DataManager table="organizations" columns={orgColumns} defaultValues={{ status: 'active', metadata: {} }} />; }
export function OrganizationMembersModule({ organizationId }: Props) { return <DataManager table="organization_members" organizationId={organizationId} columns={memberColumns} defaultValues={{ role: 'staff', status: 'active' }} />; }
export function EnterpriseBranchesModule({ organizationId }: Props) { return <DataManager table="enterprise_branches" organizationId={organizationId} columns={branchColumns} defaultValues={{ status: 'active', branch_type: 'main', health_score: 100, metadata: {}, operating_hours: {} }} />; }
export function EnterpriseRegionsModule({ organizationId }: Props) { return <DataManager table="enterprise_regions" organizationId={organizationId} columns={regionColumns} defaultValues={{ status: 'active', metadata: {} }} />; }
export function OrganizationPoliciesModule({ organizationId }: Props) { return <DataManager table="organization_policies" organizationId={organizationId} columns={policyColumns} defaultValues={{ status: 'active', is_inherited: false, is_overridable: true, rules: {} }} />; }
