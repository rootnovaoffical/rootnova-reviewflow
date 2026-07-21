import DataManager from '../components/DataManager';

const customerColumns = [
  { key: 'display_name', label: 'Name', type: 'text' as const, required: true, showInTable: true },
  { key: 'identifier', label: 'Identifier', type: 'text' as const, showInTable: true },
  { key: 'total_visits', label: 'Visits', type: 'number' as const, showInTable: true },
  { key: 'total_reviews', label: 'Reviews', type: 'number' as const, showInTable: true },
  { key: 'avg_rating', label: 'Avg Rating', type: 'number' as const, showInTable: true },
  { key: 'segment', label: 'Segment', type: 'text' as const, showInTable: true },
];

const loyaltyColumns = [
  { key: 'name', label: 'Program Name', type: 'text' as const, required: true, showInTable: true },
  { key: 'program_type', label: 'Type', type: 'select' as const, options: ['points', 'visits', 'tiered'], showInTable: true },
  { key: 'points_per_action', label: 'Points/Action', type: 'number' as const, showInTable: true },
  { key: 'target_count', label: 'Target Count', type: 'number' as const, showInTable: true },
  { key: 'reward_description', label: 'Reward', type: 'textarea' as const, showInTable: true },
  { key: 'status', label: 'Status', type: 'select' as const, options: ['active', 'paused', 'ended'], showInTable: true },
];

export function CustomersModule({ businessId }: { businessId: string }) {
  return <DataManager table="customers" businessId={businessId} columns={customerColumns} defaultValues={{ total_visits: 0, total_reviews: 0 }} />;
}

export function LoyaltyModule({ businessId }: { businessId: string }) {
  return <DataManager table="loyalty_programs" businessId={businessId} columns={loyaltyColumns} defaultValues={{ status: 'active', program_type: 'points', points_per_action: 10, target_count: 100 }} />;
}
