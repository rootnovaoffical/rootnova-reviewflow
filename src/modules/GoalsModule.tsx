import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import {
  LoadingSpinner, EmptyState, PageHeader, Card, Badge, Button,
  Input, TextArea, Select, Modal,
} from '../components/UI';
import {
  Target, Plus, Pencil, Trash2, Calendar, TrendingUp,
} from 'lucide-react';

interface BusinessGoal {
  id: string;
  goal_type: string | null;
  title: string | null;
  description: string | null;
  target_value: number | null;
  current_value: number | null;
  unit: string | null;
  status: string | null;
  deadline: string | null;
}

const emptyForm = {
  goal_type: 'reviews',
  title: '',
  description: '',
  target_value: '100',
  current_value: '0',
  unit: '',
  status: 'active',
  deadline: '',
};

const statusColor = (s: string | null): string => {
  switch (s) {
    case 'active': return 'blue';
    case 'achieved': case 'completed': return 'green';
    case 'overdue': return 'red';
    case 'paused': return 'yellow';
    default: return 'gray';
  }
};

const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString() : '—');

export function GoalsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<BusinessGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('business_goals')
      .select('id, goal_type, title, description, target_value, current_value, unit, status, deadline')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('error', 'Failed to load goals');
      setItems([]);
    } else {
      setItems((data ?? []) as BusinessGoal[]);
    }
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (g: BusinessGoal) => {
    setEditingId(g.id);
    setForm({
      goal_type: g.goal_type ?? 'reviews',
      title: g.title ?? '',
      description: g.description ?? '',
      target_value: String(g.target_value ?? 100),
      current_value: String(g.current_value ?? 0),
      unit: g.unit ?? '',
      status: g.status ?? 'active',
      deadline: g.deadline ? new Date(g.deadline).toISOString().slice(0, 16) : '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { showToast('error', 'Title is required'); return; }
    setSaving(true);
    const payload = {
      business_id: businessId,
      goal_type: form.goal_type,
      title: form.title.trim(),
      description: form.description.trim() || null,
      target_value: Number(form.target_value) || 0,
      current_value: Number(form.current_value) || 0,
      unit: form.unit.trim() || null,
      status: form.status,
      deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
    };
    const res = editingId
      ? await supabase.from('business_goals').update(payload).eq('id', editingId)
      : await supabase.from('business_goals').insert(payload);
    setSaving(false);
    if (res.error) { showToast('error', `Failed to save: ${res.error.message}`); return; }
    showToast('success', editingId ? 'Goal updated' : 'Goal created');
    setModalOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this goal?')) return;
    const { error } = await supabase.from('business_goals').delete().eq('id', id);
    if (error) { showToast('error', `Failed to delete: ${error.message}`); return; }
    showToast('success', 'Goal deleted');
    fetchData();
  };

  const progressPct = (current: number | null, target: number | null): number => {
    const c = current ?? 0;
    const t = target ?? 0;
    if (t <= 0) return 0;
    return Math.min(100, Math.round((c / t) * 100));
  };

  const progressColor = (pct: number): string => {
    if (pct >= 100) return 'bg-emerald-500';
    if (pct >= 66) return 'bg-blue-500';
    if (pct >= 33) return 'bg-amber-500';
    return 'bg-zinc-500';
  };

  return (
    <div>
      <PageHeader
        title="Business Goals"
        description="Track progress toward key business objectives."
        action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Goal</Button>}
      />
      {loading ? (
        <LoadingSpinner label="Loading goals…" />
      ) : items.length === 0 ? (
        <EmptyState icon={Target} title="No goals yet" description="Set a business goal to start tracking progress." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((g) => {
            const pct = progressPct(g.current_value, g.target_value);
            return (
              <Card key={g.id} className="p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{g.title}</p>
                    <p className="text-xs text-zinc-500 capitalize">{g.goal_type ?? '—'}</p>
                  </div>
                  <Badge color={statusColor(g.status)}>{g.status ?? '—'}</Badge>
                </div>
                {g.description && <p className="text-xs text-zinc-400 line-clamp-2">{g.description}</p>}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-zinc-400">
                      {g.current_value ?? 0} / {g.target_value ?? 0}
                      {g.unit ? ` ${g.unit}` : ''}
                    </span>
                    <span className="font-semibold text-white">{pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${progressColor(pct)}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-auto">
                  <span className="text-xs text-zinc-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> {fmtDate(g.deadline)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(g)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(g.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Goal' : 'New Goal'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Title *</label>
            <Input value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="Reach 100 reviews" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Goal Type</label>
              <Select value={form.goal_type} onChange={(v) => setForm({ ...form, goal_type: v })}>
                <option value="reviews">Reviews</option>
                <option value="rating">Rating</option>
                <option value="revenue">Revenue</option>
                <option value="customers">Customers</option>
                <option value="visits">Visits</option>
                <option value="custom">Custom</option>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Status</label>
              <Select value={form.status} onChange={(v) => setForm({ ...form, status: v })}>
                <option value="active">Active</option>
                <option value="achieved">Achieved</option>
                <option value="paused">Paused</option>
                <option value="overdue">Overdue</option>
              </Select>
            </div>
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
              <Input value={form.unit} onChange={(v) => setForm({ ...form, unit: v })} placeholder="reviews" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Deadline</label>
            <Input type="datetime-local" value={form.deadline} onChange={(v) => setForm({ ...form, deadline: v })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description</label>
            <TextArea value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Goal description" rows={3} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Goal'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
