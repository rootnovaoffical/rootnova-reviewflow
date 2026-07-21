import DataManager, { ColumnDef } from "../components/DataManager";

const templateCols: ColumnDef[] = [
  { key: "template_key", label: "Key", type: "text", editable: true, required: true },
  { key: "name", label: "Name", type: "text", editable: true, required: true },
  { key: "description", label: "Description", type: "textarea", editable: true },
  { key: "category", label: "Category", type: "text", editable: true, defaultValue: "general" },
  { key: "trigger_type", label: "Trigger", type: "select", options: ["manual", "schedule", "event", "webhook"], editable: true, defaultValue: "manual" },
  { key: "is_ai_generated", label: "AI Generated", type: "boolean", editable: true, defaultValue: false },
  { key: "is_active", label: "Active", type: "boolean", editable: true, defaultValue: true },
  { key: "use_count", label: "Uses", type: "number", editable: false },
  { key: "nodes", label: "Nodes", type: "json", hideInTable: true, editable: true },
  { key: "edges", label: "Edges", type: "json", hideInTable: true, editable: true },
  { key: "variables", label: "Variables", type: "json", hideInTable: true, editable: true },
  { key: "trigger_config", label: "Trigger Config", type: "json", hideInTable: true, editable: true },
  { key: "created_at", label: "Created" },
];

export default function WorkflowTemplatesModule() {
  return <DataManager table="workflow_templates" columns={templateCols} title="Workflow Templates" subtitle="Pre-built workflow templates" defaultValues={{ category: "general", trigger_type: "manual", is_ai_generated: false, is_active: true, use_count: 0, nodes: [], edges: [], variables: [], trigger_config: {} }} />;
}
