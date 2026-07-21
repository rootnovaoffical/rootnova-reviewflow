import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  Card, Badge, Button, Input, TextArea, Select, Modal,
  PageHeader, LoadingSpinner, EmptyState,
} from '../components/UI';
import { useToast } from '../context/ToastContext';
import {
  KeyRound, AppWindow, Webhook, Plus, Pencil, Trash2, Copy, CheckCircle2, XCircle,
} from 'lucide-react';

function fmtDate(s: string | null) {
  if (!s) return '—';
  try { return new Date(s).toLocaleString(); } catch { return s; }
}

/* ------------------------------------------------------------------ */
/* ApiKeysModule                                                      */
/* ------------------------------------------------------------------ */

type ApiKey = {
  id: string;
  key_name: string;
  key_prefix: string | null;
  scopes: string[] | null;
  is_active: boolean | null;
  last_used_at: string | null;
  expires_at: string | null;
};

export function ApiKeysModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ApiKey | null>(null);
  const [form, setForm] = useState({
    key_name: '',
    scopes: '',
    rate_limit_per_hour: 1000,
  is_active: true,
  expires_at: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('id, key_name, key_prefix, scopes, is_active, last_used_at, expires_at')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      showToast('error', `Failed to load API keys: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [businessId, showToast]);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({ key_name: '', scopes: '', rate_limit_per_hour: 1000, is_active: true, expires_at: '' });
    setModalOpen(true);
  }

  function openEdit(k: ApiKey) {
    setEditing(k);
    setForm({
      key_name: k.key_name,
      scopes: (k.scopes || []).join(', '),
      rate_limit_per_hour: 1000,
      is_active: k.is_active ?? true,
      expires_at: k.expires_at ? k.expires_at.slice(0, 10) : '',
    });
    setModalOpen(true);
  }

  async function save() {
    if (!form.key_name.trim()) {
      showToast('error', 'Key name is required');
      return;
    }
    const scopes = form.scopes.split(',').map((s) => s.trim()).filter(Boolean);
    const payload: Record<string, unknown> = {
      business_id: businessId,
      key_name: form.key_name.trim(),
      scopes,
      is_active: form.is_active,
    };
    if (form.expires_at) payload.expires_at = form.expires_at;
    if (!editing) payload.rate_limit_per_hour = form.rate_limit_per_hour;

    try {
      if (editing) {
        const { error } = await supabase.from('api_keys').update(payload).eq('id', editing.id);
        if (error) throw error;
        showToast('success', 'API key updated');
      } else {
        const { error } = await supabase.from('api_keys').insert(payload);
        if (error) throw error;
        showToast('success', 'API key created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      showToast('error', `Save failed: ${(err as Error).message}`);
    }
  }

  async function remove(k: ApiKey) {
    if (!confirm(`Revoke "${k.key_name}"?`)) return;
    try {
      const { error } = await supabase.from('api_keys').delete().eq('id', k.id);
      if (error) throw error;
      showToast('success', 'API key revoked');
      load();
    } catch (err) {
      showToast('error', `Revoke failed: ${(err as Error).message}`);
    }
  }

  function copyPrefix(prefix: string) {
    navigator.clipboard.writeText(prefix);
    showToast('info', 'Copied key prefix');
  }

  if (loading) return <LoadingSpinner label="Loading API keys…" />;

  return (
    <div>
      <PageHeader
        title="API Keys"
        description="Manage API keys for this business"
        action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Key</Button>}
      />
      {items.length === 0 ? (
        <EmptyState icon={KeyRound} title="No API keys" description="Create an API key to access the platform programmatically." action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Key</Button>} />
      ) : (
        <div className="grid gap-3">
          {items.map((k) => (
            <Card key={k.id} className="p-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-white truncate">{k.key_name}</h3>
                  {k.is_active ? <Badge color="green"><CheckCircle2 className="w-3 h-3 mr-1" />Active</Badge> : <Badge color="gray"><XCircle className="w-3 h-3 mr-1" />Revoked</Badge>}
                </div>
                {k.key_prefix && (
                  <button onClick={() => copyPrefix(k.key_prefix!)} className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white font-mono mb-2">
                    {k.key_prefix}<Copy className="w-3 h-3" />
                  </button>
                )}
                <div className="flex flex-wrap gap-1.5 mb-1">
                  {(k.scopes || []).map((s) => <Badge key={s} color="blue">{s}</Badge>)}
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-zinc-500">
                  <span>Last used: {fmtDate(k.last_used_at)}</span>
                  <span>Expires: {fmtDate(k.expires_at)}</span>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => openEdit(k)}><Pencil className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => remove(k)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit API Key' : 'New API Key'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Key Name</label>
            <Input value={form.key_name} onChange={(v) => setForm({ ...form, key_name: v })} placeholder="Production key" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Scopes (comma-separated)</label>
            <Input value={form.scopes} onChange={(v) => setForm({ ...form, scopes: v })} placeholder="read:reviews, write:reviews" />
          </div>
          {!editing && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Rate Limit (per hour)</label>
              <Input type="number" value={String(form.rate_limit_per_hour)} onChange={(v) => setForm({ ...form, rate_limit_per_hour: parseInt(v) || 0 })} />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Expires At (optional)</label>
            <Input type="date" value={form.expires_at} onChange={(v) => setForm({ ...form, expires_at: v })} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded border-white/20 bg-white/5" />
            <span className="text-sm text-zinc-300">Active</span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? 'Save' : 'Create'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* DeveloperAppsModule                                                */
/* ------------------------------------------------------------------ */

type DeveloperApp = {
  id: string;
  app_name: string;
  description: string | null;
  client_id: string | null;
  is_active: boolean | null;
};

export function DeveloperAppsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<DeveloperApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DeveloperApp | null>(null);
  const [form, setForm] = useState({ app_name: '', description: '', is_active: true });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('developer_apps')
        .select('id, app_name, description, client_id, is_active')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      showToast('error', `Failed to load apps: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [businessId, showToast]);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({ app_name: '', description: '', is_active: true });
    setModalOpen(true);
  }

  function openEdit(a: DeveloperApp) {
    setEditing(a);
    setForm({ app_name: a.app_name, description: a.description || '', is_active: a.is_active ?? true });
    setModalOpen(true);
  }

  async function save() {
    if (!form.app_name.trim()) {
      showToast('error', 'App name is required');
      return;
    }
    const payload = {
      business_id: businessId,
      app_name: form.app_name.trim(),
      description: form.description.trim() || null,
      is_active: form.is_active,
    };
    try {
      if (editing) {
        const { error } = await supabase.from('developer_apps').update(payload).eq('id', editing.id);
        if (error) throw error;
        showToast('success', 'App updated');
      } else {
        const { error } = await supabase.from('developer_apps').insert(payload);
        if (error) throw error;
        showToast('success', 'App created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      showToast('error', `Save failed: ${(err as Error).message}`);
    }
  }

  async function remove(a: DeveloperApp) {
    if (!confirm(`Delete "${a.app_name}"?`)) return;
    try {
      const { error } = await supabase.from('developer_apps').delete().eq('id', a.id);
      if (error) throw error;
      showToast('success', 'App deleted');
      load();
    } catch (err) {
      showToast('error', `Delete failed: ${(err as Error).message}`);
    }
  }

  if (loading) return <LoadingSpinner label="Loading developer apps…" />;

  return (
    <div>
      <PageHeader
        title="Developer Apps"
        description="Manage OAuth applications for this business"
        action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New App</Button>}
      />
      {items.length === 0 ? (
        <EmptyState icon={AppWindow} title="No developer apps" description="Register an OAuth application to get started." action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New App</Button>} />
      ) : (
        <div className="grid gap-3">
          {items.map((a) => (
            <Card key={a.id} className="p-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-white truncate">{a.app_name}</h3>
                  {a.is_active ? <Badge color="green">Active</Badge> : <Badge color="gray">Inactive</Badge>}
                </div>
                {a.description && <p className="text-sm text-zinc-400 mb-1">{a.description}</p>}
                {a.client_id && <p className="text-sm text-zinc-500 font-mono">Client ID: {a.client_id}</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => openEdit(a)}><Pencil className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => remove(a)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit App' : 'New App'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">App Name</label>
            <Input value={form.app_name} onChange={(v) => setForm({ ...form, app_name: v })} placeholder="My OAuth App" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Description</label>
            <TextArea value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="What does this app do?" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded border-white/20 bg-white/5" />
            <span className="text-sm text-zinc-300">Active</span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? 'Save' : 'Create'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* WebhooksModule                                                    */
/* ------------------------------------------------------------------ */

type Webhook = {
  id: string;
  name: string;
  url: string | null;
  events: string[] | null;
  is_active: boolean | null;
};

export function WebhooksModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Webhook | null>(null);
  const [form, setForm] = useState({ name: '', url: '', events: '', is_active: true });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('webhooks')
        .select('id, name, url, events, is_active')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      showToast('error', `Failed to load webhooks: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [businessId, showToast]);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({ name: '', url: '', events: '', is_active: true });
    setModalOpen(true);
  }

  function openEdit(w: Webhook) {
    setEditing(w);
    setForm({ name: w.name, url: w.url || '', events: (w.events || []).join(', '), is_active: w.is_active ?? true });
    setModalOpen(true);
  }

  async function save() {
    if (!form.name.trim()) {
      showToast('error', 'Name is required');
      return;
    }
    if (!form.url.trim()) {
      showToast('error', 'URL is required');
      return;
    }
    const events = form.events.split(',').map((s) => s.trim()).filter(Boolean);
    const payload = {
      business_id: businessId,
      name: form.name.trim(),
      url: form.url.trim(),
      events,
      is_active: form.is_active,
    };
    try {
      if (editing) {
        const { error } = await supabase.from('webhooks').update(payload).eq('id', editing.id);
        if (error) throw error;
        showToast('success', 'Webhook updated');
      } else {
        const { error } = await supabase.from('webhooks').insert(payload);
        if (error) throw error;
        showToast('success', 'Webhook created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      showToast('error', `Save failed: ${(err as Error).message}`);
    }
  }

  async function remove(w: Webhook) {
    if (!confirm(`Delete "${w.name}"?`)) return;
    try {
      const { error } = await supabase.from('webhooks').delete().eq('id', w.id);
      if (error) throw error;
      showToast('success', 'Webhook deleted');
      load();
    } catch (err) {
      showToast('error', `Delete failed: ${(err as Error).message}`);
    }
  }

  if (loading) return <LoadingSpinner label="Loading webhooks…" />;

  return (
    <div>
      <PageHeader
        title="Webhooks"
        description="Manage webhook endpoints for this business"
        action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Webhook</Button>}
      />
      {items.length === 0 ? (
        <EmptyState icon={Webhook} title="No webhooks" description="Register a webhook endpoint to receive event notifications." action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Webhook</Button>} />
      ) : (
        <div className="grid gap-3">
          {items.map((w) => (
            <Card key={w.id} className="p-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-white truncate">{w.name}</h3>
                  {w.is_active ? <Badge color="green">Active</Badge> : <Badge color="gray">Inactive</Badge>}
                </div>
                {w.url && <p className="text-sm text-zinc-400 font-mono mb-1 truncate">{w.url}</p>}
                <div className="flex flex-wrap gap-1.5">
                  {(w.events || []).map((e) => <Badge key={e} color="purple">{e}</Badge>)}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => openEdit(w)}><Pencil className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => remove(w)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Webhook' : 'New Webhook'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Name</label>
            <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Review created" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">URL</label>
            <Input value={form.url} onChange={(v) => setForm({ ...form, url: v })} placeholder="https://example.com/webhook" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Events (comma-separated)</label>
            <Input value={form.events} onChange={(v) => setForm({ ...form, events: v })} placeholder="review.created, review.replied" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded border-white/20 bg-white/5" />
            <span className="text-sm text-zinc-300">Active</span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? 'Save' : 'Create'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
