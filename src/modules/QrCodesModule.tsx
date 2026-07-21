import DataManager from '../components/DataManager';

const columns = [
  { key: 'name', label: 'Name', type: 'text' as const, required: true, showInTable: true },
  { key: 'qr_type', label: 'Type', type: 'select' as const, options: ['review', 'landing', 'custom'], showInTable: true },
  { key: 'destination_url', label: 'URL', type: 'text' as const, required: true, showInTable: true },
  { key: 'status', label: 'Status', type: 'select' as const, options: ['active', 'paused', 'expired'], showInTable: true },
  { key: 'scan_count', label: 'Scans', type: 'number' as const, showInTable: true },
];

export default function QrCodesModule({ businessId }: { businessId: string }) {
  return <DataManager table="qr_codes" businessId={businessId} columns={columns} defaultValues={{ scan_count: 0, status: 'active', qr_type: 'review' }} />;
}
