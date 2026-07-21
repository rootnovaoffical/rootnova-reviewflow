import DataManager, { ColumnDef } from "../components/DataManager";

const cols: ColumnDef[] = [
  { key: "question_text", label: "Question", type: "text", editable: true, required: true },
  { key: "question_type", label: "Type", type: "select", options: ["multiple_choice", "text", "rating"], editable: true, defaultValue: "multiple_choice" },
  { key: "flow_type", label: "Flow Type", type: "select", options: ["ALWAYS", "POSITIVE", "NEGATIVE"], editable: true, defaultValue: "ALWAYS" },
  { key: "options", label: "Options", type: "array", editable: true, required: true },
  { key: "is_required", label: "Required", type: "boolean", editable: true, defaultValue: true },
  { key: "is_active", label: "Active", type: "boolean", editable: true, defaultValue: true },
  { key: "sort_order", label: "Sort Order", type: "number", editable: true, defaultValue: 0 },
  { key: "created_at", label: "Created" },
];

export default function QuestionsModule({ businessId }: { businessId: string }) {
  return <DataManager table="questions" businessId={businessId} columns={cols} title="Review Questions" subtitle="Configure questions for the review flow" defaultValues={{ question_type: "multiple_choice", flow_type: "ALWAYS", is_required: true, is_active: true, sort_order: 0, options: [] }} />;
}
