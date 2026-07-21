import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import {
  LoadingSpinner, EmptyState, PageHeader, Card, Badge, Button,
  Input, TextArea, Select, Modal,
} from '../components/UI';
import {
  BarChart3, Plus, Pencil, Trash2, Calendar, Users, MousePointerClick, CheckCircle2,
} from 'lucide-react';

interface Campaign {
  id: string;
  name: string | null;
  description: string | null;
  campaign_type: string | null;
  audience_segment: string | null;
  status: string | null;
  schedule_start: string | null;
  schedule_end: string | null;
  reach_count: number | null;
  response_count: number | null;
  conversion_count: number | null;
}

const emptyForm = {
  name: '',
  description: '',
  campaign_type: 'email',
  audience_segment: '',
  status: 'draft',
  schedule_start: '',
  schedule_end: '',
  reach_count: '0',
  response_count: '0',
  conversion_count: '0',
};

const statusColor = (s: string | null): string => {
  switch (s) {
    case 'active': case 'running': return 'green';
    case 'draft': case 'planned': return 'gray';
    case 'paused': return 'yellow';
    case 'completed': return 'blue';
    case 'cancelled': case 'failed': return 'red';
    default: return 'gray';
  }
};

const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString() : '—');

export function CampaignsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('campaigns')
      .select('id, name, description, campaign_type, audience_segment, status, schedule_start, schedule_end, reach_count, response_count, conversion_count')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('error', 'Failed to load campaigns');
      setItems([]);
    } else {
      setItems((data ?? []) as Campaign[]);
    }
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (c: Campaign) => {
    setEditingId(c.id);
    setForm({
      name: c.name ?? '',
      description: c.description ?? '',
      campaign_type: c.campaign_type ?? 'email',
      audience_segment: c.audience_segment ?? '',
      status: c.status ?? 'draft',
      schedule_start: c.schedule_start ? new Date(c.schedule_start).toISOString().slice(0, 16) : '',
      schedule_end: c.schedule_end ? new Date(c.schedule_end).toISOString().slice(0, 16) : '',
      reach_count: String(c.reach_count ?? 0),
      response_count: String(c.response_count ?? 0),
      conversion_count: String(c.conversion_count ?? 0),
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { showToast('error', 'Name is required'); return; }
    setSaving(true);
    const payload = {
      business_id: businessId,
      name: form.name.trim(),
      description: form.description.trim() || null,
      campaign_type: form.campaign_type,
      audience_segment: form.audience_segment.trim() || null,
      status: form.status,
      schedule_start: form.schedule_start ? new Date(form.schedule_start).toISOString() : null,
      schedule_end: form.schedule_end ? new Date(form.schedule_end).toISOString() : null,
      reach_count: Number(form.reach_count) || 0,
      response_count: Number(form.response_count) || 0,
      conversion_count: Number(form.conversion_count) || 0,
    };
    const res = editingId
      ? await supabase.from('campaigns').update(payload).eq('id', editingId)
      : await supabase.from('campaigns').insert(payload);
    setSaving(false);
    if (res.error) { showToast('error', `Failed to save: ${res.error.message}`); return; }
    showToast('success', editingId ? 'Campaign updated' : 'Campaign created');
    setModalOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this campaign?')) return;
    const { error } = await supabase.from('campaigns').delete().eq('id', id);
    if (error) { showToast('error', `Failed to delete: ${error.message}`); return; }
    showToast('success', 'Campaign deleted');
    fetchData();
  };

  const conversionRate = (c: Campaign): number => {
    const r = c.reach_count ?? 0;
    const cv = c.conversion_count ?? 0;
    if (r <= 0) return 0;
    return Math.round((cv / r) * 1000) / 10;
  };

  return (
    <div>
      <PageHeader
        title="Campaigns"
        description="Marketing campaigns targeting customer segments."
        action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Campaign</Button>}
      />
      {loading ? (
        <LoadingSpinner label="Loading campaigns…" />
      ) : items.length === 0 ? (
        <EmptyState icon={BarChart3} title="No campaigns yet" description="Launch a campaign to engage your customers." />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {items.map((c) => (
            <Card key={c.id} className="p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{c.name}</p>
                  <p className="text-xs text-zinc-500 capitalize">{c.campaign_type ?? '—'}</p>
                </div>
                <Badge color={statusColor(c.status)}>{c.status ?? '—'}</Badge>
              </div>
              {c.description && <p className="text-xs text-zinc-400 line-clamp-2">{c.description}</p>}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {c.audience_segment && <Badge color="purple">{c.audience_segment}</Badge>}
                <span className="text-zinc-500 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {fmtDate(c.schedule_start)} → {fmtDate(c.schedule_end)}</span>
              </div>
              <div className="grid grid-cols-4 gap-2 mt-1">
                <div className="rounded-lg bg-white/5 py-2 text-center">
                  <Users className="w-3.5 h-3.5 text-blue-400 mx-auto mb-0.5" />
                  <p className="text-sm font-bold text-white">{c.reach_count ?? 0}</p>
                  <p className="text-[10px] text-zinc-500">reach</p>
                </div>
                <div className="rounded-lg bg-white/5 py-2 text-center">
                  <MousePointerClick className="w-3.5 h-3.5 text-amber-400 mx-auto mb-0.5" />
                  <p className="text-sm font-bold text-white">{c.response_count ?? 0}</p>
                  <p className="text-[10px] text-zinc-500">responses</p>
                </div>
                <div className="rounded-lg bg-white/5 py-2 text-center">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-0.5" />
                  <p className="text-sm font-bold text-white">{c.conversion_count ?? 0}</p>
                  <p className="text-[10px] text-zinc-500">conversions</p>
                </div>
                <div className="rounded-lg bg-white/5 py-2 text-center">
                  <BarChart3 className="w-3.5 h-3.5 text-violet-400 mx-auto mb-0.5" />
                  <p className="text-sm font-bold text-white">{conversionRate(c)}%</p>
                  <p className="text-[10px] text-zinc-500">conv. rate</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 border-t border-white/5 pt-2 mt-auto">
                <Button size="sm" variant="ghost" onClick={() => openEdit(c)}><Pencil className="w-3.5 h-3.5" /> Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(c.id)}><Trash2 className="w-3.5 h-3.5" /> Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Campaign' : 'New Campaign'} maxWidth="max-w-xl">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Name *</label>
            <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Summer review drive" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description</label>
            <TextArea value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Campaign description" rows={2} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Type</label>
              <Select value={form.campaign_type} onChange={(v) => setForm({ ...form, campaign_type: v })}>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="social">Social</option>
                <option value="referral">Referral</option>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Audience Segment</label>
              <Input value={form.audience_segment} onChange={(v) => setForm({ ...form, audience_segment: v })} placeholder="vip" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Status</label>
              <Select value={form.status} onChange={(v) => setForm({ ...form, status: v })}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Schedule Start</label>
              <Input type="datetime-local" value={form.schedule_start} onChange={(v) => setForm({ ...form, schedule_start: v })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Schedule End</label>
              <Input type="datetime-local" value={form.schedule_end} onChange={(v) => setForm({ ...form, schedule_end: v })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Reach Count</label>
              <Input type="number" value={form.reach_count} onChange={(v) => setForm({ ...form, reach_count: v })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Response Count</label>
              <Input type="number" value={form.response_count} onChange={(v) => setForm({ ...form, response_count: v })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Conversion Count</label>
              <Input type="number" value={form.conversion_count} onChange={(v) => setForm({ ...form, conversion_count: v })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Campaign'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
