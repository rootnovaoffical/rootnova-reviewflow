import DataManager from '../components/DataManager';

const columns = [
  { key: 'text', label: 'Question', type: 'text' as const, required: true, showInTable: true },
  { key: 'flow_type', label: 'Flow Type', type: 'select' as const, options: ['positive', 'neutral', 'negative', 'all'], required: true, showInTable: true },
  { key: 'options', label: 'Options', type: 'array' as const, showInTable: true },
  { key: 'condition_rating_min', label: 'Min Rating', type: 'number' as const, showInTable: false },
  { key: 'condition_rating_max', label: 'Max Rating', type: 'number' as const, showInTable: false },
  { key: 'order_index', label: 'Order', type: 'number' as const, showInTable: true },
];

export default function QuestionsModule({ businessId }: { businessId: string }) {
  return <DataManager table="questions" businessId={businessId} columns={columns} defaultValues={{ order_index: 0, flow_type: 'all' }} />;
}
