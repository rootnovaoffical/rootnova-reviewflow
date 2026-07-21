import { useState, useEffect } from 'react';
import { QrCode, Plus, Pencil, Trash2, ExternalLink, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge, Button, Input, Select, Modal } from '../components/UI';
import { useToast } from '../context/ToastContext';

interface QrCodeRow {
  id: string;
  name: string;
  qr_type: string;
  destination_url: string;
  status: string;
  scan_count: number;
  created_at: string;
}

interface Business {
  id: string;
  slug: string;
  name: string;
}

const QR_TYPES = ['reviewflow', 'custom', 'landing'];
const QR_STATUSES = ['active', 'inactive', 'archived'];

export default function QrCodesModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [qrCodes, setQrCodes] = useState<QrCodeRow[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<QrCodeRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    qr_type: 'reviewflow',
    destination_url: '',
    status: 'active',
  });

  useEffect(() => {
    fetchData();
  }, [businessId]);

  async function fetchData() {
    setLoading(true);
    try {
      const [qrRes, bizRes] = await Promise.all([
        supabase.from('qr_codes').select('id, name, qr_type, destination_url, status, scan_count, created_at').eq('business_id', businessId).order('created_at', { ascending: false }),
        supabase.from('businesses').select('id, slug, name').eq('id', businessId).single(),
      ]);

      if (qrRes.error) throw qrRes.error;
      setQrCodes((qrRes.data as QrCodeRow[]) ?? []);
      if (bizRes.data) setBusiness(bizRes.data as Business);
    } catch (err: any) {
      showToast('error', err.message ?? 'Failed to load QR codes');
      setQrCodes([]);
    } finally {
      setLoading(false);
    }
  }

  function defaultReviewUrl() {
    const slug = business?.slug ?? '';
    return `${window.location.origin}/review/${slug}`;
  }

  function openCreate() {
    setEditing(null);
    setForm({ name: '', qr_type: 'reviewflow', destination_url: defaultReviewUrl(), status: 'active' });
    setModalOpen(true);
  }

  function openEdit(q: QrCodeRow) {
    setEditing(q);
    setForm({ name: q.name, qr_type: q.qr_type, destination_url: q.destination_url, status: q.status });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      showToast('error', 'Name is required');
      return;
    }
    if (!form.destination_url.trim()) {
      showToast('error', 'Destination URL is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        business_id: businessId,
        name: form.name.trim(),
        qr_type: form.qr_type,
        destination_url: form.destination_url.trim(),
        status: form.status,
      };

      if (editing) {
        const { error } = await supabase.from('qr_codes').update(payload).eq('id', editing.id);
        if (error) throw error;
        showToast('success', 'QR code updated');
      } else {
        const { error } = await supabase.from('qr_codes').insert(payload);
        if (error) throw error;
        showToast('success', 'QR code created');
      }
      setModalOpen(false);
      await fetchData();
    } catch (err: any) {
      showToast('error', err.message ?? 'Failed to save QR code');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('qr_codes').delete().eq('id', deleteId);
      if (error) throw error;
      showToast('success', 'QR code deleted');
      setDeleteId(null);
      await fetchData();
    } catch (err: any) {
      showToast('error', err.message ?? 'Failed to delete QR code');
    } finally {
      setSaving(false);
    }
  }

  function qrImageUrl(url: string) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  if (loading) return <LoadingSpinner label="Loading QR codes..." />;

  return (
    <div>
      <PageHeader
        title="QR Codes"
        description="Manage QR codes for reviews and campaigns"
        action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> Add QR Code</Button>}
      />

      {qrCodes.length === 0 ? (
        <EmptyState icon={QrCode} title="No QR codes yet" description="Create QR codes to direct customers to your review flow." action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> Add QR Code</Button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {qrCodes.map((q) => (
            <Card key={q.id} className="p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate">{q.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <Badge color="blue">{q.qr_type}</Badge>
                    <Badge color={q.status === 'active' ? 'green' : 'gray'}>{q.status}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => setPreviewUrl(q.destination_url)}><Eye className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(q)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteId(q.id)}><Trash2 className="w-3.5 h-3.5 text-red-400" /></Button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <img src={qrImageUrl(q.destination_url)} alt={q.name} className="w-20 h-20 rounded-lg bg-white p-1 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-500 mb-1">Destination</p>
                  <a href={q.destination_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-300 hover:text-blue-200 truncate flex items-center gap-1">
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    <span className="truncate">{q.destination_url}</span>
                  </a>
                  <p className="text-xs text-zinc-500 mt-2">Scans: <span className="text-zinc-300 font-medium">{q.scan_count}</span></p>
                  <p className="text-xs text-zinc-600 mt-0.5">{formatDate(q.created_at)}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit QR Code' : 'Add QR Code'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Name</label>
            <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Front Desk QR" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">QR Type</label>
              <Select value={form.qr_type} onChange={(v) => setForm({ ...form, qr_type: v })}>
                {QR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Status</label>
              <Select value={form.status} onChange={(v) => setForm({ ...form, status: v })}>
                {QR_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Destination URL</label>
            <Input value={form.destination_url} onChange={(v) => setForm({ ...form, destination_url: v })} placeholder={defaultReviewUrl()} />
            {business && (
              <button
                type="button"
                onClick={() => setForm({ ...form, destination_url: defaultReviewUrl() })}
                className="mt-1.5 text-xs text-blue-400 hover:text-blue-300"
              >
                Use default review URL
              </button>
            )}
          </div>
          {form.destination_url && (
            <div className="flex justify-center">
              <img src={qrImageUrl(form.destination_url)} alt="Preview" className="w-32 h-32 rounded-lg bg-white p-1" />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!previewUrl} onClose={() => setPreviewUrl(null)} title="QR Code Preview">
        <div className="flex flex-col items-center gap-3">
          <img src={qrImageUrl(previewUrl ?? '')} alt="QR Code" className="w-48 h-48 rounded-lg bg-white p-2" />
          <a href={previewUrl ?? '#'} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-300 hover:text-blue-200 break-all text-center">
            {previewUrl}
          </a>
        </div>
      </Modal>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete QR Code" maxWidth="max-w-sm">
        <p className="text-sm text-zinc-300 mb-4">Are you sure you want to delete this QR code? This action cannot be undone.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} disabled={saving}>{saving ? 'Deleting...' : 'Delete'}</Button>
        </div>
      </Modal>
    </div>
  );
}
