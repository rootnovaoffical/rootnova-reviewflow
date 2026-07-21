import DataManager, { ColumnDef } from "../components/DataManager";

const recCols: ColumnDef[] = [
  { key: "title", label: "Title", type: "text", editable: true, required: true },
  { key: "description", label: "Description", type: "textarea", editable: true },
  { key: "reasoning", label: "Reasoning", type: "textarea", editable: true },
  { key: "confidence", label: "Confidence", type: "number", editable: true, defaultValue: 0.8 },
  { key: "expected_outcome", label: "Expected Outcome", type: "text", editable: true },
  { key: "business_impact", label: "Business Impact", type: "text", editable: true },
  { key: "category", label: "Category", type: "select", options: ["growth", "retention", "operations", "marketing", "customer_experience"], editable: true, defaultValue: "growth" },
  { key: "status", label: "Status", type: "select", options: ["pending", "accepted", "rejected", "implemented"], editable: true, defaultValue: "pending" },
  { key: "evidence", label: "Evidence", type: "json", hideInTable: true, editable: true },
  { key: "created_at", label: "Created" },
];

const actionCols: ColumnDef[] = [
  { key: "title", label: "Title", type: "text", editable: true, required: true },
  { key: "explanation", label: "Explanation", type: "textarea", editable: true },
  { key: "why_it_matters", label: "Why It Matters", type: "textarea", editable: true },
  { key: "recommended_action", label: "Recommended Action", type: "textarea", editable: true },
  { key: "priority_level", label: "Priority", type: "select", options: ["low", "medium", "high", "critical"], editable: true, defaultValue: "medium" },
  { key: "confidence", label: "Confidence", type: "text", editable: true, defaultValue: "high" },
  { key: "status", label: "Status", type: "select", options: ["pending", "in_progress", "completed"], editable: true, defaultValue: "pending" },
  { key: "internal_notes", label: "Internal Notes", type: "textarea", hideInTable: true, editable: true },
  { key: "evidence", label: "Evidence", type: "json", hideInTable: true, editable: true },
  { key: "created_at", label: "Created" },
];

const briefingCols: ColumnDef[] = [
  { key: "period", label: "Period", type: "select", options: ["daily", "weekly", "monthly"], editable: true, required: true, defaultValue: "weekly" },
  { key: "briefing_date", label: "Date", type: "date", editable: true, required: true },
  { key: "summary", label: "Summary", type: "textarea", editable: true },
  { key: "wins", label: "Wins", type: "array", editable: true },
  { key: "risks", label: "Risks", type: "array", editable: true },
  { key: "recommendations", label: "Recommendations", type: "array", editable: true },
  { key: "progress", label: "Progress", type: "array", hideInTable: true, editable: true },
  { key: "upcoming_opportunities", label: "Opportunities", type: "array", hideInTable: true, editable: true },
  { key: "metrics_snapshot", label: "Metrics", type: "json", hideInTable: true, editable: true },
  { key: "created_at", label: "Created" },
];

const simCols: ColumnDef[] = [
  { key: "simulation_type", label: "Type", type: "select", options: ["growth", "churn", "revenue", "capacity", "market"], editable: true, required: true, defaultValue: "growth" },
  { key: "scenario", label: "Scenario", type: "textarea", editable: true, required: true },
  { key: "projected_outcome", label: "Projected Outcome", type: "textarea", editable: true },
  { key: "confidence", label: "Confidence", type: "number", editable: true, defaultValue: 0.7 },
  { key: "is_labelled_estimate", label: "Labelled Estimate", type: "boolean", editable: true, defaultValue: true },
  { key: "assumptions", label: "Assumptions", type: "array", hideInTable: true, editable: true },
  { key: "current_state", label: "Current State", type: "json", hideInTable: true, editable: true },
  { key: "projected_state", label: "Projected State", type: "json", hideInTable: true, editable: true },
  { key: "created_at", label: "Created" },
];

export function AiRecommendationsModule({ businessId }: { businessId: string }) {
  return <DataManager table="ai_recommendations" businessId={businessId} columns={recCols} title="AI Recommendations" subtitle="Strategic AI recommendations" defaultValues={{ category: "growth", status: "pending", confidence: 0.8, evidence: {} }} />;
}

export function ActionItemsModule({ businessId }: { businessId: string }) {
  return <DataManager table="action_items" businessId={businessId} columns={actionCols} title="Action Items" subtitle="Prioritized action items from AI analysis" defaultValues={{ priority_level: "medium", confidence: "high", status: "pending", evidence: {} }} />;
}

export function AiBriefingsModule({ businessId }: { businessId: string }) {
  return <DataManager table="ai_briefings" businessId={businessId} columns={briefingCols} title="AI Briefings" subtitle="Periodic AI-generated business briefings" defaultValues={{ period: "weekly", wins: [], risks: [], recommendations: [], progress: [], upcoming_opportunities: [], metrics_snapshot: {} }} />;
}

export function AiSimulationsModule({ businessId }: { businessId: string }) {
  return <DataManager table="ai_simulations" businessId={businessId} columns={simCols} title="AI Simulations" subtitle="Predictive simulations and projections" defaultValues={{ simulation_type: "growth", confidence: 0.7, is_labelled_estimate: true, assumptions: [], current_state: {}, projected_state: {} }} />;
}
