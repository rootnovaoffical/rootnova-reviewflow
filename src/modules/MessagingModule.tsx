import DataManager from '../components/DataManager';
import type { ColumnDef } from '../components/DataManager';

const messageColumns: ColumnDef[] = [
  { key: 'channel', label: 'Channel', type: 'select', options: ['sms', 'email', 'whatsapp', 'push'], required: true, showInTable: true },
  { key: 'direction', label: 'Direction', type: 'select', options: ['inbound', 'outbound'], required: true, showInTable: true, editable: false },
  { key: 'content', label: 'Content', type: 'textarea', required: true, showInTable: true },
  { key: 'status', label: 'Status', type: 'select', options: ['pending', 'sent', 'delivered', 'failed'], showInTable: true, editable: false },
  { key: 'created_at', label: 'Created', type: 'date', showInTable: true, editable: false },
];

const templateColumns: ColumnDef[] = [
  { key: 'name', label: 'Template Name', type: 'text', required: true, showInTable: true },
  { key: 'channel', label: 'Channel', type: 'select', options: ['sms', 'email', 'whatsapp', 'push'], required: true, showInTable: true },
  { key: 'content', label: 'Content', type: 'textarea', required: true, showInTable: true },
  { key: 'variables', label: 'Variables (one per line)', type: 'array', showInTable: false },
  { key: 'is_active', label: 'Active', type: 'boolean', showInTable: true },
];

const scheduledColumns: ColumnDef[] = [
  { key: 'channel', label: 'Channel', type: 'select', options: ['sms', 'email', 'whatsapp', 'push'], required: true, showInTable: true },
  { key: 'content', label: 'Content', type: 'textarea', required: true, showInTable: true },
  { key: 'scheduled_for', label: 'Scheduled For', type: 'date', required: true, showInTable: true },
  { key: 'status', label: 'Status', type: 'select', options: ['pending', 'sent', 'cancelled'], showInTable: true, editable: false },
  { key: 'created_at', label: 'Created', type: 'date', showInTable: true, editable: false },
];

interface Props { businessId: string; }

export function MessagesModule({ businessId }: Props) {
  return <DataManager table="messages" businessId={businessId} columns={messageColumns} defaultValues={{ channel: 'sms', direction: 'outbound', status: 'pending' }} />;
}

export function MessageTemplatesModule({ businessId }: Props) {
  return <DataManager table="message_templates" businessId={businessId} columns={templateColumns} defaultValues={{ is_active: true, variables: [] }} />;
}

export function ScheduledMessagesModule({ businessId }: Props) {
  return <DataManager table="scheduled_messages" businessId={businessId} columns={scheduledColumns} defaultValues={{ channel: 'sms', status: 'pending' }} />;
}
