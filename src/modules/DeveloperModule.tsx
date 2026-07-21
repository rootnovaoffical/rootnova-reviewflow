import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge, Button, Input, TextArea, Modal } from '../components/UI';
import { useToast } from '../context/ToastContext';
import { KeyRound, AppWindow, Webhook, Plus, Pencil, Trash2, Copy } from 'lucide-react';

/* ============================================================
 * ApiKeysModule
 * CRUD for api_keys filtered by business_id
 * Show: key_name, key_prefix, scopes, is_active, last_used_at, expires_at
 * Create modal with key_name, scopes (comma-separated input), rate_limit_per_hour
 * ============================================================ */

interface ApiKey {
  id: string;
  business_id: string;
  key_name: string;
  key_prefix: string | null;
  scopes: string[] | null;
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  rate_limit_per_hour: number | null;
  created_at?: string;
}

function formatDate(d: string | null): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleString(); } catch { return d; }
}

export function ApiKeysModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ApiKey | null>(null);
  const [form, setForm] = useState({ key_name: '', scopes: '', rate_limit_per_hour: '1000' });
  const [saving, setSaving] = useState(false);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('error', `Failed to load API keys: ${error.message}`);
    } else {
      setKeys(data || []);
    }
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const openCreate = () => {
    setEditing(null);
    setForm({ key_name: '', scopes: '', rate_limit_per_hour: '1000' });
    setModalOpen(true);
  };

  const openEdit = (k: ApiKey) => {
    setEditing(k);
    setForm({
      key_name: k.key_name || '',
      scopes: (k.scopes || []).join(', '),
      rate_limit_per_hour: k.rate_limit_per_hour?.toString() || '1000',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.key_name.trim()) { showToast('error', 'Key name is required'); return; }
    setSaving(true);
    const scopes = form.scopes.split(',').map((s) => s.trim()).filter(Boolean);
    const payload = {
      business_id: businessId,
      key_name: form.key_name.trim(),
      scopes: scopes.length ? scopes : null,
      rate_limit_per_hour: parseInt(form.rate_limit_per_hour, 10) || null,
    };
    let error;
    if (editing) {
      ({ error } = await supabase.from('api_keys').update(payload).eq('id', editing.id));
    } else {
      ({ error } = await supabase.from('api_keys').insert(payload));
    }
    setSaving(false);
    if (error) {
      showToast('error', `Save failed: ${error.message}`);
    } else {
      showToast('success', editing ? 'API key updated' : 'API key created');
      setModalOpen(false);
      fetchKeys();
    }
  };

  const handleDelete = async (k: ApiKey) => {
    if (!confirm(`Delete API key "${k.key_name}"?`)) return;
    const { error } = await supabase.from('api_keys').delete().eq('id', k.id);
    if (error) {
      showToast('error', `Delete failed: ${error.message}`);
    } else {
      showToast('success', 'API key deleted');
      fetchKeys();
    }
  };

  return (
    <div>
      <PageHeader
        title="API Keys"
        description="Manage API keys for this business"
        action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Key</Button>}
      />
      {loading ? (
        <LoadingSpinner label="Loading API keys..." />
      ) : keys.length === 0 ? (
        <EmptyState icon={KeyRound} title="No API keys" description="Create an API key to access the platform programmatically." action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Key</Button>} />
      ) : (
        <div className="grid gap-3">
          {keys.map((k) => (
            <Card key={k.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <KeyRound className="w-4 h-4 text-blue-400 shrink-0" />
                    <h3 className="font-semibold text-white truncate">{k.key_name}</h3>
                    {k.is_active ? <Badge color="green">Active</Badge> : <Badge color="gray">Inactive</Badge>}
                  </div>
                  {k.key_prefix && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <code className="text-xs font-mono text-zinc-300 bg-white/5 px-2 py-0.5 rounded">{k.key_prefix}...</code>
                      <button onClick={() => { navigator.clipboard?.writeText(k.key_prefix || ''); showToast('info', 'Prefix copied'); }} className="text-zinc-500 hover:text-white"><Copy className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                  {k.scopes && k.scopes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {k.scopes.map((s) => <Badge key={s} color="purple">{s}</Badge>)}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-400">
                    <span>Last used: <span className="text-zinc-200">{formatDate(k.last_used_at)}</span></span>
                    <span>Expires: <span className="text-zinc-200">{formatDate(k.expires_at)}</span></span>
                    {k.rate_limit_per_hour !== null && <span>Rate limit: <span className="text-zinc-200">{k.rate_limit_per_hour}/hr</span></span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(k)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(k)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit API Key' : 'New API Key'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Key Name</label>
            <Input value={form.key_name} onChange={(v) => setForm({ ...form, key_name: v })} placeholder="Production API Key" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Scopes (comma-separated)</label>
            <Input value={form.scopes} onChange={(v) => setForm({ ...form, scopes: v })} placeholder="read:reviews, write:messages" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Rate Limit (per hour)</label>
            <Input type="number" value={form.rate_limit_per_hour} onChange={(v) => setForm({ ...form, rate_limit_per_hour: v })} placeholder="1000" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ============================================================
 * DeveloperAppsModule
 * CRUD for developer_apps filtered by business_id
 * Show: app_name, description, client_id, is_active
 * Create modal with app_name, description
 * ============================================================ */

interface DeveloperApp {
  id: string;
  business_id: string;
  app_name: string;
  description: string | null;
  client_id: string | null;
  is_active: boolean;
  created_at?: string;
}

export function DeveloperAppsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [apps, setApps] = useState<DeveloperApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DeveloperApp | null>(null);
  const [form, setForm] = useState({ app_name: '', description: '' });
  const [saving, setSaving] = useState(false);

  const fetchApps = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('developer_apps')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('error', `Failed to load apps: ${error.message}`);
    } else {
      setApps(data || []);
    }
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  const openCreate = () => {
    setEditing(null);
    setForm({ app_name: '', description: '' });
    setModalOpen(true);
  };

  const openEdit = (a: DeveloperApp) => {
    setEditing(a);
    setForm({ app_name: a.app_name || '', description: a.description || '' });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.app_name.trim()) { showToast('error', 'App name is required'); return; }
    setSaving(true);
    const payload = {
      business_id: businessId,
      app_name: form.app_name.trim(),
      description: form.description.trim() || null,
    };
    let error;
    if (editing) {
      ({ error } = await supabase.from('developer_apps').update(payload).eq('id', editing.id));
    } else {
      ({ error } = await supabase.from('developer_apps').insert(payload));
    }
    setSaving(false);
    if (error) {
      showToast('error', `Save failed: ${error.message}`);
    } else {
      showToast('success', editing ? 'App updated' : 'App created');
      setModalOpen(false);
      fetchApps();
    }
  };

  const handleDelete = async (a: DeveloperApp) => {
    if (!confirm(`Delete app "${a.app_name}"?`)) return;
    const { error } = await supabase.from('developer_apps').delete().eq('id', a.id);
    if (error) {
      showToast('error', `Delete failed: ${error.message}`);
    } else {
      showToast('success', 'App deleted');
      fetchApps();
    }
  };

  return (
    <div>
      <PageHeader
        title="Developer Apps"
        description="Manage developer applications for this business"
        action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New App</Button>}
      />
      {loading ? (
        <LoadingSpinner label="Loading apps..." />
      ) : apps.length === 0 ? (
        <EmptyState icon={AppWindow} title="No developer apps" description="Register a developer app to get started." action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New App</Button>} />
      ) : (
        <div className="grid gap-3">
          {apps.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <AppWindow className="w-4 h-4 text-blue-400 shrink-0" />
                    <h3 className="font-semibold text-white truncate">{a.app_name}</h3>
                    {a.is_active ? <Badge color="green">Active</Badge> : <Badge color="gray">Inactive</Badge>}
                  </div>
                  {a.description && <p className="text-sm text-zinc-400 mb-2 line-clamp-2">{a.description}</p>}
                  {a.client_id && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-zinc-500">Client ID:</span>
                      <code className="text-xs font-mono text-zinc-300 bg-white/5 px-2 py-0.5 rounded">{a.client_id}</code>
                      <button onClick={() => { navigator.clipboard?.writeText(a.client_id || ''); showToast('info', 'Client ID copied'); }} className="text-zinc-500 hover:text-white"><Copy className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(a)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(a)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit App' : 'New Developer App'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">App Name</label>
            <Input value={form.app_name} onChange={(v) => setForm({ ...form, app_name: v })} placeholder="My Review App" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Description</label>
            <TextArea value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Describe your application..." />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ============================================================
 * WebhooksModule
 * CRUD for webhooks filtered by business_id
 * Show: name, url, events, is_active
 * Create/edit modal with name, url, events (comma-separated)
 * ============================================================ */

interface Webhook {
  id: string;
  business_id: string;
  name: string;
  url: string | null;
  events: string[] | null;
  is_active: boolean;
  created_at?: string;
}

export function WebhooksModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Webhook | null>(null);
  const [form, setForm] = useState({ name: '', url: '', events: '' });
  const [saving, setSaving] = useState(false);

  const fetchWebhooks = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('webhooks')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('error', `Failed to load webhooks: ${error.message}`);
    } else {
      setWebhooks(data || []);
    }
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => { fetchWebhooks(); }, [fetchWebhooks]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', url: '', events: '' });
    setModalOpen(true);
  };

  const openEdit = (w: Webhook) => {
    setEditing(w);
    setForm({ name: w.name || '', url: w.url || '', events: (w.events || []).join(', ') });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { showToast('error', 'Name is required'); return; }
    if (!form.url.trim()) { showToast('error', 'URL is required'); return; }
    setSaving(true);
    const events = form.events.split(',').map((e) => e.trim()).filter(Boolean);
    const payload = {
      business_id: businessId,
      name: form.name.trim(),
      url: form.url.trim(),
      events: events.length ? events : null,
    };
    let error;
    if (editing) {
      ({ error } = await supabase.from('webhooks').update(payload).eq('id', editing.id));
    } else {
      ({ error } = await supabase.from('webhooks').insert(payload));
    }
    setSaving(false);
    if (error) {
      showToast('error', `Save failed: ${error.message}`);
    } else {
      showToast('success', editing ? 'Webhook updated' : 'Webhook created');
      setModalOpen(false);
      fetchWebhooks();
    }
  };

  const handleDelete = async (w: Webhook) => {
    if (!confirm(`Delete webhook "${w.name}"?`)) return;
    const { error } = await supabase.from('webhooks').delete().eq('id', w.id);
    if (error) {
      showToast('error', `Delete failed: ${error.message}`);
    } else {
      showToast('success', 'Webhook deleted');
      fetchWebhooks();
    }
  };

  return (
    <div>
      <PageHeader
        title="Webhooks"
        description="Manage webhook endpoints for this business"
        action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Webhook</Button>}
      />
      {loading ? (
        <LoadingSpinner label="Loading webhooks..." />
      ) : webhooks.length === 0 ? (
        <EmptyState icon={Webhook} title="No webhooks" description="Create a webhook to receive event notifications." action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Webhook</Button>} />
      ) : (
        <div className="grid gap-3">
          {webhooks.map((w) => (
            <Card key={w.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Webhook className="w-4 h-4 text-blue-400 shrink-0" />
                    <h3 className="font-semibold text-white truncate">{w.name}</h3>
                    {w.is_active ? <Badge color="green">Active</Badge> : <Badge color="gray">Inactive</Badge>}
                  </div>
                  {w.url && <p className="text-sm text-zinc-400 mb-2 truncate font-mono">{w.url}</p>}
                  {w.events && w.events.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {w.events.map((e) => <Badge key={e} color="blue">{e}</Badge>)}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(w)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(w)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Webhook' : 'New Webhook'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Name</label>
            <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Review Created Webhook" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">URL</label>
            <Input value={form.url} onChange={(v) => setForm({ ...form, url: v })} placeholder="https://example.com/webhook" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Events (comma-separated)</label>
            <Input value={form.events} onChange={(v) => setForm({ ...form, events: v })} placeholder="review.created, review.updated" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
