import DataManager, { ColumnDef } from "../components/DataManager";

const messageCols: ColumnDef[] = [
  { key: "channel", label: "Channel", type: "select", options: ["sms", "email", "whatsapp", "push"], editable: true, required: true, defaultValue: "sms" },
  { key: "content", label: "Content", type: "textarea", editable: true, required: true },
  { key: "status", label: "Status", type: "select", options: ["pending", "queued", "sent", "delivered", "failed"], editable: true, defaultValue: "pending" },
  { key: "sent_at", label: "Sent At", hideInTable: false },
  { key: "delivered_at", label: "Delivered At", hideInTable: true },
  { key: "customer_id", label: "Customer ID", type: "text", hideInTable: true, editable: true },
  { key: "created_at", label: "Created" },
];

const templateCols: ColumnDef[] = [
  { key: "name", label: "Name", type: "text", editable: true, required: true },
  { key: "channel", label: "Channel", type: "select", options: ["sms", "email", "whatsapp", "push"], editable: true, required: true, defaultValue: "sms" },
  { key: "content", label: "Content", type: "textarea", editable: true, required: true },
  { key: "variables", label: "Variables", type: "array", editable: true },
  { key: "is_active", label: "Active", type: "boolean", editable: true, defaultValue: true },
  { key: "created_at", label: "Created" },
];

const scheduledCols: ColumnDef[] = [
  { key: "channel", label: "Channel", type: "select", options: ["sms", "email", "whatsapp", "push"], editable: true, required: true, defaultValue: "sms" },
  { key: "content", label: "Content", type: "textarea", editable: true, required: true },
  { key: "scheduled_for", label: "Scheduled For", type: "date", editable: true, required: true },
  { key: "status", label: "Status", type: "select", options: ["pending", "sent", "cancelled"], editable: true, defaultValue: "pending" },
  { key: "customer_id", label: "Customer ID", type: "text", hideInTable: true, editable: true },
  { key: "created_at", label: "Created", hideInTable: true },
];

export function MessagesModule({ businessId }: { businessId: string }) {
  return <DataManager table="messages" businessId={businessId} columns={messageCols} title="Messages" subtitle="All customer messages" defaultValues={{ channel: "sms", status: "pending" }} />;
}

export function MessageTemplatesModule({ businessId }: { businessId: string }) {
  return <DataManager table="message_templates" businessId={businessId} columns={templateCols} title="Message Templates" subtitle="Reusable message templates" defaultValues={{ channel: "sms", is_active: true, variables: [] }} />;
}

export function ScheduledMessagesModule({ businessId }: { businessId: string }) {
  return <DataManager table="scheduled_messages" businessId={businessId} columns={scheduledCols} title="Scheduled Messages" subtitle="Messages scheduled for future delivery" defaultValues={{ channel: "sms", status: "pending" }} />;
}
