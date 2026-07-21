import DataManager from '../components/DataManager';
import type { ColumnDef } from '../components/DataManager';

const columns: ColumnDef[] = [
  { key: 'rating', label: 'Rating', type: 'number', showInTable: true },
  { key: 'ai_generated_review', label: 'AI Review', type: 'textarea', showInTable: true },
  { key: 'ai_status', label: 'AI Status', type: 'text', showInTable: true, editable: false },
  { key: 'answers', label: 'Answers', type: 'json', showInTable: false },
  { key: 'created_at', label: 'Created', type: 'date', showInTable: true, editable: false },
];
interface Props { businessId: string; }
export default function ReviewsModule({ businessId }: Props) { return <DataManager table="review_sessions" businessId={businessId} columns={columns} pageSize={20} />; }
