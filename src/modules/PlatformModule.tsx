import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  Card, Badge, Button,
  PageHeader, LoadingSpinner, EmptyState,
} from '../components/UI';
import { useToast } from '../context/ToastContext';
import {
  Flag, ScrollText, BarChart3,
} from 'lucide-react';

function fmtDate(s: string | null) {
  if (!s) return '—';
  try { return new Date(s).toLocaleString(); } catch { return s; }
}

/* ------------------------------------------------------------------ */
/* FeatureFlagsModule                                                */
/* ------------------------------------------------------------------ */

type FeatureFlag = {
  id: string;
  key: string;
  label: string | null;
  description: string | null;
  is_enabled: boolean | null;
  category: string | null;
};

export function FeatureFlagsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('id, key, label, description, is_enabled, category')
        .order('category', { ascending: true });
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      showToast('error', `Failed to load feature flags: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  async function toggle(f: FeatureFlag) {
    setUpdating(f.id);
    try {
      const { error } = await supabase
        .from('feature_flags')
        .update({ is_enabled: !f.is_enabled })
        .eq('id', f.id);
      if (error) throw error;
      showToast('success', `${f.key} ${!f.is_enabled ? 'enabled' : 'disabled'}`);
      load();
    } catch (err) {
      showToast('error', `Toggle failed: ${(err as Error).message}`);
    } finally {
      setUpdating(null);
    }
  }

  if (loading) return <LoadingSpinner label="Loading feature flags…" />;

  return (
    <div>
      <PageHeader title="Feature Flags" description="Toggle feature availability" />
      {items.length === 0 ? (
        <EmptyState icon={Flag} title="No feature flags" />
      ) : (
        <div className="grid gap-3">
          {items.map((f) => (
            <Card key={f.id} className="p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-white">{f.label || f.key}</h3>
                  {f.category && <Badge color="purple">{f.category}</Badge>}
                </div>
                <p className="text-sm text-zinc-500 font-mono mb-1">{f.key}</p>
                {f.description && <p className="text-sm text-zinc-400">{f.description}</p>}
              </div>
              <div className="shrink-0">
                <Button
                  variant={f.is_enabled ? 'primary' : 'secondary'}
                  size="sm"
                  disabled={updating === f.id}
                  onClick={() => toggle(f)}
                >
                  {updating === f.id ? '…' : f.is_enabled ? 'Enabled' : 'Disabled'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* AuditLogsModule                                                  */
/* ------------------------------------------------------------------ */

type AuditLog = {
  id: string;
  actor_email: string | null;
  action: string | null;
  target_type: string | null;
  created_at: string | null;
};

export function AuditLogsModule({ organizationId }: { organizationId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('id, actor_email, action, target_type, created_at')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      showToast('error', `Failed to load audit logs: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [organizationId, showToast]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner label="Loading audit logs…" />;

  return (
    <div>
      <PageHeader title="Audit Logs" description="Recent activity for this organization" />
      {items.length === 0 ? (
        <EmptyState icon={ScrollText} title="No audit logs" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-zinc-500">
                <th className="px-4 py-3 font-medium">Actor</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Target Type</th>
                <th className="px-4 py-3 font-medium">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {items.map((l) => (
                <tr key={l.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3 text-zinc-300">{l.actor_email || '—'}</td>
                  <td className="px-4 py-3"><Badge color="blue">{l.action}</Badge></td>
                  <td className="px-4 py-3 text-zinc-400">{l.target_type || '—'}</td>
                  <td className="px-4 py-3 text-zinc-400">{fmtDate(l.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* UsageRecordsModule                                               */
/* ------------------------------------------------------------------ */

type UsageRecord = {
  id: string;
  period_start: string | null;
  period_end: string | null;
  reviews_generated: number | null;
  ai_requests: number | null;
  messages_sent: number | null;
  reports_generated: number | null;
  qr_scans: number | null;
};

export function UsageRecordsModule({ organizationId }: { organizationId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<UsageRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('usage_records')
        .select('id, period_start, period_end, reviews_generated, ai_requests, messages_sent, reports_generated, qr_scans')
        .eq('organization_id', organizationId)
        .order('period_start', { ascending: false })
        .limit(50);
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      showToast('error', `Failed to load usage records: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [organizationId, showToast]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner label="Loading usage records…" />;

  return (
    <div>
      <PageHeader title="Usage Records" description="Resource usage by billing period" />
      {items.length === 0 ? (
        <EmptyState icon={BarChart3} title="No usage records" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-zinc-500">
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
                  <td className="px-4 py-3 text-zinc-300">{fmtDate(u.period_start)}</td>
                  <td className="px-4 py-3 text-zinc-300">{fmtDate(u.period_end)}</td>
                  <td className="px-4 py-3 text-white font-semibold">{u.reviews_generated ?? 0}</td>
                  <td className="px-4 py-3 text-white font-semibold">{u.ai_requests ?? 0}</td>
                  <td className="px-4 py-3 text-white font-semibold">{u.messages_sent ?? 0}</td>
                  <td className="px-4 py-3 text-white font-semibold">{u.reports_generated ?? 0}</td>
                  <td className="px-4 py-3 text-white font-semibold">{u.qr_scans ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
