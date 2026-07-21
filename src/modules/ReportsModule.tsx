import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge, Button, Input, TextArea, Select, Modal } from '../components/UI';
import { FileText, CalendarClock, Plus, Pencil, Trash2, Clock, CheckCircle2, XCircle } from 'lucide-react';

/* ============================================================
 * ReportTemplatesModule
 * ============================================================ */

interface ReportTemplate {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  report_type: string | null;
  date_range_preset: string | null;
  is_active: boolean;
  created_at?: string;
}

const REPORT_TYPES = ['summary', 'detailed', 'compliance', 'performance', 'custom'];
const DATE_RANGE_PRESETS = ['today', 'yesterday', 'last_7_days', 'last_30_days', 'this_month', 'last_month', 'this_quarter', 'this_year', 'all_time'];

export function ReportTemplatesModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ReportTemplate | null>(null);
  const [form, setForm] = useState({ name: '', description: '', report_type: 'summary', date_range_preset: 'last_30_days' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('report_templates')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('error', `Failed to load templates: ${error.message}`);
    } else {
      setTemplates((data as ReportTemplate[]) || []);
    }
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '', report_type: 'summary', date_range_preset: 'last_30_days' });
    setModalOpen(true);
  };

  const openEdit = (t: ReportTemplate) => {
    setEditing(t);
    setForm({
      name: t.name || '',
      description: t.description || '',
      report_type: t.report_type || 'summary',
      date_range_preset: t.date_range_preset || 'last_30_days',
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) { showToast('error', 'Name is required'); return; }
    setSaving(true);
    const payload = {
      business_id: businessId,
      name: form.name.trim(),
      description: form.description.trim() || null,
      report_type: form.report_type,
      date_range_preset: form.date_range_preset,
    };
    let result;
    if (editing) {
      result = await supabase.from('report_templates').update(payload).eq('id', editing.id);
    } else {
      result = await supabase.from('report_templates').insert(payload);
    }
    setSaving(false);
    if (result.error) {
      showToast('error', `Save failed: ${result.error.message}`);
      return;
    }
    showToast('success', editing ? 'Template updated' : 'Template created');
    setModalOpen(false);
    load();
  };

  const remove = async (t: ReportTemplate) => {
    if (!confirm(`Delete template "${t.name}"?`)) return;
    const { error } = await supabase.from('report_templates').delete().eq('id', t.id);
    if (error) { showToast('error', `Delete failed: ${error.message}`); return; }
    showToast('success', 'Template deleted');
    load();
  };

  const toggleActive = async (t: ReportTemplate) => {
    const { error } = await supabase.from('report_templates').update({ is_active: !t.is_active }).eq('id', t.id);
    if (error) { showToast('error', `Update failed: ${error.message}`); return; }
    showToast('success', `Template ${!t.is_active ? 'activated' : 'deactivated'}`);
    load();
  };

  if (loading) return <LoadingSpinner label="Loading report templates…" />;

  return (
    <div>
      <PageHeader
        title="Report Templates"
        description="Reusable report configurations for this business"
        action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Template</Button>}
      />

      {templates.length === 0 ? (
        <EmptyState icon={FileText} title="No report templates" description="Create a template to standardize recurring reports." action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Template</Button>} />
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <Card key={t.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white truncate">{t.name}</h3>
                    <Badge color={t.is_active ? 'green' : 'gray'}>{t.is_active ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  {t.description && <p className="text-sm text-zinc-400 mb-2">{t.description}</p>}
                  <div className="flex flex-wrap gap-2">
                    {t.report_type && <Badge color="blue">{t.report_type}</Badge>}
                    {t.date_range_preset && <Badge color="purple">{t.date_range_preset}</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => toggleActive(t)}>{t.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}</Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(t)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(t)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Template' : 'New Template'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Name</label>
            <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Monthly performance report" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description</label>
            <TextArea value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="What this report covers…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Report Type</label>
              <Select value={form.report_type} onChange={(v) => setForm({ ...form, report_type: v })}>
                {REPORT_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Date Range Preset</label>
              <Select value={form.date_range_preset} onChange={(v) => setForm({ ...form, date_range_preset: v })}>
                {DATE_RANGE_PRESETS.map((d) => <option key={d} value={d}>{d}</option>)}
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : editing ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ============================================================
 * ScheduledReportsModule
 * ============================================================ */

interface ScheduledReport {
  id: string;
  business_id: string;
  name: string;
  frequency: string | null;
  next_run_at: string | null;
  last_run_at: string | null;
  delivery_emails: string | null;
  is_active: boolean;
  created_at?: string;
}

const FREQUENCIES = ['daily', 'weekly', 'monthly'];

function formatDate(value: string | null): string {
  if (!value) return '—';
  try { return new Date(value).toLocaleString(); } catch { return value; }
}

export function ScheduledReportsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [reports, setReports] = useState<ScheduledReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', frequency: 'weekly', delivery_emails: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('scheduled_reports')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('error', `Failed to load scheduled reports: ${error.message}`);
    } else {
      setReports((data as ScheduledReport[]) || []);
    }
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm({ name: '', frequency: 'weekly', delivery_emails: '' });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) { showToast('error', 'Name is required'); return; }
    setSaving(true);
    const payload = {
      business_id: businessId,
      name: form.name.trim(),
      frequency: form.frequency,
      delivery_emails: form.delivery_emails.trim() || null,
    };
    const { error } = await supabase.from('scheduled_reports').insert(payload);
    setSaving(false);
    if (error) { showToast('error', `Save failed: ${error.message}`); return; }
    showToast('success', 'Scheduled report created');
    setModalOpen(false);
    load();
  };

  const toggleActive = async (r: ScheduledReport) => {
    const { error } = await supabase.from('scheduled_reports').update({ is_active: !r.is_active }).eq('id', r.id);
    if (error) { showToast('error', `Update failed: ${error.message}`); return; }
    showToast('success', `Report ${!r.is_active ? 'activated' : 'deactivated'}`);
    load();
  };

  const remove = async (r: ScheduledReport) => {
    if (!confirm(`Delete scheduled report "${r.name}"?`)) return;
    const { error } = await supabase.from('scheduled_reports').delete().eq('id', r.id);
    if (error) { showToast('error', `Delete failed: ${error.message}`); return; }
    showToast('success', 'Scheduled report deleted');
    load();
  };

  if (loading) return <LoadingSpinner label="Loading scheduled reports…" />;

  return (
    <div>
      <PageHeader
        title="Scheduled Reports"
        description="Automated report delivery schedules"
        action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Schedule</Button>}
      />

      {reports.length === 0 ? (
        <EmptyState icon={CalendarClock} title="No scheduled reports" description="Create a schedule to automatically deliver reports." action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Schedule</Button>} />
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white truncate">{r.name}</h3>
                    <Badge color={r.is_active ? 'green' : 'gray'}>{r.is_active ? 'Active' : 'Inactive'}</Badge>
                    {r.frequency && <Badge color="blue">{r.frequency}</Badge>}
                  </div>
                  {r.delivery_emails && <p className="text-sm text-zinc-400 mb-2 truncate">→ {r.delivery_emails}</p>}
                  <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
                    <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Next: {formatDate(r.next_run_at)}</span>
                    <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Last: {formatDate(r.last_run_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => toggleActive(r)}>{r.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}</Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(r)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Scheduled Report">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Name</label>
            <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Weekly review summary" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Frequency</label>
            <Select value={form.frequency} onChange={(v) => setForm({ ...form, frequency: v })}>
              {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Delivery Emails</label>
            <Input value={form.delivery_emails} onChange={(v) => setForm({ ...form, delivery_emails: v })} placeholder="comma@separated.emails" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Create'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
