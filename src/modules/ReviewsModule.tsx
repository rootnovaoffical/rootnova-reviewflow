import DataManager, { ColumnDef } from "../components/DataManager";

const cols: ColumnDef[] = [
  { key: "rating", label: "Rating", type: "number", editable: true, required: true },
  { key: "ai_generated_review", label: "AI Review", type: "textarea", editable: true },
  { key: "ai_status", label: "AI Status", type: "select", options: ["pending", "completed", "failed"], editable: true, defaultValue: "pending" },
  { key: "business_response", label: "Response", type: "textarea", editable: true },
  { key: "created_at", label: "Created", hideInTable: false },
  { key: "completed_at", label: "Completed", hideInTable: true },
  { key: "google_place_id_snapshot", label: "Place ID", hideInTable: true, editable: true },
  { key: "answers", label: "Answers", type: "json", hideInTable: true, editable: true },
];

export default function ReviewsModule({ businessId }: { businessId: string }) {
  return <DataManager table="review_sessions" businessId={businessId} columns={cols} title="Reviews" subtitle="All customer review sessions" defaultValues={{ ai_status: "pending", answers: [] }} />;
}
