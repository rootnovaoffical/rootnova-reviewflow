import { useEffect, useState } from 'react';
import { Plus, Workflow, Play, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge, Button, Input, TextArea, Select, Modal } from '../components/UI';
import { useToast } from '../context/ToastContext';

interface WorkflowRecord {
  id: string;
  name: string;
  description: string | null;
  status: string;
  trigger_type: string;
  execution_count: number;
  success_count: number;
  failure_count: number;
}

type FormState = {
  name: string;
  description: string;
  trigger_type: string;
};

const EMPTY_FORM: FormState = { name: '', description: '', trigger_type: 'manual' };

export default function WorkflowsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workflows, setWorkflows] = useState<WorkflowRecord[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  async function fetchWorkflows() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('workflows')
        .select('id, name, description, status, trigger_type, execution_count, success_count, failure_count')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorkflows((data as WorkflowRecord[]) ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load workflows';
      showToast('error', msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchWorkflows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  function openCreate() {
    setForm(EMPTY_FORM);
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
      const msg = err instanceof Error ? err.message : 'Failed to create workflow';
      showToast('error', msg);
    } finally {
      setSaving(false);
    }
  }

  function statusColor(s: string) {
    if (s === 'active') return 'green';
    if (s === 'draft') return 'gray';
    if (s === 'paused') return 'yellow';
    return 'gray';
  }

  if (loading) return <LoadingSpinner label="Loading workflows..." />;

  return (
    <div>
      <PageHeader
        title="Workflows"
        description="Automated multi-step processes"
        action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Workflow</Button>}
      />

      {workflows.length === 0 ? (
        <EmptyState
          icon={Workflow}
          title="No workflows yet"
          description="Create workflows to automate multi-step customer journeys."
          action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Workflow</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {workflows.map((wf) => (
            <Card key={wf.id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-white truncate">{wf.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <Badge color={statusColor(wf.status)}>{wf.status}</Badge>
                    <Badge color="blue">{wf.trigger_type}</Badge>
                  </div>
                </div>
              </div>
              {wf.description && <p className="text-xs text-zinc-400 mb-3 line-clamp-2">{wf.description}</p>}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/10">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-zinc-300">
                    <Play className="w-3 h-3" />
                    <span className="text-sm font-semibold">{wf.execution_count}</span>
                  </div>
                  <p className="text-[10px] text-zinc-600 mt-0.5">Executed</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" />
                    <span className="text-sm font-semibold">{wf.success_count}</span>
                  </div>
                  <p className="text-[10px] text-zinc-600 mt-0.5">Success</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-red-400">
                    <XCircle className="w-3 h-3" />
                    <span className="text-sm font-semibold">{wf.failure_count}</span>
                  </div>
                  <p className="text-[10px] text-zinc-600 mt-0.5">Failed</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Workflow">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Name</label>
            <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="e.g. Post-review follow-up" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description</label>
            <TextArea value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="What does this workflow do?" rows={3} />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Trigger Type</label>
            <Select value={form.trigger_type} onChange={(v) => setForm({ ...form, trigger_type: v })}>
              <option value="manual">Manual</option>
              <option value="review_submitted">Review Submitted</option>
              <option value="positive_review">Positive Review</option>
              <option value="negative_review">Negative Review</option>
              <option value="customer_signup">Customer Signup</option>
              <option value="scheduled">Scheduled</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Create'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
