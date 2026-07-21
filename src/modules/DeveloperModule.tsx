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
  Input,
  Modal,
} from '../components/UI';
import {
  KeyRound,
  Plus,
  Trash2,
  AppWindow,
  Webhook,
  Copy,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

/* ============================================================
 * ApiKeysModule
 * CRUD for api_keys filtered by business_id
 * ============================================================ */

interface ApiKey {
  id: string;
  business_id: string;
  key_name: string;
  key_prefix: string | null;
  scopes: string[] | string | null;
  is_active: boolean | null;
  last_used_at: string | null;
  expires_at: string | null;
  created_at?: string;
}

export function ApiKeysModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
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
      showToast('error', 'Failed to load API keys');
    } else {
      setKeys((data as ApiKey[]) || []);
    }
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const openCreate = () => {
    setForm({ key_name: '', scopes: '', rate_limit_per_hour: '1000' });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.key_name.trim()) {
      showToast('error', 'Key name is required');
      return;
    }
    setSaving(true);
    const scopes = form.scopes
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const payload = {
      business_id: businessId,
      key_name: form.key_name.trim(),
      scopes: scopes.length ? scopes : null,
      rate_limit_per_hour: parseInt(form.rate_limit_per_hour, 10) || 1000,
    };
    const { error } = await supabase.from('api_keys').insert(payload);
    setSaving(false);
    if (error) {
      showToast('error', 'Failed to create API key');
      return;
    }
    showToast('success', 'API key created');
    setModalOpen(false);
    fetchKeys();
  };

  const handleDelete = async (k: ApiKey) => {
    if (!confirm('Revoke and delete this API key?')) return;
    const { error } = await supabase.from('api_keys').delete().eq('id', k.id);
    if (error) {
      showToast('error', 'Failed to delete API key');
      return;
    }
    showToast('success', 'API key revoked');
    fetchKeys();
  };

  const toggleActive = async (k: ApiKey) => {
    const { error } = await supabase.from('api_keys').update({ is_active: !k.is_active }).eq('id', k.id);
    if (error) {
      showToast('error', 'Failed to toggle key status');
      return;
    }
    fetchKeys();
  };

  const formatScopes = (s: string[] | string | null) => {
    if (!s) return [];
    if (Array.isArray(s)) return s;
    return s.split(',').map((x) => x.trim());
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleString();
  };

  return (
    <div>
      <PageHeader
        title="API Keys"
        description="Manage API keys for this business"
        action={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" /> Generate Key
          </Button>
        }
      />

      {loading ? (
        <LoadingSpinner label="Loading API keys..." />
      ) : keys.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="No API keys"
          description="Generate an API key to access the platform programmatically"
          action={
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4" /> Generate Key
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3">
          {keys.map((k) => (
            <Card key={k.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-white">{k.key_name}</h3>
                    <button onClick={() => toggleActive(k)} title="Toggle active">
                      {k.is_active ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-zinc-600" />
                      )}
                    </button>
                  </div>
                  {k.key_prefix && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <code className="px-2 py-0.5 rounded bg-white/5 text-blue-300 text-xs font-mono">{k.key_prefix}</code>
                    </div>
                  )}
                  {formatScopes(k.scopes).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {formatScopes(k.scopes).map((s, idx) => (
                        <Badge key={idx} color="blue">{s}</Badge>
                      ))}
                    </div>
                  )}
                  <div className="text-sm text-zinc-500 space-y-0.5">
                    <p>Last used: {formatDate(k.last_used_at)}</p>
                    <p>Expires: {formatDate(k.expires_at)}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(k)}>
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Generate API Key">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Key Name</label>
            <Input value={form.key_name} onChange={(v) => setForm({ ...form, key_name: v })} placeholder="e.g. Production API Key" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Scopes</label>
            <Input
              value={form.scopes}
              onChange={(v) => setForm({ ...form, scopes: v })}
              placeholder="read:reviews, write:reviews, read:reports"
            />
            <p className="text-xs text-zinc-500 mt-1">Comma-separated list of scopes</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Rate Limit (per hour)</label>
            <Input
              type="number"
              value={form.rate_limit_per_hour}
              onChange={(v) => setForm({ ...form, rate_limit_per_hour: v })}
              placeholder="1000"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Generating...' : 'Generate'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ============================================================
 * DeveloperAppsModule
 * CRUD for developer_apps filtered by business_id
 * ============================================================ */

interface DeveloperApp {
  id: string;
  business_id: string;
  app_name: string;
  description: string | null;
  client_id: string | null;
  is_active: boolean | null;
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
      showToast('error', 'Failed to load developer apps');
    } else {
      setApps((data as DeveloperApp[]) || []);
    }
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

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
    if (!form.app_name.trim()) {
      showToast('error', 'App name is required');
      return;
    }
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
      showToast('error', `Failed to ${editing ? 'update' : 'create'} app`);
      return;
    }
    showToast('success', `App ${editing ? 'updated' : 'created'} successfully`);
    setModalOpen(false);
    fetchApps();
  };

  const handleDelete = async (a: DeveloperApp) => {
    if (!confirm('Delete this developer app?')) return;
    const { error } = await supabase.from('developer_apps').delete().eq('id', a.id);
    if (error) {
      showToast('error', 'Failed to delete app');
      return;
    }
    showToast('success', 'App deleted');
    fetchApps();
  };

  return (
    <div>
      <PageHeader
        title="Developer Apps"
        description="Manage OAuth applications for this business"
        action={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" /> New App
          </Button>
        }
      />

      {loading ? (
        <LoadingSpinner label="Loading apps..." />
      ) : apps.length === 0 ? (
        <EmptyState
          icon={AppWindow}
          title="No developer apps"
          description="Create a developer app to enable OAuth integrations"
          action={
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4" /> New App
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3">
          {apps.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white">{a.app_name}</h3>
                    {a.is_active ? <Badge color="green">Active</Badge> : <Badge color="gray">Inactive</Badge>}
                  </div>
                  {a.description && <p className="text-sm text-zinc-400 mb-2">{a.description}</p>}
                  {a.client_id && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-zinc-500">Client ID:</span>
                      <code className="px-2 py-0.5 rounded bg-white/5 text-blue-300 text-xs font-mono">{a.client_id}</code>
                    </div>
                  )}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(a)}>
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(a)}>
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </Button>
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
            <Input value={form.app_name} onChange={(v) => setForm({ ...form, app_name: v })} placeholder="My Application" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Description</label>
            <Input value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="App description" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ============================================================
 * WebhooksModule
 * CRUD for webhooks filtered by business_id
 * ============================================================ */

interface Webhook {
  id: string;
  business_id: string;
  name: string;
  url: string;
  events: string[] | string | null;
  is_active: boolean | null;
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
      showToast('error', 'Failed to load webhooks');
    } else {
      setWebhooks((data as Webhook[]) || []);
    }
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', url: '', events: '' });
    setModalOpen(true);
  };

  const openEdit = (w: Webhook) => {
    setEditing(w);
    const events = Array.isArray(w.events) ? w.events.join(', ') : (w.events || '');
    setForm({ name: w.name || '', url: w.url || '', events });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('error', 'Name is required');
      return;
    }
    if (!form.url.trim()) {
      showToast('error', 'URL is required');
      return;
    }
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
      showToast('error', `Failed to ${editing ? 'update' : 'create'} webhook`);
      return;
    }
    showToast('success', `Webhook ${editing ? 'updated' : 'created'} successfully`);
    setModalOpen(false);
    fetchWebhooks();
  };

  const handleDelete = async (w: Webhook) => {
    if (!confirm('Delete this webhook?')) return;
    const { error } = await supabase.from('webhooks').delete().eq('id', w.id);
    if (error) {
      showToast('error', 'Failed to delete webhook');
      return;
    }
    showToast('success', 'Webhook deleted');
    fetchWebhooks();
  };

  const formatEvents = (e: string[] | string | null) => {
    if (!e) return [];
    if (Array.isArray(e)) return e;
    return e.split(',').map((x) => x.trim());
  };

  return (
    <div>
      <PageHeader
        title="Webhooks"
        description="Manage webhook endpoints for this business"
        action={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" /> New Webhook
          </Button>
        }
      />

      {loading ? (
        <LoadingSpinner label="Loading webhooks..." />
      ) : webhooks.length === 0 ? (
        <EmptyState
          icon={Webhook}
          title="No webhooks"
          description="Create a webhook to receive event notifications"
          action={
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4" /> New Webhook
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3">
          {webhooks.map((w) => (
            <Card key={w.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white">{w.name}</h3>
                    {w.is_active ? <Badge color="green">Active</Badge> : <Badge color="gray">Inactive</Badge>}
                  </div>
                  <p className="text-sm text-blue-300 truncate mb-2 font-mono">{w.url}</p>
                  {formatEvents(w.events).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {formatEvents(w.events).map((ev, idx) => (
                        <Badge key={idx} color="purple">{ev}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(w)}>
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(w)}>
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </Button>
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
            <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Webhook name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">URL</label>
            <Input value={form.url} onChange={(v) => setForm({ ...form, url: v })} placeholder="https://example.com/webhook" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Events</label>
            <Input
              value={form.events}
              onChange={(v) => setForm({ ...form, events: v })}
              placeholder="review.created, review.updated, report.generated"
            />
            <p className="text-xs text-zinc-500 mt-1">Comma-separated list of events</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
