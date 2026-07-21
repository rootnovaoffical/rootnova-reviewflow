import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import {
  LoadingSpinner,
  EmptyState,
  PageHeader,
  Card,
  Badge,
  Button,
  Input,
  TextArea,
  Select,
  Modal,
} from '../components/UI';
import type { Campaign } from '../lib/types';
import { Megaphone, Plus, Pencil, Trash2 } from 'lucide-react';

const campaignStatusColor = (status: string): string => {
  switch ((status || '').toLowerCase()) {
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
    case 'cancelled':
    case 'failed':
      return 'red';
    default:
      return 'gray';
  }
};

export function CampaignsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [saving, setSaving] = useState(false);

  // form state
  const [fName, setFName] = useState('');
  const [fDescription, setFDescription] = useState('');
  const [fCampaignType, setFCampaignType] = useState('promo');
  const [fAudienceSegment, setFAudienceSegment] = useState('');
  const [fStatus, setFStatus] = useState('draft');
  const [fScheduleStart, setFScheduleStart] = useState('');
  const [fScheduleEnd, setFScheduleEnd] = useState('');

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('error', `Failed to load campaigns: ${error.message}`);
    } else {
      setItems(data as Campaign[]);
    }
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const openCreate = () => {
    setEditing(null);
    setFName('');
    setFDescription('');
    setFCampaignType('promo');
    setFAudienceSegment('');
    setFStatus('draft');
    setFScheduleStart('');
    setFScheduleEnd('');
    setShowModal(true);
  };

  const openEdit = (c: Campaign) => {
    setEditing(c);
    setFName(c.name);
    setFDescription(c.description || '');
    setFCampaignType(c.campaign_type || 'promo');
    setFAudienceSegment(c.audience_segment || '');
    setFStatus(c.status || 'draft');
    setFScheduleStart(c.schedule_start ? c.schedule_start.slice(0, 16) : '');
    setFScheduleEnd(c.schedule_end ? c.schedule_end.slice(0, 16) : '');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!fName.trim()) {
      showToast('error', 'Name is required');
      return;
    }
    setSaving(true);
    const payload = {
      business_id: businessId,
      name: fName,
      description: fDescription || null,
      campaign_type: fCampaignType,
      audience_segment: fAudienceSegment || null,
      status: fStatus,
      schedule_start: fScheduleStart ? new Date(fScheduleStart).toISOString() : null,
      schedule_end: fScheduleEnd ? new Date(fScheduleEnd).toISOString() : null,
    };
    let error;
    if (editing) {
      ({ error } = await supabase.from('campaigns').update(payload).eq('id', editing.id));
    } else {
      ({ error } = await supabase.from('campaigns').insert(payload));
    }
    setSaving(false);
    if (error) {
      showToast('error', `Failed to save campaign: ${error.message}`);
      return;
    }
    showToast('success', editing ? 'Campaign updated' : 'Campaign created');
    setShowModal(false);
    fetchItems();
  };

  const handleDelete = async (c: Campaign) => {
    if (!confirm(`Delete campaign "${c.name}"?`)) return;
    const { error } = await supabase.from('campaigns').delete().eq('id', c.id);
    if (error) {
      showToast('error', `Delete failed: ${error.message}`);
      return;
    }
    showToast('success', 'Campaign deleted');
    fetchItems();
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

      {items.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No campaigns yet"
          description="Create a campaign to reach your customers."
        />
      ) : (
        <div className="grid gap-3">
          {items.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold text-white">{c.name}</span>
                    <Badge color="blue">{c.campaign_type}</Badge>
                    <Badge color={campaignStatusColor(c.status)}>{c.status}</Badge>
                    {c.audience_segment && <Badge color="purple">{c.audience_segment}</Badge>}
                  </div>
                  {c.description && (
                    <p className="text-sm text-zinc-400 mb-2 line-clamp-2">{c.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(c)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-2 mb-2">
                <div className="rounded-lg bg-white/5 px-3 py-2">
                  <p className="text-xs text-zinc-500">Reach</p>
                  <p className="text-lg font-semibold text-white">{c.reach_count ?? 0}</p>
                </div>
                <div className="rounded-lg bg-white/5 px-3 py-2">
                  <p className="text-xs text-zinc-500">Responses</p>
                  <p className="text-lg font-semibold text-white">{c.response_count ?? 0}</p>
                </div>
                <div className="rounded-lg bg-white/5 px-3 py-2">
                  <p className="text-xs text-zinc-500">Conversions</p>
                  <p className="text-lg font-semibold text-white">{c.conversion_count ?? 0}</p>
                </div>
              </div>

              {(c.schedule_start || c.schedule_end) && (
                <p className="text-xs text-zinc-600">
                  {c.schedule_start ? `Start: ${new Date(c.schedule_start).toLocaleDateString()}` : ''}
                  {c.schedule_start && c.schedule_end ? ' · ' : ''}
                  {c.schedule_end ? `End: ${new Date(c.schedule_end).toLocaleDateString()}` : ''}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Campaign' : 'New Campaign'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Name *</label>
            <Input value={fName} onChange={setFName} placeholder="Campaign name" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description</label>
            <TextArea
              value={fDescription}
              onChange={setFDescription}
              placeholder="Campaign description"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Campaign Type</label>
              <Select value={fCampaignType} onChange={setFCampaignType}>
                <option value="promo">Promo</option>
                <option value="winback">Win-back</option>
                <option value="loyalty">Loyalty</option>
                <option value="referral">Referral</option>
                <option value="announcement">Announcement</option>
                <option value="seasonal">Seasonal</option>
                <option value="custom">Custom</option>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Status</label>
              <Select value={fStatus} onChange={setFStatus}>
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Audience Segment</label>
            <Input
              value={fAudienceSegment}
              onChange={setFAudienceSegment}
              placeholder="e.g. vip, new, at-risk"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Schedule Start</label>
              <Input
                type="datetime-local"
                value={fScheduleStart}
                onChange={setFScheduleStart}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Schedule End</label>
              <Input
                type="datetime-local"
                value={fScheduleEnd}
                onChange={setFScheduleEnd}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Campaign'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
