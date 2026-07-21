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
  Select,
  Modal,
} from '../components/UI';
import {
  Plug,
  Plus,
  Pencil,
  Trash2,
  Layers,
  Star,
  CheckCircle2,
  XCircle,
  Activity,
} from 'lucide-react';

/* ============================================================
 * InstalledIntegrationsModule
 * CRUD for installed_integrations filtered by business_id
 * ============================================================ */

interface IntegrationProvider {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  auth_type: string | null;
  is_active: boolean | null;
  is_featured: boolean | null;
}

interface InstalledIntegration {
  id: string;
  business_id: string;
  provider_id: string;
  status: string | null;
  sync_frequency: string | null;
  last_sync_at: string | null;
  health_score: number | null;
  created_at?: string;
}

const SYNC_FREQUENCIES = ['realtime', 'hourly', 'daily', 'weekly', 'manual'];

export function InstalledIntegrationsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [installed, setInstalled] = useState<InstalledIntegration[]>([]);
  const [providers, setProviders] = useState<IntegrationProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<InstalledIntegration | null>(null);
  const [form, setForm] = useState({ provider_id: '', sync_frequency: SYNC_FREQUENCIES[0] });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [instRes, provRes] = await Promise.all([
      supabase.from('installed_integrations').select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
      supabase.from('integration_providers').select('*').order('name', { ascending: true }),
    ]);
    if (instRes.error) {
      showToast('error', 'Failed to load installed integrations');
    } else {
      setInstalled((instRes.data as InstalledIntegration[]) || []);
    }
    if (provRes.error) {
      showToast('error', 'Failed to load integration providers');
    } else {
      setProviders((provRes.data as IntegrationProvider[]) || []);
    }
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const providerName = (id: string) => providers.find((p) => p.id === id)?.name || 'Unknown Provider';

  const openCreate = () => {
    setEditing(null);
    setForm({ provider_id: providers[0]?.id || '', sync_frequency: SYNC_FREQUENCIES[0] });
    setModalOpen(true);
  };

  const openEdit = (i: InstalledIntegration) => {
    setEditing(i);
    setForm({ provider_id: i.provider_id, sync_frequency: i.sync_frequency || SYNC_FREQUENCIES[0] });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.provider_id) {
      showToast('error', 'Please select a provider');
      return;
    }
    setSaving(true);
    const payload = {
      business_id: businessId,
      provider_id: form.provider_id,
      sync_frequency: form.sync_frequency,
    };
    let error;
    if (editing) {
      ({ error } = await supabase.from('installed_integrations').update(payload).eq('id', editing.id));
    } else {
      ({ error } = await supabase.from('installed_integrations').insert(payload));
    }
    setSaving(false);
    if (error) {
      showToast('error', `Failed to ${editing ? 'update' : 'install'} integration`);
      return;
    }
    showToast('success', `Integration ${editing ? 'updated' : 'installed'} successfully`);
    setModalOpen(false);
    fetchData();
  };

  const handleDelete = async (i: InstalledIntegration) => {
    if (!confirm('Remove this integration?')) return;
    const { error } = await supabase.from('installed_integrations').delete().eq('id', i.id);
    if (error) {
      showToast('error', 'Failed to remove integration');
      return;
    }
    showToast('success', 'Integration removed');
    fetchData();
  };

  const healthColor = (score: number | null) => {
    if (score === null) return 'gray';
    if (score >= 80) return 'green';
    if (score >= 50) return 'yellow';
    return 'red';
  };

  const statusColor = (s: string | null) => {
    if (!s) return 'gray';
    if (s === 'active' || s === 'connected') return 'green';
    if (s === 'error' || s === 'disconnected') return 'red';
    return 'yellow';
  };

  return (
    <div>
      <PageHeader
        title="Installed Integrations"
        description="Manage integrations installed for this business"
        action={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" /> Install Integration
          </Button>
        }
      />

      {loading ? (
        <LoadingSpinner label="Loading integrations..." />
      ) : installed.length === 0 ? (
        <EmptyState
          icon={Plug}
          title="No installed integrations"
          description="Install an integration to connect external services"
          action={
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4" /> Install Integration
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3">
          {installed.map((i) => (
            <Card key={i.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white mb-2">{providerName(i.provider_id)}</h3>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {i.status && <Badge color={statusColor(i.status)}>{i.status}</Badge>}
                    {i.sync_frequency && <Badge color="blue">{i.sync_frequency}</Badge>}
                    {i.health_score !== null && (
                      <Badge color={healthColor(i.health_score)}>
                        <Activity className="w-3 h-3 mr-1" />
                        {i.health_score}%
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-zinc-500">
                    Last sync: {i.last_sync_at ? new Date(i.last_sync_at).toLocaleString() : 'Never'}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(i)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(i)}>
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Integration' : 'Install Integration'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Provider</label>
            <Select value={form.provider_id} onChange={(v) => setForm({ ...form, provider_id: v })}>
              <option value="">Select a provider</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Sync Frequency</label>
            <Select value={form.sync_frequency} onChange={(v) => setForm({ ...form, sync_frequency: v })}>
              {SYNC_FREQUENCIES.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Install'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ============================================================
 * IntegrationProvidersModule
 * List integration_providers (global, read-only)
 * ============================================================ */

export function IntegrationProvidersModule() {
  const { showToast } = useToast();
  const [providers, setProviders] = useState<IntegrationProvider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProviders = async () => {
      const { data, error } = await supabase
        .from('integration_providers')
        .select('*')
        .order('name', { ascending: true });
      if (error) {
        showToast('error', 'Failed to load integration providers');
      } else {
        setProviders((data as IntegrationProvider[]) || []);
      }
      setLoading(false);
    };
    fetchProviders();
  }, [showToast]);

  return (
    <div>
      <PageHeader
        title="Integration Providers"
        description="Available integrations you can connect to your business"
      />

      {loading ? (
        <LoadingSpinner label="Loading providers..." />
      ) : providers.length === 0 ? (
        <EmptyState icon={Layers} title="No providers available" description="Integration providers will appear here" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.map((p) => (
            <Card key={p.id} className="p-5 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Plug className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex gap-1">
                  {p.is_featured && (
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  )}
                  {p.is_active ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-zinc-600" />
                  )}
                </div>
              </div>
              <h3 className="font-semibold text-white mb-1">{p.name}</h3>
              {p.category && <Badge color="purple">{p.category}</Badge>}
              {p.description && <p className="text-sm text-zinc-400 mt-2 flex-1">{p.description}</p>}
              {p.auth_type && (
                <div className="mt-3 pt-3 border-t border-white/5">
                  <span className="text-xs text-zinc-500">Auth: </span>
                  <span className="text-xs text-zinc-300">{p.auth_type}</span>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
