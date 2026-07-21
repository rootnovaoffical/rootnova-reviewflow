import DataManager, { ColumnDef } from "../components/DataManager";

const cols: ColumnDef[] = [
  { key: "name", label: "Campaign Name", type: "text", editable: true, required: true },
  { key: "channel", label: "Channel", type: "select", options: ["sms", "email", "whatsapp", "social", "push"], editable: true, required: true, defaultValue: "sms" },
  { key: "status", label: "Status", type: "select", options: ["draft", "scheduled", "active", "completed", "paused"], editable: true, defaultValue: "draft" },
  { key: "start_date", label: "Start Date", type: "date", editable: true },
  { key: "end_date", label: "End Date", type: "date", editable: true },
  { key: "created_at", label: "Created" },
  { key: "updated_at", label: "Updated", hideInTable: true },
];

export default function CampaignsModule({ businessId }: { businessId: string }) {
  return <DataManager table="campaigns" businessId={businessId} columns={cols} title="Campaigns" subtitle="Marketing campaigns and outreach" defaultValues={{ channel: "sms", status: "draft" }} />;
}
