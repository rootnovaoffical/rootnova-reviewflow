import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { PageHeader, Card, Badge, LoadingSpinner, EmptyState } from '../components/UI';
import { useToast } from '../context/ToastContext';
import { Lightbulb, CheckSquare, FileBarChart, FlaskConical, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

/* ------------------------- AiRecommendationsModule ----------------------- */
export function AiRecommendationsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('ai_recommendations').select('*').eq('business_id', businessId).order('created_at', { ascending: false });
    if (error) showToast('error', error.message);
    else setItems(data || []);
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => { load(); }, [load]);

  const statusColor: Record<string, string> = { pending: 'yellow', accepted: 'green', rejected: 'red', implemented: 'blue' };

  return (
    <div>
      <PageHeader title="AI Recommendations" description="AI-generated business recommendations" />
      {loading ? <LoadingSpinner label="Loading recommendations..." /> : items.length === 0 ? (
        <EmptyState icon={Lightbulb} title="No recommendations" description="AI recommendations will appear here." />
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Lightbulb className="w-5 h-5 text-amber-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-sm font-semibold text-white">{r.title}</h3>
                    {r.category && <Badge color="purple">{r.category}</Badge>}
                    <Badge color={statusColor[r.status] || 'gray'}>{r.status}</Badge>
                  </div>
                  {r.description && <p className="text-sm text-zinc-400">{r.description}</p>}
                  <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                    {r.confidence != null && <span>Confidence: <span className="text-zinc-300">{Math.round(Number(r.confidence) * 100)}%</span></span>}
                    {r.business_impact && <span>Impact: <span className="text-zinc-300">{r.business_impact}</span></span>}
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

/* ---------------------------- ActionItemsModule --------------------------- */
export function ActionItemsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('action_items').select('*').eq('business_id', businessId).order('created_at', { ascending: false });
    if (error) showToast('error', error.message);
    else setItems(data || []);
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => { load(); }, [load]);

  const statusColor: Record<string, string> = { pending: 'yellow', in_progress: 'blue', completed: 'green', dismissed: 'gray' };
  const priorityColor: Record<string, string> = { high: 'red', medium: 'yellow', low: 'gray' };

  return (
    <div>
      <PageHeader title="Action Items" description="Recommended actions from AI insights" />
      {loading ? <LoadingSpinner label="Loading action items..." /> : items.length === 0 ? (
        <EmptyState icon={CheckSquare} title="No action items" description="Action items will appear here." />
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                  <CheckSquare className="w-5 h-5 text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-sm font-semibold text-white">{a.title}</h3>
                    <Badge color={priorityColor[a.priority_level] || 'gray'}>{a.priority_level}</Badge>
                    <Badge color={statusColor[a.status] || 'gray'}>{a.status}</Badge>
                  </div>
                  {a.explanation && <p className="text-sm text-zinc-400">{a.explanation}</p>}
                  {a.recommended_action && (
                    <div className="mt-2 rounded-lg bg-white/5 border border-white/10 px-3 py-2">
                      <p className="text-xs text-zinc-500 mb-0.5">Recommended Action</p>
                      <p className="text-sm text-zinc-200">{a.recommended_action}</p>
                    </div>
                  )}
                  {a.confidence != null && (
                    <p className="text-xs text-zinc-500 mt-2">Confidence: <span className="text-zinc-300">{Math.round(Number(a.confidence) * 100)}%</span></p>
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

/* ---------------------------- AiBriefingsModule --------------------------- */
export function AiBriefingsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('ai_briefings').select('*').eq('business_id', businessId).order('briefing_date', { ascending: false });
    if (error) showToast('error', error.message);
    else setItems(data || []);
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <PageHeader title="AI Briefings" description="Periodic AI-generated business summaries" />
      {loading ? <LoadingSpinner label="Loading briefings..." /> : items.length === 0 ? (
        <EmptyState icon={FileBarChart} title="No briefings" description="AI briefings will appear here." />
      ) : (
        <div className="space-y-3">
          {items.map((b) => (
            <Card key={b.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <FileBarChart className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge color="green">{b.period}</Badge>
                    {b.briefing_date && <span className="text-xs text-zinc-500">{new Date(b.briefing_date).toLocaleDateString()}</span>}
                  </div>
                  {b.summary && <p className="text-sm text-zinc-300 mb-3">{b.summary}</p>}
                  <div className="grid gap-2 sm:grid-cols-3">
                    {Array.isArray(b.wins) && b.wins.length > 0 && (
                      <div className="rounded-lg bg-emerald-500/5 border border-emerald-400/20 p-2.5">
                        <p className="text-xs font-medium text-emerald-300 mb-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Wins</p>
                        <ul className="space-y-0.5">
                          {b.wins.map((w: string, i: number) => <li key={i} className="text-xs text-zinc-400">• {w}</li>)}
                        </ul>
                      </div>
                    )}
                    {Array.isArray(b.risks) && b.risks.length > 0 && (
                      <div className="rounded-lg bg-red-500/5 border border-red-400/20 p-2.5">
                        <p className="text-xs font-medium text-red-300 mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Risks</p>
                        <ul className="space-y-0.5">
                          {b.risks.map((r: string, i: number) => <li key={i} className="text-xs text-zinc-400">• {r}</li>)}
                        </ul>
                      </div>
                    )}
                    {Array.isArray(b.recommendations) && b.recommendations.length > 0 && (
                      <div className="rounded-lg bg-blue-500/5 border border-blue-400/20 p-2.5">
                        <p className="text-xs font-medium text-blue-300 mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Recommendations</p>
                        <ul className="space-y-0.5">
                          {b.recommendations.map((rec: string, i: number) => <li key={i} className="text-xs text-zinc-400">• {rec}</li>)}
                        </ul>
                      </div>
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

/* --------------------------- AiSimulationsModule -------------------------- */
export function AiSimulationsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('ai_simulations').select('*').eq('business_id', businessId).order('created_at', { ascending: false });
    if (error) showToast('error', error.message);
    else setItems(data || []);
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <PageHeader title="AI Simulations" description="Projected outcomes from AI scenario modeling" />
      {loading ? <LoadingSpinner label="Loading simulations..." /> : items.length === 0 ? (
        <EmptyState icon={FlaskConical} title="No simulations" description="AI simulations will appear here." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((s) => (
            <Card key={s.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                  <FlaskConical className="w-5 h-5 text-violet-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {s.simulation_type && <Badge color="purple">{s.simulation_type}</Badge>}
                    {s.is_labelled_estimate && <Badge color="yellow">Estimate</Badge>}
                  </div>
                  {s.scenario && <h3 className="text-sm font-semibold text-white">{s.scenario}</h3>}
                  {s.projected_outcome && <p className="text-sm text-zinc-400 mt-1">{s.projected_outcome}</p>}
                  {s.confidence != null && (
                    <p className="text-xs text-zinc-500 mt-2">Confidence: <span className="text-zinc-300">{Math.round(Number(s.confidence) * 100)}%</span></p>
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
