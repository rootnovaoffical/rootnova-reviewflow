import { useState, useEffect } from 'react';
import { Workflow, Plus, Activity, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge, Button, Input, TextArea, Select, Modal } from '../components/UI';

interface WorkflowRow {
  id: string;
  name: string;
  description: string | null;
  status: string;
  trigger_type: string | null;
  execution_count: number;
  success_count: number;
  failure_count: number;
}

interface WorkflowsModuleProps {
  businessId: string;
}

const TRIGGER_TYPES = [
  { value: 'manual', label: 'Manual' },
  { value: 'review_submitted', label: 'Review Submitted' },
  { value: 'review_completed', label: 'Review Completed' },
  { value: 'customer_created', label: 'Customer Created' },
  { value: 'qr_scan', label: 'QR Code Scanned' },
  { value: 'scheduled', label: 'Scheduled' },
];

const STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'draft', label: 'Draft' },
];

export default function WorkflowsModule({ businessId }: WorkflowsModuleProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [workflows, setWorkflows] = useState<WorkflowRow[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    status: 'draft',
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
        .select('id, name, description, status, trigger_type, execution_count, success_count, failure_count')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorkflows((data ?? []) as WorkflowRow[]);
    } catch (err) {
      showToast('error', `Failed to load workflows: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setForm({ name: '', description: '', status: 'draft', trigger_type: 'manual' });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      showToast('error', 'Workflow name is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        business_id: businessId,
        name: form.name.trim(),
        description: form.description.trim() || null,
        status: form.status,
        trigger_type: form.trigger_type,
      };

      const { error } = await supabase.from('workflows').insert(payload);
      if (error) throw error;

      showToast('success', 'Workflow created');
      setModalOpen(false);
      fetchWorkflows();
    } catch (err) {
      showToast('error', `Create failed: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  function statusColor(status: string): string {
    if (status === 'active') return 'green';
    if (status === 'paused') return 'yellow';
    return 'gray';
  }

  if (loading) return <LoadingSpinner label="Loading workflows..." />;

  return (
    <div>
      <PageHeader
        title="Workflows"
        description="Automated workflow pipelines for your business"
        action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> Create Workflow</Button>}
      />

      {workflows.length === 0 ? (
        <Card className="p-5">
          <EmptyState icon={Workflow} title="No workflows yet" description="Create workflows to automate multi-step processes triggered by customer activity." action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> Create Workflow</Button>} />
        </Card>
      ) : (
        <div className="space-y-3">
          {workflows.map((wf) => (
            <Card key={wf.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Workflow className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <h3 className="text-sm font-semibold text-white">{wf.name}</h3>
                  </div>
                  {wf.description && (
                    <p className="text-sm text-zinc-400 mt-1">{wf.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Badge color={statusColor(wf.status)}>{wf.status}</Badge>
                    {wf.trigger_type && (
                      <Badge color="blue">{wf.trigger_type.replace(/_/g, ' ')}</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-zinc-500" />
                  <div>
                    <p className="text-xs text-zinc-500">Executions</p>
                    <p className="text-sm font-semibold text-white">{wf.execution_count}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <div>
                    <p className="text-xs text-zinc-500">Success</p>
                    <p className="text-sm font-semibold text-emerald-300">{wf.success_count}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-400" />
                  <div>
                    <p className="text-xs text-zinc-500">Failures</p>
                    <p className="text-sm font-semibold text-red-300">{wf.failure_count}</p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create Workflow">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Workflow Name</label>
            <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="e.g. Post-review follow-up sequence" />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description</label>
            <TextArea value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="What does this workflow do?" rows={3} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Trigger Type</label>
              <Select value={form.trigger_type} onChange={(v) => setForm({ ...form, trigger_type: v })}>
                {TRIGGER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Status</label>
              <Select value={form.status} onChange={(v) => setForm({ ...form, status: v })}>
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Creating...' : 'Create'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
