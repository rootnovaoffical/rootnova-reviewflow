import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, QrCode as QrCodeIcon, ExternalLink, Eye } from 'lucide-react';
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
  Select,
  Modal,
} from '../components/UI';

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
}

const QR_TYPES = ['reviewflow', 'landing_page', 'feedback', 'social'];
const QR_STATUSES = ['active', 'paused', 'archived'];

export default function QrCodesModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [qrCodes, setQrCodes] = useState<QrCode[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<QrCode | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<QrCode | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    qr_type: 'reviewflow',
    destination_url: '',
    status: 'active',
  });

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  async function fetchData() {
    setLoading(true);
    try {
      const [qrRes, bizRes] = await Promise.all([
        supabase
          .from('qr_codes')
          .select('id, name, qr_type, destination_url, status, scan_count')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false }),
        supabase.from('businesses').select('id, slug').eq('id', businessId).single(),
      ]);

      if (qrRes.error) throw qrRes.error;
      setQrCodes(qrRes.data || []);
      setBusiness(bizRes.data || null);
    } catch (err) {
      console.error('Error fetching QR codes:', err);
      showToast('error', 'Failed to load QR codes');
    } finally {
      setLoading(false);
    }
  }

  function defaultReviewUrl() {
    const slug = business?.slug || '';
    return `${window.location.origin}/review/${slug}`;
  }

  function openCreate() {
    setEditing(null);
    setForm({
      name: '',
      qr_type: 'reviewflow',
      destination_url: defaultReviewUrl(),
      status: 'active',
    });
    setModalOpen(true);
  }

  function openEdit(qr: QrCode) {
    setEditing(qr);
    setForm({
      name: qr.name,
      qr_type: qr.qr_type,
      destination_url: qr.destination_url,
      status: qr.status,
    });
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
    } catch (err) {
      console.error('Error saving QR code:', err);
      showToast('error', 'Failed to save QR code');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase.from('qr_codes').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      showToast('success', 'QR code deleted');
      setDeleteTarget(null);
      await fetchData();
    } catch (err) {
      console.error('Error deleting QR code:', err);
      showToast('error', 'Failed to delete QR code');
    }
  }

  function statusColor(status: string): string {
    switch (status) {
      case 'active':
        return 'green';
      case 'paused':
        return 'yellow';
      case 'archived':
        return 'gray';
      default:
        return 'gray';
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
        description="Generate and manage QR codes that link to your review flow"
        action={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" /> Add QR Code
          </Button>
        }
      />

      {qrCodes.length === 0 ? (
        <EmptyState
          icon={QrCodeIcon}
          title="No QR codes yet"
          description="Create a QR code to let customers quickly access your review page."
          action={
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4" /> Add QR Code
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {qrCodes.map((qr) => (
            <Card key={qr.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-white truncate">{qr.name}</h3>
                  <Badge color={statusColor(qr.status)}>{qr.status}</Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setPreviewUrl(qr.destination_url)}>
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(qr)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(qr)}>
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </Button>
                </div>
              </div>

              <div className="flex justify-center mb-3">
                <img
                  src={qrImageUrl(qr.destination_url)}
                  alt={`QR code for ${qr.name}`}
                  className="w-32 h-32 rounded-lg bg-white p-1.5"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Type</span>
                  <Badge color="blue">{qr.qr_type}</Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Scans</span>
                  <span className="text-zinc-300 font-medium">{qr.scan_count}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <a
                    href={qr.destination_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-400 hover:text-blue-300 truncate"
                  >
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{qr.destination_url}</span>
                  </a>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit QR Code' : 'New QR Code'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Name</label>
            <Input
              value={form.name}
              onChange={(v) => setForm({ ...form, name: v })}
              placeholder="e.g. Front Desk QR"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">QR Type</label>
              <Select
                value={form.qr_type}
                onChange={(v) => setForm({ ...form, qr_type: v })}
              >
                {QR_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Status</label>
              <Select
                value={form.status}
                onChange={(v) => setForm({ ...form, status: v })}
              >
                {QR_STATUSES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Destination URL
            </label>
            <Input
              value={form.destination_url}
              onChange={(v) => setForm({ ...form, destination_url: v })}
              placeholder="https://..."
            />
            <p className="text-xs text-zinc-500 mt-1">
              Defaults to your public review link.
            </p>
          </div>

          {form.destination_url && (
            <div className="flex justify-center">
              <img
                src={qrImageUrl(form.destination_url)}
                alt="QR preview"
                className="w-32 h-32 rounded-lg bg-white p-1.5"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal
        open={!!previewUrl}
        onClose={() => setPreviewUrl(null)}
        title="QR Code Preview"
        maxWidth="max-w-sm"
      >
        <div className="flex flex-col items-center gap-3">
          {previewUrl && (
            <img
              src={qrImageUrl(previewUrl)}
              alt="QR preview"
              className="w-48 h-48 rounded-lg bg-white p-2"
            />
          )}
          <p className="text-xs text-zinc-500 text-center break-all">{previewUrl}</p>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete QR Code"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-300">
            Are you sure you want to delete this QR code? This action cannot be undone.
          </p>
          {deleteTarget && (
            <p className="text-sm text-zinc-500 bg-white/5 rounded-lg p-3 border border-white/10">
              {deleteTarget.name}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              <Trash2 className="w-4 h-4" /> Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
