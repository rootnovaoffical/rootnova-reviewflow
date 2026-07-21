import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import {
  LoadingSpinner, EmptyState, PageHeader, Card, Badge, Button,
  Input, TextArea, Select, Modal,
} from '../components/UI';
import {
  Users, Gift, Plus, Pencil, Trash2, Star, Calendar,
} from 'lucide-react';

/* ============================================================
 * CustomersModule
 * ========================================================== */

interface Customer {
  id: string;
  identifier: string | null;
  display_name: string | null;
  total_visits: number | null;
  total_reviews: number | null;
  avg_rating: number | null;
  segment: string | null;
  last_visit_at: string | null;
}

const segmentColor = (s: string | null): string => {
  switch (s) {
    case 'vip': case 'champion': return 'purple';
    case 'loyal': case 'regular': return 'blue';
    case 'at_risk': case 'churned': return 'red';
    case 'new': return 'green';
    default: return 'gray';
  }
};

const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString() : '—');

export function CustomersModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('customers')
      .select('id, identifier, display_name, total_visits, total_reviews, avg_rating, segment, last_visit_at')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('error', 'Failed to load customers');
      setItems([]);
    } else {
      setItems((data ?? []) as Customer[]);
    }
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div>
      <PageHeader title="Customers" description="Customer profiles and engagement metrics for this business." />
      {loading ? (
        <LoadingSpinner label="Loading customers…" />
      ) : items.length === 0 ? (
        <EmptyState icon={Users} title="No customers yet" description="Customers will appear here once they interact with your business." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs text-zinc-500 uppercase tracking-wider">
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium text-center">Visits</th>
                  <th className="px-4 py-3 font-medium text-center">Reviews</th>
                  <th className="px-4 py-3 font-medium text-center">Avg Rating</th>
                  <th className="px-4 py-3 font-medium">Segment</th>
                  <th className="px-4 py-3 font-medium">Last Visit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {items.map((c) => (
                  <tr key={c.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400/30 to-cyan-500/30 flex items-center justify-center text-xs font-bold text-blue-200 shrink-0">
                          {(c.display_name || c.identifier || '?')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-white truncate">{c.display_name || '—'}</p>
                          <p className="text-xs text-zinc-500 truncate">{c.identifier || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-zinc-300">{c.total_visits ?? 0}</td>
                    <td className="px-4 py-3 text-center text-zinc-300">{c.total_reviews ?? 0}</td>
                    <td className="px-4 py-3 text-center">
                      {c.avg_rating != null ? (
                        <span className="inline-flex items-center gap-1 text-amber-300">
                          <Star className="w-3.5 h-3.5 fill-amber-400/40" />
                          {Number(c.avg_rating).toFixed(1)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3"><Badge color={segmentColor(c.segment)}>{c.segment || 'unsegmented'}</Badge></td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">{fmtDate(c.last_visit_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ============================================================
 * LoyaltyModule
 * ========================================================== */

interface LoyaltyProgram {
  id: string;
  name: string | null;
  program_type: string | null;
  target_count: number | null;
  reward_description: string | null;
  points_per_action: number | null;
  status: string | null;
  redeemed_count: number | null;
}

const emptyForm = {
  name: '', program_type: 'visits', target_count: '10',
  reward_description: '', points_per_action: '1', status: 'active',
};

const programStatusColor = (s: string | null): string => {
  switch (s) {
    case 'active': return 'green';
    case 'paused': return 'yellow';
    case 'archived': return 'gray';
    default: return 'gray';
  }
};

export function LoyaltyModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<LoyaltyProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('loyalty_programs')
      .select('id, name, program_type, target_count, reward_description, points_per_action, status, redeemed_count')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('error', 'Failed to load loyalty programs');
      setItems([]);
    } else {
      setItems((data ?? []) as LoyaltyProgram[]);
    }
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (p: LoyaltyProgram) => {
    setEditingId(p.id);
    setForm({
      name: p.name ?? '',
      program_type: p.program_type ?? 'visits',
      target_count: String(p.target_count ?? 10),
      reward_description: p.reward_description ?? '',
      points_per_action: String(p.points_per_action ?? 1),
      status: p.status ?? 'active',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { showToast('error', 'Name is required'); return; }
    setSaving(true);
    const payload = {
      business_id: businessId,
      name: form.name.trim(),
      program_type: form.program_type,
      target_count: Number(form.target_count) || 0,
      reward_description: form.reward_description.trim() || null,
      points_per_action: Number(form.points_per_action) || 0,
      status: form.status,
    };
    const res = editingId
      ? await supabase.from('loyalty_programs').update(payload).eq('id', editingId)
      : await supabase.from('loyalty_programs').insert(payload);
    setSaving(false);
    if (res.error) { showToast('error', `Failed to save: ${res.error.message}`); return; }
    showToast('success', editingId ? 'Program updated' : 'Program created');
    setModalOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this loyalty program?')) return;
    const { error } = await supabase.from('loyalty_programs').delete().eq('id', id);
    if (error) { showToast('error', `Failed to delete: ${error.message}`); return; }
    showToast('success', 'Program deleted');
    fetchData();
  };

  return (
    <div>
      <PageHeader
        title="Loyalty Programs"
        description="Reward programs that incentivize repeat customer engagement."
        action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Program</Button>}
      />
      {loading ? (
        <LoadingSpinner label="Loading loyalty programs…" />
      ) : items.length === 0 ? (
        <EmptyState icon={Gift} title="No loyalty programs" description="Create a loyalty program to reward repeat customers." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <Card key={p.id} className="p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{p.name}</p>
                  <p className="text-xs text-zinc-500 capitalize">{p.program_type ?? '—'}</p>
                </div>
                <Badge color={programStatusColor(p.status)}>{p.status ?? '—'}</Badge>
              </div>
              {p.reward_description && <p className="text-xs text-zinc-400 line-clamp-2">{p.reward_description}</p>}
              <div className="grid grid-cols-3 gap-2 text-center mt-1">
                <div className="rounded-lg bg-white/5 py-1.5">
                  <p className="text-sm font-bold text-white">{p.target_count ?? 0}</p>
                  <p className="text-[10px] text-zinc-500">target</p>
                </div>
                <div className="rounded-lg bg-white/5 py-1.5">
                  <p className="text-sm font-bold text-white">{p.points_per_action ?? 0}</p>
                  <p className="text-[10px] text-zinc-500">pts/action</p>
                </div>
                <div className="rounded-lg bg-white/5 py-1.5">
                  <p className="text-sm font-bold text-white">{p.redeemed_count ?? 0}</p>
                  <p className="text-[10px] text-zinc-500">redeemed</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 border-t border-white/5 pt-2 mt-auto">
                <Button size="sm" variant="ghost" onClick={() => openEdit(p)}><Pencil className="w-3.5 h-3.5" /> Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(p.id)}><Trash2 className="w-3.5 h-3.5" /> Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Loyalty Program' : 'New Loyalty Program'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Name *</label>
            <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Coffee Club" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Program Type</label>
              <Select value={form.program_type} onChange={(v) => setForm({ ...form, program_type: v })}>
                <option value="visits">Visits</option>
                <option value="points">Points</option>
                <option value="punch_card">Punch Card</option>
                <option value="tiered">Tiered</option>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Status</label>
              <Select value={form.status} onChange={(v) => setForm({ ...form, status: v })}>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="archived">Archived</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Target Count</label>
              <Input type="number" value={form.target_count} onChange={(v) => setForm({ ...form, target_count: v })} placeholder="10" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Points Per Action</label>
              <Input type="number" value={form.points_per_action} onChange={(v) => setForm({ ...form, points_per_action: v })} placeholder="1" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Reward Description</label>
            <TextArea value={form.reward_description} onChange={(v) => setForm({ ...form, reward_description: v })} placeholder="Free coffee after 10 visits" rows={3} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Program'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
