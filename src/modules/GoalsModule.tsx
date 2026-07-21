import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { PageHeader, Card, Badge, Button, Input, TextArea, Select, Modal, LoadingSpinner, EmptyState } from '../components/UI';
import { useToast } from '../context/ToastContext';
import { Target, Plus, TrendingUp } from 'lucide-react';

export function GoalsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ goal_type: '', title: '', description: '', target_value: 100, current_value: 0, unit: '', status: 'active', deadline: '' });

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('business_goals').select('*').eq('business_id', businessId).order('created_at', { ascending: false });
    if (error) showToast('error', error.message);
    else setGoals(data || []);
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => { load(); }, [load]);

  function openCreate() { setEditing(null); setForm({ goal_type: '', title: '', description: '', target_value: 100, current_value: 0, unit: '', status: 'active', deadline: '' }); setShowModal(true); }
  function openEdit(g: any) { setEditing(g); setForm({ goal_type: g.goal_type || '', title: g.title || '', description: g.description || '', target_value: g.target_value ?? 100, current_value: g.current_value ?? 0, unit: g.unit || '', status: g.status || 'active', deadline: g.deadline || '' }); setShowModal(true); }

  async function handleSave() {
    if (!form.title) { showToast('error', 'Title is required'); return; }
    const payload = { ...form, target_value: Number(form.target_value), current_value: Number(form.current_value) };
    if (editing) {
      const { error } = await supabase.from('business_goals').update(payload).eq('id', editing.id);
      if (error) { showToast('error', error.message); return; }
      showToast('success', 'Goal updated');
    } else {
      const { error } = await supabase.from('business_goals').insert({ business_id: businessId, ...payload });
      if (error) { showToast('error', error.message); return; }
      showToast('success', 'Goal created');
    }
    setShowModal(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this goal?')) return;
    const { error } = await supabase.from('business_goals').delete().eq('id', id);
    if (error) { showToast('error', error.message); return; }
    showToast('success', 'Goal deleted');
    load();
  }

  const statusColor: Record<string, string> = { active: 'green', completed: 'blue', paused: 'yellow', failed: 'red' };

  function progressPct(g: any) {
    if (!g.target_value || g.target_value === 0) return 0;
    return Math.min(100, Math.round((g.current_value / g.target_value) * 100));
  }

  return (
    <div>
      <PageHeader title="Business Goals" description="Track progress toward business targets" action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Goal</Button>} />
      {loading ? <LoadingSpinner label="Loading goals..." /> : goals.length === 0 ? (
        <EmptyState icon={Target} title="No goals" description="Set a business goal to track progress." action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Goal</Button>} />
      ) : (
        <div className="space-y-3">
          {goals.map((g) => {
            const pct = progressPct(g);
            return (
              <Card key={g.id} className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-semibold text-white">{g.title}</span>
                      {g.goal_type && <Badge color="purple">{g.goal_type}</Badge>}
                      <Badge color={statusColor[g.status] || 'gray'}>{g.status}</Badge>
                    </div>
                    {g.description && <p className="text-sm text-zinc-400">{g.description}</p>}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(g)}>Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(g.id)}>Delete</Button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                      <span>{g.current_value} / {g.target_value} {g.unit}</span>
                      <span className="font-medium text-white">{pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
                {g.deadline && <p className="text-xs text-zinc-600 mt-2 flex items-center gap-1"><Target className="w-3 h-3" /> Deadline: {new Date(g.deadline).toLocaleDateString()}</p>}
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Goal' : 'New Goal'}>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Goal Type</label>
            <Input value={form.goal_type} onChange={(v) => setForm({ ...form, goal_type: v })} placeholder="e.g. reviews, revenue" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Title</label>
            <Input value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="Goal title" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Description</label>
            <TextArea value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Goal description" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Target Value</label>
              <Input value={String(form.target_value)} onChange={(v) => setForm({ ...form, target_value: Number(v) })} type="number" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Current Value</label>
              <Input value={String(form.current_value)} onChange={(v) => setForm({ ...form, current_value: Number(v) })} type="number" />
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Unit</label>
            <Input value={form.unit} onChange={(v) => setForm({ ...form, unit: v })} placeholder="e.g. reviews, $" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Status</label>
            <Select value={form.status} onChange={(v) => setForm({ ...form, status: v })}>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="paused">Paused</option>
              <option value="failed">Failed</option>
            </Select>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Deadline</label>
            <Input value={form.deadline} onChange={(v) => setForm({ ...form, deadline: v })} type="date" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave}><TrendingUp className="w-4 h-4" /> {editing ? 'Save' : 'Create'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
