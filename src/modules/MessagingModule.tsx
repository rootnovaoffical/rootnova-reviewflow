import DataManager from '../components/DataManager';

const messageColumns = [
  { key: 'channel', label: 'Channel', type: 'select' as const, options: ['sms', 'email', 'whatsapp', 'push'], showInTable: true },
  { key: 'recipient_name', label: 'Recipient', type: 'text' as const, showInTable: true },
  { key: 'subject', label: 'Subject', type: 'text' as const, showInTable: true },
  { key: 'body', label: 'Body', type: 'textarea' as const, showInTable: true },
  { key: 'status', label: 'Status', type: 'select' as const, options: ['pending', 'sent', 'delivered', 'failed', 'read'], showInTable: true },
  { key: 'recipient_identifier', label: 'Recipient ID', type: 'text' as const, showInTable: false },
];

const templateColumns = [
  { key: 'name', label: 'Name', type: 'text' as const, required: true, showInTable: true },
  { key: 'channel', label: 'Channel', type: 'select' as const, options: ['sms', 'email', 'whatsapp', 'push'], showInTable: true },
  { key: 'subject', label: 'Subject', type: 'text' as const, showInTable: true },
  { key: 'body', label: 'Body', type: 'textarea' as const, required: true, showInTable: true },
  { key: 'category', label: 'Category', type: 'text' as const, showInTable: true },
  { key: 'is_active', label: 'Active', type: 'boolean' as const, showInTable: true },
];

const scheduledColumns = [
  { key: 'schedule_type', label: 'Type', type: 'select' as const, options: ['one_time', 'recurring'], showInTable: true },
  { key: 'scheduled_for', label: 'Scheduled For', type: 'date' as const, showInTable: true },
  { key: 'timezone', label: 'Timezone', type: 'text' as const, showInTable: true },
  { key: 'is_processed', label: 'Processed', type: 'boolean' as const, showInTable: true },
];

export function MessagesModule({ businessId }: { businessId: string }) {
  return <DataManager table="messages" businessId={businessId} columns={messageColumns} defaultValues={{ channel: 'sms', status: 'pending' }} />;
}

export function MessageTemplatesModule({ businessId }: { businessId: string }) {
  return <DataManager table="message_templates" businessId={businessId} columns={templateColumns} defaultValues={{ channel: 'sms', is_active: true }} />;
}

export function ScheduledMessagesModule({ businessId }: { businessId: string }) {
  return <DataManager table="scheduled_messages" businessId={businessId} columns={scheduledColumns} defaultValues={{ schedule_type: 'one_time', is_processed: false }} />;
}
