import { useEffect, useState } from 'react';
import { Plus, Trash2, Workflow as WorkflowIcon, Activity, CheckCircle2, XCircle } from 'lucide-react';
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

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  status: string;
  trigger_type: string;
  execution_count: number;
  success_count: number;
  failure_count: number;
}

const WORKFLOW_STATUSES = ['draft', 'active', 'paused', 'archived'];
const TRIGGER_TYPES = ['manual', 'review_submitted', 'low_rating', 'positive_rating', 'scheduled'];

export default function WorkflowsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Workflow | null>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    trigger_type: 'manual',
  });

  useEffect(() => {
    fetchWorkflows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  async function fetchWorkflows() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('workflows')
        .select(
          'id, name, description, status, trigger_type, execution_count, success_count, failure_count'
        )
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorkflows(data || []);
    } catch (err) {
      console.error('Error fetching workflows:', err);
      showToast('error', 'Failed to load workflows');
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
    } catch (err) {
      console.error('Error saving workflow:', err);
      showToast('error', 'Failed to create workflow');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase.from('workflows').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      showToast('success', 'Workflow deleted');
      setDeleteTarget(null);
      await fetchWorkflows();
    } catch (err) {
      console.error('Error deleting workflow:', err);
      showToast('error', 'Failed to delete workflow');
    }
  }

  function statusColor(status: string): string {
    switch (status) {
      case 'active':
        return 'green';
      case 'draft':
        return 'yellow';
      case 'paused':
        return 'blue';
      case 'archived':
        return 'gray';
      default:
        return 'gray';
    }
  }

  if (loading) return <LoadingSpinner label="Loading workflows..." />;

  return (
    <div>
      <PageHeader
        title="Workflows"
        description="Automated sequences triggered by customer events"
        action={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" /> Add Workflow
          </Button>
        }
      />

      {workflows.length === 0 ? (
        <EmptyState
          icon={WorkflowIcon}
          title="No workflows yet"
          description="Create a workflow to automate multi-step customer engagement sequences."
          action={
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4" /> Add Workflow
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {workflows.map((wf) => (
            <Card key={wf.id} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <WorkflowIcon className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-white truncate">{wf.name}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <Badge color={statusColor(wf.status)}>{wf.status}</Badge>
                      <Badge color="blue">{wf.trigger_type}</Badge>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(wf)}>
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </Button>
              </div>

              {wf.description && (
                <p className="text-sm text-zinc-400 mb-4 line-clamp-2">{wf.description}</p>
              )}

              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/10">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-zinc-500 mb-1">
                    <Activity className="w-3 h-3" />
                  </div>
                  <p className="text-lg font-bold text-white">{wf.execution_count}</p>
                  <p className="text-xs text-zinc-500">Executions</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-emerald-500 mb-1">
                    <CheckCircle2 className="w-3 h-3" />
                  </div>
                  <p className="text-lg font-bold text-emerald-400">{wf.success_count}</p>
                  <p className="text-xs text-zinc-500">Success</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-red-500 mb-1">
                    <XCircle className="w-3 h-3" />
                  </div>
                  <p className="text-lg font-bold text-red-400">{wf.failure_count}</p>
                  <p className="text-xs text-zinc-500">Failed</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New Workflow"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Name</label>
            <Input
              value={form.name}
              onChange={(v) => setForm({ ...form, name: v })}
              placeholder="e.g. Post-review follow-up sequence"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description</label>
            <TextArea
              value={form.description}
              onChange={(v) => setForm({ ...form, description: v })}
              placeholder="Describe what this workflow does..."
              rows={3}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Trigger Type</label>
            <Select
              value={form.trigger_type}
              onChange={(v) => setForm({ ...form, trigger_type: v })}
            >
              {TRIGGER_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Workflow"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-300">
            Are you sure you want to delete this workflow? This action cannot be undone.
          </p>
          {deleteTarget && (
            <p className="text-sm text-zinc-500 bg-white/5 rounded-lg p-3 border border-white/10">
              {deleteTarget.name}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              <Trash2 className="w-4 h-4" /> Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
