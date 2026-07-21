import { useState, useEffect } from 'react';
import { QrCode, Plus, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge, Button, Input, Select, Modal } from '../components/UI';

interface QrCodeRow {
  id: string;
  name: string;
  qr_type: string;
  destination_url: string;
  status: string;
  scan_count: number;
}

interface QrCodesModuleProps {
  businessId: string;
}

const QR_TYPES = [
  { value: 'review', label: 'Review Page' },
  { value: 'menu', label: 'Menu' },
  { value: 'wifi', label: 'WiFi' },
  { value: 'custom', label: 'Custom URL' },
];

const STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'draft', label: 'Draft' },
];

export default function QrCodesModule({ businessId }: QrCodesModuleProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [qrCodes, setQrCodes] = useState<QrCodeRow[]>([]);
  const [businessSlug, setBusinessSlug] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<QrCodeRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    qr_type: 'review',
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
        supabase.from('qr_codes').select('id, name, qr_type, destination_url, status, scan_count').eq('business_id', businessId).order('created_at', { ascending: false }),
        supabase.from('businesses').select('slug').eq('id', businessId).single(),
      ]);

      if (qrRes.error) throw qrRes.error;
      if (bizRes.error && bizRes.error.code !== 'PGRP1161') throw bizRes.error;

      setQrCodes((qrRes.data ?? []) as QrCodeRow[]);
      setBusinessSlug(bizRes.data?.slug ?? '');
    } catch (err) {
      showToast('error', `Failed to load QR codes: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  function defaultUrl() {
    if (businessSlug) return `${window.location.origin}/review/${businessSlug}`;
    return '';
  }

  function openCreate() {
    setEditing(null);
    setForm({ name: '', qr_type: 'review', destination_url: defaultUrl(), status: 'active' });
    setModalOpen(true);
  }

  function openEdit(qr: QrCodeRow) {
    setEditing(qr);
    setForm({ name: qr.name, qr_type: qr.qr_type, destination_url: qr.destination_url, status: qr.status });
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
      fetchData();
    } catch (err) {
      showToast('error', `Save failed: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(qr: QrCodeRow) {
    if (!confirm(`Delete "${qr.name}"?`)) return;
    try {
      const { error } = await supabase.from('qr_codes').delete().eq('id', qr.id);
      if (error) throw error;
      showToast('success', 'QR code deleted');
      fetchData();
    } catch (err) {
      showToast('error', `Delete failed: ${(err as Error).message}`);
    }
  }

  function statusColor(status: string): string {
    if (status === 'active') return 'green';
    if (status === 'draft') return 'yellow';
    return 'gray';
  }

  function qrImageUrl(url: string) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}`;
  }

  if (loading) return <LoadingSpinner label="Loading QR codes..." />;

  return (
    <div>
      <PageHeader
        title="QR Codes"
        description="Manage QR codes for reviews and custom destinations"
        action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> Add QR Code</Button>}
      />

      {qrCodes.length === 0 ? (
        <Card className="p-5">
          <EmptyState icon={QrCode} title="No QR codes yet" description="Create QR codes to direct customers to your review page or custom URLs." action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> Add QR Code</Button>} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {qrCodes.map((qr) => (
            <Card key={qr.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white truncate">{qr.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge color="blue">{qr.qr_type}</Badge>
                    <Badge color={statusColor(qr.status)}>{qr.status}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(qr)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(qr)}><Trash2 className="w-3.5 h-3.5 text-red-400" /></Button>
                </div>
              </div>

              <div className="flex justify-center mb-3">
                <img src={qrImageUrl(qr.destination_url)} alt={qr.name} className="w-32 h-32 rounded-lg bg-white p-1.5" />
              </div>

              <div className="space-y-1">
                <a href={qr.destination_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 truncate">
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{qr.destination_url}</span>
                </a>
                <p className="text-xs text-zinc-500">{qr.scan_count} scan{qr.scan_count !== 1 ? 's' : ''}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit QR Code' : 'New QR Code'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Name</label>
            <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="e.g. Front Desk Review QR" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">QR Type</label>
              <Select value={form.qr_type} onChange={(v) => setForm({ ...form, qr_type: v })}>
                {QR_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Status</label>
              <Select value={form.status} onChange={(v) => setForm({ ...form, status: v })}>
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Destination URL</label>
            <Input value={form.destination_url} onChange={(v) => setForm({ ...form, destination_url: v })} placeholder={defaultUrl() || 'https://...'} />
            {businessSlug && (
              <p className="text-xs text-zinc-500 mt-1">Default: {window.location.origin}/review/{businessSlug}</p>
            )}
          </div>

          {form.destination_url && (
            <div className="flex justify-center">
              <img src={qrImageUrl(form.destination_url)} alt="Preview" className="w-32 h-32 rounded-lg bg-white p-1.5" />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
