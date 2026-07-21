import DataManager from '../components/DataManager';

const columns = [
  { key: 'type', label: 'Type', type: 'select' as const, options: ['review_generation', 'sentiment_analysis', 'summary', 'recommendation', 'simulation'], required: true, showInTable: true },
  { key: 'status', label: 'Status', type: 'select' as const, options: ['pending', 'processing', 'completed', 'failed'], showInTable: true },
  { key: 'result', label: 'Result', type: 'json' as const, showInTable: false },
];

export default function AiTasksModule({ businessId }: { businessId: string }) {
  return <DataManager table="ai_tasks" businessId={businessId} columns={columns} defaultValues={{ status: 'pending', type: 'review_generation' }} />;
}
