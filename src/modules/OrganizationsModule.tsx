import DataManager, { ColumnDef } from "../components/DataManager";

const orgCols: ColumnDef[] = [
  { key: "name", label: "Name", type: "text", editable: true, required: true },
  { key: "slug", label: "Slug", type: "text", editable: true },
  { key: "status", label: "Status", type: "select", options: ["active", "suspended", "trial", "churned"], editable: true, defaultValue: "active" },
  { key: "plan_id", label: "Plan", type: "text", hideInTable: true, editable: true },
  { key: "created_at", label: "Created" },
  { key: "updated_at", label: "Updated", hideInTable: true },
];

const memberCols: ColumnDef[] = [
  { key: "role", label: "Role", type: "select", options: ["owner", "admin", "member", "viewer"], editable: true, required: true, defaultValue: "member" },
  { key: "status", label: "Status", type: "select", options: ["active", "invited", "removed"], editable: true, defaultValue: "active" },
  { key: "user_id", label: "User ID", type: "text", editable: true, required: true },
  { key: "created_at", label: "Created" },
];

const branchCols: ColumnDef[] = [
  { key: "name", label: "Branch Name", type: "text", editable: true, required: true },
  { key: "location", label: "Location", type: "text", editable: true },
  { key: "status", label: "Status", type: "select", options: ["active", "inactive"], editable: true, defaultValue: "active" },
  { key: "created_at", label: "Created" },
];

const regionCols: ColumnDef[] = [
  { key: "name", label: "Region Name", type: "text", editable: true, required: true },
  { key: "status", label: "Status", type: "select", options: ["active", "inactive"], editable: true, defaultValue: "active" },
  { key: "created_at", label: "Created" },
];

const policyCols: ColumnDef[] = [
  { key: "name", label: "Policy Name", type: "text", editable: true, required: true },
  { key: "status", label: "Status", type: "select", options: ["active", "draft", "archived"], editable: true, defaultValue: "active" },
  { key: "created_at", label: "Created" },
];

export function OrganizationsModule() {
  return <DataManager table="organizations" columns={orgCols} title="Organizations" subtitle="Manage all organizations on the platform" defaultValues={{ status: "active" }} />;
}

export function OrganizationMembersModule({ organizationId }: { organizationId: string }) {
  return <DataManager table="organization_members" organizationId={organizationId} columns={memberCols} title="Organization Members" subtitle="Team members and roles" defaultValues={{ role: "member", status: "active" }} />;
}

export function EnterpriseBranchesModule({ organizationId }: { organizationId: string }) {
  return <DataManager table="enterprise_branches" organizationId={organizationId} columns={branchCols} title="Enterprise Branches" subtitle="Branch locations" defaultValues={{ status: "active" }} />;
}

export function EnterpriseRegionsModule({ organizationId }: { organizationId: string }) {
  return <DataManager table="enterprise_regions" organizationId={organizationId} columns={regionCols} title="Enterprise Regions" subtitle="Regional groupings" defaultValues={{ status: "active" }} />;
}

export function OrganizationPoliciesModule({ organizationId }: { organizationId: string }) {
  return <DataManager table="organization_policies" organizationId={organizationId} columns={policyCols} title="Organization Policies" subtitle="Governance policies" defaultValues={{ status: "active" }} />;
}
