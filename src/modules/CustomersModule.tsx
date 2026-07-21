import DataManager, { ColumnDef } from "../components/DataManager";

const customerCols: ColumnDef[] = [
  { key: "name", label: "Name", type: "text", editable: true, required: true },
  { key: "email", label: "Email", type: "text", editable: true },
  { key: "phone", label: "Phone", type: "text", editable: true },
  { key: "status", label: "Status", type: "select", options: ["active", "inactive", "blocked"], editable: true, defaultValue: "active" },
  { key: "created_at", label: "Created" },
  { key: "updated_at", label: "Updated", hideInTable: true },
];

const loyaltyCols: ColumnDef[] = [
  { key: "name", label: "Program Name", type: "text", editable: true, required: true },
  { key: "description", label: "Description", type: "textarea", editable: true },
  { key: "points_per_visit", label: "Points/Visit", type: "number", editable: true, defaultValue: 10 },
  { key: "reward_threshold", label: "Reward Threshold", type: "number", editable: true, defaultValue: 100 },
  { key: "is_active", label: "Active", type: "boolean", editable: true, defaultValue: true },
  { key: "created_at", label: "Created" },
];

export function CustomersModule({ businessId }: { businessId: string }) {
  return <DataManager table="customers" businessId={businessId} columns={customerCols} title="Customers" subtitle="Customer database" defaultValues={{ status: "active" }} />;
}

export function LoyaltyModule({ businessId }: { businessId: string }) {
  return <DataManager table="loyalty_programs" businessId={businessId} columns={loyaltyCols} title="Loyalty Programs" subtitle="Customer loyalty and rewards programs" defaultValues={{ points_per_visit: 10, reward_threshold: 100, is_active: true }} />;
}
