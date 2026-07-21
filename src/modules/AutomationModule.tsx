import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Zap, Clock } from 'lucide-react';
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
}

type FormState = {
  name: string;
  trigger_type: string;
  action_type: string;
  delay_hours: string;
  status: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  trigger_type: 'review_submitted',
  action_type: 'send_message',
  delay_hours: '0',
  status: 'active',
};

export default function AutomationModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<AutomationRule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AutomationRule | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  async function fetchRules() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('automation_rules')
        .select('id, name, trigger_type, action_type, delay_hours, status, trigger_count')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRules((data as AutomationRule[]) ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load automation rules';
      showToast('error', msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchRules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(r: AutomationRule) {
    setEditing(r);
    setForm({
      name: r.name,
      trigger_type: r.trigger_type,
      action_type: r.action_type,
      delay_hours: String(r.delay_hours),
      status: r.status,
    });
    setModalOpen(true);
  }

  function openDelete(r: AutomationRule) {
    setDeleteTarget(r);
    setDeleteOpen(true);
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
        delay_hours: parseInt(form.delay_hours || '0', 10) || 0,
        status: form.status,
      };

      if (editing) {
        const { error } = await supabase.from('automation_rules').update(payload).eq('id', editing.id);
        if (error) throw error;
        showToast('success', 'Rule updated');
      } else {
        const { error } = await supabase.from('automation_rules').insert(payload);
        if (error) throw error;
        showToast('success', 'Rule created');
      }
      setModalOpen(false);
      await fetchRules();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save rule';
      showToast('error', msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('automation_rules').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      showToast('success', 'Rule deleted');
      setDeleteOpen(false);
      setDeleteTarget(null);
      await fetchRules();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete rule';
      showToast('error', msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner label="Loading automation rules..." />;

  return (
    <div>
      <PageHeader
        title="Automation Rules"
        description="Trigger actions based on customer events"
        action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Rule</Button>}
      />

      {rules.length === 0 ? (
        <EmptyState
          icon={Zap}
          title="No automation rules yet"
          description="Create rules to automate actions like sending messages after reviews."
          action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Rule</Button>}
        />
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <Card key={rule.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-white">{rule.name}</h3>
                    <Badge color={rule.status === 'active' ? 'green' : 'gray'}>{rule.status}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-400 flex-wrap">
                    <span><span className="text-zinc-600">Trigger:</span> {rule.trigger_type}</span>
                    <span><span className="text-zinc-600">Action:</span> {rule.action_type}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {rule.delay_hours}h delay</span>
                    <span><span className="text-zinc-600">Fired:</span> {rule.trigger_count}×</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(rule)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => openDelete(rule)}><Trash2 className="w-3.5 h-3.5 text-red-400" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Rule' : 'New Rule'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Name</label>
            <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="e.g. Thank positive reviewers" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Trigger Type</label>
              <Select value={form.trigger_type} onChange={(v) => setForm({ ...form, trigger_type: v })}>
                <option value="review_submitted">Review Submitted</option>
                <option value="positive_review">Positive Review</option>
                <option value="negative_review">Negative Review</option>
                <option value="customer_signup">Customer Signup</option>
                <option value="manual">Manual</option>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Action Type</label>
              <Select value={form.action_type} onChange={(v) => setForm({ ...form, action_type: v })}>
                <option value="send_message">Send Message</option>
                <option value="send_email">Send Email</option>
                <option value="add_tag">Add Tag</option>
                <option value="create_task">Create Task</option>
                <option value="webhook">Webhook</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Delay (hours)</label>
              <Input type="number" value={form.delay_hours} onChange={(v) => setForm({ ...form, delay_hours: v })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Status</label>
              <Select value={form.status} onChange={(v) => setForm({ ...form, status: v })}>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Rule" maxWidth="max-w-md">
        <p className="text-sm text-zinc-300 mb-6">Are you sure you want to delete this automation rule? This action cannot be undone.</p>
        {deleteTarget && <p className="text-sm text-white bg-white/5 border border-white/10 rounded-lg p-3 mb-6">{deleteTarget.name}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} disabled={saving}>{saving ? 'Deleting...' : 'Delete'}</Button>
        </div>
      </Modal>
    </div>
  );
}
