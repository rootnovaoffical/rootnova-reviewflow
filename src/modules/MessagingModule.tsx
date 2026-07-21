import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { PageHeader, Card, Badge, Button, Input, TextArea, Select, Modal, LoadingSpinner, EmptyState } from '../components/UI';
import { useToast } from '../context/ToastContext';
import { Mail, MessageSquare, Plus, CalendarClock, FileText, Send } from 'lucide-react';

/* ----------------------------- MessagesModule ----------------------------- */
export function MessagesModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ channel: 'email', recipient_identifier: '', recipient_name: '', subject: '', body: '', priority: 'normal' });

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('messages').select('*').eq('business_id', businessId).order('created_at', { ascending: false });
    if (error) showToast('error', error.message);
    else setMessages(data || []);
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    if (!form.recipient_identifier || !form.body) { showToast('error', 'Recipient and body are required'); return; }
    const { error } = await supabase.from('messages').insert({ business_id: businessId, ...form });
    if (error) { showToast('error', error.message); return; }
    showToast('success', 'Message created');
    setShowCreate(false);
    setForm({ channel: 'email', recipient_identifier: '', recipient_name: '', subject: '', body: '', priority: 'normal' });
    load();
  }

  const channelColor: Record<string, string> = { email: 'blue', sms: 'green', whatsapp: 'purple' };
  const statusColor: Record<string, string> = { sent: 'green', pending: 'yellow', failed: 'red', draft: 'gray' };

  return (
    <div>
      <PageHeader title="Messages" description="Outbound messages across channels" action={<Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> New Message</Button>} />
      {loading ? <LoadingSpinner label="Loading messages..." /> : messages.length === 0 ? (
        <EmptyState icon={Mail} title="No messages" description="Create your first message to get started." action={<Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> New Message</Button>} />
      ) : (
        <div className="space-y-3">
          {messages.map((m) => (
            <Card key={m.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <Badge color={channelColor[m.channel] || 'gray'}>{m.channel}</Badge>
                    <Badge color={statusColor[m.status] || 'gray'}>{m.status}</Badge>
                    <Badge color={m.priority === 'high' ? 'red' : 'gray'}>{m.priority}</Badge>
                  </div>
                  <p className="text-sm font-semibold text-white">{m.subject || '(no subject)'}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">To: {m.recipient_name || m.recipient_identifier}</p>
                  <p className="text-sm text-zinc-400 mt-1 line-clamp-2">{m.body}</p>
                  <p className="text-xs text-zinc-600 mt-1.5">{new Date(m.created_at).toLocaleString()}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Message">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Channel</label>
            <Select value={form.channel} onChange={(v) => setForm({ ...form, channel: v })}>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
            </Select>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Recipient Identifier</label>
            <Input value={form.recipient_identifier} onChange={(v) => setForm({ ...form, recipient_identifier: v })} placeholder="email or phone" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Recipient Name</label>
            <Input value={form.recipient_name} onChange={(v) => setForm({ ...form, recipient_name: v })} placeholder="Jane Doe" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Subject</label>
            <Input value={form.subject} onChange={(v) => setForm({ ...form, subject: v })} placeholder="Subject" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Body</label>
            <TextArea value={form.body} onChange={(v) => setForm({ ...form, body: v })} placeholder="Message body" rows={4} />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Priority</label>
            <Select value={form.priority} onChange={(v) => setForm({ ...form, priority: v })}>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate}><Send className="w-4 h-4" /> Create</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ------------------------ MessageTemplatesModule ------------------------- */
export function MessageTemplatesModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ name: '', category: '', channel: 'email', subject: '', body: '', is_active: true });

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('message_templates').select('*').eq('business_id', businessId).order('created_at', { ascending: false });
    if (error) showToast('error', error.message);
    else setTemplates(data || []);
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => { load(); }, [load]);

  function openCreate() { setEditing(null); setForm({ name: '', category: '', channel: 'email', subject: '', body: '', is_active: true }); setShowModal(true); }
  function openEdit(t: any) { setEditing(t); setForm({ name: t.name || '', category: t.category || '', channel: t.channel || 'email', subject: t.subject || '', body: t.body || '', is_active: t.is_active ?? true }); setShowModal(true); }

  async function handleSave() {
    if (!form.name) { showToast('error', 'Name is required'); return; }
    if (editing) {
      const { error } = await supabase.from('message_templates').update(form).eq('id', editing.id);
      if (error) { showToast('error', error.message); return; }
      showToast('success', 'Template updated');
    } else {
      const { error } = await supabase.from('message_templates').insert({ business_id: businessId, ...form });
      if (error) { showToast('error', error.message); return; }
      showToast('success', 'Template created');
    }
    setShowModal(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this template?')) return;
    const { error } = await supabase.from('message_templates').delete().eq('id', id);
    if (error) { showToast('error', error.message); return; }
    showToast('success', 'Template deleted');
    load();
  }

  return (
    <div>
      <PageHeader title="Message Templates" description="Reusable message templates" action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Template</Button>} />
      {loading ? <LoadingSpinner label="Loading templates..." /> : templates.length === 0 ? (
        <EmptyState icon={FileText} title="No templates" description="Create a reusable message template." action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Template</Button>} />
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <Card key={t.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-semibold text-white">{t.name}</span>
                    <Badge color="blue">{t.channel}</Badge>
                    {t.category && <Badge color="gray">{t.category}</Badge>}
                    <Badge color={t.is_active ? 'green' : 'gray'}>{t.is_active ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  {t.subject && <p className="text-sm text-zinc-300">{t.subject}</p>}
                  <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{t.body}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(t)}>Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(t.id)}>Delete</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Template' : 'New Template'}>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Name</label>
            <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Template name" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Category</label>
            <Input value={form.category} onChange={(v) => setForm({ ...form, category: v })} placeholder="Category" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Channel</label>
            <Select value={form.channel} onChange={(v) => setForm({ ...form, channel: v })}>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
            </Select>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Subject</label>
            <Input value={form.subject} onChange={(v) => setForm({ ...form, subject: v })} placeholder="Subject" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Body</label>
            <TextArea value={form.body} onChange={(v) => setForm({ ...form, body: v })} placeholder="Template body" rows={4} />
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded" />
            Active
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Save' : 'Create'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ------------------------ ScheduledMessagesModule ------------------------ */
export function ScheduledMessagesModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ schedule_type: 'once', scheduled_for: '', timezone: 'UTC' });

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('scheduled_messages').select('*').eq('business_id', businessId).order('created_at', { ascending: false });
    if (error) showToast('error', error.message);
    else setItems(data || []);
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    if (!form.scheduled_for) { showToast('error', 'Scheduled time is required'); return; }
    const { error } = await supabase.from('scheduled_messages').insert({ business_id: businessId, ...form });
    if (error) { showToast('error', error.message); return; }
    showToast('success', 'Scheduled message created');
    setShowCreate(false);
    setForm({ schedule_type: 'once', scheduled_for: '', timezone: 'UTC' });
    load();
  }

  return (
    <div>
      <PageHeader title="Scheduled Messages" description="Messages scheduled for future delivery" action={<Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> New Schedule</Button>} />
      {loading ? <LoadingSpinner label="Loading scheduled messages..." /> : items.length === 0 ? (
        <EmptyState icon={CalendarClock} title="No scheduled messages" description="Schedule a message for future delivery." action={<Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> New Schedule</Button>} />
      ) : (
        <div className="space-y-3">
          {items.map((s) => (
            <Card key={s.id} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge color="blue">{s.schedule_type}</Badge>
                    <Badge color={s.is_processed ? 'green' : 'yellow'}>{s.is_processed ? 'Processed' : 'Pending'}</Badge>
                  </div>
                  <p className="text-sm text-white">{new Date(s.scheduled_for).toLocaleString()}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Timezone: {s.timezone}</p>
                  <p className="text-xs text-zinc-600 mt-1">Created {new Date(s.created_at).toLocaleString()}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Scheduled Message">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Schedule Type</label>
            <Select value={form.schedule_type} onChange={(v) => setForm({ ...form, schedule_type: v })}>
              <option value="once">Once</option>
              <option value="recurring">Recurring</option>
            </Select>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Scheduled For</label>
            <Input value={form.scheduled_for} onChange={(v) => setForm({ ...form, scheduled_for: v })} type="datetime-local" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Timezone</label>
            <Input value={form.timezone} onChange={(v) => setForm({ ...form, timezone: v })} placeholder="UTC" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate}><CalendarClock className="w-4 h-4" /> Schedule</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
