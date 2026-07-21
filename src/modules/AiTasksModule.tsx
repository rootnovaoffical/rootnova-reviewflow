import DataManager, { ColumnDef } from "../components/DataManager";

const cols: ColumnDef[] = [
  { key: "title", label: "Title", type: "text", editable: true, required: true },
  { key: "description", label: "Description", type: "textarea", editable: true },
  { key: "reasoning", label: "Reasoning", type: "textarea", editable: true },
  { key: "confidence", label: "Confidence", type: "number", editable: true, defaultValue: 0.8 },
  { key: "priority", label: "Priority", type: "select", options: ["low", "medium", "high", "critical"], editable: true, defaultValue: "medium" },
  { key: "status", label: "Status", type: "select", options: ["pending", "accepted", "in_progress", "completed", "dismissed"], editable: true, defaultValue: "pending" },
  { key: "expected_impact", label: "Expected Impact", type: "text", editable: true },
  { key: "task_type", label: "Task Type", type: "select", options: ["improvement", "alert", "opportunity", "follow_up", "optimization"], editable: true, defaultValue: "improvement" },
  { key: "evidence", label: "Evidence", type: "json", hideInTable: true, editable: true },
  { key: "created_at", label: "Created" },
];

export default function AiTasksModule({ businessId }: { businessId: string }) {
  return <DataManager table="ai_tasks" businessId={businessId} columns={cols} title="AI Tasks" subtitle="AI-generated tasks and recommendations" defaultValues={{ task_type: "improvement", priority: "medium", status: "pending", confidence: 0.8, evidence: {} }} />;
}
