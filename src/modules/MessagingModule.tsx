import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge, Button, Input, TextArea, Select, Modal } from '../components/UI';
import { Mail, MessageSquare, CalendarClock, Plus, Pencil, Trash2, Inbox, FileText, Send } from 'lucide-react';

/* ============================================================
 * MessagesModule
 * ============================================================ */

interface Message {
  id: string;
  business_id: string;
  channel: string;
  recipient_identifier: string;
  recipient_name: string | null;
  subject: string | null;
  body: string | null;
  status: string | null;
  priority: string | null;
  created_at: string;
}

const emptyMessageForm = {
  channel: 'email',
  recipient_identifier: '',
  recipient_name: '',
  subject: '',
  body: '',
  priority: 'normal',
};

export function MessagesModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...emptyMessageForm });

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('error', 'Failed to load messages');
    } else {
      setMessages(data || []);
    }
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const openCreate = () => {
    setForm({ ...emptyMessageForm });
    setModalOpen(true);
  };

  const handleCreate = async () => {
    if (!form.recipient_identifier.trim()) {
      showToast('error', 'Recipient identifier is required');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('messages').insert({
      business_id: businessId,
      channel: form.channel,
      recipient_identifier: form.recipient_identifier,
      recipient_name: form.recipient_name || null,
      subject: form.subject || null,
      body: form.body || null,
      priority: form.priority,
      status: 'pending',
    });
    setSaving(false);
    if (error) {
      showToast('error', 'Failed to create message');
      return;
    }
    showToast('success', 'Message created');
    setModalOpen(false);
    fetchMessages();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this message?')) return;
    const { error } = await supabase.from('messages').delete().eq('id', id);
    if (error) {
      showToast('error', 'Failed to delete message');
      return;
    }
    showToast('success', 'Message deleted');
    fetchMessages();
  };

  const channelColor = (c: string) => {
    if (c === 'email') return 'blue';
    if (c === 'sms') return 'green';
    if (c === 'whatsapp') return 'purple';
    return 'gray';
  };

  const statusColor = (s: string | null) => {
    if (s === 'sent') return 'green';
    if (s === 'failed') return 'red';
    if (s === 'pending') return 'yellow';
    return 'gray';
  };

  const priorityColor = (p: string | null) => {
    if (p === 'high') return 'red';
    if (p === 'normal') return 'blue';
    if (p === 'low') return 'gray';
    return 'gray';
  };

  if (loading) return <LoadingSpinner label="Loading messages…" />;

  return (
    <div>
      <PageHeader
        title="Messages"
        description="Outbound messages sent to customers"
        action={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" /> New Message
          </Button>
        }
      />

      {messages.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No messages yet"
          description="Create a new message to reach out to your customers."
          action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Message</Button>}
        />
      ) : (
        <div className="space-y-3">
          {messages.map((m) => (
            <Card key={m.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge color={channelColor(m.channel)}>{m.channel}</Badge>
                    {m.status && <Badge color={statusColor(m.status)}>{m.status}</Badge>}
                    {m.priority && <Badge color={priorityColor(m.priority)}>{m.priority}</Badge>}
                    <span className="text-xs text-zinc-500">
                      {new Date(m.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-white truncate">
                    {m.subject || '(no subject)'}
                  </p>
                  <p className="text-sm text-zinc-400 mt-1 truncate">
                    {m.body || ''}
                  </p>
                  <p className="text-xs text-zinc-500 mt-2">
                    To: {m.recipient_identifier}
                    {m.recipient_name ? ` (${m.recipient_name})` : ''}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(m.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Message">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Channel</label>
            <Select value={form.channel} onChange={(v) => setForm({ ...form, channel: v })}>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
            </Select>
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Recipient Identifier *</label>
            <Input value={form.recipient_identifier} onChange={(v) => setForm({ ...form, recipient_identifier: v })} placeholder="email or phone" />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Recipient Name</label>
            <Input value={form.recipient_name} onChange={(v) => setForm({ ...form, recipient_name: v })} placeholder="Optional name" />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Subject</label>
            <Input value={form.subject} onChange={(v) => setForm({ ...form, subject: v })} placeholder="Subject" />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Body</label>
            <TextArea value={form.body} onChange={(v) => setForm({ ...form, body: v })} placeholder="Message body" rows={5} />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Priority</label>
            <Select value={form.priority} onChange={(v) => setForm({ ...form, priority: v })}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? 'Sending…' : 'Create Message'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ============================================================
 * MessageTemplatesModule
 * ============================================================ */

interface MessageTemplate {
  id: string;
  business_id: string;
  name: string;
  category: string | null;
  channel: string | null;
  subject: string | null;
  body: string | null;
  is_active: boolean | null;
  created_at: string;
}

const emptyTemplateForm = {
  name: '',
  category: '',
  channel: 'email',
  subject: '',
  body: '',
  is_active: true,
};

export function MessageTemplatesModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MessageTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...emptyTemplateForm });

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('message_templates')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('error', 'Failed to load templates');
    } else {
      setTemplates(data || []);
    }
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyTemplateForm });
    setModalOpen(true);
  };

  const openEdit = (t: MessageTemplate) => {
    setEditing(t);
    setForm({
      name: t.name || '',
      category: t.category || '',
      channel: t.channel || 'email',
      subject: t.subject || '',
      body: t.body || '',
      is_active: t.is_active ?? true,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('error', 'Name is required');
      return;
    }
    setSaving(true);
    const payload = {
      business_id: businessId,
      name: form.name,
      category: form.category || null,
      channel: form.channel,
      subject: form.subject || null,
      body: form.body || null,
      is_active: form.is_active,
    };
    let error;
    if (editing) {
      ({ error } = await supabase.from('message_templates').update(payload).eq('id', editing.id));
    } else {
      ({ error } = await supabase.from('message_templates').insert(payload));
    }
    setSaving(false);
    if (error) {
      showToast('error', 'Failed to save template');
      return;
    }
    showToast('success', editing ? 'Template updated' : 'Template created');
    setModalOpen(false);
    fetchTemplates();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    const { error } = await supabase.from('message_templates').delete().eq('id', id);
    if (error) {
      showToast('error', 'Failed to delete template');
      return;
    }
    showToast('success', 'Template deleted');
    fetchTemplates();
  };

  if (loading) return <LoadingSpinner label="Loading templates…" />;

  return (
    <div>
      <PageHeader
        title="Message Templates"
        description="Reusable message templates"
        action={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" /> New Template
          </Button>
        }
      />

      {templates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No templates yet"
          description="Create reusable templates for your messages."
          action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Template</Button>}
        />
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <Card key={t.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-sm font-semibold text-white">{t.name}</span>
                    {t.channel && <Badge color="blue">{t.channel}</Badge>}
                    {t.category && <Badge color="purple">{t.category}</Badge>}
                    <Badge color={t.is_active ? 'green' : 'gray'}>
                      {t.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  {t.subject && <p className="text-sm text-zinc-300 truncate">{t.subject}</p>}
                  {t.body && <p className="text-sm text-zinc-500 mt-1 truncate">{t.body}</p>}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(t)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(t.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Template' : 'New Template'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Name *</label>
            <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Template name" />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Category</label>
            <Input value={form.category} onChange={(v) => setForm({ ...form, category: v })} placeholder="e.g. review_request" />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Channel</label>
            <Select value={form.channel} onChange={(v) => setForm({ ...form, channel: v })}>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
            </Select>
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Subject</label>
            <Input value={form.subject} onChange={(v) => setForm({ ...form, subject: v })} placeholder="Subject" />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Body</label>
            <TextArea value={form.body} onChange={(v) => setForm({ ...form, body: v })} placeholder="Template body" rows={5} />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="tpl-active"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="w-4 h-4 rounded border-white/20 bg-white/5"
            />
            <label htmlFor="tpl-active" className="text-sm text-zinc-300">Active</label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ============================================================
 * ScheduledMessagesModule
 * ============================================================ */

interface ScheduledMessage {
  id: string;
  business_id: string;
  schedule_type: string | null;
  scheduled_for: string | null;
  timezone: string | null;
  is_processed: boolean | null;
  created_at: string;
}

const emptyScheduleForm = {
  schedule_type: 'one_time',
  scheduled_for: '',
  timezone: 'UTC',
};

export function ScheduledMessagesModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [schedules, setSchedules] = useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...emptyScheduleForm });

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('scheduled_messages')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('error', 'Failed to load scheduled messages');
    } else {
      setSchedules(data || []);
    }
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const openCreate = () => {
    setForm({ ...emptyScheduleForm });
    setModalOpen(true);
  };

  const handleCreate = async () => {
    if (!form.scheduled_for) {
      showToast('error', 'Scheduled time is required');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('scheduled_messages').insert({
      business_id: businessId,
      schedule_type: form.schedule_type,
      scheduled_for: new Date(form.scheduled_for).toISOString(),
      timezone: form.timezone,
      is_processed: false,
    });
    setSaving(false);
    if (error) {
      showToast('error', 'Failed to create scheduled message');
      return;
    }
    showToast('success', 'Scheduled message created');
    setModalOpen(false);
    fetchSchedules();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this scheduled message?')) return;
    const { error } = await supabase.from('scheduled_messages').delete().eq('id', id);
    if (error) {
      showToast('error', 'Failed to delete scheduled message');
      return;
    }
    showToast('success', 'Scheduled message deleted');
    fetchSchedules();
  };

  if (loading) return <LoadingSpinner label="Loading scheduled messages…" />;

  return (
    <div>
      <PageHeader
        title="Scheduled Messages"
        description="Messages scheduled for future delivery"
        action={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" /> New Schedule
          </Button>
        }
      />

      {schedules.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No scheduled messages"
          description="Schedule a message to be sent at a future time."
          action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Schedule</Button>}
        />
      ) : (
        <div className="space-y-3">
          {schedules.map((s) => (
            <Card key={s.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {s.schedule_type && <Badge color="blue">{s.schedule_type}</Badge>}
                    <Badge color={s.is_processed ? 'green' : 'yellow'}>
                      {s.is_processed ? 'Processed' : 'Pending'}
                    </Badge>
                    <span className="text-xs text-zinc-500">
                      {new Date(s.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-300">
                    Scheduled for: {s.scheduled_for ? new Date(s.scheduled_for).toLocaleString() : '—'}
                  </p>
                  {s.timezone && <p className="text-xs text-zinc-500 mt-1">Timezone: {s.timezone}</p>}
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Scheduled Message">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Schedule Type</label>
            <Select value={form.schedule_type} onChange={(v) => setForm({ ...form, schedule_type: v })}>
              <option value="one_time">One Time</option>
              <option value="recurring">Recurring</option>
              <option value="reminder">Reminder</option>
            </Select>
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Scheduled For *</label>
            <input
              type="datetime-local"
              value={form.scheduled_for}
              onChange={(e) => setForm({ ...form, scheduled_for: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-400/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Timezone</label>
            <Input value={form.timezone} onChange={(v) => setForm({ ...form, timezone: v })} placeholder="UTC" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? 'Scheduling…' : 'Schedule'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
