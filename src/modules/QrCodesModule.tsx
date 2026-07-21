import DataManager from '../components/DataManager';

const columns = [
  { key: 'name', label: 'Name', type: 'text' as const, required: true, showInTable: true },
  { key: 'url', label: 'URL', type: 'text' as const, required: true, showInTable: true },
  { key: 'scans', label: 'Scans', type: 'number' as const, showInTable: true },
];

export default function QrCodesModule({ businessId }: { businessId: string }) {
  return <DataManager table="qr_codes" businessId={businessId} columns={columns} defaultValues={{ scans: 0 }} />;
}
