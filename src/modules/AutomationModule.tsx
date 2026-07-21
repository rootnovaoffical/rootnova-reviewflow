import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Zap, Clock, Activity } from 'lucide-react';
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
  Select,
  Modal,
} from '../components/UI';

interface AutomationRule {
  id: string;
  name: string;
  trigger_type: string;
  action_type: string;
  delay_hours: number;
  status: string;
  trigger_count: number;
}

const TRIGGER_TYPES = ['review_submitted', 'low_rating', 'positive_rating', 'new_customer', 'no_review'];
const ACTION_TYPES = ['send_email', 'send_sms', 'create_task', 'send_review_request', 'tag_customer'];
const RULE_STATUSES = ['active', 'paused', 'archived'];

export default function AutomationModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AutomationRule | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AutomationRule | null>(null);

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
      setRules(data || []);
    } catch (err) {
      console.error('Error fetching automation rules:', err);
      showToast('error', 'Failed to load automation rules');
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm({
      name: '',
      trigger_type: 'review_submitted',
      action_type: 'send_email',
      delay_hours: 0,
      status: 'active',
    });
    setModalOpen(true);
  }

  function openEdit(rule: AutomationRule) {
    setEditing(rule);
    setForm({
      name: rule.name,
      trigger_type: rule.trigger_type,
      action_type: rule.action_type,
      delay_hours: rule.delay_hours || 0,
      status: rule.status,
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
        name: form.name.trim(),
        trigger_type: form.trigger_type,
        action_type: form.action_type,
        delay_hours: form.delay_hours,
        status: form.status,
      };

      if (editing) {
        const { error } = await supabase
          .from('automation_rules')
          .update(payload)
          .eq('id', editing.id);
        if (error) throw error;
        showToast('success', 'Automation rule updated');
      } else {
        const { error } = await supabase.from('automation_rules').insert(payload);
        if (error) throw error;
        showToast('success', 'Automation rule created');
      }

      setModalOpen(false);
      await fetchRules();
    } catch (err) {
      console.error('Error saving automation rule:', err);
      showToast('error', 'Failed to save automation rule');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase
        .from('automation_rules')
        .delete()
        .eq('id', deleteTarget.id);
      if (error) throw error;
      showToast('success', 'Automation rule deleted');
      setDeleteTarget(null);
      await fetchRules();
    } catch (err) {
      console.error('Error deleting automation rule:', err);
      showToast('error', 'Failed to delete automation rule');
    }
  }

  function statusColor(status: string): string {
    switch (status) {
      case 'active':
        return 'green';
      case 'paused':
        return 'yellow';
      case 'archived':
        return 'gray';
      default:
        return 'gray';
    }
  }

  if (loading) return <LoadingSpinner label="Loading automation rules..." />;

  return (
    <div>
      <PageHeader
        title="Automation Rules"
        description="Trigger actions automatically based on customer behavior"
        action={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" /> Add Rule
          </Button>
        }
      />

      {rules.length === 0 ? (
        <EmptyState
          icon={Zap}
          title="No automation rules yet"
          description="Create rules to automate follow-ups, notifications, and customer engagement."
          action={
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4" /> Add Rule
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <Card key={rule.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-white mb-2">{rule.name}</h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge color="blue">{rule.trigger_type}</Badge>
                      <span className="text-zinc-600 text-xs">→</span>
                      <Badge color="purple">{rule.action_type}</Badge>
                      <Badge color={statusColor(rule.status)}>{rule.status}</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {rule.delay_hours > 0
                          ? `${rule.delay_hours}h delay`
                          : 'Immediate'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        {rule.trigger_count} triggers
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(rule)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(rule)}>
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Automation Rule' : 'New Automation Rule'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Rule Name</label>
            <Input
              value={form.name}
              onChange={(v) => setForm({ ...form, name: v })}
              placeholder="e.g. Follow up on low ratings"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Trigger Type</label>
              <Select
                value={form.trigger_type}
                onChange={(v) => setForm({ ...form, trigger_type: v })}
              >
                {TRIGGER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Action Type</label>
              <Select
                value={form.action_type}
                onChange={(v) => setForm({ ...form, action_type: v })}
              >
                {ACTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Delay (hours)
              </label>
              <Input
                type="number"
                value={String(form.delay_hours)}
                onChange={(v) => setForm({ ...form, delay_hours: parseInt(v) || 0 })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Status</label>
              <Select
                value={form.status}
                onChange={(v) => setForm({ ...form, status: v })}
              >
                {RULE_STATUSES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Automation Rule"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-300">
            Are you sure you want to delete this automation rule? This action cannot be undone.
          </p>
          {deleteTarget && (
            <p className="text-sm text-zinc-500 bg-white/5 rounded-lg p-3 border border-white/10">
              {deleteTarget.name}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              <Trash2 className="w-4 h-4" /> Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
