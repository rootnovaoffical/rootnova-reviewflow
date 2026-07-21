import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge, Button, Input, TextArea, Select, Modal } from '../components/UI';
import { useToast } from '../context/ToastContext';
import { Mail, FileText, CalendarClock, Plus, Pencil, Trash2, MessageSquare, Clock, Send } from 'lucide-react';

/* ============================================================
 *  MessagesModule
 * ========================================================== */

interface Message {
  id: string;
  recipient_identifier: string;
  recipient_name: string | null;
  channel: string;
  subject: string | null;
  body: string;
  status: string;
  priority: number;
  created_at: string;
}

interface MessageForm {
  channel: string;
  recipient_identifier: string;
  recipient_name: string;
  subject: string;
  body: string;
  priority: string;
}

const emptyMessageForm: MessageForm = {
  channel: 'email',
  recipient_identifier: '',
  recipient_name: '',
  subject: '',
  body: '',
  priority: '5',
};

function statusColor(status: string): string {
  switch (status) {
    case 'sent':
    case 'delivered':
      return 'green';
    case 'failed':
      return 'red';
    case 'pending':
    case 'scheduled':
      return 'yellow';
    default:
      return 'gray';
  }
}

function channelColor(channel: string): string {
  switch (channel) {
    case 'email':
      return 'blue';
    case 'sms':
      return 'green';
    case 'whatsapp':
      return 'purple';
    default:
      return 'gray';
  }
}

