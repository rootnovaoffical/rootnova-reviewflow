import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge, Button, Input, Select, Modal } from '../components/UI';
import { useToast } from '../context/ToastContext';
import { Plug, Grid3x3, Plus, Pencil, Trash2, Activity, Zap, Star } from 'lucide-react';

/* ============================================================
 * InstalledIntegrationsModule
 * CRUD for installed_integrations filtered by business_id
 * Show: provider_id (lookup name from integration_providers), status,
 *       sync_frequency, last_sync_at, health_score
 * Create modal with provider_id (select from integration_providers list), sync_frequency
 * ============================================================ */

interface IntegrationProvider {
  id: string;
  name: string;
  category: string | null;
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

function formatDate(d: string | null): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleString(); } catch { return d; }
}

function healthColor(score: number | null): string {
  if (score === null) return 'gray';
  if (score >= 80) return 'green';
  if (score >= 50) return 'yellow';
  return 'red';
}

export function InstalledIntegrationsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [integrations, setIntegrations] = useState<InstalledIntegration[]>([]);
  const [providers, setProviders] = useState<IntegrationProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<InstalledIntegration | null>(null);
  const [form, setForm] = useState({ provider_id: '', sync_frequency: 'daily' });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [intRes, provRes] = await Promise.all([
      supabase.from('installed_integrations').select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
      supabase.from('integration_providers').select('id, name, category').order('name', { ascending: true }),
    ]);
    if (intRes.error) showToast('error', `Failed to load integrations: ${intRes.error.message}`);
    else setIntegrations(intRes.data || []);
    if (provRes.error) showToast('error', `Failed to load providers: ${provRes.error.message}`);
    else setProviders(provRes.data || []);
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const providerName = (pid: string) => providers.find((p) => p.id === pid)?.name || pid;

  const openCreate = () => {
    setEditing(null);
    setForm({ provider_id: providers[0]?.id || '', sync_frequency: 'daily' });
    setModalOpen(true);
  };

  const openEdit = (i: InstalledIntegration) => {
    setEditing(i);
    setForm({ provider_id: i.provider_id, sync_frequency: i.sync_frequency || 'daily' });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.provider_id) { showToast('error', 'Provider is required'); return; }
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
      showToast('error', `Save failed: ${error.message}`);
    } else {
      showToast('success', editing ? 'Integration updated' : 'Integration installed');
      setModalOpen(false);
      fetchData();
    }
  };

  const handleDelete = async (i: InstalledIntegration) => {
    if (!confirm(`Uninstall ${providerName(i.provider_id)}?`)) return;
    const { error } = await supabase.from('installed_integrations').delete().eq('id', i.id);
    if (error) {
      showToast('error', `Uninstall failed: ${error.message}`);
    } else {
      showToast('success', 'Integration uninstalled');
      fetchData();
    }
  };

  return (
    <div>
      <PageHeader
        title="Installed Integrations"
        description="Manage integrations connected to this business"
        action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> Install Integration</Button>}
      />
      {loading ? (
        <LoadingSpinner label="Loading integrations..." />
      ) : integrations.length === 0 ? (
        <EmptyState icon={Plug} title="No integrations installed" description="Connect an integration provider to get started." action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> Install Integration</Button>} />
      ) : (
        <div className="grid gap-3">
          {integrations.map((i) => (
            <Card key={i.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Plug className="w-4 h-4 text-blue-400 shrink-0" />
                    <h3 className="font-semibold text-white truncate">{providerName(i.provider_id)}</h3>
                    {i.status && <Badge color={i.status === 'connected' ? 'green' : i.status === 'error' ? 'red' : 'gray'}>{i.status}</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-400">
                    {i.sync_frequency && <span className="flex items-center gap-1"><Activity className="w-3.5 h-3.5" /> {i.sync_frequency}</span>}
                    <span>Last sync: <span className="text-zinc-200">{formatDate(i.last_sync_at)}</span></span>
                  </div>
                  {i.health_score !== null && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-zinc-500">Health:</span>
                      <Badge color={healthColor(i.health_score)}>{i.health_score}%</Badge>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(i)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(i)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
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
              {providers.length === 0 && <option value="">No providers available</option>}
              {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Sync Frequency</label>
            <Select value={form.sync_frequency} onChange={(v) => setForm({ ...form, sync_frequency: v })}>
              {SYNC_FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.provider_id}>{saving ? 'Saving...' : editing ? 'Update' : 'Install'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ============================================================
 * IntegrationProvidersModule
 * No props. List integration_providers (global, no business filter)
 * Show: name, category, description, auth_type, is_active, is_featured
 * Grid of cards. Read-only.
 * ============================================================ */

interface IntegrationProviderFull {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  auth_type: string | null;
  is_active: boolean;
  is_featured: boolean;
}

export function IntegrationProvidersModule() {
  const { showToast } = useToast();
  const [providers, setProviders] = useState<IntegrationProviderFull[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('integration_providers')
        .select('*')
        .order('name', { ascending: true });
      if (error) {
        showToast('error', `Failed to load providers: ${error.message}`);
      } else {
        setProviders(data || []);
      }
      setLoading(false);
    })();
  }, [showToast]);

  return (
    <div>
      <PageHeader title="Integration Providers" description="Browse all available integration providers" />
      {loading ? (
        <LoadingSpinner label="Loading providers..." />
      ) : providers.length === 0 ? (
        <EmptyState icon={Grid3x3} title="No providers available" description="Integration providers will appear here." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {providers.map((p) => (
            <Card key={p.id} className="p-4 flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Zap className="w-4 h-4 text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-white truncate">{p.name}</h3>
                </div>
                {p.is_featured && <Star className="w-4 h-4 text-amber-400 shrink-0 fill-amber-400" />}
              </div>
              {p.description && <p className="text-sm text-zinc-400 mb-3 line-clamp-2 flex-1">{p.description}</p>}
              <div className="flex flex-wrap gap-2">
                {p.category && <Badge color="blue">{p.category}</Badge>}
                {p.auth_type && <Badge color="purple">{p.auth_type}</Badge>}
                {p.is_active ? <Badge color="green">Active</Badge> : <Badge color="gray">Inactive</Badge>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
