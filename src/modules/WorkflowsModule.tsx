import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge, Button, Input, TextArea, Select, Modal } from '../components/UI';
import { useToast } from '../context/ToastContext';
import { Workflow, Plus, Pencil, Trash2, Activity, CheckCircle, XCircle } from 'lucide-react';

interface WorkflowRow {
  id: string;
  name: string;
  description: string | null;
  status: string;
  trigger_type: string;
  execution_count: number;
  success_count: number;
  failure_count: number;
}

const emptyForm = {
  name: '',
  description: '',
  trigger_type: 'manual',
};

export default function WorkflowsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workflows, setWorkflows] = useState<WorkflowRow[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    fetchWorkflows();
  }, [businessId]);

  async function fetchWorkflows() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('workflows')
        .select('id, name, description, status, trigger_type, execution_count, success_count, failure_count')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setWorkflows((data ?? []) as WorkflowRow[]);
    } catch {
      showToast('error', 'Failed to load workflows');
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(w: WorkflowRow) {
    setEditingId(w.id);
    setForm({
      name: w.name,
      description: w.description ?? '',
      trigger_type: w.trigger_type,
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
        name: form.name,
        description: form.description || null,
        trigger_type: form.trigger_type,
      };
      if (editingId) {
        const { error } = await supabase.from('workflows').update(payload).eq('id', editingId);
        if (error) throw error;
        showToast('success', 'Workflow updated');
      } else {
        const { error } = await supabase.from('workflows').insert({ ...payload, status: 'draft' });
        if (error) throw error;
        showToast('success', 'Workflow created');
      }
      setModalOpen(false);
      await fetchWorkflows();
    } catch {
      showToast('error', 'Failed to save workflow');
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
      setDeleteOpen(false);
      setDeleteId(null);
      await fetchWorkflows();
    } catch {
      showToast('error', 'Failed to delete workflow');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner label="Loading workflows..." />;

  return (
    <div>
      <PageHeader
        title="Workflows"
        description="Manage automation workflows for this business"
        action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> Add Workflow</Button>}
      />

      {workflows.length === 0 ? (
        <EmptyState icon={Workflow} title="No workflows yet" description="Create workflows to automate your business processes." action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> Add Workflow</Button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {workflows.map((w) => (
            <Card key={w.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white truncate">{w.name}</h3>
                  <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{w.description || 'No description'}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(w)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => { setDeleteId(w.id); setDeleteOpen(true); }}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                </div>
              </div>
              <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                <Badge color={w.status === 'active' ? 'green' : w.status === 'paused' ? 'yellow' : 'gray'}>{w.status}</Badge>
                <Badge color="blue">{w.trigger_type}</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/5">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-zinc-400 mb-0.5"><Activity className="w-3 h-3" /></div>
                  <p className="text-sm font-semibold text-white">{w.execution_count}</p>
                  <p className="text-xs text-zinc-600">Runs</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-emerald-400 mb-0.5"><CheckCircle className="w-3 h-3" /></div>
                  <p className="text-sm font-semibold text-white">{w.success_count}</p>
                  <p className="text-xs text-zinc-600">Success</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-red-400 mb-0.5"><XCircle className="w-3 h-3" /></div>
                  <p className="text-sm font-semibold text-white">{w.failure_count}</p>
                  <p className="text-xs text-zinc-600">Failed</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Workflow' : 'Add Workflow'}>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Name</label>
            <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="e.g. Welcome Email Flow" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Description</label>
            <TextArea value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Describe what this workflow does..." rows={3} />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Trigger Type</label>
            <Select value={form.trigger_type} onChange={(v) => setForm({ ...form, trigger_type: v })}>
              <option value="manual">Manual</option>
              <option value="review_submitted">Review Submitted</option>
              <option value="positive_review">Positive Review</option>
              <option value="negative_review">Negative Review</option>
              <option value="qr_scan">QR Scan</option>
              <option value="scheduled">Scheduled</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editingId ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Workflow" maxWidth="max-w-sm">
        <p className="text-sm text-zinc-300 mb-4">Are you sure you want to delete this workflow? This action cannot be undone.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} disabled={saving}>{saving ? 'Deleting...' : 'Delete'}</Button>
        </div>
      </Modal>
    </div>
  );
}
