import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import {
  LoadingSpinner,
  EmptyState,
  PageHeader,
  Card,
  Badge,
  Button,
  Input,
  TextArea,
  Select,
  Modal,
} from '../components/UI';
import type { Message, MessageTemplate, ScheduledMessage } from '../lib/types';
import {
  Mail,
  MessageSquare,
  Plus,
  Pencil,
  Trash2,
  Send,
  Clock,
  FileText,
  Smartphone,
} from 'lucide-react';

/* ============================================================
 * MessagesModule
 * ============================================================ */

const messageStatusColor = (status: string): string => {
  switch ((status || '').toLowerCase()) {
    case 'sent':
    case 'delivered':
      return 'green';
    case 'read':
      return 'blue';
    case 'failed':
    case 'bounced':
      return 'red';
    case 'pending':
    case 'queued':
    case 'scheduled':
      return 'yellow';
    default:
      return 'gray';
  }
};

const channelIcon = (channel: string) => {
  switch ((channel || '').toLowerCase()) {
    case 'email':
      return Mail;
    case 'sms':
      return Smartphone;
    case 'whatsapp':
      return MessageSquare;
    default:
      return Send;
  }
};

function truncate(text: string | null, max: number): string {
  if (!text) return '';
  return text.length > max ? text.slice(0, max) + '…' : text;
}

