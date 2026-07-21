import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge, Button, Input, TextArea, Select, Modal } from '../components/UI';
import { Megaphone, Plus, Pencil, Trash2 } from 'lucide-react';

interface Campaign {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  campaign_type: string | null;
  audience_segment: string | null;
  status: string | null;
  schedule_start: string | null;
  schedule_end: string | null;
  reach_count: number | null;
  response_count: number | null;
  conversion_count: number | null;
  created_at: string;
}

const emptyForm = {
  name: '',
  description: '',
  campaign_type: 'email',
  audience_segment: 'all',
  status: 'draft',
  schedule_start: '',
  schedule_end: '',
};

export function CampaignsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('error', 'Failed to load campaigns');
    } else {
      setCampaigns(data || []);
    }
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setModalOpen(true);
  };

  const openEdit = (c: Campaign) => {
    setEditing(c);
    setForm({
      name: c.name || '',
      description: c.description || '',
      campaign_type: c.campaign_type || 'email',
      audience_segment: c.audience_segment || 'all',
      status: c.status || 'draft',
      schedule_start: c.schedule_start ? c.schedule_start.slice(0, 16) : '',
      schedule_end: c.schedule_end ? c.schedule_end.slice(0, 16) : '',
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
      description: form.description || null,
      campaign_type: form.campaign_type,
      audience_segment: form.audience_segment,
      status: form.status,
      schedule_start: form.schedule_start ? new Date(form.schedule_start).toISOString() : null,
      schedule_end: form.schedule_end ? new Date(form.schedule_end).toISOString() : null,
    };
    let error;
    if (editing) {
      ({ error } = await supabase.from('campaigns').update(payload).eq('id', editing.id));
    } else {
      ({ error } = await supabase.from('campaigns').insert(payload));
    }
    setSaving(false);
    if (error) {
      showToast('error', 'Failed to save campaign');
      return;
    }
    showToast('success', editing ? 'Campaign updated' : 'Campaign created');
    setModalOpen(false);
    fetchCampaigns();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this campaign?')) return;
    const { error } = await supabase.from('campaigns').delete().eq('id', id);
    if (error) {
      showToast('error', 'Failed to delete campaign');
      return;
    }
    showToast('success', 'Campaign deleted');
    fetchCampaigns();
  };

  const statusColor = (s: string | null) => {
    if (s === 'active') return 'green';
    if (s === 'draft') return 'gray';
    if (s === 'scheduled') return 'blue';
    if (s === 'completed') return 'purple';
    if (s === 'paused') return 'yellow';
    return 'gray';
  };

  if (loading) return <LoadingSpinner label="Loading campaigns…" />;

  return (
    <div>
      <PageHeader
        title="Campaigns"
        description="Marketing campaigns and outreach"
        action={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" /> New Campaign
          </Button>
        }
      />

      {campaigns.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No campaigns yet"
          description="Create a campaign to reach your audience."
          action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Campaign</Button>}
        />
      ) : (
        <div className="space-y-4">
          {campaigns.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-sm font-semibold text-white">{c.name}</span>
                    {c.campaign_type && <Badge color="blue">{c.campaign_type}</Badge>}
                    {c.audience_segment && <Badge color="purple">{c.audience_segment}</Badge>}
                    {c.status && <Badge color={statusColor(c.status)}>{c.status}</Badge>}
                  </div>
                  {c.description && <p className="text-sm text-zinc-400 mb-3">{c.description}</p>}

                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div>
                      <p className="text-xs text-zinc-500">Reach</p>
                      <p className="text-sm text-zinc-200 font-medium">{c.reach_count ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Responses</p>
                      <p className="text-sm text-zinc-200 font-medium">{c.response_count ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Conversions</p>
                      <p className="text-sm text-zinc-200 font-medium">{c.conversion_count ?? 0}</p>
                    </div>
                  </div>

                  {(c.schedule_start || c.schedule_end) && (
                    <p className="text-xs text-zinc-500">
                      {c.schedule_start ? new Date(c.schedule_start).toLocaleDateString() : '—'}
                      {' → '}
                      {c.schedule_end ? new Date(c.schedule_end).toLocaleDateString() : '—'}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Campaign' : 'New Campaign'} maxWidth="max-w-xl">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Name *</label>
            <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Campaign name" />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Description</label>
            <TextArea value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Campaign description" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">Campaign Type</label>
              <Select value={form.campaign_type} onChange={(v) => setForm({ ...form, campaign_type: v })}>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="social">Social</option>
                <option value="multi">Multi-channel</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">Audience Segment</label>
              <Select value={form.audience_segment} onChange={(v) => setForm({ ...form, audience_segment: v })}>
                <option value="all">All Customers</option>
                <option value="vip">VIP</option>
                <option value="new">New</option>
                <option value="at_risk">At Risk</option>
                <option value="churned">Churned</option>
              </Select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Status</label>
            <Select value={form.status} onChange={(v) => setForm({ ...form, status: v })}>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">Schedule Start</label>
              <input
                type="datetime-local"
                value={form.schedule_start}
                onChange={(e) => setForm({ ...form, schedule_start: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-400/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">Schedule End</label>
              <input
                type="datetime-local"
                value={form.schedule_end}
                onChange={(e) => setForm({ ...form, schedule_end: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-400/50 transition-colors"
              />
            </div>
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
