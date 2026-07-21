import DataManager from '../components/DataManager';

const recColumns = [
  { key: 'title', label: 'Title', type: 'text' as const, required: true, showInTable: true },
  { key: 'description', label: 'Description', type: 'textarea' as const, showInTable: true },
  { key: 'priority', label: 'Priority', type: 'select' as const, options: ['low', 'medium', 'high', 'critical'], showInTable: true },
  { key: 'status', label: 'Status', type: 'select' as const, options: ['new', 'reviewed', 'applied', 'dismissed'], showInTable: true },
];

const actionColumns = [
  { key: 'title', label: 'Title', type: 'text' as const, required: true, showInTable: true },
  { key: 'description', label: 'Description', type: 'textarea' as const, showInTable: true },
  { key: 'status', label: 'Status', type: 'select' as const, options: ['todo', 'in_progress', 'done', 'cancelled'], showInTable: true },
  { key: 'due_date', label: 'Due Date', type: 'date' as const, showInTable: true },
];

const briefingColumns = [
  { key: 'title', label: 'Title', type: 'text' as const, required: true, showInTable: true },
  { key: 'content', label: 'Content', type: 'textarea' as const, required: true, showInTable: true },
];

const simulationColumns = [
  { key: 'scenario', label: 'Scenario', type: 'text' as const, required: true, showInTable: true },
  { key: 'outcome', label: 'Outcome', type: 'textarea' as const, showInTable: true },
];

export function AiRecommendationsModule({ businessId }: { businessId: string }) {
  return <DataManager table="ai_recommendations" businessId={businessId} columns={recColumns} defaultValues={{ priority: 'medium', status: 'new' }} />;
}

export function ActionItemsModule({ businessId }: { businessId: string }) {
  return <DataManager table="action_items" businessId={businessId} columns={actionColumns} defaultValues={{ status: 'todo' }} />;
}

export function AiBriefingsModule({ businessId }: { businessId: string }) {
  return <DataManager table="ai_briefings" businessId={businessId} columns={briefingColumns} />;
}

export function AiSimulationsModule({ businessId }: { businessId: string }) {
  return <DataManager table="ai_simulations" businessId={businessId} columns={simulationColumns} />;
}
