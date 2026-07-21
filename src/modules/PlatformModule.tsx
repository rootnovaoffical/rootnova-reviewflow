import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import {
  LoadingSpinner,
  EmptyState,
  PageHeader,
  Card,
  Badge,
} from '../components/UI';
import {
  Flag,
  ScrollText,
  BarChart3,
  ToggleLeft,
  ToggleRight,
  Mail,
  Activity,
  Calendar,
  MessageSquare,
  QrCode,
  FileText,
  Bot,
} from 'lucide-react';

/* ============================================================
 * FeatureFlagsModule
 * List feature_flags (global) with toggle for is_enabled
 * ============================================================ */

interface FeatureFlag {
  id: string;
  key: string;
  label: string | null;
  description: string | null;
  is_enabled: boolean | null;
  category: string | null;
}

export function FeatureFlagsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchFlags = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('feature_flags')
      .select('*')
      .order('category', { ascending: true });
    if (error) {
      showToast('error', 'Failed to load feature flags');
    } else {
      setFlags((data as FeatureFlag[]) || []);
    }
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const toggleFlag = async (f: FeatureFlag) => {
    setToggling(f.id);
    const newValue = !f.is_enabled;
    const { error } = await supabase
      .from('feature_flags')
      .update({ is_enabled: newValue })
      .eq('id', f.id);
    setToggling(null);
    if (error) {
      showToast('error', `Failed to toggle ${f.key}`);
      return;
    }
    showToast('success', `${f.key} ${newValue ? 'enabled' : 'disabled'}`);
    setFlags((prev) => prev.map((x) => (x.id === f.id ? { ...x, is_enabled: newValue } : x)));
  };

  // Group by category
  const grouped: Record<string, FeatureFlag[]> = {};
  flags.forEach((f) => {
    const cat = f.category || 'uncategorized';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(f);
  });

  return (
    <div>
      <PageHeader title="Feature Flags" description="Toggle platform features on and off" />

      {loading ? (
        <LoadingSpinner label="Loading feature flags..." />
      ) : flags.length === 0 ? (
        <EmptyState icon={Flag} title="No feature flags" description="Feature flags will appear here" />
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">{category}</h3>
              <div className="grid gap-3">
                {items.map((f) => (
                  <Card key={f.id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-white">{f.label || f.key}</h4>
                          <code className="text-xs text-zinc-500 font-mono">{f.key}</code>
                        </div>
                        {f.description && <p className="text-sm text-zinc-400">{f.description}</p>}
                      </div>
                      <button
                        onClick={() => toggleFlag(f)}
                        disabled={toggling === f.id}
                        className="shrink-0 transition-transform hover:scale-105 disabled:opacity-50"
                        title={f.is_enabled ? 'Click to disable' : 'Click to enable'}
                      >
                        {f.is_enabled ? (
                          <ToggleRight className="w-10 h-10 text-emerald-400" />
                        ) : (
                          <ToggleLeft className="w-10 h-10 text-zinc-600" />
                        )}
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
 * AuditLogsModule
 * List audit_logs filtered by organization_id (read-only)
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
      .limit(100);
    if (error) {
      showToast('error', 'Failed to load audit logs');
    } else {
      setLogs((data as AuditLog[]) || []);
    }
    setLoading(false);
  }, [organizationId, showToast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleString();
  };

  return (
    <div>
      <PageHeader title="Audit Logs" description="Activity log for this organization" />

      {loading ? (
        <LoadingSpinner label="Loading audit logs..." />
      ) : logs.length === 0 ? (
        <EmptyState icon={ScrollText} title="No audit logs" description="Audit log entries will appear here" />
      ) : (
        <div className="grid gap-2">
          {logs.map((l) => (
            <Card key={l.id} className="p-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                  <Activity className="w-4 h-4 text-zinc-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {l.action && <Badge color="blue">{l.action}</Badge>}
                    {l.target_type && <Badge color="purple">{l.target_type}</Badge>}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5 text-sm text-zinc-400">
                    <Mail className="w-3.5 h-3.5" />
                    <span className="truncate">{l.actor_email || 'Unknown actor'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 text-xs text-zinc-500">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(l.created_at)}</span>
                  </div>
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
 * List usage_records filtered by organization_id (read-only)
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
      showToast('error', 'Failed to load usage records');
    } else {
      setRecords((data as UsageRecord[]) || []);
    }
    setLoading(false);
  }, [organizationId, showToast]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString();
  };

  const metrics = [
    { key: 'reviews_generated', label: 'Reviews Generated', icon: StarIcon, color: 'blue' },
    { key: 'ai_requests', label: 'AI Requests', icon: Bot, color: 'purple' },
    { key: 'messages_sent', label: 'Messages Sent', icon: MessageSquare, color: 'green' },
    { key: 'reports_generated', label: 'Reports Generated', icon: FileText, color: 'yellow' },
    { key: 'qr_scans', label: 'QR Scans', icon: QrCode, color: 'blue' },
  ] as const;

  const colorClasses: Record<string, string> = {
    blue: 'text-blue-400 bg-blue-500/10',
    purple: 'text-violet-400 bg-violet-500/10',
    green: 'text-emerald-400 bg-emerald-500/10',
    yellow: 'text-amber-400 bg-amber-500/10',
  };

  return (
    <div>
      <PageHeader title="Usage Records" description="Platform usage for this organization" />

      {loading ? (
        <LoadingSpinner label="Loading usage records..." />
      ) : records.length === 0 ? (
        <EmptyState icon={BarChart3} title="No usage records" description="Usage records will appear here" />
      ) : (
        <div className="grid gap-4">
          {records.map((r) => (
            <Card key={r.id} className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-4 h-4 text-zinc-500" />
                <span className="text-sm text-zinc-400">
                  {formatDate(r.period_start)} → {formatDate(r.period_end)}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {metrics.map((m) => {
                  const Icon = m.icon;
                  return (
                    <div key={m.key} className="rounded-lg bg-white/5 p-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${colorClasses[m.color]}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <p className="text-xs text-zinc-500 mb-0.5">{m.label}</p>
                      <p className="text-lg font-bold text-white">{r[m.key] ?? 0}</p>
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

// Small inline icon to avoid extra import noise
function StarIcon(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
