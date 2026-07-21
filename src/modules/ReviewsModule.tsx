import DataManager from '../components/DataManager';

const columns = [
  { key: 'customer_name', label: 'Customer', type: 'text' as const, showInTable: true },
  { key: 'rating', label: 'Rating', type: 'number' as const, showInTable: true },
  { key: 'status', label: 'Status', type: 'select' as const, options: ['pending', 'completed', 'posted'], showInTable: true },
  { key: 'ai_review_text', label: 'AI Review', type: 'textarea' as const, showInTable: true },
  { key: 'answers', label: 'Answers', type: 'json' as const, showInTable: false },
];

export default function ReviewsModule({ businessId }: { businessId: string }) {
  return <DataManager table="review_sessions" businessId={businessId} columns={columns} />;
}
