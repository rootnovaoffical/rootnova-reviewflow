import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge, Button, Input, TextArea, Select, Modal } from '../components/UI';
import { useToast } from '../context/ToastContext';
import { Megaphone, Plus, Pencil, Trash2, Calendar, Users, Mail, MousePointerClick, CheckCircle } from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  campaign_type: string;
  audience_segment: string | null;
  status: string;
  schedule_start: string | null;
  schedule_end: string | null;
  reach_count: number;
  response_count: number;
  conversion_count: number;
}

interface CampaignForm {
  name: string;
  description: string;
  campaign_type: string;
  audience_segment: string;
  status: string;
  schedule_start: string;
  schedule_end: string;
}

const emptyCampaignForm: CampaignForm = {
  name: '',
  description: '',
  campaign_type: 'review',
  audience_segment: '',
  status: 'draft',
  schedule_start: '',
  schedule_end: '',
};

function statusColor(status: string): string {
  switch (status) {
    case 'active':
    case 'running':
      return 'green';
    case 'draft':
      return 'gray';
    case 'scheduled':
      return 'blue';
    case 'completed':
      return 'purple';
    case 'paused':
      return 'yellow';
    case 'failed':
      return 'red';
    default:
      return 'gray';
  }
}

export function CampaignsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [form, setForm] = useState<CampaignForm>(emptyCampaignForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCampaigns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  async function fetchCampaigns() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, name, description, campaign_type, audience_segment, status, schedule_start, schedule_end, reach_count, response_count, conversion_count')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCampaigns((data ?? []) as Campaign[]);
    } catch (e) {
      showToast('error', 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyCampaignForm);
    setModalOpen(true);
  }

  function openEdit(c: Campaign) {
    setEditing(c);
    setForm({
      name: c.name,
      description: c.description ?? '',
      campaign_type: c.campaign_type,
      audience_segment: c.audience_segment ?? '',
      status: c.status,
      schedule_start: c.schedule_start ? c.schedule_start.slice(0, 16) : '',
      schedule_end: c.schedule_end ? c.schedule_end.slice(0, 16) : '',
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      showToast('error', 'Name is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        business_id: businessId,
        name: form.name.trim(),
        description: form.description.trim() || null,
        campaign_type: form.campaign_type,
        audience_segment: form.audience_segment.trim() || null,
        status: form.status,
        schedule_start: form.schedule_start ? new Date(form.schedule_start).toISOString() : null,
        schedule_end: form.schedule_end ? new Date(form.schedule_end).toISOString() : null,
      };
      if (editing) {
        const { error } = await supabase.from('campaigns').update(payload).eq('id', editing.id);
        if (error) throw error;
        showToast('success', 'Campaign updated');
      } else {
        const { error } = await supabase.from('campaigns').insert(payload);
        if (error) throw error;
        showToast('success', 'Campaign created');
      }
      setModalOpen(false);
      fetchCampaigns();
    } catch (e) {
      showToast('error', 'Failed to save campaign');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(c: Campaign) {
    if (!confirm(`Delete campaign "${c.name}"?`)) return;
    try {
      const { error } = await supabase.from('campaigns').delete().eq('id', c.id);
      if (error) throw error;
      showToast('success', 'Campaign deleted');
      fetchCampaigns();
    } catch (e) {
      showToast('error', 'Failed to delete campaign');
    }
  }

  if (loading) return <LoadingSpinner label="Loading campaigns..." />;

  return (
    <div>
      <PageHeader
        title="Campaigns"
        description="Marketing campaigns and their performance"
        action={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" /> New Campaign
          </Button>
        }
      />

      {campaigns.length === 0 ? (
        <EmptyState icon={Megaphone} title="No campaigns yet" description="Create a campaign to reach your audience." />
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const convRate = c.reach_count > 0 ? Math.round((c.conversion_count / c.reach_count) * 100) : 0;
            return (
              <Card key={c.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-semibold text-white">{c.name}</span>
                      <Badge color="blue">{c.campaign_type}</Badge>
                      <Badge color={statusColor(c.status)}>{c.status}</Badge>
                      {c.audience_segment && <Badge color="gray">{c.audience_segment}</Badge>}
                    </div>
                    {c.description && <p className="text-sm text-zinc-400 mb-3">{c.description}</p>}
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="flex items-center gap-2 text-xs">
                        <Users className="w-4 h-4 text-zinc-500" />
                        <div>
                          <p className="text-zinc-500">Reach</p>
                          <p className="text-zinc-200 font-medium">{c.reach_count}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Mail className="w-4 h-4 text-zinc-500" />
                        <div>
                          <p className="text-zinc-500">Responses</p>
                          <p className="text-zinc-200 font-medium">{c.response_count}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <CheckCircle className="w-4 h-4 text-zinc-500" />
                        <div>
                          <p className="text-zinc-500">Conversions</p>
                          <p className="text-zinc-200 font-medium">{c.conversion_count} ({convRate}%)</p>
                        </div>
                      </div>
                    </div>
                    {(c.schedule_start || c.schedule_end) && (
                      <div className="flex items-center gap-1 text-xs text-zinc-500">
                        <Calendar className="w-3 h-3" />
                        {c.schedule_start && new Date(c.schedule_start).toLocaleDateString()}
                        {c.schedule_start && c.schedule_end && ' → '}
                        {c.schedule_end && new Date(c.schedule_end).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(c)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Campaign' : 'New Campaign'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Name</label>
            <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Campaign name" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description</label>
            <TextArea value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Optional" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Campaign Type</label>
              <Select value={form.campaign_type} onChange={(v) => setForm({ ...form, campaign_type: v })}>
                <option value="review">Review</option>
                <option value="promotion">Promotion</option>
                <option value="referral">Referral</option>
                <option value="retention">Retention</option>
                <option value="winback">Win-back</option>
                <option value="custom">Custom</option>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Status</label>
              <Select value={form.status} onChange={(v) => setForm({ ...form, status: v })}>
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </Select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Audience Segment</label>
            <Input value={form.audience_segment} onChange={(v) => setForm({ ...form, audience_segment: v })} placeholder="e.g. vip, new, at_risk" />
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
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              <MousePointerClick className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
