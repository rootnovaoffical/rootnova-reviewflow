import DataManager from '../components/DataManager';

const customerColumns = [
  { key: 'name', label: 'Name', type: 'text' as const, required: true, showInTable: true },
  { key: 'email', label: 'Email', type: 'text' as const, showInTable: true },
  { key: 'phone', label: 'Phone', type: 'text' as const, showInTable: true },
  { key: 'loyalty_points', label: 'Points', type: 'number' as const, showInTable: true },
];

const loyaltyColumns = [
  { key: 'name', label: 'Program Name', type: 'text' as const, required: true, showInTable: true },
  { key: 'points_per_review', label: 'Points/Review', type: 'number' as const, showInTable: true },
  { key: 'reward_threshold', label: 'Reward Threshold', type: 'number' as const, showInTable: true },
  { key: 'is_active', label: 'Active', type: 'boolean' as const, showInTable: true },
];

export function CustomersModule({ businessId }: { businessId: string }) {
  return <DataManager table="customers" businessId={businessId} columns={customerColumns} defaultValues={{ loyalty_points: 0 }} />;
}

export function LoyaltyModule({ businessId }: { businessId: string }) {
  return <DataManager table="loyalty_programs" businessId={businessId} columns={loyaltyColumns} defaultValues={{ is_active: true, points_per_review: 10, reward_threshold: 100 }} />;
}
