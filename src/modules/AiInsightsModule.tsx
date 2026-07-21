import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge } from '../components/UI';
import {
  Lightbulb, CheckSquare, FileBarChart, FlaskConical,
  TrendingUp, AlertTriangle, Sparkles,
} from 'lucide-react';

/* ============================================================
 * AiRecommendationsModule
 * ============================================================ */

interface AiRecommendation {
  id: string;
  business_id: string;
  title: string;
  description: string | null;
  category: string | null;
  confidence: number | null;
  status: string | null;
  business_impact: string | null;
  created_at: string;
}

export function AiRecommendationsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<AiRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ai_recommendations')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('error', 'Failed to load recommendations');
    } else {
      setItems(data || []);
    }
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => { fetch(); }, [fetch]);

  const statusColor = (s: string | null) => {
    if (s === 'implemented') return 'green';
    if (s === 'accepted') return 'blue';
    if (s === 'pending') return 'yellow';
    if (s === 'rejected') return 'red';
    return 'gray';
  };

  if (loading) return <LoadingSpinner label="Loading recommendations…" />;

  return (
    <div>
      <PageHeader title="AI Recommendations" description="AI-generated recommendations for your business" />
      {items.length === 0 ? (
        <EmptyState icon={Lightbulb} title="No recommendations" description="AI recommendations will appear here." />
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-sm font-semibold text-white">{r.title}</span>
                    {r.category && <Badge color="purple">{r.category}</Badge>}
                    {r.status && <Badge color={statusColor(r.status)}>{r.status}</Badge>}
                    {r.confidence != null && (
                      <span className="text-xs text-zinc-500">{Math.round(Number(r.confidence) * 100)}%</span>
                    )}
                  </div>
                  {r.description && <p className="text-sm text-zinc-400">{r.description}</p>}
                  {r.business_impact && (
                    <div className="flex items-start gap-1.5 text-sm text-emerald-300 mt-2">
                      <TrendingUp className="w-4 h-4 mt-0.5 shrink-0" />
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

interface ActionItem {
  id: string;
  business_id: string;
  title: string;
  explanation: string | null;
  priority_level: string | null;
  confidence: number | null;
  status: string | null;
  recommended_action: string | null;
  created_at: string;
}

export function ActionItemsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('action_items')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('error', 'Failed to load action items');
    } else {
      setItems(data || []);
    }
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => { fetch(); }, [fetch]);

  const statusColor = (s: string | null) => {
    if (s === 'done' || s === 'completed') return 'green';
    if (s === 'in_progress') return 'blue';
    if (s === 'pending') return 'yellow';
    if (s === 'skipped') return 'gray';
    return 'gray';
  };

  const priorityColor = (p: string | null) => {
    if (p === 'high' || p === 'critical') return 'red';
    if (p === 'medium') return 'yellow';
    if (p === 'low') return 'gray';
    return 'gray';
  };

  if (loading) return <LoadingSpinner label="Loading action items…" />;

  return (
    <div>
      <PageHeader title="Action Items" description="Prioritized actions to improve your business" />
      {items.length === 0 ? (
        <EmptyState icon={CheckSquare} title="No action items" description="Action items will appear here." />
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <CheckSquare className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-sm font-semibold text-white">{a.title}</span>
                    {a.priority_level && <Badge color={priorityColor(a.priority_level)}>{a.priority_level}</Badge>}
                    {a.status && <Badge color={statusColor(a.status)}>{a.status}</Badge>}
                    {a.confidence != null && (
                      <span className="text-xs text-zinc-500">{Math.round(Number(a.confidence) * 100)}%</span>
                    )}
                  </div>
                  {a.explanation && <p className="text-sm text-zinc-400">{a.explanation}</p>}
                  {a.recommended_action && (
                    <div className="mt-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-400/20">
                      <p className="text-sm text-blue-200">
                        <span className="font-medium">Recommended:</span> {a.recommended_action}
                      </p>
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

interface AiBriefing {
  id: string;
  business_id: string;
  period: string | null;
  briefing_date: string | null;
  summary: string | null;
  wins: string[] | null;
  risks: string[] | null;
  recommendations: string[] | null;
  created_at: string;
}

export function AiBriefingsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<AiBriefing[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ai_briefings')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('error', 'Failed to load briefings');
    } else {
      setItems(data || []);
    }
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => { fetch(); }, [fetch]);

  if (loading) return <LoadingSpinner label="Loading briefings…" />;

  return (
    <div>
      <PageHeader title="AI Briefings" description="Periodic AI-generated business summaries" />
      {items.length === 0 ? (
        <EmptyState icon={FileBarChart} title="No briefings" description="AI briefings will appear here." />
      ) : (
        <div className="space-y-4">
          {items.map((b) => (
            <Card key={b.id} className="p-4">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {b.period && <Badge color="blue">{b.period}</Badge>}
                {b.briefing_date && (
                  <span className="text-xs text-zinc-500">
                    {new Date(b.briefing_date).toLocaleDateString()}
                  </span>
                )}
              </div>
              {b.summary && <p className="text-sm text-zinc-300 mb-4">{b.summary}</p>}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {b.wins && b.wins.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wide">Wins</span>
                    </div>
                    <ul className="space-y-1.5">
                      {b.wins.map((w, i) => (
                        <li key={i} className="text-sm text-zinc-400 flex items-start gap-1.5">
                          <span className="text-emerald-400 mt-1">•</span>
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {b.risks && b.risks.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-semibold text-amber-300 uppercase tracking-wide">Risks</span>
                    </div>
                    <ul className="space-y-1.5">
                      {b.risks.map((r, i) => (
                        <li key={i} className="text-sm text-zinc-400 flex items-start gap-1.5">
                          <span className="text-amber-400 mt-1">•</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {b.recommendations && b.recommendations.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Lightbulb className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-semibold text-blue-300 uppercase tracking-wide">Recommendations</span>
                    </div>
                    <ul className="space-y-1.5">
                      {b.recommendations.map((r, i) => (
                        <li key={i} className="text-sm text-zinc-400 flex items-start gap-1.5">
                          <span className="text-blue-400 mt-1">•</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
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

interface AiSimulation {
  id: string;
  business_id: string;
  simulation_type: string | null;
  scenario: string | null;
  projected_outcome: string | null;
  confidence: number | null;
  is_labelled_estimate: boolean | null;
  created_at: string;
}

export function AiSimulationsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<AiSimulation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ai_simulations')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('error', 'Failed to load simulations');
    } else {
      setItems(data || []);
    }
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => { fetch(); }, [fetch]);

  if (loading) return <LoadingSpinner label="Loading simulations…" />;

  return (
    <div>
      <PageHeader title="AI Simulations" description="Projected outcomes from AI scenario modeling" />
      {items.length === 0 ? (
        <EmptyState icon={FlaskConical} title="No simulations" description="AI simulations will appear here." />
      ) : (
        <div className="space-y-3">
          {items.map((s) => (
            <Card key={s.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                  <FlaskConical className="w-5 h-5 text-violet-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    {s.simulation_type && <Badge color="purple">{s.simulation_type}</Badge>}
                    {s.confidence != null && (
                      <span className="text-xs text-zinc-500">{Math.round(Number(s.confidence) * 100)}%</span>
                    )}
                    {s.is_labelled_estimate && <Badge color="yellow">Estimate</Badge>}
                  </div>
                  {s.scenario && <p className="text-sm font-medium text-zinc-200">{s.scenario}</p>}
                  {s.projected_outcome && <p className="text-sm text-zinc-400 mt-1">{s.projected_outcome}</p>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
