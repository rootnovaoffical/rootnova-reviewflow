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
import type { Customer, LoyaltyProgram } from '../lib/types';
import { Users, Award, Plus, Pencil, Trash2, Star } from 'lucide-react';

/* ============================================================
 * CustomersModule
 * ============================================================ */

const segmentColor = (segment: string | null): string => {
  switch ((segment || '').toLowerCase()) {
    case 'vip':
      return 'purple';
    case 'loyal':
      return 'blue';
    case 'new':
      return 'green';
    case 'at-risk':
    case 'at_risk':
      return 'red';
    case 'churned':
      return 'gray';
    default:
      return 'gray';
  }
};

function ratingStars(rating: number | null): string {
  if (rating == null) return '—';
  return `${rating.toFixed(1)} ★`;
}

export function CustomersModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('error', `Failed to load customers: ${error.message}`);
    } else {
      setItems(data as Customer[]);
    }
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  if (loading) return <LoadingSpinner label="Loading customers…" />;

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Customers are auto-created from reviews"
      />

      {items.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers yet"
          description="Customers appear automatically when they leave reviews."
        />
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
                {items.map((c) => (
                  <tr key={c.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 text-zinc-300 font-mono text-xs">{c.identifier}</td>
                    <td className="px-4 py-3 text-white">{c.display_name || '—'}</td>
                    <td className="px-4 py-3 text-right text-zinc-300">{c.total_visits}</td>
                    <td className="px-4 py-3 text-right text-zinc-300">{c.total_reviews}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1 text-amber-400">
                        <Star className="w-3.5 h-3.5" />
                        {ratingStars(c.avg_rating)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={segmentColor(c.segment)}>{c.segment || 'none'}</Badge>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">
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

const programTypeColor = (type: string): string => {
  switch ((type || '').toLowerCase()) {
    case 'visits':
      return 'blue';
    case 'points':
      return 'purple';
    case 'tier':
      return 'yellow';
    case 'referral':
      return 'green';
    default:
      return 'gray';
  }
};

const programStatusColor = (status: string): string => {
  switch ((status || '').toLowerCase()) {
    case 'active':
      return 'green';
    case 'paused':
      return 'yellow';
    case 'ended':
    case 'expired':
      return 'gray';
    default:
      return 'gray';
  }
};

export function LoyaltyModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<LoyaltyProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<LoyaltyProgram | null>(null);
  const [saving, setSaving] = useState(false);

  // form state
  const [fName, setFName] = useState('');
  const [fProgramType, setFProgramType] = useState('visits');
  const [fTargetCount, setFTargetCount] = useState('10');
  const [fRewardDescription, setFRewardDescription] = useState('');
  const [fPointsPerAction, setFPointsPerAction] = useState('1');
  const [fStatus, setFStatus] = useState('active');

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('loyalty_programs')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('error', `Failed to load loyalty programs: ${error.message}`);
    } else {
      setItems(data as LoyaltyProgram[]);
    }
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const openCreate = () => {
    setEditing(null);
    setFName('');
    setFProgramType('visits');
    setFTargetCount('10');
    setFRewardDescription('');
    setFPointsPerAction('1');
    setFStatus('active');
    setShowModal(true);
  };

  const openEdit = (p: LoyaltyProgram) => {
    setEditing(p);
    setFName(p.name);
    setFProgramType(p.program_type || 'visits');
    setFTargetCount(String(p.target_count ?? 10));
    setFRewardDescription(p.reward_description || '');
    setFPointsPerAction(String(p.points_per_action ?? 1));
    setFStatus(p.status || 'active');
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
      program_type: fProgramType,
      target_count: Number(fTargetCount) || 0,
      reward_description: fRewardDescription || null,
      points_per_action: Number(fPointsPerAction) || 0,
      status: fStatus,
    };
    let error;
    if (editing) {
      ({ error } = await supabase.from('loyalty_programs').update(payload).eq('id', editing.id));
    } else {
      ({ error } = await supabase.from('loyalty_programs').insert(payload));
    }
    setSaving(false);
    if (error) {
      showToast('error', `Failed to save program: ${error.message}`);
      return;
    }
    showToast('success', editing ? 'Program updated' : 'Program created');
    setShowModal(false);
    fetchItems();
  };

  const handleDelete = async (p: LoyaltyProgram) => {
    if (!confirm(`Delete program "${p.name}"?`)) return;
    const { error } = await supabase.from('loyalty_programs').delete().eq('id', p.id);
    if (error) {
      showToast('error', `Delete failed: ${error.message}`);
      return;
    }
    showToast('success', 'Program deleted');
    fetchItems();
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

      {items.length === 0 ? (
        <EmptyState
          icon={Award}
          title="No loyalty programs"
          description="Create a loyalty program to reward your customers."
        />
      ) : (
        <div className="grid gap-3">
          {items.map((p) => (
            <Card key={p.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold text-white">{p.name}</span>
                    <Badge color={programTypeColor(p.program_type)}>{p.program_type}</Badge>
                    <Badge color={programStatusColor(p.status)}>{p.status}</Badge>
                  </div>
                  {p.reward_description && (
                    <p className="text-sm text-zinc-400 mb-1">{p.reward_description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                    <span>Target: <span className="text-zinc-300">{p.target_count}</span></span>
                    <span>Points/action: <span className="text-zinc-300">{p.points_per_action}</span></span>
                    <span>Redeemed: <span className="text-zinc-300">{p.redeemed_count}</span></span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
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

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Program' : 'New Loyalty Program'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Name *</label>
            <Input value={fName} onChange={setFName} placeholder="Program name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Program Type</label>
              <Select value={fProgramType} onChange={setFProgramType}>
                <option value="visits">Visits</option>
                <option value="points">Points</option>
                <option value="tier">Tier</option>
                <option value="referral">Referral</option>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Status</label>
              <Select value={fStatus} onChange={setFStatus}>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="ended">Ended</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Target Count</label>
              <Input type="number" value={fTargetCount} onChange={setFTargetCount} />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Points Per Action</label>
              <Input type="number" value={fPointsPerAction} onChange={setFPointsPerAction} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Reward Description</label>
            <TextArea
              value={fRewardDescription}
              onChange={setFRewardDescription}
              placeholder="Describe the reward"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Program'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
