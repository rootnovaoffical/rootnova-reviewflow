import DataManager, { ColumnDef } from "../components/DataManager";

const cols: ColumnDef[] = [
  { key: "name", label: "Rule Name", type: "text", editable: true, required: true },
  { key: "trigger_type", label: "Trigger", type: "select", options: ["low_rating", "high_rating", "new_review", "no_review", "qr_scan"], editable: true, defaultValue: "low_rating" },
  { key: "action_type", label: "Action", type: "select", options: ["send_sms", "send_email", "webhook", "create_task", "send_message"], editable: true, defaultValue: "send_sms" },
  { key: "delay_hours", label: "Delay (hrs)", type: "number", editable: true, defaultValue: 1 },
  { key: "status", label: "Status", type: "select", options: ["active", "paused", "draft"], editable: true, defaultValue: "active" },
  { key: "trigger_count", label: "Triggers", type: "number", editable: false },
  { key: "last_triggered_at", label: "Last Triggered", hideInTable: false },
  { key: "trigger_config", label: "Trigger Config", type: "json", hideInTable: true, editable: true },
  { key: "action_config", label: "Action Config", type: "json", hideInTable: true, editable: true },
  { key: "created_at", label: "Created", hideInTable: true },
];

export default function AutomationModule({ businessId }: { businessId: string }) {
  return <DataManager table="automation_rules" businessId={businessId} columns={cols} title="Automation Rules" subtitle="Automate responses to reviews and events" defaultValues={{ trigger_type: "low_rating", action_type: "send_sms", delay_hours: 1, status: "active", trigger_count: 0, trigger_config: {}, action_config: {} }} />;
}
