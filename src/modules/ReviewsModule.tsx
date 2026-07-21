import DataManager from '../components/DataManager';

const columns = [
  { key: 'rating', label: 'Rating', type: 'number' as const, showInTable: true },
  { key: 'ai_status', label: 'AI Status', type: 'select' as const, options: ['pending', 'processing', 'completed', 'failed'], showInTable: true },
  { key: 'ai_generated_review', label: 'AI Review', type: 'textarea' as const, showInTable: true },
  { key: 'answers', label: 'Answers', type: 'json' as const, showInTable: false },
  { key: 'business_response', label: 'Response', type: 'textarea' as const, showInTable: false },
];

export default function ReviewsModule({ businessId }: { businessId: string }) {
  return <DataManager table="review_sessions" businessId={businessId} columns={columns} defaultValues={{ ai_status: 'pending' }} />;
}
