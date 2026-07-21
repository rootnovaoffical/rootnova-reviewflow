import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge, Button, Input, Select, Modal } from '../components/UI';
import { useToast } from '../context/ToastContext';
import { Zap, Plus, Pencil, Trash2, Clock } from 'lucide-react';

interface AutomationRule {
  id: string;
  name: string;
  trigger_type: string;
  action_type: string;
  delay_hours: number;
  status: string;
  trigger_count: number;
}

const emptyForm = {
  name: '',
  trigger_type: 'review_submitted',
  action_type: 'send_sms',
  delay_hours: 0,
  status: 'active',
};

export default function AutomationModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    fetchRules();
  }, [businessId]);

  async function fetchRules() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('automation_rules')
        .select('id, name, trigger_type, action_type, delay_hours, status, trigger_count')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRules((data ?? []) as AutomationRule[]);
    } catch {
      showToast('error', 'Failed to load automation rules');
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(r: AutomationRule) {
    setEditingId(r.id);
    setForm({
      name: r.name,
      trigger_type: r.trigger_type,
      action_type: r.action_type,
      delay_hours: r.delay_hours,
      status: r.status,
    });
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
        name: form.name,
        trigger_type: form.trigger_type,
        action_type: form.action_type,
        delay_hours: form.delay_hours,
        status: form.status,
      };
      if (editingId) {
        const { error } = await supabase.from('automation_rules').update(payload).eq('id', editingId);
        if (error) throw error;
        showToast('success', 'Automation rule updated');
      } else {
        const { error } = await supabase.from('automation_rules').insert(payload);
        if (error) throw error;
        showToast('success', 'Automation rule created');
      }
      setModalOpen(false);
      await fetchRules();
    } catch {
      showToast('error', 'Failed to save automation rule');
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
      setDeleteOpen(false);
      setDeleteId(null);
      await fetchRules();
    } catch {
      showToast('error', 'Failed to delete automation rule');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner label="Loading automation rules..." />;

  return (
    <div>
      <PageHeader
        title="Automation"
        description="Manage automation rules for this business"
        action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> Add Rule</Button>}
      />

      {rules.length === 0 ? (
        <EmptyState icon={Zap} title="No automation rules" description="Create automation rules to trigger actions based on events." action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> Add Rule</Button>} />
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <Card key={rule.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Zap className="w-4 h-4 text-blue-400" />
                    <h3 className="text-sm font-semibold text-white">{rule.name}</h3>
                    <Badge color={rule.status === 'active' ? 'green' : 'gray'}>{rule.status}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-400 flex-wrap">
                    <span>Trigger: <span className="text-blue-300">{rule.trigger_type}</span></span>
                    <span>Action: <span className="text-blue-300">{rule.action_type}</span></span>
                    {rule.delay_hours > 0 && (
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {rule.delay_hours}h delay</span>
                    )}
                    <span>Triggers: {rule.trigger_count}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(rule)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => { setDeleteId(rule.id); setDeleteOpen(true); }}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Automation Rule' : 'Add Automation Rule'}>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Name</label>
            <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="e.g. Positive Review SMS" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Trigger Type</label>
              <Select value={form.trigger_type} onChange={(v) => setForm({ ...form, trigger_type: v })}>
                <option value="review_submitted">Review Submitted</option>
                <option value="positive_review">Positive Review</option>
                <option value="negative_review">Negative Review</option>
                <option value="qr_scan">QR Scan</option>
                <option value="new_customer">New Customer</option>
              </Select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Action Type</label>
              <Select value={form.action_type} onChange={(v) => setForm({ ...form, action_type: v })}>
                <option value="send_sms">Send SMS</option>
                <option value="send_email">Send Email</option>
                <option value="webhook">Webhook</option>
                <option value="ai_response">AI Response</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Delay (hours)</label>
              <Input type="number" value={String(form.delay_hours)} onChange={(v) => setForm({ ...form, delay_hours: parseInt(v) || 0 })} placeholder="0" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Status</label>
              <Select value={form.status} onChange={(v) => setForm({ ...form, status: v })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="paused">Paused</option>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editingId ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Automation Rule" maxWidth="max-w-sm">
        <p className="text-sm text-zinc-300 mb-4">Are you sure you want to delete this automation rule? This action cannot be undone.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} disabled={saving}>{saving ? 'Deleting...' : 'Delete'}</Button>
        </div>
      </Modal>
    </div>
  );
}
