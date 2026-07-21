import DataManager from '../components/DataManager';
import type { ColumnDef } from '../components/DataManager';

// qr_codes: id, business_id, name, qr_type, destination_url, status, scan_count, metadata, created_at, updated_at
const columns: ColumnDef[] = [
  { key: 'name', label: 'Name', type: 'text', required: true, showInTable: true },
  { key: 'qr_type', label: 'Type', type: 'select', options: ['review', 'menu', 'wifi', 'custom'], required: true, showInTable: true },
  { key: 'destination_url', label: 'Target URL', type: 'text', showInTable: true },
  { key: 'status', label: 'Status', type: 'select', options: ['active', 'paused', 'expired'], showInTable: true },
  { key: 'scan_count', label: 'Scans', type: 'number', showInTable: true, editable: false },
  { key: 'created_at', label: 'Created', type: 'date', showInTable: true, editable: false },
];
interface Props { businessId: string; }
export default function QrCodesModule({ businessId }: Props) { return <DataManager table="qr_codes" businessId={businessId} columns={columns} defaultValues={{ qr_type: 'review', status: 'active', scan_count: 0, metadata: {} }} />; }
