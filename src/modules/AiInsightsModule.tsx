import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge } from '../components/UI';
import { useToast } from '../context/ToastContext';
import {
  Lightbulb,
  ListChecks,
  FileText,
  FlaskConical,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Target,
  Calendar,
} from 'lucide-react';

/* ============================================================
 *  AiRecommendationsModule
 * ========================================================== */

interface AiRecommendation {
  id: string;
  title: string;
  description: string;
  category: string;
  confidence: number;
  status: string;
  business_impact: string;
}

function recStatusColor(status: string): string {
  switch (status) {
    case 'accepted':
    case 'implemented':
      return 'green';
    case 'dismissed':
      return 'gray';
    case 'pending':
    default:
      return 'yellow';
  }
}

export function AiRecommendationsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AiRecommendation[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('ai_recommendations')
          .select('id, title, description, category, confidence, status, business_impact')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setItems((data ?? []) as AiRecommendation[]);
      } catch (e) {
        showToast('error', 'Failed to load recommendations');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  if (loading) return <LoadingSpinner label="Loading recommendations..." />;

  return (
    <div>
      <PageHeader title="AI Recommendations" description="AI-generated recommendations for your business" />

      {items.length === 0 ? (
        <EmptyState icon={Lightbulb} title="No recommendations" description="AI recommendations will appear here as they are generated." />
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Lightbulb className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-semibold text-white">{r.title}</span>
                    <Badge color="purple">{r.category}</Badge>
                    <Badge color={recStatusColor(r.status)}>{r.status}</Badge>
                  </div>
                  <p className="text-sm text-zinc-400 mb-2">{r.description}</p>
                  <div className="flex items-center gap-4 text-xs text-zinc-500 flex-wrap">
                    <span className="inline-flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Confidence: <span className="text-zinc-300">{Math.round(r.confidence * 100)}%</span>
                    </span>
                    {r.business_impact && (
                      <span className="inline-flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        Impact: <span className="text-zinc-300">{r.business_impact}</span>
                      </span>
                    )}
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
 *  ActionItemsModule
 * ========================================================== */

interface ActionItem {
  id: string;
  title: string;
  explanation: string | null;
  priority_level: string;
  confidence: string;
  status: string;
  recommended_action: string | null;
}

function priorityLevelColor(level: string): string {
  switch (level) {
    case 'critical':
    case 'high':
      return 'red';
    case 'medium':
      return 'yellow';
    case 'low':
      return 'green';
    default:
      return 'gray';
  }
}

function actionItemStatusColor(status: string): string {
  switch (status) {
    case 'done':
    case 'completed':
      return 'green';
    case 'in_progress':
      return 'blue';
    case 'dismissed':
      return 'gray';
    case 'open':
    default:
      return 'yellow';
  }
}

export function ActionItemsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ActionItem[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('action_items')
          .select('id, title, explanation, priority_level, confidence, status, recommended_action')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setItems((data ?? []) as ActionItem[]);
      } catch (e) {
        showToast('error', 'Failed to load action items');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  if (loading) return <LoadingSpinner label="Loading action items..." />;

  return (
    <div>
      <PageHeader title="Action Items" description="Prioritized actions to improve your business" />

      {items.length === 0 ? (
        <EmptyState icon={ListChecks} title="No action items" description="Action items will appear here as they are identified." />
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Target className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-semibold text-white">{a.title}</span>
                    <Badge color={priorityLevelColor(a.priority_level)}>{a.priority_level}</Badge>
                    <Badge color={actionItemStatusColor(a.status)}>{a.status}</Badge>
                    <Badge color="gray">conf: {a.confidence}</Badge>
                  </div>
                  {a.explanation && <p className="text-sm text-zinc-400 mb-2">{a.explanation}</p>}
                  {a.recommended_action && (
                    <div className="mt-2 rounded-lg bg-white/5 border border-white/10 px-3 py-2">
                      <p className="text-xs text-zinc-500 mb-0.5">Recommended action</p>
                      <p className="text-sm text-zinc-200">{a.recommended_action}</p>
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
 *  AiBriefingsModule
 * ========================================================== */

interface AiBriefing {
  id: string;
  period: string;
  briefing_date: string;
  summary: string;
  wins: string[];
  risks: string[];
  recommendations: string[];
}

function periodColor(period: string): string {
  switch (period) {
    case 'daily':
      return 'blue';
    case 'weekly':
      return 'purple';
    case 'monthly':
      return 'green';
    default:
      return 'gray';
  }
}

export function AiBriefingsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AiBriefing[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('ai_briefings')
          .select('id, period, briefing_date, summary, wins, risks, recommendations')
          .eq('business_id', businessId)
          .order('briefing_date', { ascending: false });
        if (error) throw error;
        setItems((data ?? []) as AiBriefing[]);
      } catch (e) {
        showToast('error', 'Failed to load briefings');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  if (loading) return <LoadingSpinner label="Loading briefings..." />;

  return (
    <div>
      <PageHeader title="AI Briefings" description="Periodic AI-generated business briefings" />

      {items.length === 0 ? (
        <EmptyState icon={FileText} title="No briefings" description="AI briefings will appear here as they are generated." />
      ) : (
        <div className="space-y-3">
          {items.map((b) => (
            <Card key={b.id} className="p-4">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <Badge color={periodColor(b.period)}>{b.period}</Badge>
                <span className="flex items-center gap-1 text-xs text-zinc-500">
                  <Calendar className="w-3 h-3" />
                  {new Date(b.briefing_date).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-zinc-300 mb-4">{b.summary}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <p className="text-xs font-semibold text-emerald-400 mb-1.5 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" /> Wins
                  </p>
                  {b.wins.length > 0 ? (
                    <ul className="space-y-1">
                      {b.wins.map((w, i) => (
                        <li key={i} className="text-xs text-zinc-400 flex gap-1.5">
                          <span className="text-emerald-400">•</span> {w}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-zinc-600">None</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-amber-400 mb-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Risks
                  </p>
                  {b.risks.length > 0 ? (
                    <ul className="space-y-1">
                      {b.risks.map((r, i) => (
                        <li key={i} className="text-xs text-zinc-400 flex gap-1.5">
                          <span className="text-amber-400">•</span> {r}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-zinc-600">None</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-blue-400 mb-1.5 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Recommendations
                  </p>
                  {b.recommendations.length > 0 ? (
                    <ul className="space-y-1">
                      {b.recommendations.map((r, i) => (
                        <li key={i} className="text-xs text-zinc-400 flex gap-1.5">
                          <span className="text-blue-400">•</span> {r}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-zinc-600">None</p>
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
 *  AiSimulationsModule
 * ========================================================== */

interface AiSimulation {
  id: string;
  simulation_type: string;
  scenario: string;
  projected_outcome: string;
  confidence: number;
  is_labelled_estimate: boolean;
}

export function AiSimulationsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AiSimulation[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('ai_simulations')
          .select('id, simulation_type, scenario, projected_outcome, confidence, is_labelled_estimate')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setItems((data ?? []) as AiSimulation[]);
      } catch (e) {
        showToast('error', 'Failed to load simulations');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  if (loading) return <LoadingSpinner label="Loading simulations..." />;

  return (
    <div>
      <PageHeader title="AI Simulations" description="Scenario simulations projected by AI" />

      {items.length === 0 ? (
        <EmptyState icon={FlaskConical} title="No simulations" description="AI simulations will appear here as they are run." />
      ) : (
        <div className="space-y-3">
          {items.map((s) => (
            <Card key={s.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                  <FlaskConical className="w-5 h-5 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge color="purple">{s.simulation_type}</Badge>
                    <Badge color={s.is_labelled_estimate ? 'yellow' : 'gray'}>
                      {s.is_labelled_estimate ? 'Estimate' : 'Modelled'}
                    </Badge>
                    <span className="text-xs text-zinc-500">
                      Confidence: <span className="text-zinc-300">{Math.round(s.confidence * 100)}%</span>
                    </span>
                  </div>
                  <p className="text-sm font-medium text-zinc-200 mb-1">{s.scenario}</p>
                  <p className="text-sm text-zinc-400">{s.projected_outcome}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
