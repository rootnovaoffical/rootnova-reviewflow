import DataManager, { ColumnDef } from "../components/DataManager";

const cols: ColumnDef[] = [
  { key: "goal_type", label: "Goal Type", type: "select", options: ["reviews", "rating", "revenue", "customers", "retention", "engagement"], editable: true, required: true, defaultValue: "reviews" },
  { key: "target_value", label: "Target", type: "number", editable: true, required: true, defaultValue: 100 },
  { key: "current_value", label: "Current", type: "number", editable: true, defaultValue: 0 },
  { key: "period", label: "Period", type: "select", options: ["daily", "weekly", "monthly", "quarterly", "yearly"], editable: true, defaultValue: "monthly" },
  { key: "status", label: "Status", type: "select", options: ["active", "completed", "paused", "failed"], editable: true, defaultValue: "active" },
  { key: "created_at", label: "Created" },
  { key: "updated_at", label: "Updated", hideInTable: true },
];

export default function GoalsModule({ businessId }: { businessId: string }) {
  return <DataManager table="business_goals" businessId={businessId} columns={cols} title="Business Goals" subtitle="Track and manage business goals" defaultValues={{ goal_type: "reviews", target_value: 100, current_value: 0, period: "monthly", status: "active" }} />;
}
