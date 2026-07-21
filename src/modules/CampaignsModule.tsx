import DataManager from '../components/DataManager';

const columns = [
  { key: 'name', label: 'Campaign Name', type: 'text' as const, required: true, showInTable: true },
  { key: 'campaign_type', label: 'Type', type: 'select' as const, options: ['email', 'sms', 'social', 'web', 'print'], showInTable: true },
  { key: 'status', label: 'Status', type: 'select' as const, options: ['draft', 'active', 'paused', 'completed'], showInTable: true },
  { key: 'audience_segment', label: 'Audience', type: 'text' as const, showInTable: true },
  { key: 'schedule_start', label: 'Start Date', type: 'date' as const, showInTable: true },
  { key: 'schedule_end', label: 'End Date', type: 'date' as const, showInTable: true },
  { key: 'reach_count', label: 'Reach', type: 'number' as const, showInTable: true },
  { key: 'response_count', label: 'Responses', type: 'number' as const, showInTable: true },
];

export default function CampaignsModule({ businessId }: { businessId: string }) {
  return <DataManager table="campaigns" businessId={businessId} columns={columns} defaultValues={{ status: 'draft', campaign_type: 'email', reach_count: 0, response_count: 0 }} />;
}
