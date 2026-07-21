import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge, Button, Input, TextArea, Select, Modal } from '../components/UI';
import { useToast } from '../context/ToastContext';
import { FileText, Calendar, Plus, Pencil, Trash2, Clock, CheckCircle2, XCircle } from 'lucide-react';

/* ============================================================
 * ReportTemplatesModule
 * CRUD for report_templates filtered by business_id
 * Columns: name, description, report_type, date_range_preset, is_active
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

const REPORT_TYPES = ['summary', 'performance', 'reviews', 'messages', 'custom'];
const DATE_RANGE_PRESETS = ['today', 'yesterday', 'last_7_days', 'last_30_days', 'this_month', 'last_month', 'this_quarter', 'this_year'];

export function ReportTemplatesModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ReportTemplate | null>(null);
  const [form, setForm] = useState({ name: '', description: '', report_type: 'summary', date_range_preset: 'last_30_days' });
  const [saving, setSaving] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('report_templates')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('error', `Failed to load templates: ${error.message}`);
    } else {
      setTemplates(data || []);
    }
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

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

  const handleSave = async () => {
    if (!form.name.trim()) { showToast('error', 'Name is required'); return; }
    setSaving(true);
    const payload = {
      business_id: businessId,
      name: form.name.trim(),
      description: form.description.trim() || null,
      report_type: form.report_type,
      date_range_preset: form.date_range_preset,
    };
    let error;
    if (editing) {
      ({ error } = await supabase.from('report_templates').update(payload).eq('id', editing.id));
    } else {
      ({ error } = await supabase.from('report_templates').insert(payload));
    }
    setSaving(false);
    if (error) {
      showToast('error', `Save failed: ${error.message}`);
    } else {
      showToast('success', editing ? 'Template updated' : 'Template created');
      setModalOpen(false);
      fetchTemplates();
    }
  };

  const handleDelete = async (t: ReportTemplate) => {
    if (!confirm(`Delete template "${t.name}"?`)) return;
    const { error } = await supabase.from('report_templates').delete().eq('id', t.id);
    if (error) {
      showToast('error', `Delete failed: ${error.message}`);
    } else {
      showToast('success', 'Template deleted');
      fetchTemplates();
    }
  };

  const toggleActive = async (t: ReportTemplate) => {
    const { error } = await supabase.from('report_templates').update({ is_active: !t.is_active }).eq('id', t.id);
    if (error) {
      showToast('error', `Toggle failed: ${error.message}`);
    } else {
      showToast('success', `Template ${!t.is_active ? 'activated' : 'deactivated'}`);
      fetchTemplates();
    }
  };

  return (
    <div>
      <PageHeader
        title="Report Templates"
        description="Manage reusable report templates for this business"
        action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Template</Button>}
      />
      {loading ? (
        <LoadingSpinner label="Loading templates..." />
      ) : templates.length === 0 ? (
        <EmptyState icon={FileText} title="No report templates" description="Create your first report template to get started." action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Template</Button>} />
      ) : (
        <div className="grid gap-3">
          {templates.map((t) => (
            <Card key={t.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                    <h3 className="font-semibold text-white truncate">{t.name}</h3>
                    {t.is_active ? <Badge color="green">Active</Badge> : <Badge color="gray">Inactive</Badge>}
                  </div>
                  {t.description && <p className="text-sm text-zinc-400 mb-2 line-clamp-2">{t.description}</p>}
                  <div className="flex flex-wrap gap-2">
                    {t.report_type && <Badge color="blue">{t.report_type}</Badge>}
                    {t.date_range_preset && <Badge color="purple">{t.date_range_preset}</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => toggleActive(t)}>{t.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}</Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(t)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(t)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Template' : 'New Report Template'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Name</label>
            <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Monthly Performance Report" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Description</label>
            <TextArea value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Describe this report template..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Report Type</label>
            <Select value={form.report_type} onChange={(v) => setForm({ ...form, report_type: v })}>
              {REPORT_TYPES.map((rt) => <option key={rt} value={rt}>{rt}</option>)}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Date Range Preset</label>
            <Select value={form.date_range_preset} onChange={(v) => setForm({ ...form, date_range_preset: v })}>
              {DATE_RANGE_PRESETS.map((dr) => <option key={dr} value={dr}>{dr}</option>)}
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ============================================================
 * ScheduledReportsModule
 * List scheduled_reports filtered by business_id
 * Show: name, frequency, next_run_at, last_run_at, is_active
 * Create modal with name, frequency, delivery_emails
 * ============================================================ */

