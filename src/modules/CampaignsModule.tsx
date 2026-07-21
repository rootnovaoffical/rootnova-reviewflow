import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { PageHeader, Card, Badge, Button, Input, TextArea, Select, Modal, LoadingSpinner, EmptyState } from '../components/UI';
import { useToast } from '../context/ToastContext';
import { Megaphone, Plus, Users } from 'lucide-react';

export function CampaignsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ name: '', description: '', campaign_type: '', audience_segment: '', status: 'draft', schedule_start: '', schedule_end: '', reach_count: 0, response_count: 0, conversion_count: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('campaigns').select('*').eq('business_id', businessId).order('created_at', { ascending: false });
    if (error) showToast('error', error.message);
    else setCampaigns(data || []);
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => { load(); }, [load]);

  function openCreate() { setEditing(null); setForm({ name: '', description: '', campaign_type: '', audience_segment: '', status: 'draft', schedule_start: '', schedule_end: '', reach_count: 0, response_count: 0, conversion_count: 0 }); setShowModal(true); }
  function openEdit(c: any) { setEditing(c); setForm({ name: c.name || '', description: c.description || '', campaign_type: c.campaign_type || '', audience_segment: c.audience_segment || '', status: c.status || 'draft', schedule_start: c.schedule_start || '', schedule_end: c.schedule_end || '', reach_count: c.reach_count ?? 0, response_count: c.response_count ?? 0, conversion_count: c.conversion_count ?? 0 }); setShowModal(true); }

  async function handleSave() {
    if (!form.name) { showToast('error', 'Name is required'); return; }
    const payload = { ...form, reach_count: Number(form.reach_count), response_count: Number(form.response_count), conversion_count: Number(form.conversion_count) };
    if (editing) {
      const { error } = await supabase.from('campaigns').update(payload).eq('id', editing.id);
      if (error) { showToast('error', error.message); return; }
      showToast('success', 'Campaign updated');
    } else {
      const { error } = await supabase.from('campaigns').insert({ business_id: businessId, ...payload });
      if (error) { showToast('error', error.message); return; }
      showToast('success', 'Campaign created');
    }
    setShowModal(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this campaign?')) return;
    const { error } = await supabase.from('campaigns').delete().eq('id', id);
    if (error) { showToast('error', error.message); return; }
    showToast('success', 'Campaign deleted');
    load();
  }

  const statusColor: Record<string, string> = { draft: 'gray', active: 'green', paused: 'yellow', completed: 'blue', failed: 'red' };

  function conversionRate(c: any) {
    if (!c.reach_count || c.reach_count === 0) return '0%';
    return `${Math.round((c.conversion_count / c.reach_count) * 100)}%`;
  }

  return (
    <div>
      <PageHeader title="Campaigns" description="Marketing campaigns and performance" action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Campaign</Button>} />
      {loading ? <LoadingSpinner label="Loading campaigns..." /> : campaigns.length === 0 ? (
        <EmptyState icon={Megaphone} title="No campaigns" description="Create a marketing campaign to reach your audience." action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Campaign</Button>} />
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-semibold text-white">{c.name}</span>
                    {c.campaign_type && <Badge color="purple">{c.campaign_type}</Badge>}
                    <Badge color={statusColor[c.status] || 'gray'}>{c.status}</Badge>
                  </div>
                  {c.description && <p className="text-sm text-zinc-400">{c.description}</p>}
                  {c.audience_segment && (
                    <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1"><Users className="w-3 h-3" /> Audience: {c.audience_segment}</p>
                  )}
                  <div className="flex gap-4 mt-2 text-xs text-zinc-500">
                    <span>Reach: <span className="text-zinc-300">{c.reach_count}</span></span>
                    <span>Responses: <span className="text-zinc-300">{c.response_count}</span></span>
                    <span>Conversions: <span className="text-zinc-300">{c.conversion_count}</span></span>
                    <span>Conv. Rate: <span className="text-emerald-300">{conversionRate(c)}</span></span>
                  </div>
                  {(c.schedule_start || c.schedule_end) && (
                    <p className="text-xs text-zinc-600 mt-1.5">
                      {c.schedule_start && new Date(c.schedule_start).toLocaleDateString()} → {c.schedule_end && new Date(c.schedule_end).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)}>Delete</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Campaign' : 'New Campaign'}>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Name</label>
            <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Campaign name" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Description</label>
            <TextArea value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Campaign description" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Campaign Type</label>
            <Input value={form.campaign_type} onChange={(v) => setForm({ ...form, campaign_type: v })} placeholder="e.g. email, social" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Audience Segment</label>
            <Input value={form.audience_segment} onChange={(v) => setForm({ ...form, audience_segment: v })} placeholder="e.g. vip, new customers" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Status</label>
            <Select value={form.status} onChange={(v) => setForm({ ...form, status: v })}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Schedule Start</label>
              <Input value={form.schedule_start} onChange={(v) => setForm({ ...form, schedule_start: v })} type="date" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Schedule End</label>
              <Input value={form.schedule_end} onChange={(v) => setForm({ ...form, schedule_end: v })} type="date" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Reach</label>
              <Input value={String(form.reach_count)} onChange={(v) => setForm({ ...form, reach_count: Number(v) })} type="number" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Responses</label>
              <Input value={String(form.response_count)} onChange={(v) => setForm({ ...form, response_count: Number(v) })} type="number" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Conversions</label>
              <Input value={String(form.conversion_count)} onChange={(v) => setForm({ ...form, conversion_count: Number(v) })} type="number" />
            </div>
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
