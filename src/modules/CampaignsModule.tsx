import DataManager from '../components/DataManager';

const columns = [
  { key: 'name', label: 'Campaign Name', type: 'text' as const, required: true, showInTable: true },
  { key: 'channel', label: 'Channel', type: 'select' as const, options: ['email', 'sms', 'social', 'web', 'print'], showInTable: true },
  { key: 'status', label: 'Status', type: 'select' as const, options: ['draft', 'active', 'paused', 'completed'], showInTable: true },
  { key: 'start_date', label: 'Start Date', type: 'date' as const, showInTable: true },
  { key: 'end_date', label: 'End Date', type: 'date' as const, showInTable: true },
];

export default function CampaignsModule({ businessId }: { businessId: string }) {
  return <DataManager table="campaigns" businessId={businessId} columns={columns} defaultValues={{ status: 'draft', channel: 'email' }} />;
}
