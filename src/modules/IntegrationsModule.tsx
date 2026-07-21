import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  Card, Badge, Button, Input, Select, Modal,
  PageHeader, LoadingSpinner, EmptyState,
} from '../components/UI';
import { useToast } from '../context/ToastContext';
import {
  Plug, Plus, Pencil, Trash2, Star, Activity, CheckCircle2, XCircle,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* InstalledIntegrationsModule                                        */
/* ------------------------------------------------------------------ */

type IntegrationProvider = {
  id: string;
  name: string;
};

type InstalledIntegration = {
  id: string;
  provider_id: string;
  status: string | null;
  sync_frequency: string | null;
  last_sync_at: string | null;
  health_score: number | null;
};

const SYNC_FREQUENCIES = ['realtime', 'hourly', 'daily', 'weekly'];
const STATUSES = ['connected', 'disconnected', 'error', 'pending'];

function fmtDate(s: string | null) {
  if (!s) return '—';
  try { return new Date(s).toLocaleString(); } catch { return s; }
}

function healthColor(score: number | null) {
  if (score === null) return 'gray';
  if (score >= 80) return 'green';
  if (score >= 50) return 'yellow';
  return 'red';
}

export function InstalledIntegrationsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<InstalledIntegration[]>([]);
  const [providers, setProviders] = useState<Record<string, IntegrationProvider>>({});
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<InstalledIntegration | null>(null);
  const [form, setForm] = useState({
    provider_id: '',
    status: STATUSES[0],
    sync_frequency: SYNC_FREQUENCIES[0],
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [instRes, provRes] = await Promise.all([
        supabase
          .from('installed_integrations')
          .select('id, provider_id, status, sync_frequency, last_sync_at, health_score')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false }),
        supabase.from('integration_providers').select('id, name'),
      ]);
      if (instRes.error) throw instRes.error;
      if (provRes.error) throw provRes.error;
      setItems(instRes.data || []);
      const map: Record<string, IntegrationProvider> = {};
      (provRes.data || []).forEach((p: IntegrationProvider) => { map[p.id] = p; });
      setProviders(map);
    } catch (err) {
      showToast('error', `Failed to load integrations: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [businessId, showToast]);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({
      provider_id: Object.keys(providers)[0] || '',
      status: STATUSES[0],
      sync_frequency: SYNC_FREQUENCIES[0],
    });
    setModalOpen(true);
  }

  function openEdit(i: InstalledIntegration) {
    setEditing(i);
    setForm({
      provider_id: i.provider_id,
      status: i.status || STATUSES[0],
      sync_frequency: i.sync_frequency || SYNC_FREQUENCIES[0],
    });
    setModalOpen(true);
  }

  async function save() {
    if (!form.provider_id) {
      showToast('error', 'Provider is required');
      return;
    }
    const payload = {
      business_id: businessId,
      provider_id: form.provider_id,
      status: form.status,
      sync_frequency: form.sync_frequency,
    };
    try {
      if (editing) {
        const { error } = await supabase
          .from('installed_integrations').update(payload).eq('id', editing.id);
        if (error) throw error;
        showToast('success', 'Integration updated');
      } else {
        const { error } = await supabase
          .from('installed_integrations').insert(payload);
        if (error) throw error;
        showToast('success', 'Integration installed');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      showToast('error', `Save failed: ${(err as Error).message}`);
    }
  }

  async function remove(i: InstalledIntegration) {
    if (!confirm('Remove this integration?')) return;
    try {
      const { error } = await supabase.from('installed_integrations').delete().eq('id', i.id);
      if (error) throw error;
      showToast('success', 'Integration removed');
      load();
    } catch (err) {
      showToast('error', `Remove failed: ${(err as Error).message}`);
    }
  }

  if (loading) return <LoadingSpinner label="Loading integrations…" />;

  return (
    <div>
      <PageHeader
        title="Installed Integrations"
        description="Manage integrations installed for this business"
        action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> Install</Button>}
      />
      {items.length === 0 ? (
        <EmptyState icon={Plug} title="No integrations installed" description="Connect an integration provider to get started." action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> Install</Button>} />
      ) : (
        <div className="grid gap-3">
          {items.map((i) => (
            <Card key={i.id} className="p-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-white truncate">{providers[i.provider_id]?.name || i.provider_id}</h3>
                  {i.status === 'connected' ? <Badge color="green"><CheckCircle2 className="w-3 h-3 mr-1" />{i.status}</Badge> : <Badge color={i.status === 'error' ? 'red' : 'gray'}><XCircle className="w-3 h-3 mr-1" />{i.status}</Badge>}
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-zinc-400">
                  {i.sync_frequency && <Badge color="blue">{i.sync_frequency}</Badge>}
                  <span className="flex items-center gap-1"><Activity className="w-3.5 h-3.5" /> Last sync: {fmtDate(i.last_sync_at)}</span>
                  {i.health_score !== null && <Badge color={healthColor(i.health_score)}>Health: {i.health_score}</Badge>}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => openEdit(i)}><Pencil className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => remove(i)}><Trash2 className="w-4 h-4" /></Button>
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
              {Object.values(providers).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Status</label>
              <Select value={form.status} onChange={(v) => setForm({ ...form, status: v })}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Sync Frequency</label>
              <Select value={form.sync_frequency} onChange={(v) => setForm({ ...form, sync_frequency: v })}>
                {SYNC_FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? 'Save' : 'Install'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* IntegrationProvidersModule                                         */
/* ------------------------------------------------------------------ */

type IntegrationProviderFull = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  auth_type: string | null;
  is_active: boolean | null;
  is_featured: boolean | null;
};

export function IntegrationProvidersModule() {
  const { showToast } = useToast();
  const [items, setItems] = useState<IntegrationProviderFull[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('integration_providers')
        .select('id, name, category, description, auth_type, is_active, is_featured')
        .order('name', { ascending: true });
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      showToast('error', `Failed to load providers: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner label="Loading providers…" />;

  return (
    <div>
      <PageHeader title="Integration Providers" description="Browse all available integration providers" />
      {items.length === 0 ? (
        <EmptyState icon={Plug} title="No providers available" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <Card key={p.id} className="p-4 flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-white">{p.name}</h3>
                {p.is_featured && <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />}
              </div>
              {p.description && <p className="text-sm text-zinc-400 mb-3 line-clamp-2">{p.description}</p>}
              <div className="flex flex-wrap gap-1.5 mt-auto">
                {p.category && <Badge color="purple">{p.category}</Badge>}
                {p.auth_type && <Badge color="blue">{p.auth_type}</Badge>}
                {p.is_active ? <Badge color="green">Active</Badge> : <Badge color="gray">Inactive</Badge>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
