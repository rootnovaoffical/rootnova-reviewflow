import DataManager from '../components/DataManager';
import type { ColumnDef } from '../components/DataManager';

// messages: id, business_id, customer_id, template_id, campaign_id, automation_rule_id, channel, provider_id, recipient_identifier, recipient_name, subject, body, status, priority, scheduled_for, sent_at, delivered_at, read_at, clicked_at, failed_at, retry_count, max_retries, next_retry_at, provider_message_id, provider_response, error_message, metadata, created_at, updated_at
const messageColumns: ColumnDef[] = [
  { key: 'channel', label: 'Channel', type: 'select', options: ['sms', 'email', 'whatsapp', 'push'], required: true, showInTable: true },
  { key: 'recipient_name', label: 'Recipient', type: 'text', showInTable: true },
  { key: 'subject', label: 'Subject', type: 'text', showInTable: true },
  { key: 'body', label: 'Body', type: 'textarea', required: true, showInTable: true },
  { key: 'status', label: 'Status', type: 'select', options: ['pending', 'sent', 'delivered', 'failed'], showInTable: true, editable: false },
  { key: 'created_at', label: 'Created', type: 'date', showInTable: true, editable: false },
];

// message_templates: id, business_id, name, category, channel, subject, body, variables, locale, version, ai_optimized, ai_optimization_score, is_active, created_at, updated_at
const templateColumns: ColumnDef[] = [
  { key: 'name', label: 'Template Name', type: 'text', required: true, showInTable: true },
  { key: 'category', label: 'Category', type: 'select', options: ['review_request', 'follow_up', 'thank_you', 'promotion', 'winback'], showInTable: true },
  { key: 'channel', label: 'Channel', type: 'select', options: ['sms', 'email', 'whatsapp', 'push'], required: true, showInTable: true },
  { key: 'subject', label: 'Subject', type: 'text', showInTable: false },
  { key: 'body', label: 'Body', type: 'textarea', required: true, showInTable: true },
  { key: 'is_active', label: 'Active', type: 'boolean', showInTable: true },
];

// scheduled_messages: id, business_id, message_id, schedule_type, scheduled_for, recurrence_rule, timezone, business_hours_only, quiet_hours_start, quiet_hours_end, expiry_at, is_processed, processed_at, created_at, updated_at
const scheduledColumns: ColumnDef[] = [
  { key: 'schedule_type', label: 'Type', type: 'select', options: ['once', 'recurring'], required: true, showInTable: true },
  { key: 'scheduled_for', label: 'Scheduled For', type: 'date', required: true, showInTable: true },
  { key: 'timezone', label: 'Timezone', type: 'text', showInTable: true },
  { key: 'is_processed', label: 'Processed', type: 'boolean', showInTable: true, editable: false },
  { key: 'created_at', label: 'Created', type: 'date', showInTable: true, editable: false },
];

interface Props { businessId: string; }
export function MessagesModule({ businessId }: Props) { return <DataManager table="messages" businessId={businessId} columns={messageColumns} defaultValues={{ channel: 'sms', status: 'pending', priority: 'normal', retry_count: 0, max_retries: 3 }} />; }
export function MessageTemplatesModule({ businessId }: Props) { return <DataManager table="message_templates" businessId={businessId} columns={templateColumns} defaultValues={{ is_active: true, channel: 'sms', locale: 'en', version: 1, ai_optimized: false, ai_optimization_score: 0, variables: [] }} />; }
export function ScheduledMessagesModule({ businessId }: Props) { return <DataManager table="scheduled_messages" businessId={businessId} columns={scheduledColumns} defaultValues={{ schedule_type: 'once', is_processed: false, business_hours_only: false }} />; }
