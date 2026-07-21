import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge, Button, Input, TextArea, Select, Modal } from '../components/UI';
import { useToast } from '../context/ToastContext';
import { Target, Plus, Pencil, Trash2, Calendar, TrendingUp } from 'lucide-react';

interface BusinessGoal {
  id: string;
  goal_type: string;
  title: string;
  description: string | null;
  target_value: number;
  current_value: number;
  unit: string;
  status: string;
  deadline: string | null;
}

interface GoalForm {
  goal_type: string;
  title: string;
  description: string;
  target_value: string;
  current_value: string;
  unit: string;
  status: string;
  deadline: string;
}

const emptyGoalForm: GoalForm = {
  goal_type: 'custom',
  title: '',
  description: '',
  target_value: '100',
  current_value: '0',
  unit: 'units',
  status: 'active',
  deadline: '',
};

function statusColor(status: string): string {
  switch (status) {
    case 'active':
      return 'blue';
    case 'achieved':
      return 'green';
    case 'failed':
      return 'red';
    case 'paused':
      return 'yellow';
    default:
      return 'gray';
  }
}

export function GoalsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<BusinessGoal[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BusinessGoal | null>(null);
  const [form, setForm] = useState<GoalForm>(emptyGoalForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchGoals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  async function fetchGoals() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('business_goals')
        .select('id, goal_type, title, description, target_value, current_value, unit, status, deadline')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setGoals((data ?? []) as BusinessGoal[]);
    } catch (e) {
      showToast('error', 'Failed to load goals');
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyGoalForm);
    setModalOpen(true);
  }

  function openEdit(g: BusinessGoal) {
    setEditing(g);
    setForm({
      goal_type: g.goal_type,
      title: g.title,
      description: g.description ?? '',
      target_value: String(g.target_value),
      current_value: String(g.current_value),
      unit: g.unit,
      status: g.status,
      deadline: g.deadline ? g.deadline.slice(0, 16) : '',
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim()) {
      showToast('error', 'Title is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        business_id: businessId,
        goal_type: form.goal_type,
        title: form.title.trim(),
        description: form.description.trim() || null,
        target_value: Number(form.target_value) || 100,
        current_value: Number(form.current_value) || 0,
        unit: form.unit.trim() || 'units',
        status: form.status,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
      };
      if (editing) {
        const { error } = await supabase.from('business_goals').update(payload).eq('id', editing.id);
        if (error) throw error;
        showToast('success', 'Goal updated');
      } else {
        const { error } = await supabase.from('business_goals').insert(payload);
        if (error) throw error;
        showToast('success', 'Goal created');
      }
      setModalOpen(false);
      fetchGoals();
    } catch (e) {
      showToast('error', 'Failed to save goal');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(g: BusinessGoal) {
    if (!confirm(`Delete goal "${g.title}"?`)) return;
    try {
      const { error } = await supabase.from('business_goals').delete().eq('id', g.id);
      if (error) throw error;
      showToast('success', 'Goal deleted');
      fetchGoals();
    } catch (e) {
      showToast('error', 'Failed to delete goal');
    }
  }

  if (loading) return <LoadingSpinner label="Loading goals..." />;

  return (
    <div>
      <PageHeader
        title="Business Goals"
        description="Track progress toward your business objectives"
        action={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" /> New Goal
          </Button>
        }
      />

      {goals.length === 0 ? (
        <EmptyState icon={Target} title="No goals yet" description="Create a goal to track progress toward your targets." />
      ) : (
        <div className="space-y-3">
          {goals.map((g) => {
            const target = g.target_value || 0;
            const current = g.current_value || 0;
            const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
            return (
              <Card key={g.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-semibold text-white">{g.title}</span>
                      <Badge color="purple">{g.goal_type}</Badge>
                      <Badge color={statusColor(g.status)}>{g.status}</Badge>
                    </div>
                    {g.description && <p className="text-sm text-zinc-400 mb-3">{g.description}</p>}
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="text-zinc-400">
                        {current} / {target} {g.unit}
                      </span>
                      <span className="text-zinc-300 font-medium">{pct}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(g)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(g)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    {g.deadline && (
                      <span className="flex items-center gap-1 text-xs text-zinc-500 whitespace-nowrap">
                        <Calendar className="w-3 h-3" />
                        {new Date(g.deadline).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Goal' : 'New Goal'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Title</label>
            <Input value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="Goal title" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Goal Type</label>
              <Select value={form.goal_type} onChange={(v) => setForm({ ...form, goal_type: v })}>
                <option value="custom">Custom</option>
                <option value="reviews">Reviews</option>
                <option value="revenue">Revenue</option>
                <option value="visits">Visits</option>
                <option value="retention">Retention</option>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Status</label>
              <Select value={form.status} onChange={(v) => setForm({ ...form, status: v })}>
                <option value="active">Active</option>
                <option value="achieved">Achieved</option>
                <option value="paused">Paused</option>
                <option value="failed">Failed</option>
              </Select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description</label>
            <TextArea value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Optional" rows={2} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Target</label>
              <Input type="number" value={form.target_value} onChange={(v) => setForm({ ...form, target_value: v })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Current</label>
              <Input type="number" value={form.current_value} onChange={(v) => setForm({ ...form, current_value: v })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Unit</label>
              <Input value={form.unit} onChange={(v) => setForm({ ...form, unit: v })} placeholder="units" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Deadline</label>
            <Input type="datetime-local" value={form.deadline} onChange={(v) => setForm({ ...form, deadline: v })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              <TrendingUp className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
