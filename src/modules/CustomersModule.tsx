import DataManager from '../components/DataManager';
import type { ColumnDef } from '../components/DataManager';

const customerColumns: ColumnDef[] = [
  { key: 'display_name', label: 'Name', type: 'text', showInTable: true },
  { key: 'identifier', label: 'Identifier', type: 'text', showInTable: true },
  { key: 'segment', label: 'Segment', type: 'select', options: ['new', 'regular', 'vip', 'at_risk', 'churned'], showInTable: true },
  { key: 'total_visits', label: 'Visits', type: 'number', showInTable: true, editable: false },
  { key: 'total_reviews', label: 'Reviews', type: 'number', showInTable: true, editable: false },
  { key: 'avg_rating', label: 'Avg Rating', type: 'number', showInTable: true, editable: false },
  { key: 'last_visit_at', label: 'Last Visit', type: 'date', showInTable: true, editable: false },
  { key: 'first_seen_at', label: 'First Seen', type: 'date', showInTable: true, editable: false },
];
const loyaltyColumns: ColumnDef[] = [
  { key: 'name', label: 'Program Name', type: 'text', required: true, showInTable: true },
  { key: 'description', label: 'Description', type: 'textarea', showInTable: true },
  { key: 'points_per_review', label: 'Points/Review', type: 'number', required: true, showInTable: true },
  { key: 'reward_threshold', label: 'Reward Threshold', type: 'number', required: true, showInTable: true },
  { key: 'reward_description', label: 'Reward', type: 'text', showInTable: true },
  { key: 'is_active', label: 'Active', type: 'boolean', showInTable: true },
];
interface Props { businessId: string; }
export function CustomersModule({ businessId }: Props) { return <DataManager table="customers" businessId={businessId} columns={customerColumns} defaultValues={{ total_visits: 0, total_reviews: 0, segment: 'new' }} />; }
export function LoyaltyModule({ businessId }: Props) { return <DataManager table="loyalty_programs" businessId={businessId} columns={loyaltyColumns} defaultValues={{ is_active: true, points_per_review: 10, reward_threshold: 100 }} />; }
