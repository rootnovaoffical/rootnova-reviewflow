import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import {
  LoadingSpinner, EmptyState, PageHeader, Card, Badge, Button, Select, Modal,
} from '../components/UI';
import { Plug, Plus, Trash2, Pencil, Activity, Star } from 'lucide-react';

/* ============================================================
 * InstalledIntegrationsModule — CRUD for installed_integrations
 * ============================================================ */

interface IntegrationProvider {
  id: string;
  name: string;
  category: string | null;
  auth_type: string | null;
  is_active: boolean;
  is_featured: boolean;
}

interface InstalledIntegration {
  id: string;
  business_id: string;
  provider_id: string;
  status: string | null;
  sync_frequency: string | null;
  last_sync_at: string | null;
  health_score: number | null;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

const SYNC_FREQUENCIES = ['realtime', 'hourly', 'daily', 'weekly', 'manual'];

function formatDate(value: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return value;
  }
}

function healthColor(score: number | null): string {
  if (score === null) return 'gray';
  if (score >= 80) return 'green';
  if (score >= 50) return 'yellow';
  return 'red';
}

export function InstalledIntegrationsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<InstalledIntegration[]>([]);
  const [providers, setProviders] = useState<IntegrationProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<InstalledIntegration | null>(null);
  const [form, setForm] = useState({ provider_id: '', sync_frequency: 'daily' });
  const [saving, setSaving] = useState(false);

  const providerMap = new Map(providers.map((p) => [p.id, p]));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: provData, error: provError }, { data: instData, error: instError }] = await Promise.all([
        supabase.from('integration_providers').select('id, name, category, auth_type, is_active, is_featured').eq('is_active', true).order('name'),
        supabase.from('installed_integrations').select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
      ]);
      if (provError) throw provError;
      if (instError) throw instError;
      setProviders((provData as IntegrationProvider[]) || []);
      setItems((instData as InstalledIntegration[]) || []);
    } catch (e) {
      showToast('error', `Failed to load integrations: ${(e as Error).message}`);
    }
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({ provider_id: providers[0]?.id ?? '', sync_frequency: 'daily' });
    setModalOpen(true);
  }

  function openEdit(i: InstalledIntegration) {
    setEditing(i);
    setForm({ provider_id: i.provider_id, sync_frequency: i.sync_frequency ?? 'daily' });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.provider_id) { showToast('error', 'Select a provider'); return; }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from('installed_integrations')
          .update({ provider_id: form.provider_id, sync_frequency: form.sync_frequency })
          .eq('id', editing.id);
        if (error) throw error;
        showToast('success', 'Integration updated');
      } else {
        const { error } = await supabase
          .from('installed_integrations')
          .insert({
            business_id: businessId,
            provider_id: form.provider_id,
            sync_frequency: form.sync_frequency,
            status: 'connected',
          });
        if (error) throw error;
        showToast('success', 'Integration installed');
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
    if (!confirm('Remove this integration?')) return;
    const { error } = await supabase.from('installed_integrations').delete().eq('id', id);
    if (error) { showToast('error', error.message); return; }
    showToast('success', 'Integration removed');
    load();
  }

  if (loading) return <LoadingSpinner label="Loading integrations…" />;

  return (
    <div>
      <PageHeader
        title="Installed Integrations"
        description="Manage third-party integrations connected to this business"
        action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> Install Integration</Button>}
      />

      {items.length === 0 ? (
        <EmptyState
          icon={Plug}
          title="No integrations installed"
          description="Connect third-party providers to sync data and extend your workflows."
          action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> Install Integration</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((i) => {
            const prov = providerMap.get(i.provider_id);
            return (
              <Card key={i.id} className="p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Plug className="w-4.5 h-4.5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{prov?.name ?? 'Unknown Provider'}</h3>
                      {prov?.category && <p className="text-xs text-zinc-500">{prov.category}</p>}
                    </div>
                  </div>
                  <Badge color={i.status === 'connected' ? 'green' : i.status === 'error' ? 'red' : 'gray'}>{i.status ?? '—'}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-zinc-500">Sync Frequency</p>
                    <p className="text-zinc-300">{i.sync_frequency ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Health Score</p>
                    <Badge color={healthColor(i.health_score)}>{i.health_score !== null ? `${i.health_score}%` : '—'}</Badge>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-zinc-500">Last Sync</p>
                    <p className="text-zinc-300">{formatDate(i.last_sync_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Button size="sm" variant="secondary" onClick={() => openEdit(i)}><Pencil className="w-3.5 h-3.5" /> Edit</Button>
                  <Button size="sm" variant="danger" onClick={() => handleDelete(i.id)}><Trash2 className="w-3.5 h-3.5" /> Remove</Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Integration' : 'Install Integration'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Provider</label>
            <Select value={form.provider_id} onChange={(v) => setForm({ ...form, provider_id: v })}>
              <option value="">Select a provider…</option>
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
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Install'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ============================================================
 * IntegrationProvidersModule — Read-only global provider catalog
 * ============================================================ */

interface FullProvider extends IntegrationProvider {
  description: string | null;
  logo_url: string | null;
  supported_features: string[] | null;
}

export function IntegrationProvidersModule() {
  const { showToast } = useToast();
  const [items, setItems] = useState<FullProvider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('integration_providers')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) {
        showToast('error', `Failed to load providers: ${error.message}`);
      } else {
        setItems((data as FullProvider[]) || []);
      }
      setLoading(false);
    }
    load();
  }, [showToast]);

  if (loading) return <LoadingSpinner label="Loading providers…" />;

  return (
    <div>
      <PageHeader
        title="Integration Providers"
        description="Browse the catalog of available integration providers"
      />

      {items.length === 0 ? (
        <EmptyState
          icon={Plug}
          title="No providers available"
          description="The integration catalog is currently empty."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <Card key={p.id} className="p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  {p.logo_url ? (
                    <img src={p.logo_url} alt={p.name} className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Plug className="w-5 h-5 text-blue-400" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-white">{p.name}</h3>
                    {p.category && <p className="text-xs text-zinc-500">{p.category}</p>}
                  </div>
                </div>
                {p.is_featured && <Star className="w-4 h-4 text-amber-400 fill-amber-400" />}
              </div>
              {p.description && <p className="text-sm text-zinc-400 line-clamp-3">{p.description}</p>}
              <div className="flex flex-wrap gap-2 mt-auto">
                <Badge color={p.is_active ? 'green' : 'gray'}>{p.is_active ? 'Active' : 'Inactive'}</Badge>
                {p.auth_type && <Badge color="blue">{p.auth_type}</Badge>}
                {p.is_featured && <Badge color="yellow">Featured</Badge>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