export function MessagesModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  // form state
  const [fChannel, setFChannel] = useState('email');
  const [fRecipientId, setFRecipientId] = useState('');
  const [fRecipientName, setFRecipientName] = useState('');
  const [fSubject, setFSubject] = useState('');
  const [fBody, setFBody] = useState('');
  const [fPriority, setFPriority] = useState('0');

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('error', `Failed to load messages: ${error.message}`);
    } else {
      setItems(data as Message[]);
    }
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const resetForm = () => {
    setFChannel('email');
    setFRecipientId('');
    setFRecipientName('');
    setFSubject('');
    setFBody('');
    setFPriority('0');
  };

  const handleCreate = async () => {
    if (!fRecipientId.trim() || !fBody.trim()) {
      showToast('error', 'Recipient identifier and body are required');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('messages').insert({
      business_id: businessId,
      channel: fChannel,
      recipient_identifier: fRecipientId,
      recipient_name: fRecipientName || null,
      subject: fSubject || null,
      body: fBody,
      priority: fPriority ? Number(fPriority) : 0,
      status: 'pending',
    });
    setSaving(false);
    if (error) {
      showToast('error', `Failed to create message: ${error.message}`);
      return;
    }
    showToast('success', 'Message created');
    setShowCreate(false);
    resetForm();
    fetchItems();
  };

  if (loading) return <LoadingSpinner label="Loading messages…" />;

  return (
    <div>
      <PageHeader
        title="Messages"
        description="Outbound messages sent to customers"
        action={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" /> New Message
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No messages yet"
          description="Create a message to send to your customers."
        />
      ) : (
        <div className="grid gap-3">
          {items.map((m) => {
            const ChannelIcon = channelIcon(m.channel);
            return (
              <Card key={m.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                      <ChannelIcon className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold text-white truncate">
                          {m.recipient_name || m.recipient_identifier}
                        </span>
                        <Badge color="gray">{m.channel}</Badge>
                        <Badge color={messageStatusColor(m.status)}>{m.status}</Badge>
                        {m.priority != null && m.priority > 0 && (
                          <Badge color={m.priority >= 2 ? 'red' : 'yellow'}>
                            P{m.priority}
                          </Badge>
                        )}
                      </div>
                      {m.subject && (
                        <p className="text-sm text-zinc-300 truncate mb-0.5">{m.subject}</p>
                      )}
                      <p className="text-xs text-zinc-500 line-clamp-2">{truncate(m.body, 160)}</p>
                      <p className="text-xs text-zinc-600 mt-1">
                        To: {m.recipient_identifier} · {new Date(m.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Message">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Channel</label>
            <Select value={fChannel} onChange={setFChannel}>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Recipient Identifier *
            </label>
            <Input
              value={fRecipientId}
              onChange={setFRecipientId}
              placeholder="email or phone number"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Recipient Name</label>
            <Input value={fRecipientName} onChange={setFRecipientName} placeholder="Optional name" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Subject</label>
            <Input value={fSubject} onChange={setFSubject} placeholder="Message subject" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Body *</label>
            <TextArea
              value={fBody}
              onChange={setFBody}
              placeholder="Message body"
              rows={5}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Priority</label>
            <Select value={fPriority} onChange={setFPriority}>
              <option value="0">Normal (0)</option>
              <option value="1">High (1)</option>
              <option value="2">Urgent (2)</option>
              <option value="3">Critical (3)</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
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

const templateCategoryColor = (category: string): string => {
  switch ((category || '').toLowerCase()) {
    case 'review':
      return 'blue';
    case 'loyalty':
      return 'purple';
    case 'winback':
      return 'yellow';
    case 'follow-up':
    case 'followup':
      return 'green';
    case 'promo':
    case 'promotion':
      return 'red';
    default:
      return 'gray';
  }
};

export function MessageTemplatesModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<MessageTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  // form state
  const [fName, setFName] = useState('');
  const [fCategory, setFCategory] = useState('general');
  const [fChannel, setFChannel] = useState('email');
  const [fSubject, setFSubject] = useState('');
  const [fBody, setFBody] = useState('');
  const [fActive, setFActive] = useState(true);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('message_templates')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('error', `Failed to load templates: ${error.message}`);
    } else {
      setItems(data as MessageTemplate[]);
    }
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const openCreate = () => {
    setEditing(null);
    setFName('');
    setFCategory('general');
    setFChannel('email');
    setFSubject('');
    setFBody('');
    setFActive(true);
    setShowModal(true);
  };

  const openEdit = (t: MessageTemplate) => {
    setEditing(t);
    setFName(t.name);
    setFCategory(t.category || 'general');
    setFChannel(t.channel || 'email');
    setFSubject(t.subject || '');
    setFBody(t.body || '');
    setFActive(t.is_active);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!fName.trim() || !fBody.trim()) {
      showToast('error', 'Name and body are required');
      return;
    }
    setSaving(true);
    const payload = {
      business_id: businessId,
      name: fName,
      category: fCategory,
      channel: fChannel,
      subject: fSubject || null,
      body: fBody,
      is_active: fActive,
    };
    let error;
    if (editing) {
      ({ error } = await supabase.from('message_templates').update(payload).eq('id', editing.id));
    } else {
      ({ error } = await supabase.from('message_templates').insert(payload));
    }
    setSaving(false);
    if (error) {
      showToast('error', `Failed to save template: ${error.message}`);
      return;
    }
    showToast('success', editing ? 'Template updated' : 'Template created');
    setShowModal(false);
    fetchItems();
  };

  const handleDelete = async (t: MessageTemplate) => {
    if (!confirm(`Delete template "${t.name}"?`)) return;
    const { error } = await supabase.from('message_templates').delete().eq('id', t.id);
    if (error) {
      showToast('error', `Delete failed: ${error.message}`);
      return;
    }
    showToast('success', 'Template deleted');
    fetchItems();
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

      {items.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No templates yet"
          description="Create a reusable message template."
        />
      ) : (
        <div className="grid gap-3">
          {items.map((t) => (
            <Card key={t.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold text-white">{t.name}</span>
                    <Badge color={templateCategoryColor(t.category)}>{t.category}</Badge>
                    <Badge color="gray">{t.channel}</Badge>
                    <Badge color={t.is_active ? 'green' : 'gray'}>
                      {t.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  {t.subject && (
                    <p className="text-sm text-zinc-300 truncate mb-0.5">{t.subject}</p>
                  )}
                  <p className="text-xs text-zinc-500 line-clamp-2">{truncate(t.body, 160)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
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

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Template' : 'New Template'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Name *</label>
            <Input value={fName} onChange={setFName} placeholder="Template name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Category</label>
              <Input value={fCategory} onChange={setFCategory} placeholder="general" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Channel</label>
              <Select value={fChannel} onChange={setFChannel}>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
              </Select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Subject</label>
            <Input value={fSubject} onChange={setFSubject} placeholder="Subject line" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Body *</label>
            <TextArea value={fBody} onChange={setFBody} placeholder="Template body" rows={6} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={fActive}
              onChange={(e) => setFActive(e.target.checked)}
              className="w-4 h-4 rounded border-white/10 bg-white/5 text-blue-500 focus:ring-blue-500/50"
            />
            <span className="text-sm text-zinc-300">Active</span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Template'}
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

export function ScheduledMessagesModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  // form state
  const [fScheduleType, setFScheduleType] = useState('once');
  const [fScheduledFor, setFScheduledFor] = useState('');
  const [fTimezone, setFTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('scheduled_messages')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('error', `Failed to load scheduled messages: ${error.message}`);
    } else {
      setItems(data as ScheduledMessage[]);
    }
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const resetForm = () => {
    setFScheduleType('once');
    setFScheduledFor('');
    setFTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  };

  const handleCreate = async () => {
    if (!fScheduledFor) {
      showToast('error', 'Scheduled date/time is required');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('scheduled_messages').insert({
      business_id: businessId,
      schedule_type: fScheduleType,
      scheduled_for: new Date(fScheduledFor).toISOString(),
      timezone: fTimezone || null,
      is_processed: false,
    });
    setSaving(false);
    if (error) {
      showToast('error', `Failed to create scheduled message: ${error.message}`);
      return;
    }
    showToast('success', 'Scheduled message created');
    setShowCreate(false);
    resetForm();
    fetchItems();
  };

  const handleDelete = async (s: ScheduledMessage) => {
    if (!confirm('Delete this scheduled message?')) return;
    const { error } = await supabase.from('scheduled_messages').delete().eq('id', s.id);
    if (error) {
      showToast('error', `Delete failed: ${error.message}`);
      return;
    }
    showToast('success', 'Scheduled message deleted');
    fetchItems();
  };

  if (loading) return <LoadingSpinner label="Loading scheduled messages…" />;

  return (
    <div>
      <PageHeader
        title="Scheduled Messages"
        description="Messages scheduled for future delivery"
        action={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" /> New Schedule
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No scheduled messages"
          description="Schedule a message for future delivery."
        />
      ) : (
        <div className="grid gap-3">
          {items.map((s) => (
            <Card key={s.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge color="blue">{s.schedule_type}</Badge>
                      <Badge color={s.is_processed ? 'green' : 'yellow'}>
                        {s.is_processed ? 'Processed' : 'Pending'}
                      </Badge>
                    </div>
                    <p className="text-sm text-zinc-300">
                      {s.scheduled_for
                        ? new Date(s.scheduled_for).toLocaleString()
                        : 'Not scheduled'}
                    </p>
                    <p className="text-xs text-zinc-600 mt-0.5">
                      {s.timezone || 'No timezone'} · Created {new Date(s.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(s)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Scheduled Message">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Schedule Type</label>
            <Select value={fScheduleType} onChange={setFScheduleType}>
              <option value="once">Once</option>
              <option value="recurring">Recurring</option>
              <option value="relative">Relative</option>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Scheduled For *
            </label>
            <Input
              type="datetime-local"
              value={fScheduledFor}
              onChange={setFScheduledFor}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Timezone</label>
            <Input value={fTimezone} onChange={setFTimezone} placeholder="UTC" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? 'Creating…' : 'Create Schedule'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
