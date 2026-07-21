import DataManager from '../components/DataManager';
import type { ColumnDef } from '../components/DataManager';

const columns: ColumnDef[] = [
  { key: 'name', label: 'Campaign Name', type: 'text', required: true, showInTable: true },
  { key: 'campaign_type', label: 'Type', type: 'select', options: ['review_request', 'loyalty', 'winback', 'promotion', 'announcement'], required: true, showInTable: true },
  { key: 'status', label: 'Status', type: 'select', options: ['draft', 'active', 'paused', 'completed'], required: true, showInTable: true },
  { key: 'audience_segment', label: 'Audience', type: 'select', options: ['all', 'new', 'regular', 'vip', 'at_risk'], showInTable: true },
  { key: 'reach_count', label: 'Reach', type: 'number', showInTable: true, editable: false },
  { key: 'response_count', label: 'Responses', type: 'number', showInTable: true, editable: false },
  { key: 'conversion_count', label: 'Conversions', type: 'number', showInTable: true, editable: false },
  { key: 'description', label: 'Description', type: 'textarea', showInTable: false },
  { key: 'schedule_start', label: 'Start Date', type: 'date', showInTable: false },
  { key: 'schedule_end', label: 'End Date', type: 'date', showInTable: false },
];

interface Props { businessId: string; }

export default function CampaignsModule({ businessId }: Props) {
  return <DataManager table="campaigns" businessId={businessId} columns={columns} defaultValues={{ campaign_type: 'review_request', status: 'draft', reach_count: 0, response_count: 0, conversion_count: 0, metadata: {} }} />;
}
