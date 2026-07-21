import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge, Button, Input, Modal } from '../components/UI';
import { KeyRound, AppWindow, Webhook, Plus, Pencil, Trash2, Power } from 'lucide-react';

function formatDate(value: string | null): string {
  if (!value) return '—';
  try { return new Date(value).toLocaleString(); } catch { return value; }
}

/* ============================================================
 * ApiKeysModule
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

export function ApiKeysModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ key_name: '', scopes: '', rate_limit_per_hour: '1000' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) showToast('error', `Failed to load API keys: ${error.message}`);
    else setKeys((data as ApiKey[]) || []);
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm({ key_name: '', scopes: '', rate_limit_per_hour: '1000' });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.key_name.trim()) { showToast('error', 'Key name is required'); return; }
    setSaving(true);
    const payload = {
      business_id: businessId,
      key_name: form.key_name.trim(),
      scopes: form.scopes.trim() ? form.scopes.split(',').map((s) => s.trim()).filter(Boolean) : [],
      rate_limit_per_hour: parseInt(form.rate_limit_per_hour, 10) || null,
    };
    const { error } = await supabase.from('api_keys').insert(payload);
    setSaving(false);
    if (error) { showToast('error', `Save failed: ${error.message}`); return; }
    showToast('success', 'API key created');
    setModalOpen(false);
    load();
  };

  const toggleActive = async (k: ApiKey) => {
    const { error } = await supabase.from('api_keys').update({ is_active: !k.is_active }).eq('id', k.id);
    if (error) { showToast('error', `Update failed: ${error.message}`); return; }
    showToast('success', `Key ${!k.is_active ? 'activated' : 'deactivated'}`);
    load();
  };

  const remove = async (k: ApiKey) => {
    if (!confirm(`Delete API key "${k.key_name}"?`)) return;
    const { error } = await supabase.from('api_keys').delete().eq('id', k.id);
    if (error) { showToast('error', `Delete failed: ${error.message}`); return; }
    showToast('success', 'API key deleted');
    load();
  };

  if (loading) return <LoadingSpinner label="Loading API keys…" />;

  return (
    <div>
      <PageHeader
        title="API Keys"
        description="Manage API keys for this business"
        action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Key</Button>}
      />

      {keys.length === 0 ? (
        <EmptyState icon={KeyRound} title="No API keys" description="Create an API key to access the platform programmatically." action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Key</Button>} />
      ) : (
        <div className="space-y-3">
          {keys.map((k) => (
            <Card key={k.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white truncate">{k.key_name}</h3>
                    <Badge color={k.is_active ? 'green' : 'gray'}>{k.is_active ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  {k.key_prefix && <p className="text-sm font-mono text-zinc-400 mb-2">{k.key_prefix}…</p>}
                  {k.scopes && k.scopes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {k.scopes.map((s) => <Badge key={s} color="blue">{s}</Badge>)}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
                    <span>Last used: {formatDate(k.last_used_at)}</span>
                    <span>Expires: {formatDate(k.expires_at)}</span>
                    {k.rate_limit_per_hour !== null && <span>Limit: {k.rate_limit_per_hour}/hr</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => toggleActive(k)}><Power className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(k)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New API Key">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Key Name</label>
            <Input value={form.key_name} onChange={(v) => setForm({ ...form, key_name: v })} placeholder="Production server key" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Scopes</label>
            <Input value={form.scopes} onChange={(v) => setForm({ ...form, scopes: v })} placeholder="read:reviews, write:reports" />
            <p className="text-xs text-zinc-600 mt-1">Comma-separated list of scopes</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Rate Limit (per hour)</label>
            <Input type="number" value={form.rate_limit_per_hour} onChange={(v) => setForm({ ...form, rate_limit_per_hour: v })} placeholder="1000" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Create'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ============================================================
 * DeveloperAppsModule
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
  const [form, setForm] = useState({ app_name: '', description: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('developer_apps')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) showToast('error', `Failed to load apps: ${error.message}`);
    else setApps((data as DeveloperApp[]) || []);
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm({ app_name: '', description: '' });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.app_name.trim()) { showToast('error', 'App name is required'); return; }
    setSaving(true);
    const payload = {
      business_id: businessId,
      app_name: form.app_name.trim(),
      description: form.description.trim() || null,
    };
    const { error } = await supabase.from('developer_apps').insert(payload);
    setSaving(false);
    if (error) { showToast('error', `Save failed: ${error.message}`); return; }
    showToast('success', 'App created');
    setModalOpen(false);
    load();
  };

  const toggleActive = async (a: DeveloperApp) => {
    const { error } = await supabase.from('developer_apps').update({ is_active: !a.is_active }).eq('id', a.id);
    if (error) { showToast('error', `Update failed: ${error.message}`); return; }
    showToast('success', `App ${!a.is_active ? 'activated' : 'deactivated'}`);
    load();
  };

  const remove = async (a: DeveloperApp) => {
    if (!confirm(`Delete app "${a.app_name}"?`)) return;
    const { error } = await supabase.from('developer_apps').delete().eq('id', a.id);
    if (error) { showToast('error', `Delete failed: ${error.message}`); return; }
    showToast('success', 'App deleted');
    load();
  };

  if (loading) return <LoadingSpinner label="Loading developer apps…" />;

  return (
    <div>
      <PageHeader
        title="Developer Apps"
        description="OAuth applications for this business"
        action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New App</Button>}
      />

      {apps.length === 0 ? (
        <EmptyState icon={AppWindow} title="No developer apps" description="Create an app to enable OAuth integrations." action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New App</Button>} />
      ) : (
        <div className="space-y-3">
          {apps.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white truncate">{a.app_name}</h3>
                    <Badge color={a.is_active ? 'green' : 'gray'}>{a.is_active ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  {a.description && <p className="text-sm text-zinc-400 mb-1">{a.description}</p>}
                  {a.client_id && <p className="text-xs font-mono text-zinc-500">client_id: {a.client_id}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => toggleActive(a)}><Power className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(a)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Developer App">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">App Name</label>
            <Input value={form.app_name} onChange={(v) => setForm({ ...form, app_name: v })} placeholder="My Review App" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description</label>
            <Input value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="What this app does…" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Create'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ============================================================
 * WebhooksModule
 * ============================================================ */

