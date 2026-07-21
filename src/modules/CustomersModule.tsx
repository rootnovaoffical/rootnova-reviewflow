import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { PageHeader, Card, Badge, Button, Input, TextArea, Select, Modal, LoadingSpinner, EmptyState } from '../components/UI';
import { useToast } from '../context/ToastContext';
import { Users, Award, Plus, Star } from 'lucide-react';

/* ----------------------------- CustomersModule ---------------------------- */
export function CustomersModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('customers').select('*').eq('business_id', businessId).order('created_at', { ascending: false });
    if (error) showToast('error', error.message);
    else setCustomers(data || []);
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => { load(); }, [load]);

  const segmentColor: Record<string, string> = { vip: 'purple', regular: 'blue', new: 'green', at_risk: 'red' };

  return (
    <div>
      <PageHeader title="Customers" description="Customer profiles and visit history" />
      {loading ? <LoadingSpinner label="Loading customers..." /> : customers.length === 0 ? (
        <EmptyState icon={Users} title="No customers" description="Customers will appear here once they interact with your business." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-zinc-400">Identifier</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-400">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-400">Visits</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-400">Reviews</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-400">Avg Rating</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-400">Segment</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-400">Last Visit</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 text-zinc-300">{c.identifier || '—'}</td>
                    <td className="px-4 py-3 text-white font-medium">{c.display_name || '—'}</td>
                    <td className="px-4 py-3 text-zinc-300">{c.total_visits ?? 0}</td>
                    <td className="px-4 py-3 text-zinc-300">{c.total_reviews ?? 0}</td>
                    <td className="px-4 py-3">
                      {c.avg_rating != null ? (
                        <span className="inline-flex items-center gap-1 text-amber-300"><Star className="w-3.5 h-3.5" />{Number(c.avg_rating).toFixed(1)}</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">{c.segment ? <Badge color={segmentColor[c.segment] || 'gray'}>{c.segment}</Badge> : '—'}</td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">{c.last_visit_at ? new Date(c.last_visit_at).toLocaleDateString() : '—'}</td>
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

/* ------------------------------ LoyaltyModule ----------------------------- */
export function LoyaltyModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ name: '', program_type: 'visit', target_count: 10, reward_description: '', points_per_action: 1, status: 'active', redeemed_count: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('loyalty_programs').select('*').eq('business_id', businessId).order('created_at', { ascending: false });
    if (error) showToast('error', error.message);
    else setPrograms(data || []);
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => { load(); }, [load]);

  function openCreate() { setEditing(null); setForm({ name: '', program_type: 'visit', target_count: 10, reward_description: '', points_per_action: 1, status: 'active', redeemed_count: 0 }); setShowModal(true); }
  function openEdit(p: any) { setEditing(p); setForm({ name: p.name || '', program_type: p.program_type || 'visit', target_count: p.target_count ?? 10, reward_description: p.reward_description || '', points_per_action: p.points_per_action ?? 1, status: p.status || 'active', redeemed_count: p.redeemed_count ?? 0 }); setShowModal(true); }

  async function handleSave() {
    if (!form.name) { showToast('error', 'Name is required'); return; }
    const payload = { ...form, target_count: Number(form.target_count), points_per_action: Number(form.points_per_action), redeemed_count: Number(form.redeemed_count) };
    if (editing) {
      const { error } = await supabase.from('loyalty_programs').update(payload).eq('id', editing.id);
      if (error) { showToast('error', error.message); return; }
      showToast('success', 'Program updated');
    } else {
      const { error } = await supabase.from('loyalty_programs').insert({ business_id: businessId, ...payload });
      if (error) { showToast('error', error.message); return; }
      showToast('success', 'Program created');
    }
    setShowModal(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this loyalty program?')) return;
    const { error } = await supabase.from('loyalty_programs').delete().eq('id', id);
    if (error) { showToast('error', error.message); return; }
    showToast('success', 'Program deleted');
    load();
  }

  const statusColor: Record<string, string> = { active: 'green', paused: 'yellow', ended: 'gray' };

  return (
    <div>
      <PageHeader title="Loyalty Programs" description="Reward programs for repeat customers" action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Program</Button>} />
      {loading ? <LoadingSpinner label="Loading programs..." /> : programs.length === 0 ? (
        <EmptyState icon={Award} title="No loyalty programs" description="Create a loyalty program to reward customers." action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Program</Button>} />
      ) : (
        <div className="space-y-3">
          {programs.map((p) => (
            <Card key={p.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-semibold text-white">{p.name}</span>
                    <Badge color="blue">{p.program_type}</Badge>
                    <Badge color={statusColor[p.status] || 'gray'}>{p.status}</Badge>
                  </div>
                  {p.reward_description && <p className="text-sm text-zinc-400">{p.reward_description}</p>}
                  <div className="flex gap-4 mt-2 text-xs text-zinc-500">
                    <span>Target: <span className="text-zinc-300">{p.target_count}</span></span>
                    <span>Points/action: <span className="text-zinc-300">{p.points_per_action}</span></span>
                    <span>Redeemed: <span className="text-zinc-300">{p.redeemed_count}</span></span>
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)}>Delete</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Program' : 'New Program'}>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Name</label>
            <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Program name" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Program Type</label>
            <Select value={form.program_type} onChange={(v) => setForm({ ...form, program_type: v })}>
              <option value="visit">Visit</option>
              <option value="points">Points</option>
              <option value="spend">Spend</option>
            </Select>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Target Count</label>
            <Input value={String(form.target_count)} onChange={(v) => setForm({ ...form, target_count: Number(v) })} type="number" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Reward Description</label>
            <TextArea value={form.reward_description} onChange={(v) => setForm({ ...form, reward_description: v })} placeholder="What the customer gets" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Points Per Action</label>
            <Input value={String(form.points_per_action)} onChange={(v) => setForm({ ...form, points_per_action: Number(v) })} type="number" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Status</label>
            <Select value={form.status} onChange={(v) => setForm({ ...form, status: v })}>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="ended">Ended</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Save' : 'Create'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
