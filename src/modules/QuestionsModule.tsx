import DataManager from '../components/DataManager';

const columns = [
  { key: 'question_text', label: 'Question', type: 'text' as const, required: true, showInTable: true },
  { key: 'question_type', label: 'Type', type: 'select' as const, options: ['text', 'rating', 'choice', 'boolean'], showInTable: true },
  { key: 'flow_type', label: 'Flow Type', type: 'select' as const, options: ['positive', 'neutral', 'negative', 'all'], required: true, showInTable: true },
  { key: 'options', label: 'Options', type: 'json' as const, showInTable: false },
  { key: 'is_required', label: 'Required', type: 'boolean' as const, showInTable: true },
  { key: 'is_active', label: 'Active', type: 'boolean' as const, showInTable: true },
  { key: 'sort_order', label: 'Order', type: 'number' as const, showInTable: true },
];

export default function QuestionsModule({ businessId }: { businessId: string }) {
  return <DataManager table="questions" businessId={businessId} columns={columns} defaultValues={{ sort_order: 0, flow_type: 'all', question_type: 'text', is_required: false, is_active: true }} />;
}
