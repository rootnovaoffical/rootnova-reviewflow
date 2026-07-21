import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import {
  LoadingSpinner, EmptyState, PageHeader, Card, Badge, Button,
  Input, TextArea, Select, Modal,
} from '../components/UI';
import {
  Mail, FileText, Bell, Plus, Pencil, Trash2, MessageSquare,
  Calendar, Clock, Globe, CheckCircle2, XCircle,
} from 'lucide-react';

/* ============================================================
 * MessagesModule
 * ========================================================== */

interface Message {
  id: string;
  recipient_identifier: string | null;
  recipient_name: string | null;
  channel: string | null;
  subject: string | null;
  body: string | null;
  status: string | null;
  priority: number | null;
  created_at: string | null;
}

const channelColor = (c: string | null): string => {
  switch (c) {
    case 'email': return 'blue';
    case 'sms': return 'green';
    case 'whatsapp': return 'purple';
    default: return 'gray';
  }
};

const statusColor = (s: string | null): string => {
  switch (s) {
    case 'sent': case 'delivered': case 'read': return 'green';
    case 'pending': case 'queued': case 'scheduled': return 'yellow';
    case 'failed': case 'bounced': return 'red';
    default: return 'gray';
  }
};

export function MessagesModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    channel: 'email',
    recipient_identifier: '',
    recipient_name: '',
    subject: '',
    body: '',
    priority: '5',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('messages')
      .select('id, recipient_identifier, recipient_name, channel, subject, body, status, priority, created_at')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('error', 'Failed to load messages');
      setItems([]);
    } else {
      setItems((data ?? []) as Message[]);
    }
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => setForm({
    channel: 'email', recipient_identifier: '', recipient_name: '',
    subject: '', body: '', priority: '5',
  });

  const handleCreate = async () => {
    if (!form.recipient_identifier.trim()) {
      showToast('error', 'Recipient identifier is required');
      return;
    }
    setSaving(true);
    const payload = {
      business_id: businessId,
      channel: form.channel,
      recipient_identifier: form.recipient_identifier.trim(),
      recipient_name: form.recipient_name.trim() || null,
      subject: form.subject.trim() || null,
      body: form.body.trim() || null,
      priority: Number(form.priority) || 5,
      status: 'pending',
    };
    const { error } = await supabase.from('messages').insert(payload);
    setSaving(false);
    if (error) {
      showToast('error', `Failed to create message: ${error.message}`);
      return;
    }
    showToast('success', 'Message created');
    setModalOpen(false);
    resetForm();
    fetchData();
  };

  return (
    <div>
      <PageHeader
        title="Messages"
        description="Outbound messages sent to customers across channels."
        action={<Button onClick={() => { resetForm(); setModalOpen(true); }}><Plus className="w-4 h-4" /> New Message</Button>}
      />
      {loading ? (
        <LoadingSpinner label="Loading messages…" />
      ) : items.length === 0 ? (
        <EmptyState icon={Mail} title="No messages yet" description="Create your first message to reach out to customers." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((m) => (
            <Card key={m.id} className="p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge color={channelColor(m.channel)}>{m.channel ?? 'unknown'}</Badge>
                  <Badge color={statusColor(m.status)}>{m.status ?? 'unknown'}</Badge>
                </div>
                {m.priority != null && <span className="text-xs text-zinc-500">P{m.priority}</span>}
              </div>
              <div>
                <p className="text-sm font-semibold text-white truncate">{m.subject || '(no subject)'}</p>
                <p className="text-xs text-zinc-400 line-clamp-2 mt-0.5">{m.body || ''}</p>
              </div>
              <div className="text-xs text-zinc-500 flex items-center justify-between border-t border-white/5 pt-2 mt-auto">
                <span className="truncate">{m.recipient_name || m.recipient_identifier || '—'}</span>
                <span>{m.created_at ? new Date(m.created_at).toLocaleDateString() : ''}</span>
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
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Recipient Identifier *</label>
            <Input value={form.recipient_identifier} onChange={(v) => setForm({ ...form, recipient_identifier: v })} placeholder="email or phone" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Recipient Name</label>
            <Input value={form.recipient_name} onChange={(v) => setForm({ ...form, recipient_name: v })} placeholder="Jane Doe" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Subject</label>
            <Input value={form.subject} onChange={(v) => setForm({ ...form, subject: v })} placeholder="Subject line" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Body</label>
            <TextArea value={form.body} onChange={(v) => setForm({ ...form, body: v })} placeholder="Message body" rows={4} />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Priority</label>
            <Select value={form.priority} onChange={(v) => setForm({ ...form, priority: v })}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((p) => <option key={p} value={String(p)}>{p}</option>)}
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? 'Saving…' : 'Create Message'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ============================================================
 * MessageTemplatesModule
 * ========================================================== */

interface MessageTemplate {
  id: string;
  name: string | null;
  category: string | null;
  channel: string | null;
  subject: string | null;
  body: string | null;
  is_active: boolean | null;
}

const emptyTemplateForm = {
  name: '', category: '', channel: 'email', subject: '', body: '', is_active: 'true',
};

export function MessageTemplatesModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyTemplateForm);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('message_templates')
      .select('id, name, category, channel, subject, body, is_active')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('error', 'Failed to load templates');
      setItems([]);
    } else {
      setItems((data ?? []) as MessageTemplate[]);
    }
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => { setEditingId(null); setForm(emptyTemplateForm); setModalOpen(true); };
  const openEdit = (t: MessageTemplate) => {
    setEditingId(t.id);
    setForm({
      name: t.name ?? '',
      category: t.category ?? '',
      channel: t.channel ?? 'email',
      subject: t.subject ?? '',
      body: t.body ?? '',
      is_active: String(t.is_active ?? true),
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { showToast('error', 'Name is required'); return; }
    setSaving(true);
    const payload = {
      business_id: businessId,
      name: form.name.trim(),
      category: form.category.trim() || null,
      channel: form.channel,
      subject: form.subject.trim() || null,
      body: form.body.trim() || null,
      is_active: form.is_active === 'true',
    };
    const res = editingId
      ? await supabase.from('message_templates').update(payload).eq('id', editingId)
      : await supabase.from('message_templates').insert(payload);
    setSaving(false);
    if (res.error) { showToast('error', `Failed to save: ${res.error.message}`); return; }
    showToast('success', editingId ? 'Template updated' : 'Template created');
    setModalOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    const { error } = await supabase.from('message_templates').delete().eq('id', id);
    if (error) { showToast('error', `Failed to delete: ${error.message}`); return; }
    showToast('success', 'Template deleted');
    fetchData();
  };

  return (
    <div>
      <PageHeader
        title="Message Templates"
        description="Reusable message templates across channels."
        action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Template</Button>}
      />
      {loading ? (
        <LoadingSpinner label="Loading templates…" />
      ) : items.length === 0 ? (
        <EmptyState icon={FileText} title="No templates yet" description="Create a reusable template to speed up messaging." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((t) => (
            <Card key={t.id} className="p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{t.name}</p>
                  <p className="text-xs text-zinc-500">{t.category || 'uncategorized'}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge color={channelColor(t.channel)}>{t.channel ?? '—'}</Badge>
                  <Badge color={t.is_active ? 'green' : 'gray'}>{t.is_active ? 'active' : 'inactive'}</Badge>
                </div>
              </div>
              {t.subject && <p className="text-xs text-zinc-300 font-medium truncate">{t.subject}</p>}
              {t.body && <p className="text-xs text-zinc-400 line-clamp-3">{t.body}</p>}
              <div className="flex items-center gap-1.5 border-t border-white/5 pt-2 mt-auto">
                <Button size="sm" variant="ghost" onClick={() => openEdit(t)}><Pencil className="w-3.5 h-3.5" /> Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(t.id)}><Trash2 className="w-3.5 h-3.5" /> Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Template' : 'New Template'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Name *</label>
            <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Welcome email" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Category</label>
              <Input value={form.category} onChange={(v) => setForm({ ...form, category: v })} placeholder="onboarding" />
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
            <Input value={form.subject} onChange={(v) => setForm({ ...form, subject: v })} placeholder="Subject line" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Body</label>
            <TextArea value={form.body} onChange={(v) => setForm({ ...form, body: v })} placeholder="Message body" rows={5} />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Status</label>
            <Select value={form.is_active} onChange={(v) => setForm({ ...form, is_active: v })}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Template'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ============================================================
 * ScheduledMessagesModule
 * ========================================================== */

interface ScheduledMessage {
  id: string;
  schedule_type: string | null;
  scheduled_for: string | null;
  timezone: string | null;
  is_processed: boolean | null;
  created_at: string | null;
}

const emptyScheduleForm = {
  schedule_type: 'once',
  scheduled_for: '',
  timezone: 'UTC',
};

export function ScheduledMessagesModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyScheduleForm);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('scheduled_messages')
      .select('id, schedule_type, scheduled_for, timezone, is_processed, created_at')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('error', 'Failed to load scheduled messages');
      setItems([]);
    } else {
      setItems((data ?? []) as ScheduledMessage[]);
    }
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    if (!form.scheduled_for) { showToast('error', 'Scheduled time is required'); return; }
    setSaving(true);
    const payload = {
      business_id: businessId,
      schedule_type: form.schedule_type,
      scheduled_for: new Date(form.scheduled_for).toISOString(),
      timezone: form.timezone || 'UTC',
      is_processed: false,
    };
    const { error } = await supabase.from('scheduled_messages').insert(payload);
    setSaving(false);
    if (error) { showToast('error', `Failed to create: ${error.message}`); return; }
    showToast('success', 'Scheduled message created');
    setModalOpen(false);
    setForm(emptyScheduleForm);
    fetchData();
  };

  const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleString() : '—');

  return (
    <div>
      <PageHeader
        title="Scheduled Messages"
        description="Messages scheduled for future delivery."
        action={<Button onClick={() => { setForm(emptyScheduleForm); setModalOpen(true); }}><Plus className="w-4 h-4" /> New Schedule</Button>}
      />
      {loading ? (
        <LoadingSpinner label="Loading scheduled messages…" />
      ) : items.length === 0 ? (
        <EmptyState icon={Bell} title="No scheduled messages" description="Schedule a message to be sent at a future time." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((s) => (
            <Card key={s.id} className="p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Badge color="blue">{s.schedule_type ?? 'once'}</Badge>
                <Badge color={s.is_processed ? 'green' : 'yellow'}>
                  {s.is_processed ? (
                    <><CheckCircle2 className="w-3 h-3 mr-1" /> processed</>
                  ) : (
                    <><Clock className="w-3 h-3 mr-1" /> pending</>
                  )}
                </Badge>
              </div>
              <div className="space-y-1 text-xs">
                <p className="text-zinc-300 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-zinc-500" /> {fmtDate(s.scheduled_for)}</p>
                <p className="text-zinc-500 flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> {s.timezone || 'UTC'}</p>
              </div>
              <p className="text-xs text-zinc-600 border-t border-white/5 pt-2 mt-auto">Created {fmtDate(s.created_at)}</p>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Scheduled Message">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Schedule Type</label>
            <Select value={form.schedule_type} onChange={(v) => setForm({ ...form, schedule_type: v })}>
              <option value="once">Once</option>
              <option value="recurring">Recurring</option>
              <option value="recurring_daily">Recurring Daily</option>
              <option value="recurring_weekly">Recurring Weekly</option>
              <option value="recurring_monthly">Recurring Monthly</option>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Scheduled For *</label>
            <Input type="datetime-local" value={form.scheduled_for} onChange={(v) => setForm({ ...form, scheduled_for: v })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Timezone</label>
            <Input value={form.timezone} onChange={(v) => setForm({ ...form, timezone: v })} placeholder="UTC" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? 'Saving…' : 'Create Schedule'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
