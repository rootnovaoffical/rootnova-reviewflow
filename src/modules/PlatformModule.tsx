import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge } from '../components/UI';
import { Flag, ScrollText, BarChart3, ToggleLeft, ToggleRight } from 'lucide-react';

function formatDate(value: string | null): string {
  if (!value) return '—';
  try { return new Date(value).toLocaleString(); } catch { return value; }
}

/* ============================================================
 * FeatureFlagsModule
 * ============================================================ */

interface FeatureFlag {
  id: string;
  key: string;
  label: string | null;
  description: string | null;
  is_enabled: boolean;
  category: string | null;
}

export function FeatureFlagsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('feature_flags').select('*').order('category', { ascending: true });
    if (error) showToast('error', `Failed to load feature flags: ${error.message}`);
    else setFlags((data as FeatureFlag[]) || []);
    setLoading(false);
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (f: FeatureFlag) => {
    setToggling(f.id);
    const { error } = await supabase.from('feature_flags').update({ is_enabled: !f.is_enabled }).eq('id', f.id);
    setToggling(null);
    if (error) { showToast('error', `Toggle failed: ${error.message}`); return; }
    showToast('success', `Flag "${f.key}" ${!f.is_enabled ? 'enabled' : 'disabled'}`);
    setFlags((prev) => prev.map((p) => p.id === f.id ? { ...p, is_enabled: !p.is_enabled } : p));
  };

  if (loading) return <LoadingSpinner label="Loading feature flags…" />;

  return (
    <div>
      <PageHeader title="Feature Flags" description="Platform feature toggles" />

      {flags.length === 0 ? (
        <EmptyState icon={Flag} title="No feature flags" description="Feature flags will appear here." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {flags.map((f) => (
            <Card key={f.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white truncate">{f.label || f.key}</h3>
                    {f.category && <Badge color="blue">{f.category}</Badge>}
                  </div>
                  <p className="text-xs text-zinc-500 font-mono mb-1">{f.key}</p>
                  {f.description && <p className="text-sm text-zinc-400">{f.description}</p>}
                </div>
                <button
                  onClick={() => toggle(f)}
                  disabled={toggling === f.id}
                  className="shrink-0 p-1 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50"
                  title={f.is_enabled ? 'Disable' : 'Enable'}
                >
                  {f.is_enabled
                    ? <ToggleRight className="w-8 h-8 text-emerald-400" />
                    : <ToggleLeft className="w-8 h-8 text-zinc-600" />}
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
 * AuditLogsModule
 * ============================================================ */

interface AuditLog {
  id: string;
  organization_id: string;
  actor_email: string | null;
  action: string | null;
  target_type: string | null;
  created_at: string | null;
}

export function AuditLogsModule({ organizationId }: { organizationId: string }) {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) showToast('error', `Failed to load audit logs: ${error.message}`);
    else setLogs((data as AuditLog[]) || []);
    setLoading(false);
  }, [organizationId, showToast]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner label="Loading audit logs…" />;

  return (
    <div>
      <PageHeader title="Audit Logs" description="Activity records for this organization" />

      {logs.length === 0 ? (
        <EmptyState icon={ScrollText} title="No audit logs" description="Audit log entries will appear here." />
      ) : (
        <div className="space-y-2">
          {logs.map((l) => (
            <Card key={l.id} className="p-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                  <ScrollText className="w-4 h-4 text-zinc-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {l.action && <Badge color="blue">{l.action}</Badge>}
                    {l.target_type && <Badge color="purple">{l.target_type}</Badge>}
                  </div>
                  {l.actor_email && <p className="text-xs text-zinc-500 mt-1 truncate">{l.actor_email}</p>}
                </div>
                <span className="text-xs text-zinc-600 shrink-0">{formatDate(l.created_at)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
 * UsageRecordsModule
 * ============================================================ */

interface UsageRecord {
  id: string;
  organization_id: string;
  period_start: string | null;
  period_end: string | null;
  reviews_generated: number | null;
  ai_requests: number | null;
  messages_sent: number | null;
  reports_generated: number | null;
  qr_scans: number | null;
}

export function UsageRecordsModule({ organizationId }: { organizationId: string }) {
  const { showToast } = useToast();
  const [records, setRecords] = useState<UsageRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('usage_records')
      .select('*')
      .eq('organization_id', organizationId)
      .order('period_start', { ascending: false });
    if (error) showToast('error', `Failed to load usage records: ${error.message}`);
    else setRecords((data as UsageRecord[]) || []);
    setLoading(false);
  }, [organizationId, showToast]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner label="Loading usage records…" />;

  return (
    <div>
      <PageHeader title="Usage Records" description="Resource usage for this organization" />

      {records.length === 0 ? (
        <EmptyState icon={BarChart3} title="No usage records" description="Usage records will appear here." />
      ) : (
        <div className="space-y-3">
          {records.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-zinc-400">
                  {formatDate(r.period_start)} — {formatDate(r.period_end)}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <p className="text-xs text-zinc-500">Reviews</p>
                  <p className="text-lg font-bold text-white">{r.reviews_generated ?? 0}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">AI Requests</p>
                  <p className="text-lg font-bold text-white">{r.ai_requests ?? 0}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Messages</p>
                  <p className="text-lg font-bold text-white">{r.messages_sent ?? 0}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Reports</p>
                  <p className="text-lg font-bold text-white">{r.reports_generated ?? 0}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">QR Scans</p>
                  <p className="text-lg font-bold text-white">{r.qr_scans ?? 0}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
