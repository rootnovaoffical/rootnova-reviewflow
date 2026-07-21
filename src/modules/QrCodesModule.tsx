import DataManager, { ColumnDef } from "../components/DataManager";

const cols: ColumnDef[] = [
  { key: "name", label: "Name", type: "text", editable: true, required: true },
  { key: "qr_type", label: "Type", type: "select", options: ["review", "menu", "custom", "wifi"], editable: true, defaultValue: "review" },
  { key: "destination_url", label: "URL", type: "text", editable: true },
  { key: "status", label: "Status", type: "select", options: ["active", "paused", "expired"], editable: true, defaultValue: "active" },
  { key: "scan_count", label: "Scans", type: "number", editable: false },
  { key: "metadata", label: "Metadata", type: "json", hideInTable: true, editable: true },
  { key: "created_at", label: "Created" },
];

export default function QrCodesModule({ businessId }: { businessId: string }) {
  return <DataManager table="qr_codes" businessId={businessId} columns={cols} title="QR Codes" subtitle="Create and track QR codes for reviews" defaultValues={{ qr_type: "review", status: "active", scan_count: 0, metadata: {} }} />;
}
