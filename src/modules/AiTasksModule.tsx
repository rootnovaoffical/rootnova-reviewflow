import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { PageHeader, Card, Badge, LoadingSpinner, EmptyState } from '../components/UI';
import { useToast } from '../context/ToastContext';
import { Bot, Sparkles } from 'lucide-react';

export function AiTasksModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('ai_tasks').select('*').eq('business_id', businessId).order('created_at', { ascending: false });
    if (error) showToast('error', error.message);
    else setTasks(data || []);
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => { load(); }, [load]);

  const statusColor: Record<string, string> = { pending: 'yellow', in_progress: 'blue', completed: 'green', failed: 'red' };
  const priorityColor: Record<string, string> = { high: 'red', medium: 'yellow', low: 'gray' };

  return (
    <div>
      <PageHeader title="AI Tasks" description="Automated AI-generated tasks" />
      {loading ? <LoadingSpinner label="Loading AI tasks..." /> : tasks.length === 0 ? (
        <EmptyState icon={Bot} title="No AI tasks" description="AI-generated tasks will appear here." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {tasks.map((t) => (
            <Card key={t.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-violet-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge color={priorityColor[t.priority] || 'gray'}>{t.priority}</Badge>
                    <Badge color={statusColor[t.status] || 'gray'}>{t.status}</Badge>
                    {t.task_type && <Badge color="purple">{t.task_type}</Badge>}
                  </div>
                  <h3 className="text-sm font-semibold text-white">{t.title}</h3>
                  {t.expected_impact && <p className="text-xs text-zinc-400 mt-1">{t.expected_impact}</p>}
                  <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                    {t.confidence != null && (
                      <span>Confidence: <span className="text-zinc-300">{Math.round(Number(t.confidence) * 100)}%</span></span>
                    )}
                    <span>{new Date(t.created_at).toLocaleDateString()}</span>
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
