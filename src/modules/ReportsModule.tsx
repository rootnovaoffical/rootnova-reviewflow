import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  Card, Badge, Button, Input, TextArea, Select, Modal,
  PageHeader, LoadingSpinner, EmptyState,
} from '../components/UI';
import { useToast } from '../context/ToastContext';
import {
  FileText, Plus, Pencil, Trash2, CalendarClock, Clock, CheckCircle2, XCircle,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* ReportTemplatesModule                                              */
/* ------------------------------------------------------------------ */

type ReportTemplate = {
  id: string;
  name: string;
  description: string | null;
  report_type: string | null;
  date_range_preset: string | null;
  is_active: boolean | null;
};

const TEMPLATE_TYPES = ['summary', 'detailed', 'compliance', 'custom'];
const DATE_RANGE_PRESETS = ['7d', '30d', '90d', 'ytd', '12m', 'all'];

export function ReportTemplatesModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ReportTemplate | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    report_type: TEMPLATE_TYPES[0],
    date_range_preset: DATE_RANGE_PRESETS[0],
    is_active: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('report_templates')
        .select('id, name, description, report_type, date_range_preset, is_active')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      showToast('error', `Failed to load templates: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [businessId, showToast]);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({
      name: '', description: '', report_type: TEMPLATE_TYPES[0],
      date_range_preset: DATE_RANGE_PRESETS[0], is_active: true,
    });
    setModalOpen(true);
  }

  function openEdit(t: ReportTemplate) {
    setEditing(t);
    setForm({
      name: t.name,
      description: t.description || '',
      report_type: t.report_type || TEMPLATE_TYPES[0],
      date_range_preset: t.date_range_preset || DATE_RANGE_PRESETS[0],
      is_active: t.is_active ?? true,
    });
    setModalOpen(true);
  }

  async function save() {
    if (!form.name.trim()) {
      showToast('error', 'Name is required');
      return;
    }
    const payload = {
      business_id: businessId,
      name: form.name.trim(),
      description: form.description.trim() || null,
      report_type: form.report_type,
      date_range_preset: form.date_range_preset,
      is_active: form.is_active,
    };
    try {
      if (editing) {
        const { error } = await supabase
          .from('report_templates').update(payload).eq('id', editing.id);
        if (error) throw error;
        showToast('success', 'Template updated');
      } else {
        const { error } = await supabase
          .from('report_templates').insert(payload);
        if (error) throw error;
        showToast('success', 'Template created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      showToast('error', `Save failed: ${(err as Error).message}`);
    }
  }

  async function remove(t: ReportTemplate) {
    if (!confirm(`Delete "${t.name}"?`)) return;
    try {
      const { error } = await supabase.from('report_templates').delete().eq('id', t.id);
      if (error) throw error;
      showToast('success', 'Template deleted');
      load();
    } catch (err) {
      showToast('error', `Delete failed: ${(err as Error).message}`);
    }
  }

  if (loading) return <LoadingSpinner label="Loading report templates…" />;

  return (
    <div>
      <PageHeader
        title="Report Templates"
        description="Create and manage reusable report templates"
        action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Template</Button>}
      />
      {items.length === 0 ? (
        <EmptyState icon={FileText} title="No templates yet" description="Create your first report template to get started." action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Template</Button>} />
      ) : (
        <div className="grid gap-3">
          {items.map((t) => (
            <Card key={t.id} className="p-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-white truncate">{t.name}</h3>
                  {t.is_active ? <Badge color="green"><CheckCircle2 className="w-3 h-3 mr-1" />Active</Badge> : <Badge color="gray"><XCircle className="w-3 h-3 mr-1" />Inactive</Badge>}
                </div>
                {t.description && <p className="text-sm text-zinc-400 mb-2">{t.description}</p>}
                <div className="flex flex-wrap gap-2">
                  {t.report_type && <Badge color="blue">{t.report_type}</Badge>}
                  {t.date_range_preset && <Badge color="purple">{t.date_range_preset}</Badge>}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => openEdit(t)}><Pencil className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => remove(t)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Template' : 'New Template'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Name</label>
            <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Monthly summary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Description</label>
            <TextArea value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="What this report covers…" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Report Type</label>
              <Select value={form.report_type} onChange={(v) => setForm({ ...form, report_type: v })}>
                {TEMPLATE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Date Range Preset</label>
              <Select value={form.date_range_preset} onChange={(v) => setForm({ ...form, date_range_preset: v })}>
                {DATE_RANGE_PRESETS.map((d) => <option key={d} value={d}>{d}</option>)}
              </Select>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded border-white/20 bg-white/5" />
            <span className="text-sm text-zinc-300">Active</span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? 'Save' : 'Create'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ScheduledReportsModule                                             */
/* ------------------------------------------------------------------ */

type ScheduledReport = {
  id: string;
  name: string;
  frequency: string | null;
  next_run_at: string | null;
  last_run_at: string | null;
  is_active: boolean | null;
};

const FREQUENCIES = ['daily', 'weekly', 'monthly', 'quarterly'];

function fmtDate(s: string | null) {
  if (!s) return '—';
  try { return new Date(s).toLocaleString(); } catch { return s; }
}

export function ScheduledReportsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<ScheduledReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    frequency: FREQUENCIES[0],
    is_active: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('scheduled_reports')
        .select('id, name, frequency, next_run_at, last_run_at, is_active')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      showToast('error', `Failed to load scheduled reports: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [businessId, showToast]);

  useEffect(() => { load(); }, [load]);

  async function create() {
    if (!form.name.trim()) {
      showToast('error', 'Name is required');
      return;
    }
    try {
      const { error } = await supabase.from('scheduled_reports').insert({
        business_id: businessId,
        name: form.name.trim(),
        frequency: form.frequency,
        is_active: form.is_active,
      });
      if (error) throw error;
      showToast('success', 'Scheduled report created');
      setModalOpen(false);
      setForm({ name: '', frequency: FREQUENCIES[0], is_active: true });
      load();
    } catch (err) {
      showToast('error', `Create failed: ${(err as Error).message}`);
    }
  }

  async function toggleActive(s: ScheduledReport) {
    try {
      const { error } = await supabase
        .from('scheduled_reports')
        .update({ is_active: !s.is_active })
        .eq('id', s.id);
      if (error) throw error;
      showToast('success', 'Updated');
      load();
    } catch (err) {
      showToast('error', `Update failed: ${(err as Error).message}`);
    }
  }

  async function remove(s: ScheduledReport) {
    if (!confirm(`Delete "${s.name}"?`)) return;
    try {
      const { error } = await supabase.from('scheduled_reports').delete().eq('id', s.id);
      if (error) throw error;
      showToast('success', 'Deleted');
      load();
    } catch (err) {
      showToast('error', `Delete failed: ${(err as Error).message}`);
    }
  }

  if (loading) return <LoadingSpinner label="Loading scheduled reports…" />;

  return (
    <div>
      <PageHeader
        title="Scheduled Reports"
        description="Automated reports delivered on a recurring schedule"
        action={<Button onClick={() => setModalOpen(true)}><Plus className="w-4 h-4" /> New Schedule</Button>}
      />
      {items.length === 0 ? (
        <EmptyState icon={CalendarClock} title="No scheduled reports" description="Schedule a report to run automatically." action={<Button onClick={() => setModalOpen(true)}><Plus className="w-4 h-4" /> New Schedule</Button>} />
      ) : (
        <div className="grid gap-3">
          {items.map((s) => (
            <Card key={s.id} className="p-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-white truncate">{s.name}</h3>
                  {s.is_active ? <Badge color="green">Active</Badge> : <Badge color="gray">Paused</Badge>}
                  {s.frequency && <Badge color="blue">{s.frequency}</Badge>}
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-zinc-400">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Last run: {fmtDate(s.last_run_at)}</span>
                  <span className="flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" /> Next run: {fmtDate(s.next_run_at)}</span>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => toggleActive(s)}>{s.is_active ? 'Pause' : 'Resume'}</Button>
                <Button variant="ghost" size="sm" onClick={() => remove(s)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Scheduled Report">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Name</label>
            <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Weekly performance" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Frequency</label>
            <Select value={form.frequency} onChange={(v) => setForm({ ...form, frequency: v })}>
              {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
            </Select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded border-white/20 bg-white/5" />
            <span className="text-sm text-zinc-300">Active</span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={create}>Create</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
