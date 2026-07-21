import DataManager from '../components/DataManager';

const columns = [
  { key: 'task_type', label: 'Type', type: 'select' as const, options: ['review_generation', 'sentiment_analysis', 'summary', 'recommendation', 'simulation'], required: true, showInTable: true },
  { key: 'title', label: 'Title', type: 'text' as const, showInTable: true },
  { key: 'status', label: 'Status', type: 'select' as const, options: ['pending', 'processing', 'completed', 'failed', 'dismissed'], showInTable: true },
  { key: 'priority', label: 'Priority', type: 'select' as const, options: ['low', 'medium', 'high', 'critical'], showInTable: true },
  { key: 'description', label: 'Description', type: 'textarea' as const, showInTable: false },
  { key: 'result', label: 'Result', type: 'json' as const, showInTable: false },
];

export default function AiTasksModule({ businessId }: { businessId: string }) {
  return <DataManager table="ai_tasks" businessId={businessId} columns={columns} defaultValues={{ status: 'pending', task_type: 'review_generation', priority: 'medium' }} />;
}
