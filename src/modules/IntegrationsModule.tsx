import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge, Button, Input, Select, Modal } from '../components/UI';
import { Plug, LayoutGrid, Plus, Trash2, RefreshCw, Activity, Star, Power } from 'lucide-react';

/* ============================================================
 * InstalledIntegrationsModule
 * ============================================================ */

interface IntegrationProvider {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
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
  created_at?: string;
}

const SYNC_FREQUENCIES = ['realtime', 'hourly', 'daily', 'weekly', 'manual'];

function formatDate(value: string | null): string {
  if (!value) return '—';
  try { return new Date(value).toLocaleString(); } catch { return value; }
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
  const [form, setForm] = useState({ provider_id: '', sync_frequency: 'daily' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [instRes, provRes] = await Promise.all([
      supabase.from('installed_integrations').select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
      supabase.from('integration_providers').select('*').order('name', { ascending: true }),
    ]);
    if (instRes.error) showToast('error', `Failed to load integrations: ${instRes.error.message}`);
    else setIntegrations((instRes.data as InstalledIntegration[]) || []);
    if (provRes.error) showToast('error', `Failed to load providers: ${provRes.error.message}`);
    else setProviders((provRes.data as IntegrationProvider[]) || []);
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => { load(); }, [load]);

  const providerName = (pid: string) => providers.find((p) => p.id === pid)?.name || pid;

  const openCreate = () => {
    setForm({ provider_id: providers[0]?.id || '', sync_frequency: 'daily' });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.provider_id) { showToast('error', 'Select a provider'); return; }
    setSaving(true);
    const payload = {
      business_id: businessId,
      provider_id: form.provider_id,
      sync_frequency: form.sync_frequency,
    };
    const { error } = await supabase.from('installed_integrations').insert(payload);
    setSaving(false);
    if (error) { showToast('error', `Save failed: ${error.message}`); return; }
    showToast('success', 'Integration installed');
    setModalOpen(false);
    load();
  };

  const remove = async (i: InstalledIntegration) => {
    if (!confirm(`Uninstall ${providerName(i.provider_id)}?`)) return;
    const { error } = await supabase.from('installed_integrations').delete().eq('id', i.id);
    if (error) { showToast('error', `Uninstall failed: ${error.message}`); return; }
    showToast('success', 'Integration uninstalled');
    load();
  };

  if (loading) return <LoadingSpinner label="Loading integrations…" />;

  return (
    <div>
      <PageHeader
        title="Installed Integrations"
        description="Integrations connected to this business"
        action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> Install</Button>}
      />

      {integrations.length === 0 ? (
        <EmptyState icon={Plug} title="No integrations installed" description="Connect an integration provider to sync data." action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> Install</Button>} />
      ) : (
        <div className="space-y-3">
          {integrations.map((i) => (
            <Card key={i.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-white truncate">{providerName(i.provider_id)}</h3>
                    {i.status && <Badge color={i.status === 'connected' ? 'green' : i.status === 'error' ? 'red' : 'gray'}>{i.status}</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
                    {i.sync_frequency && <span className="inline-flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5" /> {i.sync_frequency}</span>}
                    <span className="inline-flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5" /> Last sync: {formatDate(i.last_sync_at)}</span>
                    {i.health_score !== null && (
                      <span className="inline-flex items-center gap-1"><Activity className="w-3.5 h-3.5" /> Health: <Badge color={healthColor(i.health_score)}>{i.health_score}</Badge></span>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => remove(i)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Install Integration">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Provider</label>
            <Select value={form.provider_id} onChange={(v) => setForm({ ...form, provider_id: v })}>
              {providers.length === 0 && <option value="">No providers available</option>}
              {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Sync Frequency</label>
            <Select value={form.sync_frequency} onChange={(v) => setForm({ ...form, sync_frequency: v })}>
              {SYNC_FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Installing…' : 'Install'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ============================================================
 * IntegrationProvidersModule
 * ============================================================ */

export function IntegrationProvidersModule() {
  const { showToast } = useToast();
  const [providers, setProviders] = useState<IntegrationProvider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('integration_providers').select('*').order('name', { ascending: true });
      if (error) showToast('error', `Failed to load providers: ${error.message}`);
      else setProviders((data as IntegrationProvider[]) || []);
      setLoading(false);
    })();
  }, [showToast]);

  if (loading) return <LoadingSpinner label="Loading providers…" />;

  return (
    <div>
      <PageHeader title="Integration Providers" description="Available integrations you can connect" />

      {providers.length === 0 ? (
        <EmptyState icon={LayoutGrid} title="No providers available" description="Integration providers will appear here." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.map((p) => (
            <Card key={p.id} className="p-4 flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-white">{p.name}</h3>
                <div className="flex items-center gap-1">
                  {p.is_featured && <Star className="w-4 h-4 text-amber-400" />}
                  {p.is_active ? <Power className="w-4 h-4 text-emerald-400" /> : <Power className="w-4 h-4 text-zinc-600" />}
                </div>
              </div>
              {p.description && <p className="text-sm text-zinc-400 mb-3 flex-1">{p.description}</p>}
              <div className="flex flex-wrap gap-2">
                {p.category && <Badge color="blue">{p.category}</Badge>}
                {p.auth_type && <Badge color="purple">{p.auth_type}</Badge>}
                <Badge color={p.is_active ? 'green' : 'gray'}>{p.is_active ? 'Active' : 'Inactive'}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
