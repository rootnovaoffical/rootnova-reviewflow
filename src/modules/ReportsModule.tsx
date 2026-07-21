import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import {
  LoadingSpinner, EmptyState, PageHeader, Card, Badge, Button, Input, TextArea, Select, Modal,
} from '../components/UI';
import { FileText, Plus, Pencil, Trash2, CalendarClock, Bell } from 'lucide-react';

/* ============================================================
 * ReportTemplatesModule — CRUD for report_templates
 * ============================================================ */

interface ReportTemplate {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  report_type: string | null;
  date_range_preset: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const REPORT_TYPES = ['overview', 'reviews', 'revenue', 'customers', 'operations', 'custom'];
const DATE_RANGE_PRESETS = ['today', 'yesterday', 'last_7_days', 'last_30_days', 'this_month', 'last_month', 'this_quarter', 'this_year', 'all_time'];

export function ReportTemplatesModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ReportTemplate | null>(null);
  const [form, setForm] = useState({ name: '', description: '', report_type: 'overview', date_range_preset: 'last_30_days' });
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
      setItems((data as ReportTemplate[]) || []);
    }
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({ name: '', description: '', report_type: 'overview', date_range_preset: 'last_30_days' });
    setModalOpen(true);
  }

  function openEdit(t: ReportTemplate) {
    setEditing(t);
    setForm({
      name: t.name,
      description: t.description ?? '',
      report_type: t.report_type ?? 'overview',
      date_range_preset: t.date_range_preset ?? 'last_30_days',
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { showToast('error', 'Name is required'); return; }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from('report_templates')
          .update({
            name: form.name.trim(),
            description: form.description.trim() || null,
            report_type: form.report_type,
            date_range_preset: form.date_range_preset,
          })
          .eq('id', editing.id);
        if (error) throw error;
        showToast('success', 'Template updated');
      } else {
        const { error } = await supabase
          .from('report_templates')
          .insert({
            business_id: businessId,
            name: form.name.trim(),
            description: form.description.trim() || null,
            report_type: form.report_type,
            date_range_preset: form.date_range_preset,
            is_active: true,
          });
        if (error) throw error;
        showToast('success', 'Template created');
      }
      setModalOpen(false);
      load();
    } catch (e) {
      showToast('error', (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this template?')) return;
    const { error } = await supabase.from('report_templates').delete().eq('id', id);
    if (error) { showToast('error', error.message); return; }
    showToast('success', 'Template deleted');
    load();
  }

  async function toggleActive(t: ReportTemplate) {
    const { error } = await supabase
      .from('report_templates')
      .update({ is_active: !t.is_active })
      .eq('id', t.id);
    if (error) { showToast('error', error.message); return; }
    load();
  }

  if (loading) return <LoadingSpinner label="Loading report templates…" />;

  return (
    <div>
      <PageHeader
        title="Report Templates"
        description="Manage reusable report templates for this business"
        action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Template</Button>}
      />

      {items.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No report templates yet"
          description="Create templates to standardize recurring reports across your business."
          action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Template</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((t) => (
            <Card key={t.id} className="p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <FileText className="w-4.5 h-4.5 text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-white">{t.name}</h3>
                </div>
                <Badge color={t.is_active ? 'green' : 'gray'}>{t.is_active ? 'Active' : 'Inactive'}</Badge>
              </div>
              {t.description && <p className="text-sm text-zinc-400 line-clamp-2">{t.description}</p>}
              <div className="flex flex-wrap gap-2">
                {t.report_type && <Badge color="blue">{t.report_type}</Badge>}
                {t.date_range_preset && <Badge color="purple">{t.date_range_preset}</Badge>}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Button size="sm" variant="secondary" onClick={() => openEdit(t)}><Pencil className="w-3.5 h-3.5" /> Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => toggleActive(t)}>{t.is_active ? 'Disable' : 'Enable'}</Button>
                <Button size="sm" variant="danger" onClick={() => handleDelete(t.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Template' : 'New Template'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Name</label>
            <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="e.g. Monthly Reviews Summary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Description</label>
            <TextArea value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="What this report covers…" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Report Type</label>
            <Select value={form.report_type} onChange={(v) => setForm({ ...form, report_type: v })}>
              {REPORT_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Date Range Preset</label>
            <Select value={form.date_range_preset} onChange={(v) => setForm({ ...form, date_range_preset: v })}>
              {DATE_RANGE_PRESETS.map((d) => <option key={d} value={d}>{d}</option>)}
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Template'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ============================================================
 * ScheduledReportsModule — List & create scheduled_reports
 * ============================================================ */

interface ScheduledReport {
  id: string;
  business_id: string;
  name: string;
  frequency: string | null;
  delivery_emails: string[] | null;
  next_run_at: string | null;
  last_run_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return value;
  }
}

export function ScheduledReportsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<ScheduledReport[]>([]);
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
      setItems((data as ScheduledReport[]) || []);
    }
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setForm({ name: '', frequency: 'weekly', delivery_emails: '' });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { showToast('error', 'Name is required'); return; }
    setSaving(true);
    try {
      const emails = form.delivery_emails
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean);
      const { error } = await supabase
        .from('scheduled_reports')
        .insert({
          business_id: businessId,
          name: form.name.trim(),
          frequency: form.frequency,
          delivery_emails: emails.length > 0 ? emails : null,
          is_active: true,
        });
      if (error) throw error;
      showToast('success', 'Scheduled report created');
      setModalOpen(false);
      load();
    } catch (e) {
      showToast('error', (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(r: ScheduledReport) {
    const { error } = await supabase
      .from('scheduled_reports')
      .update({ is_active: !r.is_active })
      .eq('id', r.id);
    if (error) { showToast('error', error.message); return; }
    load();
  }

  if (loading) return <LoadingSpinner label="Loading scheduled reports…" />;

  return (
    <div>
      <PageHeader
        title="Scheduled Reports"
        description="Automated reports delivered on a recurring schedule"
        action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Schedule</Button>}
      />

      {items.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No scheduled reports"
          description="Create a schedule to automatically generate and deliver reports via email."
          action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Schedule</Button>}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-zinc-400">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Frequency</th>
                  <th className="px-4 py-3 font-medium">Next Run</th>
                  <th className="px-4 py-3 font-medium">Last Run</th>
                  <th className="px-4 py-3 font-medium">Delivery Emails</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 text-white font-medium">{r.name}</td>
                    <td className="px-4 py-3"><Badge color="blue">{r.frequency ?? '—'}</Badge></td>
                    <td className="px-4 py-3 text-zinc-300">{formatDate(r.next_run_at)}</td>
                    <td className="px-4 py-3 text-zinc-300">{formatDate(r.last_run_at)}</td>
                    <td className="px-4 py-3 text-zinc-400 max-w-xs truncate">{(r.delivery_emails ?? []).join(', ') || '—'}</td>
                    <td className="px-4 py-3"><Badge color={r.is_active ? 'green' : 'gray'}>{r.is_active ? 'Active' : 'Paused'}</Badge></td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => toggleActive(r)}>
                        <Bell className="w-3.5 h-3.5" /> {r.is_active ? 'Pause' : 'Resume'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Scheduled Report">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Name</label>
            <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="e.g. Weekly Reviews Digest" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Frequency</label>
            <Select value={form.frequency} onChange={(v) => setForm({ ...form, frequency: v })}>
              <option value="daily">daily</option>
              <option value="weekly">weekly</option>
              <option value="monthly">monthly</option>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Delivery Emails</label>
            <Input value={form.delivery_emails} onChange={(v) => setForm({ ...form, delivery_emails: v })} placeholder="comma-separated, e.g. alice@acme.com, bob@acme.com" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Creating…' : 'Create Schedule'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
