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
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  CalendarClock,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

/* ============================================================
 * ReportTemplatesModule
 * CRUD for report_templates filtered by business_id
 * ============================================================ */

interface ReportTemplate {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  report_type: string | null;
  date_range_preset: string | null;
  is_active: boolean | null;
  created_at?: string;
}

const REPORT_TYPES = ['summary', 'reviews', 'reputation', 'engagement', 'custom'];
const DATE_RANGE_PRESETS = ['today', 'yesterday', 'last_7_days', 'last_30_days', 'this_month', 'last_month', 'this_quarter', 'this_year'];

export function ReportTemplatesModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ReportTemplate | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    report_type: REPORT_TYPES[0],
    date_range_preset: DATE_RANGE_PRESETS[0],
  });
  const [saving, setSaving] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('report_templates')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('error', 'Failed to load report templates');
    } else {
      setTemplates((data as ReportTemplate[]) || []);
    }
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '', report_type: REPORT_TYPES[0], date_range_preset: DATE_RANGE_PRESETS[0] });
    setModalOpen(true);
  };

  const openEdit = (t: ReportTemplate) => {
    setEditing(t);
    setForm({
      name: t.name || '',
      description: t.description || '',
      report_type: t.report_type || REPORT_TYPES[0],
      date_range_preset: t.date_range_preset || DATE_RANGE_PRESETS[0],
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('error', 'Name is required');
      return;
    }
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
      showToast('error', `Failed to ${editing ? 'update' : 'create'} template`);
      return;
    }
    showToast('success', `Template ${editing ? 'updated' : 'created'} successfully`);
    setModalOpen(false);
    fetchTemplates();
  };

  const handleDelete = async (t: ReportTemplate) => {
    if (!confirm('Delete this report template?')) return;
    const { error } = await supabase.from('report_templates').delete().eq('id', t.id);
    if (error) {
      showToast('error', 'Failed to delete template');
      return;
    }
    showToast('success', 'Template deleted');
    fetchTemplates();
  };

  const toggleActive = async (t: ReportTemplate) => {
    const { error } = await supabase
      .from('report_templates')
      .update({ is_active: !t.is_active })
      .eq('id', t.id);
    if (error) {
      showToast('error', 'Failed to toggle status');
      return;
    }
    fetchTemplates();
  };

  return (
    <div>
      <PageHeader
        title="Report Templates"
        description="Manage reusable report templates for this business"
        action={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" /> New Template
          </Button>
        }
      />

      {loading ? (
        <LoadingSpinner label="Loading templates..." />
      ) : templates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No report templates"
          description="Create your first report template to get started"
          action={
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4" /> New Template
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3">
          {templates.map((t) => (
            <Card key={t.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white truncate">{t.name}</h3>
                    <button onClick={() => toggleActive(t)} title="Toggle active">
                      {t.is_active ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-zinc-600" />
                      )}
                    </button>
                  </div>
                  {t.description && <p className="text-sm text-zinc-400 mb-2">{t.description}</p>}
                  <div className="flex flex-wrap gap-2">
                    {t.report_type && <Badge color="blue">{t.report_type}</Badge>}
                    {t.date_range_preset && <Badge color="gray">{t.date_range_preset}</Badge>}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(t)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(t)}>
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Template' : 'New Template'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Name</label>
            <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Template name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Description</label>
            <TextArea
              value={form.description}
              onChange={(v) => setForm({ ...form, description: v })}
              placeholder="Describe this template"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Report Type</label>
            <Select value={form.report_type} onChange={(v) => setForm({ ...form, report_type: v })}>
              {REPORT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Date Range Preset</label>
            <Select value={form.date_range_preset} onChange={(v) => setForm({ ...form, date_range_preset: v })}>
              {DATE_RANGE_PRESETS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ============================================================
 * ScheduledReportsModule
 * List scheduled_reports filtered by business_id
 * ============================================================ */

interface ScheduledReport {
  id: string;
  business_id: string;
  name: string;
  frequency: string | null;
  next_run_at: string | null;
  last_run_at: string | null;
  delivery_emails: string[] | string | null;
  is_active: boolean | null;
  created_at?: string;
}

const FREQUENCIES = ['daily', 'weekly', 'monthly'];

export function ScheduledReportsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [reports, setReports] = useState<ScheduledReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', frequency: FREQUENCIES[0], delivery_emails: '' });
  const [saving, setSaving] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('scheduled_reports')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('error', 'Failed to load scheduled reports');
    } else {
      setReports((data as ScheduledReport[]) || []);
    }
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const openCreate = () => {
    setForm({ name: '', frequency: FREQUENCIES[0], delivery_emails: '' });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('error', 'Name is required');
      return;
    }
    setSaving(true);
    const emails = form.delivery_emails
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);
    const payload = {
      business_id: businessId,
      name: form.name.trim(),
      frequency: form.frequency,
      delivery_emails: emails.length ? emails : null,
    };
    const { error } = await supabase.from('scheduled_reports').insert(payload);
    setSaving(false);
    if (error) {
      showToast('error', 'Failed to create scheduled report');
      return;
    }
    showToast('success', 'Scheduled report created');
    setModalOpen(false);
    fetchReports();
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleString();
  };

  const formatEmails = (e: string[] | string | null) => {
    if (!e) return '—';
    if (Array.isArray(e)) return e.join(', ');
    return e;
  };

  return (
    <div>
      <PageHeader
        title="Scheduled Reports"
        description="Automated reports delivered on a schedule"
        action={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" /> Schedule Report
          </Button>
        }
      />

      {loading ? (
        <LoadingSpinner label="Loading scheduled reports..." />
      ) : reports.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No scheduled reports"
          description="Schedule a report to be delivered automatically"
          action={
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4" /> Schedule Report
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3">
          {reports.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-white truncate">{r.name}</h3>
                    {r.is_active ? (
                      <Badge color="green">Active</Badge>
                    ) : (
                      <Badge color="gray">Inactive</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {r.frequency && <Badge color="blue">{r.frequency}</Badge>}
                  </div>
                  <div className="space-y-1 text-sm text-zinc-400">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Next run: {formatDate(r.next_run_at)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Last run: {formatDate(r.last_run_at)}</span>
                    </div>
                    <div className="text-zinc-500">
                      Delivery: {formatEmails(r.delivery_emails)}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Schedule Report">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Name</label>
            <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Scheduled report name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Frequency</label>
            <Select value={form.frequency} onChange={(v) => setForm({ ...form, frequency: v })}>
              {FREQUENCIES.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Delivery Emails</label>
            <Input
              value={form.delivery_emails}
              onChange={(v) => setForm({ ...form, delivery_emails: v })}
              placeholder="email1@example.com, email2@example.com"
            />
            <p className="text-xs text-zinc-500 mt-1">Comma-separated email addresses</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
