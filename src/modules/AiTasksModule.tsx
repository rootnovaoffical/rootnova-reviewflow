import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner, EmptyState, PageHeader, Card, Badge, StatCard } from '../components/UI';
import { useToast } from '../context/ToastContext';
import { Bot, Clock, ListChecks, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

interface AiTask {
  id: string;
  title: string;
  task_type: string;
  priority: string;
  status: string;
  confidence: number;
  expected_impact: string;
  created_at: string;
}

function priorityColor(priority: string): string {
  switch (priority) {
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

function statusColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'green';
    case 'accepted':
    case 'in_progress':
      return 'blue';
    case 'dismissed':
      return 'gray';
    case 'failed':
      return 'red';
    case 'recommended':
    case 'pending':
    default:
      return 'yellow';
  }
}

export function AiTasksModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<AiTask[]>([]);

  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  async function fetchTasks() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_tasks')
        .select('id, title, task_type, priority, status, confidence, expected_impact, created_at')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTasks((data ?? []) as AiTask[]);
    } catch (e) {
      showToast('error', 'Failed to load AI tasks');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingSpinner label="Loading AI tasks..." />;

  const pending = tasks.filter((t) => t.status === 'recommended' || t.status === 'pending').length;
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const highPriority = tasks.filter((t) => t.priority === 'high' || t.priority === 'critical').length;

  return (
    <div>
      <PageHeader title="AI Tasks" description="AI-generated tasks and recommendations" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Pending" value={pending} icon={Clock} color="yellow" />
        <StatCard label="Completed" value={completed} icon={CheckCircle2} color="green" />
        <StatCard label="High Priority" value={highPriority} icon={AlertCircle} color="red" />
      </div>

      {tasks.length === 0 ? (
        <EmptyState icon={Bot} title="No AI tasks" description="AI-generated tasks will appear here as they are created." />
      ) : (
        <div className="space-y-3">
          {tasks.map((t) => (
            <Card key={t.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Sparkles className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-semibold text-white">{t.title}</span>
                    <Badge color="purple">{t.task_type}</Badge>
                  </div>
                  {t.expected_impact && (
                    <p className="text-sm text-zinc-400 mb-2">{t.expected_impact}</p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <Badge color={priorityColor(t.priority)}>P: {t.priority}</Badge>
                    <Badge color={statusColor(t.status)}>{t.status}</Badge>
                    <span className="text-zinc-500">
                      Confidence: <span className="text-zinc-300">{Math.round(t.confidence * 100)}%</span>
                    </span>
                  </div>
                </div>
                <span className="flex items-center gap-1 text-xs text-zinc-500 whitespace-nowrap">
                  <Clock className="w-3 h-3" />
                  {new Date(t.created_at).toLocaleDateString()}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
