import DataManager from '../components/DataManager';

const columns = [
  { key: 'title', label: 'Goal Title', type: 'text' as const, required: true, showInTable: true },
  { key: 'goal_type', label: 'Type', type: 'text' as const, showInTable: true },
  { key: 'target_value', label: 'Target', type: 'number' as const, required: true, showInTable: true },
  { key: 'current_value', label: 'Current', type: 'number' as const, showInTable: true },
  { key: 'unit', label: 'Unit', type: 'text' as const, showInTable: true },
  { key: 'deadline', label: 'Deadline', type: 'date' as const, showInTable: true },
  { key: 'status', label: 'Status', type: 'select' as const, options: ['active', 'completed', 'overdue', 'cancelled'], showInTable: true },
];

export default function GoalsModule({ businessId }: { businessId: string }) {
  return <DataManager table="business_goals" businessId={businessId} columns={columns} defaultValues={{ status: 'active', current_value: 0, target_value: 100, unit: 'count' }} />;
}
