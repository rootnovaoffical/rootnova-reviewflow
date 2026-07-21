import DataManager from '../components/DataManager';

const recColumns = [
  { key: 'title', label: 'Title', type: 'text' as const, required: true, showInTable: true },
  { key: 'description', label: 'Description', type: 'textarea' as const, showInTable: true },
  { key: 'category', label: 'Category', type: 'text' as const, showInTable: true },
  { key: 'status', label: 'Status', type: 'select' as const, options: ['new', 'reviewed', 'applied', 'dismissed'], showInTable: true },
  { key: 'reasoning', label: 'Reasoning', type: 'textarea' as const, showInTable: false },
  { key: 'expected_outcome', label: 'Expected Outcome', type: 'text' as const, showInTable: false },
];

const actionColumns = [
  { key: 'title', label: 'Title', type: 'text' as const, required: true, showInTable: true },
  { key: 'explanation', label: 'Explanation', type: 'textarea' as const, showInTable: true },
  { key: 'priority_level', label: 'Priority', type: 'select' as const, options: ['low', 'medium', 'high', 'critical'], showInTable: true },
  { key: 'status', label: 'Status', type: 'select' as const, options: ['todo', 'in_progress', 'done', 'cancelled'], showInTable: true },
  { key: 'recommended_action', label: 'Recommended Action', type: 'textarea' as const, showInTable: false },
];

const briefingColumns = [
  { key: 'period', label: 'Period', type: 'text' as const, required: true, showInTable: true },
  { key: 'briefing_date', label: 'Date', type: 'date' as const, showInTable: true },
  { key: 'summary', label: 'Summary', type: 'textarea' as const, required: true, showInTable: true },
];

const simulationColumns = [
  { key: 'simulation_type', label: 'Type', type: 'text' as const, required: true, showInTable: true },
  { key: 'scenario', label: 'Scenario', type: 'textarea' as const, required: true, showInTable: true },
  { key: 'projected_outcome', label: 'Outcome', type: 'textarea' as const, showInTable: true },
  { key: 'confidence', label: 'Confidence', type: 'number' as const, showInTable: true },
];

export function AiRecommendationsModule({ businessId }: { businessId: string }) {
  return <DataManager table="ai_recommendations" businessId={businessId} columns={recColumns} defaultValues={{ status: 'new' }} />;
}

export function ActionItemsModule({ businessId }: { businessId: string }) {
  return <DataManager table="action_items" businessId={businessId} columns={actionColumns} defaultValues={{ status: 'todo', priority_level: 'medium' }} />;
}

export function AiBriefingsModule({ businessId }: { businessId: string }) {
  return <DataManager table="ai_briefings" businessId={businessId} columns={briefingColumns} defaultValues={{ period: 'weekly' }} />;
}

export function AiSimulationsModule({ businessId }: { businessId: string }) {
  return <DataManager table="ai_simulations" businessId={businessId} columns={simulationColumns} defaultValues={{ confidence: 0.5 }} />;
}