interface ScheduledReport {
  id: string;
  business_id: string;
  name: string;
  frequency: string | null;
  next_run_at: string | null;
  last_run_at: string | null;
  is_active: boolean;
  delivery_emails: string[] | null;
  created_at?: string;
}

const FREQUENCIES = ['daily', 'weekly', 'monthly'];

function formatDate(d: string | null): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleString(); } catch { return d; }
}

export function ScheduledReportsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [reports, setReports] = useState<ScheduledReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', frequency: 'daily', delivery_emails: '' });
  const [saving, setSaving] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('scheduled_reports')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('error', `Failed to load scheduled reports: ${error.message}`);
    } else {
      setReports(data || []);
    }
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const openCreate = () => {
    setForm({ name: '', frequency: 'daily', delivery_emails: '' });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { showToast('error', 'Name is required'); return; }
    setSaving(true);
    const emails = form.delivery_emails.split(',').map((e) => e.trim()).filter(Boolean);
    const payload = {
      business_id: businessId,
      name: form.name.trim(),
      frequency: form.frequency,
      delivery_emails: emails.length ? emails : null,
    };
    const { error } = await supabase.from('scheduled_reports').insert(payload);
    setSaving(false);
    if (error) {
      showToast('error', `Create failed: ${error.message}`);
    } else {
      showToast('success', 'Scheduled report created');
      setModalOpen(false);
      fetchReports();
    }
  };

  const toggleActive = async (r: ScheduledReport) => {
    const { error } = await supabase.from('scheduled_reports').update({ is_active: !r.is_active }).eq('id', r.id);
    if (error) {
      showToast('error', `Toggle failed: ${error.message}`);
    } else {
      showToast('success', `Report ${!r.is_active ? 'activated' : 'deactivated'}`);
      fetchReports();
    }
  };

  return (
    <div>
      <PageHeader
        title="Scheduled Reports"
        description="Automated report delivery schedules"
        action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Schedule</Button>}
      />
      {loading ? (
        <LoadingSpinner label="Loading scheduled reports..." />
      ) : reports.length === 0 ? (
        <EmptyState icon={Calendar} title="No scheduled reports" description="Create a schedule to automate report delivery." action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Schedule</Button>} />
      ) : (
        <div className="grid gap-3">
          {reports.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
                    <h3 className="font-semibold text-white truncate">{r.name}</h3>
                    {r.is_active ? <Badge color="green">Active</Badge> : <Badge color="gray">Inactive</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-400">
                    {r.frequency && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {r.frequency}</span>}
                    <span>Next run: <span className="text-zinc-200">{formatDate(r.next_run_at)}</span></span>
                    <span>Last run: <span className="text-zinc-200">{formatDate(r.last_run_at)}</span></span>
                  </div>
                  {r.delivery_emails && r.delivery_emails.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {r.delivery_emails.map((e) => <Badge key={e} color="purple">{e}</Badge>)}
                    </div>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => toggleActive(r)}>{r.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Scheduled Report">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Name</label>
            <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Weekly Reviews Summary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Frequency</label>
            <Select value={form.frequency} onChange={(v) => setForm({ ...form, frequency: v })}>
              {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Delivery Emails (comma-separated)</label>
            <Input value={form.delivery_emails} onChange={(v) => setForm({ ...form, delivery_emails: v })} placeholder="admin@example.com, boss@example.com" />
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
