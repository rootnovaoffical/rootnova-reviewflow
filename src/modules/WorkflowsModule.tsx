import DataManager, { ColumnDef } from "../components/DataManager";

const cols: ColumnDef[] = [
  { key: "name", label: "Workflow Name", type: "text", editable: true, required: true },
  { key: "status", label: "Status", type: "select", options: ["draft", "active", "paused", "archived"], editable: true, defaultValue: "draft" },
  { key: "trigger_type", label: "Trigger", type: "select", options: ["manual", "schedule", "event", "webhook"], editable: true, defaultValue: "manual" },
  { key: "nodes", label: "Nodes", type: "json", hideInTable: true, editable: true },
  { key: "edges", label: "Edges", type: "json", hideInTable: true, editable: true },
  { key: "variables", label: "Variables", type: "json", hideInTable: true, editable: true },
  { key: "created_at", label: "Created" },
  { key: "updated_at", label: "Updated", hideInTable: true },
];

export default function WorkflowsModule({ businessId }: { businessId: string }) {
  return <DataManager table="workflows" businessId={businessId} columns={cols} title="Workflows" subtitle="Build and manage automation workflows" defaultValues={{ status: "draft", trigger_type: "manual", nodes: [], edges: [], variables: [] }} />;
}