export function MessagesModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<MessageForm>(emptyMessageForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  async function fetchMessages() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id, recipient_identifier, recipient_name, channel, subject, body, status, priority, created_at')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setMessages((data ?? []) as Message[]);
    } catch (e) {
      showToast('error', 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setForm(emptyMessageForm);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.recipient_identifier.trim() || !form.body.trim()) {
      showToast('error', 'Recipient identifier and body are required');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('messages').insert({
        business_id: businessId,
        channel: form.channel,
        recipient_identifier: form.recipient_identifier.trim(),
        recipient_name: form.recipient_name.trim() || null,
        subject: form.subject.trim() || null,
        body: form.body.trim(),
        priority: Number(form.priority) || 5,
      });
      if (error) throw error;
      showToast('success', 'Message created');
      setModalOpen(false);
      fetchMessages();
    } catch (e) {
      showToast('error', 'Failed to create message');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner label="Loading messages..." />;

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
        <EmptyState icon={Mail} title="No messages yet" description="Create a new message to reach out to your customers." />
      ) : (
        <div className="space-y-3">
          {messages.map((m) => (
            <Card key={m.id} className="p-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge color={channelColor(m.channel)}>{m.channel}</Badge>
                    <span className="text-sm font-semibold text-white">{m.recipient_identifier}</span>
                    {m.recipient_name && <span className="text-sm text-zinc-400">· {m.recipient_name}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge color={statusColor(m.status)}>{m.status}</Badge>
                    <Badge color="gray">P{m.priority}</Badge>
                    <span className="flex items-center gap-1 text-xs text-zinc-500 whitespace-nowrap">
                      <Clock className="w-3 h-3" />
                      {new Date(m.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {m.subject && <p className="text-sm font-medium text-zinc-200">{m.subject}</p>}
                <p className="text-sm text-zinc-400 line-clamp-2">{m.body}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Message">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Channel</label>
            <Select value={form.channel} onChange={(v) => setForm({ ...form, channel: v })}>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Recipient Identifier</label>
            <Input value={form.recipient_identifier} onChange={(v) => setForm({ ...form, recipient_identifier: v })} placeholder="email or phone" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Recipient Name</label>
            <Input value={form.recipient_name} onChange={(v) => setForm({ ...form, recipient_name: v })} placeholder="Optional" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Subject</label>
            <Input value={form.subject} onChange={(v) => setForm({ ...form, subject: v })} placeholder="Optional" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Body</label>
            <TextArea value={form.body} onChange={(v) => setForm({ ...form, body: v })} placeholder="Message body" rows={4} />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Priority</label>
            <Select value={form.priority} onChange={(v) => setForm({ ...form, priority: v })}>
              <option value="1">1 - Highest</option>
              <option value="3">3 - High</option>
              <option value="5">5 - Normal</option>
              <option value="7">7 - Low</option>
              <option value="9">9 - Lowest</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              <Send className="w-4 h-4" /> {saving ? 'Creating...' : 'Create Message'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ============================================================
 *  MessageTemplatesModule
 * ========================================================== */

interface MessageTemplate {
  id: string;
  name: string;
  category: string;
  channel: string;
  subject: string | null;
  body: string;
  is_active: boolean;
}

interface TemplateForm {
  name: string;
  category: string;
  channel: string;
  subject: string;
  body: string;
  is_active: boolean;
}

const emptyTemplateForm: TemplateForm = {
  name: '',
  category: 'general',
  channel: 'sms',
  subject: '',
  body: '',
  is_active: true,
};

export function MessageTemplatesModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MessageTemplate | null>(null);
  const [form, setForm] = useState<TemplateForm>(emptyTemplateForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  async function fetchTemplates() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('message_templates')
        .select('id, name, category, channel, subject, body, is_active')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTemplates((data ?? []) as MessageTemplate[]);
    } catch (e) {
      showToast('error', 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyTemplateForm);
    setModalOpen(true);
  }

  function openEdit(t: MessageTemplate) {
    setEditing(t);
    setForm({
      name: t.name,
      category: t.category,
      channel: t.channel,
      subject: t.subject ?? '',
      body: t.body,
      is_active: t.is_active,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.body.trim()) {
      showToast('error', 'Name and body are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        business_id: businessId,
        name: form.name.trim(),
        category: form.category.trim() || 'general',
        channel: form.channel,
        subject: form.subject.trim() || null,
        body: form.body.trim(),
        is_active: form.is_active,
      };
      if (editing) {
        const { error } = await supabase.from('message_templates').update(payload).eq('id', editing.id);
        if (error) throw error;
        showToast('success', 'Template updated');
      } else {
        const { error } = await supabase.from('message_templates').insert(payload);
        if (error) throw error;
        showToast('success', 'Template created');
      }
      setModalOpen(false);
      fetchTemplates();
    } catch (e) {
      showToast('error', 'Failed to save template');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(t: MessageTemplate) {
    if (!confirm(`Delete template "${t.name}"?`)) return;
    try {
      const { error } = await supabase.from('message_templates').delete().eq('id', t.id);
      if (error) throw error;
      showToast('success', 'Template deleted');
      fetchTemplates();
    } catch (e) {
      showToast('error', 'Failed to delete template');
    }
  }

  if (loading) return <LoadingSpinner label="Loading templates..." />;

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
        <EmptyState icon={FileText} title="No templates yet" description="Create reusable templates for your messages." />
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <Card key={t.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-semibold text-white">{t.name}</span>
                    <Badge color="gray">{t.category}</Badge>
                    <Badge color={channelColor(t.channel)}>{t.channel}</Badge>
                    <Badge color={t.is_active ? 'green' : 'gray'}>{t.is_active ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  {t.subject && <p className="text-sm font-medium text-zinc-200 mb-1">{t.subject}</p>}
                  <p className="text-sm text-zinc-400 line-clamp-2">{t.body}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(t)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(t)}>
                    <Trash2 className="w-3.5 h-3.5" />
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
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Name</label>
            <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Template name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Category</label>
              <Input value={form.category} onChange={(v) => setForm({ ...form, category: v })} placeholder="general" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Channel</label>
              <Select value={form.channel} onChange={(v) => setForm({ ...form, channel: v })}>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
              </Select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Subject</label>
            <Input value={form.subject} onChange={(v) => setForm({ ...form, subject: v })} placeholder="Optional" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Body</label>
            <TextArea value={form.body} onChange={(v) => setForm({ ...form, body: v })} placeholder="Template body" rows={4} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-400/50"
            />
            <span className="text-sm text-zinc-300">Active</span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ============================================================
 *  ScheduledMessagesModule
 * ========================================================== */

interface ScheduledMessage {
  id: string;
  schedule_type: string;
  scheduled_for: string;
  timezone: string;
  is_processed: boolean;
  created_at: string;
}

interface ScheduledForm {
  schedule_type: string;
  scheduled_for: string;
  timezone: string;
}

const emptyScheduledForm: ScheduledForm = {
  schedule_type: 'immediate',
  scheduled_for: '',
  timezone: 'UTC',
};

export function ScheduledMessagesModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ScheduledMessage[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ScheduledForm>(emptyScheduledForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  async function fetchItems() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('scheduled_messages')
        .select('id, schedule_type, scheduled_for, timezone, is_processed, created_at')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setItems((data ?? []) as ScheduledMessage[]);
    } catch (e) {
      showToast('error', 'Failed to load scheduled messages');
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setForm(emptyScheduledForm);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.scheduled_for) {
      showToast('error', 'Scheduled date/time is required');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('scheduled_messages').insert({
        business_id: businessId,
        schedule_type: form.schedule_type,
        scheduled_for: new Date(form.scheduled_for).toISOString(),
        timezone: form.timezone.trim() || 'UTC',
      });
      if (error) throw error;
      showToast('success', 'Scheduled message created');
      setModalOpen(false);
      fetchItems();
    } catch (e) {
      showToast('error', 'Failed to create scheduled message');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner label="Loading scheduled messages..." />;

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

      {items.length === 0 ? (
        <EmptyState icon={CalendarClock} title="No scheduled messages" description="Schedule messages to be sent at a future time." />
      ) : (
        <div className="space-y-3">
          {items.map((s) => (
            <Card key={s.id} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <CalendarClock className="w-5 h-5 text-blue-400" />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge color="blue">{s.schedule_type}</Badge>
                      <Badge color={s.is_processed ? 'green' : 'yellow'}>
                        {s.is_processed ? 'Processed' : 'Pending'}
                      </Badge>
                      <Badge color="gray">{s.timezone}</Badge>
                    </div>
                    <p className="text-sm text-zinc-300 mt-1">
                      {new Date(s.scheduled_for).toLocaleString()}
                    </p>
                  </div>
                </div>
                <span className="flex items-center gap-1 text-xs text-zinc-500 whitespace-nowrap">
                  <Clock className="w-3 h-3" />
                  {new Date(s.created_at).toLocaleDateString()}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Scheduled Message">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Schedule Type</label>
            <Select value={form.schedule_type} onChange={(v) => setForm({ ...form, schedule_type: v })}>
              <option value="immediate">Immediate</option>
              <option value="once">Once</option>
              <option value="recurring">Recurring</option>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Scheduled For</label>
            <Input
              type="datetime-local"
              value={form.scheduled_for}
              onChange={(v) => setForm({ ...form, scheduled_for: v })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Timezone</label>
            <Input value={form.timezone} onChange={(v) => setForm({ ...form, timezone: v })} placeholder="UTC" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              <CalendarClock className="w-4 h-4" /> {saving ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
