import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge } from '../components/UI';
import { useToast } from '../context/ToastContext';
import { Flag, ScrollText, BarChart3, ToggleLeft, ToggleRight, History, Hash, MessageSquare, FileText, QrCode } from 'lucide-react';

function formatDateTime(d: string | null): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleString(); } catch { return d; }
}

function formatDate(d: string | null): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString(); } catch { return d; }
}

/* ============================================================
 * FeatureFlagsModule
 * List feature_flags (global table). Toggle is_enabled via supabase update.
 * Show: key, label, description, is_enabled, category
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
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchFlags = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('feature_flags')
      .select('*')
      .order('category', { ascending: true });
    if (error) {
      showToast('error', `Failed to load feature flags: ${error.message}`);
    } else {
      setFlags(data || []);
    }
    setLoading(false);
  }, [showToast]);

  useEffect(() => { fetchFlags(); }, [fetchFlags]);

  const toggleFlag = async (f: FeatureFlag) => {
    setTogglingId(f.id);
    const { error } = await supabase
      .from('feature_flags')
      .update({ is_enabled: !f.is_enabled })
      .eq('id', f.id);
    setTogglingId(null);
    if (error) {
      showToast('error', `Toggle failed: ${error.message}`);
    } else {
      showToast('success', `Feature "${f.key}" ${!f.is_enabled ? 'enabled' : 'disabled'}`);
      setFlags((prev) => prev.map((p) => p.id === f.id ? { ...p, is_enabled: !p.is_enabled } : p));
    }
  };

  return (
    <div>
      <PageHeader title="Feature Flags" description="Toggle platform features on or off" />
      {loading ? (
        <LoadingSpinner label="Loading feature flags..." />
      ) : flags.length === 0 ? (
        <EmptyState icon={Flag} title="No feature flags" description="Feature flags will appear here." />
      ) : (
        <div className="grid gap-3">
          {flags.map((f) => (
            <Card key={f.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Flag className="w-4 h-4 text-blue-400 shrink-0" />
                    <h3 className="font-semibold text-white truncate">{f.label || f.key}</h3>
                    {f.is_enabled ? <Badge color="green">Enabled</Badge> : <Badge color="gray">Disabled</Badge>}
                    {f.category && <Badge color="purple">{f.category}</Badge>}
                  </div>
                  <p className="text-xs text-zinc-500 font-mono mb-1">{f.key}</p>
                  {f.description && <p className="text-sm text-zinc-400 line-clamp-2">{f.description}</p>}
                </div>
                <button
                  onClick={() => toggleFlag(f)}
                  disabled={togglingId === f.id}
                  className="shrink-0 p-1 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50"
                  title={f.is_enabled ? 'Disable' : 'Enable'}
                >
                  {f.is_enabled ? (
                    <ToggleRight className="w-8 h-8 text-emerald-400" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-zinc-600" />
                  )}
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
 * List audit_logs filtered by organization_id. Read-only.
 * Show: actor_email, action, target_type, created_at
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

  const fetchLogs = useCallback(async () => {
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
      setLogs(data || []);
    }
    setLoading(false);
  }, [organizationId, showToast]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <div>
      <PageHeader title="Audit Logs" description="Activity log for this organization" />
      {loading ? (
        <LoadingSpinner label="Loading audit logs..." />
      ) : logs.length === 0 ? (
        <EmptyState icon={ScrollText} title="No audit logs" description="Audit log entries will appear here." />
      ) : (
        <div className="grid gap-2">
          {logs.map((l) => (
            <Card key={l.id} className="p-3">
              <div className="flex items-start gap-3">
                <History className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-white font-medium">{l.actor_email || '—'}</span>
                    {l.action && <Badge color="blue">{l.action}</Badge>}
                    {l.target_type && <Badge color="purple">{l.target_type}</Badge>}
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">{formatDateTime(l.created_at)}</p>
                </div>
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
 * List usage_records filtered by organization_id. Read-only.
 * Show: period_start, period_end, reviews_generated, ai_requests,
 *       messages_sent, reports_generated, qr_scans
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

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('usage_records')
      .select('*')
      .eq('organization_id', organizationId)
      .order('period_start', { ascending: false });
    if (error) {
      showToast('error', `Failed to load usage records: ${error.message}`);
    } else {
      setRecords(data || []);
    }
    setLoading(false);
  }, [organizationId, showToast]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const metrics = [
    { key: 'reviews_generated', icon: Hash, label: 'Reviews', color: 'blue' },
    { key: 'ai_requests', icon: BarChart3, label: 'AI Requests', color: 'purple' },
    { key: 'messages_sent', icon: MessageSquare, label: 'Messages', color: 'green' },
    { key: 'reports_generated', icon: FileText, label: 'Reports', color: 'yellow' },
    { key: 'qr_scans', icon: QrCode, label: 'QR Scans', color: 'blue' },
  ] as const;

  return (
    <div>
      <PageHeader title="Usage Records" description="Usage metrics for this organization" />
      {loading ? (
        <LoadingSpinner label="Loading usage records..." />
      ) : records.length === 0 ? (
        <EmptyState icon={BarChart3} title="No usage records" description="Usage records will appear here." />
      ) : (
        <div className="grid gap-3">
          {records.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4 text-blue-400" />
                <h3 className="font-semibold text-white text-sm">
                  {formatDate(r.period_start)} — {formatDate(r.period_end)}
                </h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {metrics.map((m) => {
                  const Icon = m.icon;
                  const value = r[m.key];
                  return (
                    <div key={m.key} className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-zinc-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-zinc-500">{m.label}</p>
                        <p className="text-sm font-semibold text-white">{value !== null ? value.toLocaleString() : '—'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
