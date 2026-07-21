import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import {
  LoadingSpinner, EmptyState, PageHeader, Card, Badge, Button,
} from '../components/UI';
import { Shield, ScrollText, BarChart3, ToggleLeft, ToggleRight } from 'lucide-react';

function formatDate(value: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return value;
  }
}

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return value;
  }
}

/* ============================================================
 * FeatureFlagsModule — List + toggle is_enabled
 * ============================================================ */

interface FeatureFlag {
  id: string;
  key: string;
  label: string | null;
  description: string | null;
  is_enabled: boolean;
  category: string | null;
  created_at: string;
  updated_at: string;
}

export function FeatureFlagsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('feature_flags')
      .select('*')
      .order('category', { ascending: true });
    if (error) {
      showToast('error', `Failed to load feature flags: ${error.message}`);
    } else {
      setItems((data as FeatureFlag[]) || []);
    }
    setLoading(false);
  }, [useToast]);

  useEffect(() => { load(); }, [load]);

  async function toggleFlag(f: FeatureFlag) {
    setToggling(f.id);
    try {
      const { error } = await supabase
        .from('feature_flags')
        .update({ is_enabled: !f.is_enabled })
        .eq('id', f.id);
      if (error) throw error;
      showToast('success', `Flag "${f.key}" ${f.is_enabled ? 'disabled' : 'enabled'}`);
      load();
    } catch (e) {
      showToast('error', (e as Error).message);
    } finally {
      setToggling(null);
    }
  }

  if (loading) return <LoadingSpinner label="Loading feature flags…" />;

  return (
    <div>
      <PageHeader title="Feature Flags" description="Toggle platform features on or off" />

      {items.length === 0 ? (
        <EmptyState icon={Shield} title="No feature flags" description="Feature flags will appear here once configured." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((f) => (
            <Card key={f.id} className="p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Shield className="w-4.5 h-4.5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{f.label ?? f.key}</h3>
                    {f.category && <p className="text-xs text-zinc-500">{f.category}</p>}
                  </div>
                </div>
                <Badge color={f.is_enabled ? 'green' : 'gray'}>{f.is_enabled ? 'Enabled' : 'Disabled'}</Badge>
              </div>
              {f.description && <p className="text-sm text-zinc-400">{f.description}</p>}
              <div className="flex items-center justify-between mt-2">
                <code className="text-blue-300 text-xs">{f.key}</code>
                <Button
                  size="sm"
                  variant={f.is_enabled ? 'danger' : 'primary'}
                  onClick={() => toggleFlag(f)}
                  disabled={toggling === f.id}
                >
                  {f.is_enabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                  {f.is_enabled ? 'Disable' : 'Enable'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
 * AuditLogsModule — Read-only list filtered by organization
 * ============================================================ */

interface AuditLog {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string | null;
  target_type: string | null;
  target_id: string | null;
  organization_id: string;
  created_at: string;
}

export function AuditLogsModule({ organizationId }: { organizationId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) {
      showToast('error', `Failed to load audit logs: ${error.message}`);
    } else {
      setItems((data as AuditLog[]) || []);
    }
    setLoading(false);
  }, [organizationId, showToast]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner label="Loading audit logs…" />;

  return (
    <div>
      <PageHeader title="Audit Logs" description="Activity log for this organization" />

      {items.length === 0 ? (
        <EmptyState icon={ScrollText} title="No audit logs" description="Audit log entries will appear here." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-zinc-400">
                  <th className="px-4 py-3 font-medium">Actor</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Target Type</th>
                  <th className="px-4 py-3 font-medium">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {items.map((l) => (
                  <tr key={l.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 text-white">{l.actor_email ?? '—'}</td>
                    <td className="px-4 py-3"><Badge color="blue">{l.action ?? '—'}</Badge></td>
                    <td className="px-4 py-3 text-zinc-300">{l.target_type ?? '—'}</td>
                    <td className="px-4 py-3 text-zinc-300">{formatDateTime(l.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ============================================================
 * UsageRecordsModule — Read-only list filtered by organization
 * ============================================================ */

interface UsageRecord {
  id: string;
  organization_id: string;
  period_start: string;
  period_end: string;
  reviews_generated: number | null;
  ai_requests: number | null;
  messages_sent: number | null;
  reports_generated: number | null;
  qr_scans: number | null;
  created_at: string;
  updated_at: string;
}

export function UsageRecordsModule({ organizationId }: { organizationId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<UsageRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('usage_records')
      .select('*')
      .eq('organization_id', organizationId)
      .order('period_start', { ascending: false });
    if (error) {
      showToast('error', `Failed to load usage records: ${error.message}`);
    } else {
      setItems((data as UsageRecord[]) || []);
    }
    setLoading(false);
  }, [organizationId, showToast]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner label="Loading usage records…" />;

  return (
    <div>
      <PageHeader title="Usage Records" description="Platform usage metrics for this organization" />

      {items.length === 0 ? (
        <EmptyState icon={BarChart3} title="No usage records" description="Usage records will appear here as they are generated." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-zinc-400">
                  <th className="px-4 py-3 font-medium">Period Start</th>
                  <th className="px-4 py-3 font-medium">Period End</th>
                  <th className="px-4 py-3 font-medium">Reviews</th>
                  <th className="px-4 py-3 font-medium">AI Requests</th>
                  <th className="px-4 py-3 font-medium">Messages</th>
                  <th className="px-4 py-3 font-medium">Reports</th>
                  <th className="px-4 py-3 font-medium">QR Scans</th>
                </tr>
              </thead>
              <tbody>
                {items.map((u) => (
                  <tr key={u.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 text-white">{formatDate(u.period_start)}</td>
                    <td className="px-4 py-3 text-zinc-300">{formatDate(u.period_end)}</td>
                    <td className="px-4 py-3 text-zinc-300">{u.reviews_generated ?? 0}</td>
                    <td className="px-4 py-3 text-zinc-300">{u.ai_requests ?? 0}</td>
                    <td className="px-4 py-3 text-zinc-300">{u.messages_sent ?? 0}</td>
                    <td className="px-4 py-3 text-zinc-300">{u.reports_generated ?? 0}</td>
                    <td className="px-4 py-3 text-zinc-300">{u.qr_scans ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
