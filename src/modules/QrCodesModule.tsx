import DataManager from '../components/DataManager';
import type { ColumnDef } from '../components/DataManager';

const columns: ColumnDef[] = [
  { key: 'name', label: 'Name', type: 'text', required: true, showInTable: true },
  { key: 'qr_type', label: 'Type', type: 'select', options: ['review', 'menu', 'wifi', 'custom'], required: true, showInTable: true },
  { key: 'target_url', label: 'Target URL', type: 'text', showInTable: true },
  { key: 'scan_count', label: 'Scans', type: 'number', showInTable: true, editable: false },
  { key: 'is_active', label: 'Active', type: 'boolean', showInTable: true },
  { key: 'created_at', label: 'Created', type: 'date', showInTable: true, editable: false },
];
interface Props { businessId: string; }
export default function QrCodesModule({ businessId }: Props) { return <DataManager table="qr_codes" businessId={businessId} columns={columns} defaultValues={{ is_active: true, qr_type: 'review', scan_count: 0 }} />; }
