import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge } from '../components/UI';
import type { AiTask } from '../lib/types';
import { Bot, CheckCircle2, Clock, AlertCircle, Circle } from 'lucide-react';

const taskStatusColor = (status: string): string => {
  switch ((status || '').toLowerCase()) {
    case 'completed':
    case 'done':
      return 'green';
    case 'in_progress':
    case 'in-progress':
    case 'running':
      return 'blue';
    case 'pending':
    case 'queued':
      return 'yellow';
    case 'failed':
    case 'error':
      return 'red';
    case 'dismissed':
    case 'cancelled':
      return 'gray';
    default:
      return 'gray';
  }
};

const taskStatusIcon = (status: string) => {
  switch ((status || '').toLowerCase()) {
    case 'completed':
    case 'done':
      return CheckCircle2;
    case 'in_progress':
    case 'in-progress':
    case 'running':
    case 'pending':
    case 'queued':
      return Clock;
    case 'failed':
    case 'error':
      return AlertCircle;
    default:
      return Circle;
  }
};

const priorityColor = (priority: string): string => {
  switch ((priority || '').toLowerCase()) {
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

function confidenceLabel(confidence: number): string {
  return `${Math.round((confidence ?? 0) * 100)}%`;
}

export function AiTasksModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<AiTask[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ai_tasks')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) {
      showToast('error', `Failed to load AI tasks: ${error.message}`);
    } else {
      setItems(data as AiTask[]);
    }
    setLoading(false);
  }, [businessId, showToast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  if (loading) return <LoadingSpinner label="Loading AI tasks…" />;

  return (
    <div>
      <PageHeader
        title="AI Tasks"
        description="AI-generated tasks and recommendations for action"
      />

      {items.length === 0 ? (
        <EmptyState
          icon={Bot}
          title="No AI tasks"
          description="AI-generated tasks will appear here as they are created."
        />
      ) : (
        <div className="grid gap-3">
          {items.map((t) => {
            const StatusIcon = taskStatusIcon(t.status);
            return (
              <Card key={t.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-violet-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-semibold text-white">{t.title}</span>
                      <Badge color="purple">{t.task_type}</Badge>
                      <Badge color={priorityColor(t.priority)}>{t.priority}</Badge>
                      <Badge color={taskStatusColor(t.status)}>
                        <span className="inline-flex items-center gap-1">
                          <StatusIcon className="w-3 h-3" />
                          {t.status}
                        </span>
                      </Badge>
                    </div>
                    {t.description && (
                      <p className="text-sm text-zinc-400 mb-2 line-clamp-2">{t.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-zinc-500 flex-wrap">
                      <span>Confidence: <span className="text-zinc-300">{confidenceLabel(t.confidence)}</span></span>
                      {t.expected_impact && (
                        <span>Impact: <span className="text-zinc-300">{t.expected_impact}</span></span>
                      )}
                      <span>{new Date(t.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
