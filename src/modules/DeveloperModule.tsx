import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import {
  LoadingSpinner, EmptyState, PageHeader, Card, Badge, Button, Input, TextArea, Modal,
} from '../components/UI';
import { Key, Plus, Trash2, Pencil, Code2, Webhook } from 'lucide-react';

function formatDate(value: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return value;
  }
}

/* ============================================================
 * ApiKeysModule — CRUD for api_keys
 * ============================================================ */

interface ApiKey {
  id: string;
  business_id: string;
  key_name: string;
  key_prefix: string | null;
  scopes: string[] | null;
  rate_limit_per_hour: number | null;
  last_used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function ApiKeysModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ApiKey | null>(null);
  const [form, setForm] = useState({ key_name: '', scopes: '', rate_limit_per_hour: '1000' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('error', `Failed to load API keys: ${error.message}`);
    } else {
      setItems((data as ApiKey[]) || []);
    }
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({ key_name: '', scopes: '', rate_limit_per_hour: '1000' });
    setModalOpen(true);
  }

  function openEdit(k: ApiKey) {
    setEditing(k);
    setForm({
      key_name: k.key_name,
      scopes: (k.scopes ?? []).join(', '),
      rate_limit_per_hour: String(k.rate_limit_per_hour ?? 1000),
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.key_name.trim()) { showToast('error', 'Key name is required'); return; }
    setSaving(true);
    try {
      const scopes = form.scopes.split(',').map((s) => s.trim()).filter(Boolean);
      const rateLimit = parseInt(form.rate_limit_per_hour, 10) || 1000;
      if (editing) {
        const { error } = await supabase
          .from('api_keys')
          .update({ key_name: form.key_name.trim(), scopes, rate_limit_per_hour: rateLimit })
          .eq('id', editing.id);
        if (error) throw error;
        showToast('success', 'API key updated');
      } else {
        const { error } = await supabase
          .from('api_keys')
          .insert({
            business_id: businessId,
            key_name: form.key_name.trim(),
            scopes,
            rate_limit_per_hour: rateLimit,
            is_active: true,
          });
        if (error) throw error;
        showToast('success', 'API key created');
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
    if (!confirm('Revoke this API key? This cannot be undone.')) return;
    const { error } = await supabase.from('api_keys').delete().eq('id', id);
    if (error) { showToast('error', error.message); return; }
    showToast('success', 'API key revoked');
    load();
  }

  async function toggleActive(k: ApiKey) {
    const { error } = await supabase
      .from('api_keys')
      .update({ is_active: !k.is_active })
      .eq('id', k.id);
    if (error) { showToast('error', error.message); return; }
    load();
  }

  if (loading) return <LoadingSpinner label="Loading API keys…" />;

  return (
    <div>
      <PageHeader
        title="API Keys"
        description="Manage API keys for programmatic access to this business"
        action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Key</Button>}
      />

      {items.length === 0 ? (
        <EmptyState
          icon={Key}
          title="No API keys"
          description="Create an API key to access the RootNova API programmatically."
          action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Key</Button>}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-zinc-400">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Prefix</th>
                  <th className="px-4 py-3 font-medium">Scopes</th>
                  <th className="px-4 py-3 font-medium">Rate Limit</th>
                  <th className="px-4 py-3 font-medium">Last Used</th>
                  <th className="px-4 py-3 font-medium">Expires</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((k) => (
                  <tr key={k.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 text-white font-medium">{k.key_name}</td>
                    <td className="px-4 py-3"><code className="text-blue-300 text-xs">{k.key_prefix ?? '—'}…</code></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(k.scopes ?? []).map((s) => <Badge key={s} color="purple">{s}</Badge>)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-300">{k.rate_limit_per_hour ?? '—'}/hr</td>
                    <td className="px-4 py-3 text-zinc-300">{formatDate(k.last_used_at)}</td>
                    <td className="px-4 py-3 text-zinc-300">{formatDate(k.expires_at)}</td>
                    <td className="px-4 py-3"><Badge color={k.is_active ? 'green' : 'gray'}>{k.is_active ? 'Active' : 'Disabled'}</Badge></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(k)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => toggleActive(k)}>{k.is_active ? 'Disable' : 'Enable'}</Button>
                        <Button size="sm" variant="danger" onClick={() => handleDelete(k.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit API Key' : 'New API Key'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Key Name</label>
            <Input value={form.key_name} onChange={(v) => setForm({ ...form, key_name: v })} placeholder="e.g. Production Server Key" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Scopes (comma-separated)</label>
            <Input value={form.scopes} onChange={(v) => setForm({ ...form, scopes: v })} placeholder="e.g. reviews:read, reviews:write" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Rate Limit (per hour)</label>
            <Input type="number" value={form.rate_limit_per_hour} onChange={(v) => setForm({ ...form, rate_limit_per_hour: v })} placeholder="1000" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Key'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ============================================================
 * DeveloperAppsModule — CRUD for developer_apps
 * ============================================================ */

interface DeveloperApp {
  id: string;
  business_id: string;
  app_name: string;
  description: string | null;
  client_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function DeveloperAppsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<DeveloperApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DeveloperApp | null>(null);
  const [form, setForm] = useState({ app_name: '', description: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('developer_apps')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('error', `Failed to load apps: ${error.message}`);
    } else {
      setItems((data as DeveloperApp[]) || []);
    }
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({ app_name: '', description: '' });
    setModalOpen(true);
  }

  function openEdit(a: DeveloperApp) {
    setEditing(a);
    setForm({ app_name: a.app_name, description: a.description ?? '' });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.app_name.trim()) { showToast('error', 'App name is required'); return; }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from('developer_apps')
          .update({ app_name: form.app_name.trim(), description: form.description.trim() || null })
          .eq('id', editing.id);
        if (error) throw error;
        showToast('success', 'App updated');
      } else {
        const { error } = await supabase
          .from('developer_apps')
          .insert({
            business_id: businessId,
            app_name: form.app_name.trim(),
            description: form.description.trim() || null,
            is_active: true,
          });
        if (error) throw error;
        showToast('success', 'App created');
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
    if (!confirm('Delete this app?')) return;
    const { error } = await supabase.from('developer_apps').delete().eq('id', id);
    if (error) { showToast('error', error.message); return; }
    showToast('success', 'App deleted');
    load();
  }

  async function toggleActive(a: DeveloperApp) {
    const { error } = await supabase
      .from('developer_apps')
      .update({ is_active: !a.is_active })
      .eq('id', a.id);
    if (error) { showToast('error', error.message); return; }
    load();
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
        <EmptyState
          icon={Code2}
          title="No developer apps"
          description="Register an OAuth application to enable third-party integrations."
          action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New App</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((a) => (
            <Card key={a.id} className="p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Code2 className="w-4.5 h-4.5 text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-white">{a.app_name}</h3>
                </div>
                <Badge color={a.is_active ? 'green' : 'gray'}>{a.is_active ? 'Active' : 'Inactive'}</Badge>
              </div>
              {a.description && <p className="text-sm text-zinc-400 line-clamp-2">{a.description}</p>}
              <div>
                <p className="text-xs text-zinc-500 mb-0.5">Client ID</p>
                <code className="text-blue-300 text-xs break-all">{a.client_id ?? '—'}</code>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Button size="sm" variant="secondary" onClick={() => openEdit(a)}><Pencil className="w-3.5 h-3.5" /> Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => toggleActive(a)}>{a.is_active ? 'Disable' : 'Enable'}</Button>
                <Button size="sm" variant="danger" onClick={() => handleDelete(a.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit App' : 'New App'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">App Name</label>
            <Input value={form.app_name} onChange={(v) => setForm({ ...form, app_name: v })} placeholder="e.g. My Review Dashboard" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Description</label>
            <TextArea value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="What does this app do?" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Create App'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ============================================================
 * WebhooksModule — CRUD for webhooks
 * ============================================================ */

interface Webhook {
  id: string;
  business_id: string;
  name: string;
  url: string;
  events: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function WebhooksModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<Webhook[]>([]);
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
    if (error) {
      showToast('error', `Failed to load webhooks: ${error.message}`);
    } else {
      setItems((data as Webhook[]) || []);
    }
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({ name: '', url: '', events: '' });
    setModalOpen(true);
  }

  function openEdit(w: Webhook) {
    setEditing(w);
    setForm({ name: w.name, url: w.url, events: (w.events ?? []).join(', ') });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { showToast('error', 'Name is required'); return; }
    if (!form.url.trim()) { showToast('error', 'URL is required'); return; }
    setSaving(true);
    try {
      const events = form.events.split(',').map((e) => e.trim()).filter(Boolean);
      if (editing) {
        const { error } = await supabase
          .from('webhooks')
          .update({ name: form.name.trim(), url: form.url.trim(), events })
          .eq('id', editing.id);
        if (error) throw error;
        showToast('success', 'Webhook updated');
      } else {
        const { error } = await supabase
          .from('webhooks')
          .insert({
            business_id: businessId,
            name: form.name.trim(),
            url: form.url.trim(),
            events,
            is_active: true,
          });
        if (error) throw error;
        showToast('success', 'Webhook created');
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
    if (!confirm('Delete this webhook?')) return;
    const { error } = await supabase.from('webhooks').delete().eq('id', id);
    if (error) { showToast('error', error.message); return; }
    showToast('success', 'Webhook deleted');
    load();
  }

  async function toggleActive(w: Webhook) {
    const { error } = await supabase
      .from('webhooks')
      .update({ is_active: !w.is_active })
      .eq('id', w.id);
    if (error) { showToast('error', error.message); return; }
    load();
  }

  if (loading) return <LoadingSpinner label="Loading webhooks…" />;

  return (
    <div>
      <PageHeader
        title="Webhooks"
        description="Manage webhook endpoints for event delivery"
        action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Webhook</Button>}
      />

      {items.length === 0 ? (
        <EmptyState
          icon={Webhook}
          title="No webhooks configured"
          description="Add a webhook endpoint to receive real-time event notifications."
          action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Webhook</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((w) => (
            <Card key={w.id} className="p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Webhook className="w-4.5 h-4.5 text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-white">{w.name}</h3>
                </div>
                <Badge color={w.is_active ? 'green' : 'gray'}>{w.is_active ? 'Active' : 'Disabled'}</Badge>
              </div>
              <div>
                <p className="text-xs text-zinc-500 mb-0.5">URL</p>
                <code className="text-blue-300 text-xs break-all">{w.url}</code>
              </div>
              <div>
                <p className="text-xs text-zinc-500 mb-1">Events</p>
                <div className="flex flex-wrap gap-1">
                  {(w.events ?? []).map((e) => <Badge key={e} color="blue">{e}</Badge>)}
                  {(!w.events || w.events.length === 0) && <span className="text-zinc-500 text-sm">—</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Button size="sm" variant="secondary" onClick={() => openEdit(w)}><Pencil className="w-3.5 h-3.5" /> Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => toggleActive(w)}>{w.is_active ? 'Disable' : 'Enable'}</Button>
                <Button size="sm" variant="danger" onClick={() => handleDelete(w.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Webhook' : 'New Webhook'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Name</label>
            <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="e.g. CRM Sync Webhook" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">URL</label>
            <Input value={form.url} onChange={(v) => setForm({ ...form, url: v })} placeholder="https://example.com/webhook" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Events (comma-separated)</label>
            <Input value={form.events} onChange={(v) => setForm({ ...form, events: v })} placeholder="e.g. review.created, review.published" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Webhook'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
