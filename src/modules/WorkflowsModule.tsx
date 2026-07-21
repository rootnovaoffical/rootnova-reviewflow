import { useState, useEffect } from 'react';
import { Workflow, Plus, Trash2, Play, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge, Button, Input, TextArea, Select, Modal } from '../components/UI';
import { useToast } from '../context/ToastContext';

interface WorkflowRow {
  id: string;
  name: string;
  description: string | null;
  status: string;
  trigger_type: string;
  execution_count: number;
  success_count: number;
  failure_count: number;
  created_at: string;
}

const TRIGGER_TYPES = ['manual', 'review_submitted', 'review_completed', 'low_rating', 'positive_rating', 'schedule'];
const WORKFLOW_STATUSES = ['draft', 'active', 'paused', 'archived'];

export default function WorkflowsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [workflows, setWorkflows] = useState<WorkflowRow[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    trigger_type: 'manual',
  });

  useEffect(() => {
    fetchWorkflows();
  }, [businessId]);

  async function fetchWorkflows() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('workflows')
        .select('id, name, description, status, trigger_type, execution_count, success_count, failure_count, created_at')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorkflows((data as WorkflowRow[]) ?? []);
    } catch (err: any) {
      showToast('error', err.message ?? 'Failed to load workflows');
      setWorkflows([]);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setForm({ name: '', description: '', trigger_type: 'manual' });
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
        trigger_type: form.trigger_type,
        status: 'draft',
      };

      const { error } = await supabase.from('workflows').insert(payload);
      if (error) throw error;
      showToast('success', 'Workflow created');
      setModalOpen(false);
      await fetchWorkflows();
    } catch (err: any) {
      showToast('error', err.message ?? 'Failed to create workflow');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('workflows').delete().eq('id', deleteId);
      if (error) throw error;
      showToast('success', 'Workflow deleted');
      setDeleteId(null);
      await fetchWorkflows();
    } catch (err: any) {
      showToast('error', err.message ?? 'Failed to delete workflow');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner label="Loading workflows..." />;

  return (
    <div>
      <PageHeader
        title="Workflows"
        description="Automate multi-step processes"
        action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> Add Workflow</Button>}
      />

      {workflows.length === 0 ? (
        <EmptyState icon={Workflow} title="No workflows yet" description="Create workflows to automate multi-step processes for your business." action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> Add Workflow</Button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {workflows.map((w) => (
            <Card key={w.id} className="p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate">{w.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <Badge color={w.status === 'active' ? 'green' : w.status === 'draft' ? 'gray' : w.status === 'paused' ? 'yellow' : 'gray'}>{w.status}</Badge>
                    <Badge color="blue">{w.trigger_type}</Badge>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setDeleteId(w.id)}><Trash2 className="w-3.5 h-3.5 text-red-400" /></Button>
              </div>
              <p className="text-sm text-zinc-400 line-clamp-2 mb-3 min-h-[2.5rem]">
                {w.description || <span className="text-zinc-600 italic">No description</span>}
              </p>
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/10">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-zinc-500 mb-0.5">
                    <Play className="w-3 h-3" /> Runs
                  </div>
                  <p className="text-sm font-semibold text-white">{w.execution_count}</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-zinc-500 mb-0.5">
                    <CheckCircle className="w-3 h-3" /> Success
                  </div>
                  <p className="text-sm font-semibold text-emerald-400">{w.success_count}</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-zinc-500 mb-0.5">
                    <XCircle className="w-3 h-3" /> Failed
                  </div>
                  <p className="text-sm font-semibold text-red-400">{w.failure_count}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Workflow">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Name</label>
            <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Post-review follow-up" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description</label>
            <TextArea value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Describe what this workflow does..." rows={3} />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Trigger Type</label>
            <Select value={form.trigger_type} onChange={(v) => setForm({ ...form, trigger_type: v })}>
              {TRIGGER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Creating...' : 'Create'}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Workflow" maxWidth="max-w-sm">
        <p className="text-sm text-zinc-300 mb-4">Are you sure you want to delete this workflow? This action cannot be undone.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} disabled={saving}>{saving ? 'Deleting...' : 'Delete'}</Button>
        </div>
      </Modal>
    </div>
  );
}
