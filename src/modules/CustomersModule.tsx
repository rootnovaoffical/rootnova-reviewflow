import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge, Button, Input, TextArea, Select, Modal } from '../components/UI';
import { Users, Award, Plus, Pencil, Trash2, Star } from 'lucide-react';

/* ============================================================
 * CustomersModule
 * ============================================================ */

interface Customer {
  id: string;
  business_id: string;
  identifier: string;
  display_name: string | null;
  total_visits: number | null;
  total_reviews: number | null;
  avg_rating: number | null;
  segment: string | null;
  last_visit_at: string | null;
}

export function CustomersModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', businessId)
      .order('last_visit_at', { ascending: false, nullsFirst: false });
    if (error) {
      showToast('error', 'Failed to load customers');
    } else {
      setCustomers(data || []);
    }
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const segmentColor = (s: string | null) => {
    if (!s) return 'gray';
    if (s === 'vip' || s === 'loyal') return 'purple';
    if (s === 'new') return 'blue';
    if (s === 'at_risk') return 'red';
    if (s === 'churned') return 'gray';
    return 'green';
  };

  if (loading) return <LoadingSpinner label="Loading customers…" />;

  return (
    <div>
      <PageHeader title="Customers" description="Customer profiles and engagement metrics" />

      {customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers yet"
          description="Customers will appear here once they interact with your business."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="text-left text-xs font-medium text-zinc-400 px-4 py-3">Identifier</th>
                  <th className="text-left text-xs font-medium text-zinc-400 px-4 py-3">Name</th>
                  <th className="text-left text-xs font-medium text-zinc-400 px-4 py-3">Visits</th>
                  <th className="text-left text-xs font-medium text-zinc-400 px-4 py-3">Reviews</th>
                  <th className="text-left text-xs font-medium text-zinc-400 px-4 py-3">Avg Rating</th>
                  <th className="text-left text-xs font-medium text-zinc-400 px-4 py-3">Segment</th>
                  <th className="text-left text-xs font-medium text-zinc-400 px-4 py-3">Last Visit</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-sm text-white font-medium">{c.identifier}</td>
                    <td className="px-4 py-3 text-sm text-zinc-300">{c.display_name || '—'}</td>
                    <td className="px-4 py-3 text-sm text-zinc-300">{c.total_visits ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-zinc-300">{c.total_reviews ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-zinc-300">
                      {c.avg_rating != null ? (
                        <span className="inline-flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          {Number(c.avg_rating).toFixed(1)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {c.segment ? <Badge color={segmentColor(c.segment)}>{c.segment}</Badge> : <span className="text-zinc-600 text-sm">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500">
                      {c.last_visit_at ? new Date(c.last_visit_at).toLocaleDateString() : '—'}
                    </td>
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
 * ============================================================ */

interface LoyaltyProgram {
  id: string;
  business_id: string;
  name: string;
  program_type: string | null;
  target_count: number | null;
  reward_description: string | null;
  points_per_action: number | null;
  status: string | null;
  redeemed_count: number | null;
  created_at: string;
}

const emptyLoyaltyForm = {
  name: '',
  program_type: 'visit',
  target_count: 10,
  reward_description: '',
  points_per_action: 1,
  status: 'active',
};

export function LoyaltyModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [programs, setPrograms] = useState<LoyaltyProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LoyaltyProgram | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...emptyLoyaltyForm });

  const fetchPrograms = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('loyalty_programs')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('error', 'Failed to load loyalty programs');
    } else {
      setPrograms(data || []);
    }
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyLoyaltyForm });
    setModalOpen(true);
  };

  const openEdit = (p: LoyaltyProgram) => {
    setEditing(p);
    setForm({
      name: p.name || '',
      program_type: p.program_type || 'visit',
      target_count: p.target_count ?? 10,
      reward_description: p.reward_description || '',
      points_per_action: p.points_per_action ?? 1,
      status: p.status || 'active',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('error', 'Name is required');
      return;
    }
    setSaving(true);
    const payload = {
      business_id: businessId,
      name: form.name,
      program_type: form.program_type,
      target_count: Number(form.target_count),
      reward_description: form.reward_description || null,
      points_per_action: Number(form.points_per_action),
      status: form.status,
    };
    let error;
    if (editing) {
      ({ error } = await supabase.from('loyalty_programs').update(payload).eq('id', editing.id));
    } else {
      ({ error } = await supabase.from('loyalty_programs').insert(payload));
    }
    setSaving(false);
    if (error) {
      showToast('error', 'Failed to save loyalty program');
      return;
    }
    showToast('success', editing ? 'Loyalty program updated' : 'Loyalty program created');
    setModalOpen(false);
    fetchPrograms();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this loyalty program?')) return;
    const { error } = await supabase.from('loyalty_programs').delete().eq('id', id);
    if (error) {
      showToast('error', 'Failed to delete loyalty program');
      return;
    }
    showToast('success', 'Loyalty program deleted');
    fetchPrograms();
  };

  const statusColor = (s: string | null) => {
    if (s === 'active') return 'green';
    if (s === 'paused') return 'yellow';
    if (s === 'ended') return 'gray';
    return 'gray';
  };

  if (loading) return <LoadingSpinner label="Loading loyalty programs…" />;

  return (
    <div>
      <PageHeader
        title="Loyalty Programs"
        description="Reward programs for customer retention"
        action={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" /> New Program
          </Button>
        }
      />

      {programs.length === 0 ? (
        <EmptyState
          icon={Award}
          title="No loyalty programs"
          description="Create a loyalty program to reward your customers."
          action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Program</Button>}
        />
      ) : (
        <div className="space-y-3">
          {programs.map((p) => (
            <Card key={p.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-sm font-semibold text-white">{p.name}</span>
                    {p.program_type && <Badge color="blue">{p.program_type}</Badge>}
                    {p.status && <Badge color={statusColor(p.status)}>{p.status}</Badge>}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                    <div>
                      <p className="text-xs text-zinc-500">Target</p>
                      <p className="text-sm text-zinc-200">{p.target_count ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Points/Action</p>
                      <p className="text-sm text-zinc-200">{p.points_per_action ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Redeemed</p>
                      <p className="text-sm text-zinc-200">{p.redeemed_count ?? 0}</p>
                    </div>
                  </div>
                  {p.reward_description && (
                    <p className="text-sm text-zinc-400 mt-2">{p.reward_description}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Loyalty Program' : 'New Loyalty Program'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Name *</label>
            <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Program name" />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Program Type</label>
            <Select value={form.program_type} onChange={(v) => setForm({ ...form, program_type: v })}>
              <option value="visit">Visit Based</option>
              <option value="points">Points Based</option>
              <option value="spend">Spend Based</option>
              <option value="tier">Tier Based</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">Target Count</label>
              <Input type="number" value={String(form.target_count)} onChange={(v) => setForm({ ...form, target_count: Number(v) || 0 })} />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">Points Per Action</label>
              <Input type="number" value={String(form.points_per_action)} onChange={(v) => setForm({ ...form, points_per_action: Number(v) || 0 })} />
            </div>
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Reward Description</label>
            <TextArea value={form.reward_description} onChange={(v) => setForm({ ...form, reward_description: v })} placeholder="What does the customer get?" rows={3} />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Status</label>
            <Select value={form.status} onChange={(v) => setForm({ ...form, status: v })}>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="ended">Ended</option>
            </Select>
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
