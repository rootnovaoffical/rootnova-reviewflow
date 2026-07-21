import DataManager from '../components/DataManager';
import type { ColumnDef } from '../components/DataManager';

// ai_tasks: id, business_id, task_type, title, description, reasoning, evidence, confidence, priority, status, expected_impact, affected_customers, affected_workflows, related_entity_id, related_entity_type, scheduled_for, accepted_at, completed_at, dismissed_at, result, created_at, updated_at
const columns: ColumnDef[] = [
  { key: 'title', label: 'Title', type: 'text', required: true, showInTable: true },
  { key: 'task_type', label: 'Type', type: 'select', options: ['review_request', 'follow_up', 'optimization', 'alert', 'campaign'], required: true, showInTable: true },
  { key: 'priority', label: 'Priority', type: 'select', options: ['low', 'medium', 'high', 'critical'], required: true, showInTable: true },
  { key: 'status', label: 'Status', type: 'select', options: ['pending', 'accepted', 'completed', 'dismissed'], required: true, showInTable: true },
  { key: 'confidence', label: 'Confidence', type: 'number', showInTable: true },
  { key: 'description', label: 'Description', type: 'textarea', showInTable: false },
  { key: 'reasoning', label: 'Reasoning', type: 'textarea', showInTable: false },
  { key: 'expected_impact', label: 'Expected Impact', type: 'text', showInTable: false },
];
interface Props { businessId: string; }
export default function AiTasksModule({ businessId }: Props) { return <DataManager table="ai_tasks" businessId={businessId} columns={columns} defaultValues={{ task_type: 'review_request', priority: 'medium', status: 'pending', confidence: 0.5, affected_customers: 0, affected_workflows: [], evidence: {} }} />; }
