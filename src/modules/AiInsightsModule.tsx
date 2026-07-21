import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge } from '../components/UI';
import type {
  AiRecommendation,
  ActionItem,
  AiBriefing,
  AiSimulation,
} from '../lib/types';
import {
  Lightbulb,
  ListChecks,
  FileBarChart,
  FlaskConical,
  TrendingUp,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

/* ============================================================
 * Shared helpers
 * ============================================================ */

const statusColor = (status: string): string => {
  switch ((status || '').toLowerCase()) {
    case 'active':
    case 'accepted':
    case 'done':
    case 'completed':
      return 'green';
    case 'pending':
    case 'review':
      return 'yellow';
    case 'dismissed':
    case 'rejected':
    case 'failed':
      return 'red';
    default:
      return 'gray';
  }
};

const confidenceColor = (confidence: number | string): string => {
  const pct = typeof confidence === 'string' ? parseFloat(confidence) : confidence;
  if (pct >= 0.8) return 'green';
  if (pct >= 0.5) return 'yellow';
  return 'red';
};

function confidenceLabel(confidence: number | string): string {
  const pct = typeof confidence === 'string' ? parseFloat(confidence) : confidence;
  if (Number.isNaN(pct)) return '—';
  // If it looks like a 0-1 float, show as percentage
  if (pct <= 1) return `${Math.round(pct * 100)}%`;
  return `${Math.round(pct)}%`;
}

/* ============================================================
 * AiRecommendationsModule
 * ============================================================ */

export function AiRecommendationsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<AiRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ai_recommendations')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('error', `Failed to load recommendations: ${error.message}`);
    } else {
      setItems(data as AiRecommendation[]);
    }
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  if (loading) return <LoadingSpinner label="Loading recommendations…" />;

  return (
    <div>
      <PageHeader
        title="AI Recommendations"
        description="AI-generated recommendations to improve your business"
      />

      {items.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title="No recommendations"
          description="AI recommendations will appear here as they are generated."
        />
      ) : (
        <div className="grid gap-3">
          {items.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold text-white">{r.title}</span>
                    {r.category && <Badge color="blue">{r.category}</Badge>}
                    <Badge color={statusColor(r.status)}>{r.status}</Badge>
                    <Badge color={confidenceColor(r.confidence)}>
                      {confidenceLabel(r.confidence)}
                    </Badge>
                  </div>
                  {r.description && (
                    <p className="text-sm text-zinc-400 mb-2">{r.description}</p>
                  )}
                  {r.business_impact && (
                    <div className="flex items-start gap-1.5 text-xs text-zinc-500">
                      <TrendingUp className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{r.business_impact}</span>
                    </div>
                  )}
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
 * ActionItemsModule
 * ============================================================ */

const priorityLevelColor = (level: string): string => {
  switch ((level || '').toLowerCase()) {
    case 'critical':
    case 'urgent':
      return 'red';
    case 'high':
      return 'yellow';
    case 'medium':
      return 'blue';
    case 'low':
      return 'gray';
    default:
      return 'gray';
  }
};

export function ActionItemsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('action_items')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('error', `Failed to load action items: ${error.message}`);
    } else {
      setItems(data as ActionItem[]);
    }
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  if (loading) return <LoadingSpinner label="Loading action items…" />;

  return (
    <div>
      <PageHeader
        title="Action Items"
        description="AI-generated action items with recommended next steps"
      />

      {items.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No action items"
          description="Action items will appear here as the AI identifies them."
        />
      ) : (
        <div className="grid gap-3">
          {items.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                  <ListChecks className="w-4 h-4 text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold text-white">{a.title}</span>
                    <Badge color={priorityLevelColor(a.priority_level)}>{a.priority_level}</Badge>
                    <Badge color={confidenceColor(a.confidence)}>{a.confidence}</Badge>
                    <Badge color={statusColor(a.status)}>{a.status}</Badge>
                  </div>
                  {a.explanation && (
                    <p className="text-sm text-zinc-400 mb-2">{a.explanation}</p>
                  )}
                  {a.recommended_action && (
                    <div className="flex items-start gap-1.5 text-xs text-zinc-500 mt-1">
                      <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-400" />
                      <span className="text-zinc-400">{a.recommended_action}</span>
                    </div>
                  )}
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
 * AiBriefingsModule
 * ============================================================ */

const periodColor = (period: string): string => {
  switch ((period || '').toLowerCase()) {
    case 'daily':
      return 'blue';
    case 'weekly':
      return 'purple';
    case 'monthly':
      return 'green';
    case 'quarterly':
      return 'yellow';
    default:
      return 'gray';
  }
};

function ArrayList({ items, icon: Icon, color }: { items: string[] | null; icon: typeof TrendingUp; color: string }) {
  if (!items || items.length === 0) return null;
  const colorClasses: Record<string, string> = {
    green: 'text-emerald-400',
    red: 'text-red-400',
    blue: 'text-blue-400',
  };
  return (
    <div className="space-y-1">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-1.5 text-xs text-zinc-400">
          <Icon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${colorClasses[color] || colorClasses.blue}`} />
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

export function AiBriefingsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<AiBriefing[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ai_briefings')
      .select('*')
      .eq('business_id', businessId)
      .order('briefing_date', { ascending: false });
    if (error) {
      showToast('error', `Failed to load briefings: ${error.message}`);
    } else {
      setItems(data as AiBriefing[]);
    }
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  if (loading) return <LoadingSpinner label="Loading briefings…" />;

  return (
    <div>
      <PageHeader
        title="AI Briefings"
        description="Periodic AI-generated business briefings"
      />

      {items.length === 0 ? (
        <EmptyState
          icon={FileBarChart}
          title="No briefings"
          description="AI briefings will appear here as they are generated."
        />
      ) : (
        <div className="grid gap-3">
          {items.map((b) => (
            <Card key={b.id} className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                  <FileBarChart className="w-4 h-4 text-violet-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge color={periodColor(b.period)}>{b.period}</Badge>
                    <span className="text-xs text-zinc-500">
                      {new Date(b.briefing_date).toLocaleDateString()}
                    </span>
                  </div>
                  {b.summary && (
                    <p className="text-sm text-zinc-300">{b.summary}</p>
                  )}
                </div>
              </div>

              <div className="space-y-3 pl-12">
                {b.wins && b.wins.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-emerald-400 mb-1">Wins</p>
                    <ArrayList items={b.wins} icon={TrendingUp} color="green" />
                  </div>
                )}
                {b.risks && b.risks.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-red-400 mb-1">Risks</p>
                    <ArrayList items={b.risks} icon={AlertTriangle} color="red" />
                  </div>
                )}
                {b.recommendations && b.recommendations.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-blue-400 mb-1">Recommendations</p>
                    <ArrayList items={b.recommendations} icon={Lightbulb} color="blue" />
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
 * AiSimulationsModule
 * ============================================================ */

export function AiSimulationsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<AiSimulation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ai_simulations')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('error', `Failed to load simulations: ${error.message}`);
    } else {
      setItems(data as AiSimulation[]);
    }
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  if (loading) return <LoadingSpinner label="Loading simulations…" />;

  return (
    <div>
      <PageHeader
        title="AI Simulations"
        description="AI-projected outcome simulations for business scenarios"
      />

      {items.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title="No simulations"
          description="AI simulations will appear here as they are generated."
        />
      ) : (
        <div className="grid gap-3">
          {items.map((s) => (
            <Card key={s.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                  <FlaskConical className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge color="blue">{s.simulation_type}</Badge>
                    <Badge color={confidenceColor(s.confidence)}>
                      {confidenceLabel(s.confidence)}
                    </Badge>
                    {s.is_labelled_estimate && (
                      <Badge color="yellow">Estimate</Badge>
                    )}
                  </div>
                  <p className="text-sm font-medium text-zinc-200 mb-1">{s.scenario}</p>
                  {s.projected_outcome && (
                    <p className="text-sm text-zinc-400">{s.projected_outcome}</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
