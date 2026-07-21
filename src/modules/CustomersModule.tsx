import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge, Button, Input, TextArea, Select, Modal } from '../components/UI';
import { useToast } from '../context/ToastContext';
import { Users, Award, Plus, Pencil, Trash2, Star, Calendar } from 'lucide-react';

/* ============================================================
 *  CustomersModule
 * ========================================================== */

interface Customer {
  id: string;
  identifier: string | null;
  display_name: string | null;
  total_visits: number;
  total_reviews: number;
  avg_rating: number | string | null;
  segment: string;
  last_visit_at: string | null;
}

function segmentColor(segment: string): string {
  switch (segment) {
    case 'vip':
      return 'purple';
    case 'loyal':
      return 'blue';
    case 'regular':
      return 'green';
    case 'at_risk':
      return 'yellow';
    case 'new':
      return 'gray';
    default:
      return 'gray';
  }
}

export function CustomersModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  async function fetchCustomers() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, identifier, display_name, total_visits, total_reviews, avg_rating, segment, last_visit_at')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCustomers((data ?? []) as Customer[]);
    } catch (e) {
      showToast('error', 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingSpinner label="Loading customers..." />;

  return (
    <div>
      <PageHeader title="Customers" description="All customers for this business" />

      {customers.length === 0 ? (
        <EmptyState icon={Users} title="No customers yet" description="Customers will appear here once they interact with your business." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="text-left px-4 py-3 font-medium text-zinc-400">Identifier</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-400">Name</th>
                  <th className="text-right px-4 py-3 font-medium text-zinc-400">Visits</th>
                  <th className="text-right px-4 py-3 font-medium text-zinc-400">Reviews</th>
                  <th className="text-right px-4 py-3 font-medium text-zinc-400">Avg Rating</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-400">Segment</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-400">Last Visit</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 text-zinc-200 font-mono text-xs">{c.identifier ?? '—'}</td>
                    <td className="px-4 py-3 text-white">{c.display_name ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-zinc-300">{c.total_visits}</td>
                    <td className="px-4 py-3 text-right text-zinc-300">{c.total_reviews}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1 text-zinc-300">
                        <Star className="w-3.5 h-3.5 text-amber-400" />
                        {c.avg_rating != null ? Number(c.avg_rating).toFixed(1) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={segmentColor(c.segment)}>{c.segment}</Badge>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">
                      {c.last_visit_at ? (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(c.last_visit_at).toLocaleDateString()}
                        </span>
                      ) : (
                        '—'
                      )}
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
 *  LoyaltyModule
 * ========================================================== */

interface LoyaltyProgram {
  id: string;
  name: string;
  program_type: string;
  target_count: number;
  reward_description: string;
  points_per_action: number;
  status: string;
  redeemed_count: number;
}

interface LoyaltyForm {
  name: string;
  program_type: string;
  target_count: string;
  reward_description: string;
  points_per_action: string;
  status: string;
}

const emptyLoyaltyForm: LoyaltyForm = {
  name: '',
  program_type: 'visit_based',
  target_count: '5',
  reward_description: '',
  points_per_action: '1',
  status: 'active',
};

function loyaltyStatusColor(status: string): string {
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

export function LoyaltyModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState<LoyaltyProgram[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LoyaltyProgram | null>(null);
  const [form, setForm] = useState<LoyaltyForm>(emptyLoyaltyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPrograms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  async function fetchPrograms() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('loyalty_programs')
        .select('id, name, program_type, target_count, reward_description, points_per_action, status, redeemed_count')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPrograms((data ?? []) as LoyaltyProgram[]);
    } catch (e) {
      showToast('error', 'Failed to load loyalty programs');
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyLoyaltyForm);
    setModalOpen(true);
  }

  function openEdit(p: LoyaltyProgram) {
    setEditing(p);
    setForm({
      name: p.name,
      program_type: p.program_type,
      target_count: String(p.target_count),
      reward_description: p.reward_description,
      points_per_action: String(p.points_per_action),
      status: p.status,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.reward_description.trim()) {
      showToast('error', 'Name and reward description are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        business_id: businessId,
        name: form.name.trim(),
        program_type: form.program_type,
        target_count: Number(form.target_count) || 5,
        reward_description: form.reward_description.trim(),
        points_per_action: Number(form.points_per_action) || 1,
        status: form.status,
      };
      if (editing) {
        const { error } = await supabase.from('loyalty_programs').update(payload).eq('id', editing.id);
        if (error) throw error;
        showToast('success', 'Program updated');
      } else {
        const { error } = await supabase.from('loyalty_programs').insert(payload);
        if (error) throw error;
        showToast('success', 'Program created');
      }
      setModalOpen(false);
      fetchPrograms();
    } catch (e) {
      showToast('error', 'Failed to save program');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(p: LoyaltyProgram) {
    if (!confirm(`Delete loyalty program "${p.name}"?`)) return;
    try {
      const { error } = await supabase.from('loyalty_programs').delete().eq('id', p.id);
      if (error) throw error;
      showToast('success', 'Program deleted');
      fetchPrograms();
    } catch (e) {
      showToast('error', 'Failed to delete program');
    }
  }

  if (loading) return <LoadingSpinner label="Loading loyalty programs..." />;

  return (
    <div>
      <PageHeader
        title="Loyalty Programs"
        description="Reward programs for your customers"
        action={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" /> New Program
          </Button>
        }
      />

      {programs.length === 0 ? (
        <EmptyState icon={Award} title="No loyalty programs" description="Create a loyalty program to reward your customers." />
      ) : (
        <div className="space-y-3">
          {programs.map((p) => (
            <Card key={p.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-semibold text-white">{p.name}</span>
                    <Badge color="blue">{p.program_type}</Badge>
                    <Badge color={loyaltyStatusColor(p.status)}>{p.status}</Badge>
                  </div>
                  <p className="text-sm text-zinc-400 mb-2">{p.reward_description}</p>
                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                    <span>Target: <span className="text-zinc-300">{p.target_count}</span></span>
                    <span>Points/action: <span className="text-zinc-300">{p.points_per_action}</span></span>
                    <span>Redeemed: <span className="text-zinc-300">{p.redeemed_count}</span></span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(p)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Program' : 'New Loyalty Program'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Name</label>
            <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Program name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Program Type</label>
              <Select value={form.program_type} onChange={(v) => setForm({ ...form, program_type: v })}>
                <option value="visit_based">Visit Based</option>
                <option value="points_based">Points Based</option>
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
              <Input type="number" value={form.target_count} onChange={(v) => setForm({ ...form, target_count: v })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Points Per Action</label>
              <Input type="number" value={form.points_per_action} onChange={(v) => setForm({ ...form, points_per_action: v })} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Reward Description</label>
            <TextArea value={form.reward_description} onChange={(v) => setForm({ ...form, reward_description: v })} placeholder="Describe the reward" rows={3} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