interface Webhook {
  id: string;
  business_id: string;
  name: string;
  url: string;
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

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('webhooks')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) showToast('error', `Failed to load webhooks: ${error.message}`);
    else setWebhooks((data as Webhook[]) || []);
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', url: '', events: '' });
    setModalOpen(true);
  };

  const openEdit = (w: Webhook) => {
    setEditing(w);
    setForm({
      name: w.name || '',
      url: w.url || '',
      events: (w.events || []).join(', '),
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) { showToast('error', 'Name is required'); return; }
    if (!form.url.trim()) { showToast('error', 'URL is required'); return; }
    setSaving(true);
    const payload = {
      business_id: businessId,
      name: form.name.trim(),
      url: form.url.trim(),
      events: form.events.trim() ? form.events.split(',').map((e) => e.trim()).filter(Boolean) : [],
    };
    let result;
    if (editing) {
      result = await supabase.from('webhooks').update(payload).eq('id', editing.id);
    } else {
      result = await supabase.from('webhooks').insert(payload);
    }
    setSaving(false);
    if (result.error) { showToast('error', `Save failed: ${result.error.message}`); return; }
    showToast('success', editing ? 'Webhook updated' : 'Webhook created');
    setModalOpen(false);
    load();
  };

  const toggleActive = async (w: Webhook) => {
    const { error } = await supabase.from('webhooks').update({ is_active: !w.is_active }).eq('id', w.id);
    if (error) { showToast('error', `Update failed: ${error.message}`); return; }
    showToast('success', `Webhook ${!w.is_active ? 'activated' : 'deactivated'}`);
    load();
  };

  const remove = async (w: Webhook) => {
    if (!confirm(`Delete webhook "${w.name}"?`)) return;
    const { error } = await supabase.from('webhooks').delete().eq('id', w.id);
    if (error) { showToast('error', `Delete failed: ${error.message}`); return; }
    showToast('success', 'Webhook deleted');
    load();
  };

  if (loading) return <LoadingSpinner label="Loading webhooks…" />;

  return (
    <div>
      <PageHeader
        title="Webhooks"
        description="Event webhook endpoints for this business"
        action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Webhook</Button>}
      />

      {webhooks.length === 0 ? (
        <EmptyState icon={Webhook} title="No webhooks" description="Create a webhook to receive event notifications." action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Webhook</Button>} />
      ) : (
        <div className="space-y-3">
          {webhooks.map((w) => (
            <Card key={w.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white truncate">{w.name}</h3>
                    <Badge color={w.is_active ? 'green' : 'gray'}>{w.is_active ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  <p className="text-sm font-mono text-zinc-400 mb-2 truncate">{w.url}</p>
                  {w.events && w.events.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {w.events.map((e) => <Badge key={e} color="purple">{e}</Badge>)}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => toggleActive(w)}><Power className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(w)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(w)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Webhook' : 'New Webhook'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Name</label>
            <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Review created webhook" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">URL</label>
            <Input value={form.url} onChange={(v) => setForm({ ...form, url: v })} placeholder="https://example.com/webhook" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Events</label>
            <Input value={form.events} onChange={(v) => setForm({ ...form, events: v })} placeholder="review.created, review.updated" />
            <p className="text-xs text-zinc-600 mt-1">Comma-separated list of events</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : editing ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
