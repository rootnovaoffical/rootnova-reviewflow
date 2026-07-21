import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge, Button, Input, TextArea, Select, Modal } from '../components/UI';
import { Target, Plus, Pencil, Trash2 } from 'lucide-react';

interface BusinessGoal {
  id: string;
  business_id: string;
  goal_type: string | null;
  title: string;
  description: string | null;
  target_value: number | null;
  current_value: number | null;
  unit: string | null;
  status: string | null;
  deadline: string | null;
  created_at: string;
}

const emptyForm = {
  goal_type: 'revenue',
  title: '',
  description: '',
  target_value: 100,
  current_value: 0,
  unit: '',
  status: 'active',
  deadline: '',
};

export function GoalsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [goals, setGoals] = useState<BusinessGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BusinessGoal | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('business_goals')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('error', 'Failed to load goals');
    } else {
      setGoals(data || []);
    }
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setModalOpen(true);
  };

  const openEdit = (g: BusinessGoal) => {
    setEditing(g);
    setForm({
      goal_type: g.goal_type || 'revenue',
      title: g.title || '',
      description: g.description || '',
      target_value: g.target_value ?? 100,
      current_value: g.current_value ?? 0,
      unit: g.unit || '',
      status: g.status || 'active',
      deadline: g.deadline ? g.deadline.slice(0, 16) : '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      showToast('error', 'Title is required');
      return;
    }
    setSaving(true);
    const payload = {
      business_id: businessId,
      goal_type: form.goal_type,
      title: form.title,
      description: form.description || null,
      target_value: Number(form.target_value),
      current_value: Number(form.current_value),
      unit: form.unit || null,
      status: form.status,
      deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
    };
    let error;
    if (editing) {
      ({ error } = await supabase.from('business_goals').update(payload).eq('id', editing.id));
    } else {
      ({ error } = await supabase.from('business_goals').insert(payload));
    }
    setSaving(false);
    if (error) {
      showToast('error', 'Failed to save goal');
      return;
    }
    showToast('success', editing ? 'Goal updated' : 'Goal created');
    setModalOpen(false);
    fetchGoals();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this goal?')) return;
    const { error } = await supabase.from('business_goals').delete().eq('id', id);
    if (error) {
      showToast('error', 'Failed to delete goal');
      return;
    }
    showToast('success', 'Goal deleted');
    fetchGoals();
  };

  const statusColor = (s: string | null) => {
    if (s === 'active') return 'green';
    if (s === 'completed') return 'blue';
    if (s === 'paused') return 'yellow';
    if (s === 'failed') return 'red';
    return 'gray';
  };

  const progressPct = (current: number | null, target: number | null) => {
    if (!target || target === 0) return 0;
    return Math.min(100, Math.round(((current ?? 0) / target) * 100));
  };

  if (loading) return <LoadingSpinner label="Loading goals…" />;

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
        <EmptyState
          icon={Target}
          title="No goals yet"
          description="Set business goals to track your progress."
          action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Goal</Button>}
        />
      ) : (
        <div className="space-y-4">
          {goals.map((g) => {
            const pct = progressPct(g.current_value, g.target_value);
            return (
              <Card key={g.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-sm font-semibold text-white">{g.title}</span>
                      {g.goal_type && <Badge color="purple">{g.goal_type}</Badge>}
                      {g.status && <Badge color={statusColor(g.status)}>{g.status}</Badge>}
                    </div>
                    {g.description && <p className="text-sm text-zinc-400 mb-3">{g.description}</p>}

                    <div className="mb-2 flex items-baseline justify-between">
                      <span className="text-sm text-zinc-300">
                        {g.current_value ?? 0} / {g.target_value ?? 0}
                        {g.unit && <span className="text-zinc-500 ml-1">{g.unit}</span>}
                      </span>
                      <span className="text-sm font-medium text-blue-300">{pct}%</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    {g.deadline && (
                      <p className="text-xs text-zinc-500 mt-2">
                        Deadline: {new Date(g.deadline).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(g)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(g.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
            <label className="block text-sm text-zinc-400 mb-1.5">Title *</label>
            <Input value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="Goal title" />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Goal Type</label>
            <Select value={form.goal_type} onChange={(v) => setForm({ ...form, goal_type: v })}>
              <option value="revenue">Revenue</option>
              <option value="reviews">Reviews</option>
              <option value="rating">Rating</option>
              <option value="visits">Visits</option>
              <option value="customers">Customers</option>
              <option value="custom">Custom</option>
            </Select>
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Description</label>
            <TextArea value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Goal description" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">Target Value</label>
              <Input type="number" value={String(form.target_value)} onChange={(v) => setForm({ ...form, target_value: Number(v) || 0 })} />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">Current Value</label>
              <Input type="number" value={String(form.current_value)} onChange={(v) => setForm({ ...form, current_value: Number(v) || 0 })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">Unit</label>
              <Input value={form.unit} onChange={(v) => setForm({ ...form, unit: v })} placeholder="e.g. $, visits" />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">Status</label>
              <Select value={form.status} onChange={(v) => setForm({ ...form, status: v })}>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </Select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Deadline</label>
            <input
              type="datetime-local"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-400/50 transition-colors"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
