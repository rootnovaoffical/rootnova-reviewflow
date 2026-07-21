import DataManager from '../components/DataManager';
import type { ColumnDef } from '../components/DataManager';

const columns: ColumnDef[] = [
  { key: 'title', label: 'Goal Title', type: 'text', required: true, showInTable: true },
  { key: 'goal_type', label: 'Type', type: 'select', options: ['rating', 'reviews', 'customers', 'revenue', 'engagement'], required: true, showInTable: true },
  { key: 'target_value', label: 'Target', type: 'number', required: true, showInTable: true },
  { key: 'current_value', label: 'Current', type: 'number', required: true, showInTable: true },
  { key: 'unit', label: 'Unit', type: 'text', required: true, showInTable: true },
  { key: 'status', label: 'Status', type: 'select', options: ['active', 'achieved', 'missed', 'paused'], required: true, showInTable: true },
  { key: 'deadline', label: 'Deadline', type: 'date', showInTable: true },
  { key: 'description', label: 'Description', type: 'textarea', showInTable: false },
  { key: 'ai_strategy', label: 'AI Strategy', type: 'textarea', showInTable: false },
];
interface Props { businessId: string; }
export default function GoalsModule({ businessId }: Props) { return <DataManager table="business_goals" businessId={businessId} columns={columns} defaultValues={{ goal_type: 'rating', status: 'active', current_value: 0, unit: 'stars' }} />; }
