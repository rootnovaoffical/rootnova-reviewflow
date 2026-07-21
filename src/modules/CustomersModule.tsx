import DataManager from '../components/DataManager';
import type { ColumnDef } from '../components/DataManager';

// customers: id, business_id, identifier, display_name, total_visits, total_reviews, avg_rating, last_visit_at, first_seen_at, segment, segment_updated_at, metadata, created_at, updated_at
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

// loyalty_programs: id, business_id, name, program_type, target_count, reward_description, points_per_action, status, redeemed_count, created_at, updated_at
const loyaltyColumns: ColumnDef[] = [
  { key: 'name', label: 'Program Name', type: 'text', required: true, showInTable: true },
  { key: 'program_type', label: 'Type', type: 'select', options: ['visits', 'reviews', 'spending', 'referrals'], required: true, showInTable: true },
  { key: 'points_per_action', label: 'Points/Action', type: 'number', required: true, showInTable: true },
  { key: 'target_count', label: 'Target Count', type: 'number', required: true, showInTable: true },
  { key: 'reward_description', label: 'Reward', type: 'text', showInTable: true },
  { key: 'status', label: 'Status', type: 'select', options: ['active', 'paused', 'expired'], showInTable: true },
  { key: 'redeemed_count', label: 'Redeemed', type: 'number', showInTable: true, editable: false },
];

interface Props { businessId: string; }
export function CustomersModule({ businessId }: Props) { return <DataManager table="customers" businessId={businessId} columns={customerColumns} defaultValues={{ total_visits: 0, total_reviews: 0, segment: 'new', metadata: {} }} />; }
export function LoyaltyModule({ businessId }: Props) { return <DataManager table="loyalty_programs" businessId={businessId} columns={loyaltyColumns} defaultValues={{ status: 'active', program_type: 'visits', points_per_action: 10, target_count: 10, redeemed_count: 0 }} />; }
