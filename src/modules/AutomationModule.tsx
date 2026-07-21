import { useState, useEffect } from 'react';
import { Zap, Plus, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge, Button, Input, Select, Modal } from '../components/UI';
import { useToast } from '../context/ToastContext';

interface AutomationRule {
  id: string;
  name: string;
  trigger_type: string;
  action_type: string;
  delay_hours: number;
  status: string;
  trigger_count: number;
  created_at: string;
}

const TRIGGER_TYPES = ['review_submitted', 'review_completed', 'low_rating', 'positive_rating', 'manual'];
const ACTION_TYPES = ['send_email', 'send_sms', 'create_task', 'send_webhook', 'delay'];
const RULE_STATUSES = ['active', 'paused', 'archived'];

export default function AutomationModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AutomationRule | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    trigger_type: 'review_submitted',
    action_type: 'send_email',
    delay_hours: 0,
    status: 'active',
  });

  useEffect(() => {
    fetchRules();
  }, [businessId]);

  async function fetchRules() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('automation_rules')
        .select('id, name, trigger_type, action_type, delay_hours, status, trigger_count, created_at')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRules((data as AutomationRule[]) ?? []);
    } catch (err: any) {
      showToast('error', err.message ?? 'Failed to load automation rules');
      setRules([]);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm({ name: '', trigger_type: 'review_submitted', action_type: 'send_email', delay_hours: 0, status: 'active' });
    setModalOpen(true);
  }

  function openEdit(r: AutomationRule) {
    setEditing(r);
    setForm({ name: r.name, trigger_type: r.trigger_type, action_type: r.action_type, delay_hours: r.delay_hours, status: r.status });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      showToast('error', 'Name is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        business_id: businessId,
        name: form.name.trim(),
        trigger_type: form.trigger_type,
        action_type: form.action_type,
        delay_hours: form.delay_hours,
        status: form.status,
      };

      if (editing) {
        const { error } = await supabase.from('automation_rules').update(payload).eq('id', editing.id);
        if (error) throw error;
        showToast('success', 'Automation rule updated');
      } else {
        const { error } = await supabase.from('automation_rules').insert(payload);
        if (error) throw error;
        showToast('success', 'Automation rule created');
      }
      setModalOpen(false);
      await fetchRules();
    } catch (err: any) {
      showToast('error', err.message ?? 'Failed to save automation rule');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('automation_rules').delete().eq('id', deleteId);
      if (error) throw error;
      showToast('success', 'Automation rule deleted');
      setDeleteId(null);
      await fetchRules();
    } catch (err: any) {
      showToast('error', err.message ?? 'Failed to delete automation rule');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner label="Loading automation rules..." />;

  return (
    <div>
      <PageHeader
        title="Automation Rules"
        description="Automate actions based on triggers"
        action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> Add Rule</Button>}
      />

      {rules.length === 0 ? (
        <EmptyState icon={Zap} title="No automation rules yet" description="Create rules to automate responses to customer reviews and events." action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> Add Rule</Button>} />
      ) : (
        <div className="space-y-3">
          {rules.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="font-semibold text-white">{r.name}</h3>
                    <Badge color={r.status === 'active' ? 'green' : r.status === 'paused' ? 'yellow' : 'gray'}>{r.status}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-400 flex-wrap">
                    <span className="flex items-center gap-1">
                      <span className="text-zinc-600">Trigger:</span>
                      <Badge color="blue">{r.trigger_type}</Badge>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="text-zinc-600">Action:</span>
                      <Badge color="purple">{r.action_type}</Badge>
                    </span>
                    {r.delay_hours > 0 && (
                      <span className="text-zinc-500">Delay: {r.delay_hours}h</span>
                    )}
                    <span className="text-zinc-500">Triggers: {r.trigger_count}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(r)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteId(r.id)}><Trash2 className="w-3.5 h-3.5 text-red-400" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Automation Rule' : 'Add Automation Rule'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Name</label>
            <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Send thank you email" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Trigger Type</label>
              <Select value={form.trigger_type} onChange={(v) => setForm({ ...form, trigger_type: v })}>
                {TRIGGER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Action Type</label>
              <Select value={form.action_type} onChange={(v) => setForm({ ...form, action_type: v })}>
                {ACTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Delay (hours)</label>
              <Input type="number" value={String(form.delay_hours)} onChange={(v) => setForm({ ...form, delay_hours: parseInt(v) || 0 })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Status</label>
              <Select value={form.status} onChange={(v) => setForm({ ...form, status: v })}>
                {RULE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Automation Rule" maxWidth="max-w-sm">
        <p className="text-sm text-zinc-300 mb-4">Are you sure you want to delete this automation rule? This action cannot be undone.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} disabled={saving}>{saving ? 'Deleting...' : 'Delete'}</Button>
        </div>
      </Modal>
    </div>
  );
}
