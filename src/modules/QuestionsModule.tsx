import DataManager from '../components/DataManager';
import type { ColumnDef } from '../components/DataManager';

const columns: ColumnDef[] = [
  { key: 'question_text', label: 'Question', type: 'textarea', required: true, showInTable: true },
  { key: 'flow_type', label: 'Flow Type', type: 'select', options: ['all', 'positive', 'negative', 'neutral'], required: true, showInTable: true },
  { key: 'question_type', label: 'Type', type: 'select', options: ['text', 'multiple_choice', 'rating'], required: true, showInTable: true },
  { key: 'options', label: 'Options (one per line)', type: 'array', showInTable: false },
  { key: 'sort_order', label: 'Sort Order', type: 'number', showInTable: true },
  { key: 'is_active', label: 'Active', type: 'boolean', showInTable: true },
];

interface Props { businessId: string; }

export default function QuestionsModule({ businessId }: Props) {
  return <DataManager table="questions" businessId={businessId} columns={columns} defaultValues={{ is_active: true, sort_order: 0, flow_type: 'all', question_type: 'text' }} />;
}
