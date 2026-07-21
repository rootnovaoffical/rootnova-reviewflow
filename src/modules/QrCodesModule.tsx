import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge, Button, Input, Select, Modal } from '../components/UI';
import { useToast } from '../context/ToastContext';
import { QrCode, Plus, Pencil, Trash2, Eye, Download } from 'lucide-react';

interface QrCodeRow {
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
}

export default function QrCodesModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [qrCodes, setQrCodes] = useState<QrCodeRow[]>([]);
  const [businessSlug, setBusinessSlug] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', qr_type: 'review', destination_url: '', status: 'active' });

  useEffect(() => {
    fetchData();
  }, [businessId]);

  async function fetchData() {
    setLoading(true);
    try {
      const [qrRes, bizRes] = await Promise.all([
        supabase.from('qr_codes').select('id, name, qr_type, destination_url, status, scan_count').eq('business_id', businessId).order('created_at', { ascending: false }),
        supabase.from('businesses').select('id, slug').eq('id', businessId).single(),
      ]);
      if (qrRes.error) throw qrRes.error;
      setQrCodes((qrRes.data ?? []) as QrCodeRow[]);
      setBusinessSlug(bizRes.data?.slug ?? '');
    } catch {
      showToast('error', 'Failed to load QR codes');
    } finally {
      setLoading(false);
    }
  }

  function defaultUrl() {
    return `${window.location.origin}/review/${businessSlug}`;
  }

  function openCreate() {
    setEditingId(null);
    setForm({ name: '', qr_type: 'review', destination_url: defaultUrl(), status: 'active' });
    setModalOpen(true);
  }

  function openEdit(q: QrCodeRow) {
    setEditingId(q.id);
    setForm({ name: q.name, qr_type: q.qr_type, destination_url: q.destination_url, status: q.status });
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
        name: form.name,
        qr_type: form.qr_type,
        destination_url: form.destination_url,
        status: form.status,
      };
      if (editingId) {
        const { error } = await supabase.from('qr_codes').update(payload).eq('id', editingId);
        if (error) throw error;
        showToast('success', 'QR code updated');
      } else {
        const { error } = await supabase.from('qr_codes').insert(payload);
        if (error) throw error;
        showToast('success', 'QR code created');
      }
      setModalOpen(false);
      await fetchData();
    } catch {
      showToast('error', 'Failed to save QR code');
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
      setDeleteOpen(false);
      setDeleteId(null);
      await fetchData();
    } catch {
      showToast('error', 'Failed to delete QR code');
    } finally {
      setSaving(false);
    }
  }

  function qrImageUrl(url: string) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
  }

  if (loading) return <LoadingSpinner label="Loading QR codes..." />;

  return (
    <div>
      <PageHeader
        title="QR Codes"
        description="Manage QR codes for this business"
        action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> Add QR Code</Button>}
      />

      {qrCodes.length === 0 ? (
        <EmptyState icon={QrCode} title="No QR codes yet" description="Create QR codes to direct customers to your review page." action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> Add QR Code</Button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {qrCodes.map((qr) => (
            <Card key={qr.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white truncate">{qr.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Badge color="blue">{qr.qr_type}</Badge>
                    <Badge color={qr.status === 'active' ? 'green' : 'gray'}>{qr.status}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(qr)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => { setDeleteId(qr.id); setDeleteOpen(true); }}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                </div>
              </div>
              <div className="flex flex-col items-center gap-2 mb-3">
                <img src={qrImageUrl(qr.destination_url)} alt={qr.name} className="w-32 h-32 rounded-lg bg-white p-1" />
                <a href={qr.destination_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 truncate max-w-full flex items-center gap-1">
                  <Eye className="w-3 h-3" /> {qr.destination_url}
                </a>
              </div>
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>{qr.scan_count} scans</span>
                <a href={qrImageUrl(qr.destination_url)} download={`${qr.name}.png`} className="text-blue-400 hover:text-blue-300 flex items-center gap-1">
                  <Download className="w-3 h-3" /> Download
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit QR Code' : 'Add QR Code'}>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Name</label>
            <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="e.g. Front Desk QR" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">QR Type</label>
              <Select value={form.qr_type} onChange={(v) => setForm({ ...form, qr_type: v })}>
                <option value="review">Review</option>
                <option value="menu">Menu</option>
                <option value="website">Website</option>
                <option value="custom">Custom</option>
              </Select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Status</label>
              <Select value={form.status} onChange={(v) => setForm({ ...form, status: v })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Destination URL</label>
            <Input value={form.destination_url} onChange={(v) => setForm({ ...form, destination_url: v })} placeholder="https://..." />
            {businessSlug && (
              <button onClick={() => setForm({ ...form, destination_url: defaultUrl() })} className="text-xs text-blue-400 hover:text-blue-300 mt-1">
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
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editingId ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete QR Code" maxWidth="max-w-sm">
        <p className="text-sm text-zinc-300 mb-4">Are you sure you want to delete this QR code? This action cannot be undone.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} disabled={saving}>{saving ? 'Deleting...' : 'Delete'}</Button>
        </div>
      </Modal>
    </div>
  );
}
