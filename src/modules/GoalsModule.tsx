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
import type { BusinessGoal } from '../lib/types';
import { Target, Plus, Pencil, Trash2 } from 'lucide-react';

const goalStatusColor = (status: string): string => {
  switch ((status || '').toLowerCase()) {
    case 'active':
      return 'blue';
    case 'achieved':
      return 'green';
    case 'failed':
      return 'red';
    case 'paused':
      return 'yellow';
    default:
      return 'gray';
  }
};

export function GoalsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<BusinessGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<BusinessGoal | null>(null);
  const [saving, setSaving] = useState(false);

  // form state
  const [fGoalType, setFGoalType] = useState('reviews');
  const [fTitle, setFTitle] = useState('');
  const [fDescription, setFDescription] = useState('');
  const [fTargetValue, setFTargetValue] = useState('100');
  const [fCurrentValue, setFCurrentValue] = useState('0');
  const [fUnit, setFUnit] = useState('');
  const [fStatus, setFStatus] = useState('active');
  const [fDeadline, setFDeadline] = useState('');

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('business_goals')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('error', `Failed to load goals: ${error.message}`);
    } else {
      setItems(data as BusinessGoal[]);
    }
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const openCreate = () => {
    setEditing(null);
    setFGoalType('reviews');
    setFTitle('');
    setFDescription('');
    setFTargetValue('100');
    setFCurrentValue('0');
    setFUnit('');
    setFStatus('active');
    setFDeadline('');
    setShowModal(true);
  };

  const openEdit = (g: BusinessGoal) => {
    setEditing(g);
    setFGoalType(g.goal_type || 'reviews');
    setFTitle(g.title);
    setFDescription(g.description || '');
    setFTargetValue(String(g.target_value ?? 0));
    setFCurrentValue(String(g.current_value ?? 0));
    setFUnit(g.unit || '');
    setFStatus(g.status || 'active');
    setFDeadline(g.deadline ? g.deadline.slice(0, 10) : '');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!fTitle.trim()) {
      showToast('error', 'Title is required');
      return;
    }
    setSaving(true);
    const payload = {
      business_id: businessId,
      goal_type: fGoalType,
      title: fTitle,
      description: fDescription || null,
      target_value: Number(fTargetValue) || 0,
      current_value: Number(fCurrentValue) || 0,
      unit: fUnit || null,
      status: fStatus,
      deadline: fDeadline ? new Date(fDeadline).toISOString() : null,
    };
    let error;
    if (editing) {
      ({ error } = await supabase.from('business_goals').update(payload).eq('id', editing.id));
    } else {
      ({ error } = await supabase.from('business_goals').insert(payload));
    }
    setSaving(false);
    if (error) {
      showToast('error', `Failed to save goal: ${error.message}`);
      return;
    }
    showToast('success', editing ? 'Goal updated' : 'Goal created');
    setShowModal(false);
    fetchItems();
  };

  const handleDelete = async (g: BusinessGoal) => {
    if (!confirm(`Delete goal "${g.title}"?`)) return;
    const { error } = await supabase.from('business_goals').delete().eq('id', g.id);
    if (error) {
      showToast('error', `Delete failed: ${error.message}`);
      return;
    }
    showToast('success', 'Goal deleted');
    fetchItems();
  };

  if (loading) return <LoadingSpinner label="Loading goals…" />;

  return (
    <div>
      <PageHeader
        title="Business Goals"
        description="Track and manage your business goals"
        action={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" /> New Goal
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No goals yet"
          description="Create a business goal to track progress."
        />
      ) : (
        <div className="grid gap-3">
          {items.map((g) => {
            const target = g.target_value || 0;
            const current = g.current_value || 0;
            const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
            return (
              <Card key={g.id} className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-semibold text-white">{g.title}</span>
                      <Badge color="blue">{g.goal_type}</Badge>
                      <Badge color={goalStatusColor(g.status)}>{g.status}</Badge>
                    </div>
                    {g.description && (
                      <p className="text-sm text-zinc-400 mb-2">{g.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(g)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(g)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">
                      {current} / {target}
                      {g.unit ? ` ${g.unit}` : ''}
                    </span>
                    <span className="text-zinc-300 font-medium">{pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pct >= 100
                          ? 'bg-emerald-500'
                          : pct >= 75
                            ? 'bg-blue-500'
                            : pct >= 50
                              ? 'bg-blue-400'
                              : 'bg-amber-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {g.deadline && (
                  <p className="text-xs text-zinc-600 mt-2">
                    Deadline: {new Date(g.deadline).toLocaleDateString()}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Goal' : 'New Goal'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Goal Type</label>
              <Select value={fGoalType} onChange={setFGoalType}>
                <option value="reviews">Reviews</option>
                <option value="rating">Rating</option>
                <option value="revenue">Revenue</option>
                <option value="customers">Customers</option>
                <option value="visits">Visits</option>
                <option value="loyalty">Loyalty</option>
                <option value="custom">Custom</option>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Status</label>
              <Select value={fStatus} onChange={setFStatus}>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="achieved">Achieved</option>
                <option value="failed">Failed</option>
              </Select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Title *</label>
            <Input value={fTitle} onChange={setFTitle} placeholder="Goal title" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description</label>
            <TextArea
              value={fDescription}
              onChange={setFDescription}
              placeholder="Goal description"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Target</label>
              <Input type="number" value={fTargetValue} onChange={setFTargetValue} />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Current</label>
              <Input type="number" value={fCurrentValue} onChange={setFCurrentValue} />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Unit</label>
              <Input value={fUnit} onChange={setFUnit} placeholder="e.g. reviews" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Deadline</label>
            <Input type="date" value={fDeadline} onChange={setFDeadline} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Goal'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
