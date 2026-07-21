import { useState, useEffect } from 'react';
import { Zap, Plus, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge, Button, Input, Select, Modal } from '../components/UI';

interface AutomationRule {
  id: string;
  name: string;
  trigger_type: string;
  action_type: string;
  delay_hours: number;
  status: string;
  trigger_count: number;
}

interface AutomationModuleProps {
  businessId: string;
}

const TRIGGER_TYPES = [
  { value: 'review_submitted', label: 'Review Submitted' },
  { value: 'review_completed', label: 'Review Completed' },
  { value: 'positive_review', label: 'Positive Review (4-5★)' },
  { value: 'negative_review', label: 'Negative Review (1-3★)' },
  { value: 'customer_created', label: 'Customer Created' },
  { value: 'qr_scan', label: 'QR Code Scanned' },
];

const ACTION_TYPES = [
  { value: 'send_email', label: 'Send Email' },
  { value: 'send_sms', label: 'Send SMS' },
  { value: 'send_whatsapp', label: 'Send WhatsApp' },
  { value: 'create_task', label: 'Create Task' },
  { value: 'webhook', label: 'Trigger Webhook' },
  { value: 'tag_customer', label: 'Tag Customer' },
];

const STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'draft', label: 'Draft' },
];

export default function AutomationModule({ businessId }: AutomationModuleProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AutomationRule | null>(null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    } catch (err) {
      showToast('error', `Failed to load automation rules: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm({ name: '', trigger_type: 'review_submitted', action_type: 'send_email', delay_hours: 0, status: 'active' });
    setModalOpen(true);
  }

  function openEdit(rule: AutomationRule) {
    setEditing(rule);
    setForm({
      name: rule.name,
      trigger_type: rule.trigger_type,
      action_type: rule.action_type,
      delay_hours: rule.delay_hours,
      status: rule.status,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      showToast('error', 'Rule name is required');
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
      fetchRules();
    } catch (err) {
      showToast('error', `Save failed: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(rule: AutomationRule) {
    if (!confirm(`Delete "${rule.name}"?`)) return;
    try {
      const { error } = await supabase.from('automation_rules').delete().eq('id', rule.id);
      if (error) throw error;
      showToast('success', 'Rule deleted');
      fetchRules();
    } catch (err) {
      showToast('error', `Delete failed: ${(err as Error).message}`);
    }
  }

  function statusColor(status: string): string {
    if (status === 'active') return 'green';
    if (status === 'paused') return 'yellow';
    return 'gray';
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
        <Card className="p-5">
          <EmptyState icon={Zap} title="No automation rules yet" description="Create rules to automate emails, SMS, and tasks based on customer activity." action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> Add Rule</Button>} />
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <Card key={rule.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <h3 className="text-sm font-semibold text-white truncate">{rule.name}</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Badge color="blue">{rule.trigger_type.replace(/_/g, ' ')}</Badge>
                    <span className="text-xs text-zinc-600">→</span>
                    <Badge color="purple">{rule.action_type.replace(/_/g, ' ')}</Badge>
                    {rule.delay_hours > 0 && (
                      <Badge color="yellow">{rule.delay_hours}h delay</Badge>
                    )}
                    <Badge color={statusColor(rule.status)}>{rule.status}</Badge>
                    <span className="text-xs text-zinc-500">{rule.trigger_count} trigger{rule.trigger_count !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(rule)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(rule)}><Trash2 className="w-3.5 h-3.5 text-red-400" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Rule' : 'New Automation Rule'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Rule Name</label>
            <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="e.g. Send thank you email after review" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Trigger Type</label>
              <Select value={form.trigger_type} onChange={(v) => setForm({ ...form, trigger_type: v })}>
                {TRIGGER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Action Type</label>
              <Select value={form.action_type} onChange={(v) => setForm({ ...form, action_type: v })}>
                {ACTION_TYPES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Delay (hours)</label>
              <Input type="number" value={String(form.delay_hours)} onChange={(v) => setForm({ ...form, delay_hours: parseInt(v) || 0 })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Status</label>
              <Select value={form.status} onChange={(v) => setForm({ ...form, status: v })}>
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
