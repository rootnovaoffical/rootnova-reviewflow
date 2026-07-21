import DataManager from '../components/DataManager';

const messageColumns = [
  { key: 'customer_id', label: 'Customer ID', type: 'text' as const, showInTable: true },
  { key: 'channel', label: 'Channel', type: 'select' as const, options: ['sms', 'email', 'whatsapp', 'push'], showInTable: true },
  { key: 'direction', label: 'Direction', type: 'select' as const, options: ['inbound', 'outbound'], showInTable: true },
  { key: 'body', label: 'Body', type: 'textarea' as const, showInTable: true },
  { key: 'status', label: 'Status', type: 'select' as const, options: ['sent', 'delivered', 'failed', 'pending'], showInTable: true },
];

const templateColumns = [
  { key: 'name', label: 'Name', type: 'text' as const, required: true, showInTable: true },
  { key: 'body', label: 'Body', type: 'textarea' as const, required: true, showInTable: true },
  { key: 'channel', label: 'Channel', type: 'select' as const, options: ['sms', 'email', 'whatsapp', 'push'], showInTable: true },
];

const scheduledColumns = [
  { key: 'customer_id', label: 'Customer ID', type: 'text' as const, showInTable: true },
  { key: 'channel', label: 'Channel', type: 'select' as const, options: ['sms', 'email', 'whatsapp', 'push'], showInTable: true },
  { key: 'body', label: 'Body', type: 'textarea' as const, showInTable: true },
  { key: 'scheduled_for', label: 'Scheduled For', type: 'date' as const, showInTable: true },
  { key: 'status', label: 'Status', type: 'select' as const, options: ['scheduled', 'sent', 'cancelled'], showInTable: true },
];

export function MessagesModule({ businessId }: { businessId: string }) {
  return <DataManager table="messages" businessId={businessId} columns={messageColumns} defaultValues={{ channel: 'sms', direction: 'outbound', status: 'sent' }} />;
}

export function MessageTemplatesModule({ businessId }: { businessId: string }) {
  return <DataManager table="message_templates" businessId={businessId} columns={templateColumns} defaultValues={{ channel: 'sms' }} />;
}

export function ScheduledMessagesModule({ businessId }: { businessId: string }) {
  return <DataManager table="scheduled_messages" businessId={businessId} columns={scheduledColumns} defaultValues={{ channel: 'sms', status: 'scheduled' }} />;
}
