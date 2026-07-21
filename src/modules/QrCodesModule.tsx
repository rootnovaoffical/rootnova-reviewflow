import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, QrCode as QrIcon, ExternalLink, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge, Button, Input, Select, Modal } from '../components/UI';
import { useToast } from '../context/ToastContext';

interface QrCode {
  id: string;
  name: string;
  qr_type: string;
  destination_url: string;
  status: string;
  scan_count: number;
}

interface Business {
  id: string;
  slug: string;
  name: string;
}

type FormState = {
  name: string;
  qr_type: string;
  destination_url: string;
  status: string;
};

export default function QrCodesModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [qrCodes, setQrCodes] = useState<QrCode[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<QrCode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<QrCode | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ name: '', qr_type: 'reviewflow', destination_url: '', status: 'active' });

  async function fetchData() {
    setLoading(true);
    try {
      const [qrRes, bizRes] = await Promise.all([
        supabase.from('qr_codes').select('id, name, qr_type, destination_url, status, scan_count').eq('business_id', businessId).order('created_at', { ascending: false }),
        supabase.from('businesses').select('id, slug, name').eq('id', businessId).single(),
      ]);

      if (qrRes.error) throw qrRes.error;
      if (bizRes.error) throw bizRes.error;

      setQrCodes((qrRes.data as QrCode[]) ?? []);
      setBusiness(bizRes.data as Business);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load QR codes';
      showToast('error', msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  function defaultUrl() {
    const slug = business?.slug ?? '';
    return `${window.location.origin}/review/${slug}`;
  }

  function openCreate() {
    setEditing(null);
    setForm({ name: '', qr_type: 'reviewflow', destination_url: defaultUrl(), status: 'active' });
    setModalOpen(true);
  }

  function openEdit(q: QrCode) {
    setEditing(q);
    setForm({ name: q.name, qr_type: q.qr_type, destination_url: q.destination_url, status: q.status });
    setModalOpen(true);
  }

  function openDelete(q: QrCode) {
    setDeleteTarget(q);
    setDeleteOpen(true);
  }

  function qrImageUrl(url: string) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save QR code';
      showToast('error', msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('qr_codes').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      showToast('success', 'QR code deleted');
      setDeleteOpen(false);
      setDeleteTarget(null);
      await fetchData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete QR code';
      showToast('error', msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner label="Loading QR codes..." />;

  return (
    <div>
      <PageHeader
        title="QR Codes"
        description="Manage QR codes for your review flow"
        action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New QR Code</Button>}
      />

      {qrCodes.length === 0 ? (
        <EmptyState
          icon={QrIcon}
          title="No QR codes yet"
          description="Create QR codes to direct customers to your review flow."
          action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New QR Code</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {qrCodes.map((qr) => (
            <Card key={qr.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-white truncate">{qr.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <Badge color="blue">{qr.qr_type}</Badge>
                    <Badge color={qr.status === 'active' ? 'green' : 'gray'}>{qr.status}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(qr)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => openDelete(qr)}><Trash2 className="w-3.5 h-3.5 text-red-400" /></Button>
                </div>
              </div>
              <div className="flex justify-center mb-3">
                <img src={qrImageUrl(qr.destination_url)} alt={`QR code for ${qr.name}`} className="w-32 h-32 rounded-lg bg-white p-1.5" />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">{qr.scan_count} scans</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPreviewUrl(qr.destination_url)} className="flex items-center gap-1 text-blue-400 hover:text-blue-300"><Eye className="w-3 h-3" /> Preview</button>
                  <a href={qr.destination_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-zinc-400 hover:text-white"><ExternalLink className="w-3 h-3" /> Open</a>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit QR Code' : 'New QR Code'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Name</label>
            <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="e.g. Front Desk QR" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">QR Type</label>
              <Select value={form.qr_type} onChange={(v) => setForm({ ...form, qr_type: v })}>
                <option value="reviewflow">Review Flow</option>
                <option value="direct">Direct Link</option>
                <option value="custom">Custom</option>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Status</label>
              <Select value={form.status} onChange={(v) => setForm({ ...form, status: v })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Destination URL</label>
            <Input value={form.destination_url} onChange={(v) => setForm({ ...form, destination_url: v })} placeholder={defaultUrl()} />
            <p className="text-xs text-zinc-500 mt-1">Defaults to your public review link</p>
          </div>
          {form.destination_url && (
            <div className="flex justify-center">
              <img src={qrImageUrl(form.destination_url)} alt="QR preview" className="w-32 h-32 rounded-lg bg-white p-1.5" />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete QR Code" maxWidth="max-w-md">
        <p className="text-sm text-zinc-300 mb-6">Are you sure you want to delete this QR code? This action cannot be undone.</p>
        {deleteTarget && <p className="text-sm text-white bg-white/5 border border-white/10 rounded-lg p-3 mb-6">{deleteTarget.name}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} disabled={saving}>{saving ? 'Deleting...' : 'Delete'}</Button>
        </div>
      </Modal>

      <Modal open={!!previewUrl} onClose={() => setPreviewUrl(null)} title="QR Code Preview" maxWidth="max-w-sm">
        <div className="flex flex-col items-center gap-3">
          {previewUrl && <img src={qrImageUrl(previewUrl)} alt="QR preview" className="w-48 h-48 rounded-lg bg-white p-2" />}
          {previewUrl && <p className="text-xs text-zinc-400 break-all text-center">{previewUrl}</p>}
        </div>
      </Modal>
    </div>
  );
}
