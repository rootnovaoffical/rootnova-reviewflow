import { useEffect, useState, useCallback } from "react";
import { getActiveBusiness, getAITasks, updateAITaskStatus, getAITaskStats, TASK_TYPE_META, PRIORITY_META, STATUS_META } from "../../lib/ai-agent";
import type { AITask, AITaskStatus } from "../../lib/types";

export default function AITaskCenter() {
  const [tasks, setTasks] = useState<AITask[]>([]);
  const [stats, setStats] = useState<{ total: number; recommended: number; accepted: number; running: number; completed: number; dismissed: number; critical: number; high: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<AITaskStatus | "all">("all");
  const [selectedTask, setSelectedTask] = useState<AITask | null>(null);

  const loadData = useCallback(async (bid: string) => {
    try {
      const [taskData, statsData] = await Promise.all([
        getAITasks(bid),
        getAITaskStats(bid),
      ]);
      setTasks(taskData);
      setStats(statsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const bid = await getActiveBusiness();
      if (!bid) { setError("No business found"); setLoading(false); return; }
      setBusinessId(bid);
      await loadData(bid);
    })();
  }, [loadData]);

  const handleAction = async (taskId: string, status: AITaskStatus) => {
    await updateAITaskStatus(taskId, status);
    if (businessId) await loadData(businessId);
    setSelectedTask(null);
  };

  const filteredTasks = statusFilter === "all" ? tasks : tasks.filter((t) => t.status === statusFilter);

  if (loading) return <TaskSkeleton />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6 animate-page-enter">
      <div>
        <h1 className="text-2xl font-bold text-white">AI Task Center</h1>
        <p className="text-sm text-slate-400 mt-1">Proactive recommendations from your AI agent</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <StatBox label="Total" value={stats.total} color="#64748b" />
          <StatBox label="Recommended" value={stats.recommended} color="#3b82f6" />
          <StatBox label="Accepted" value={stats.accepted} color="#10b981" />
          <StatBox label="Running" value={stats.running} color="#f59e0b" />
          <StatBox label="Completed" value={stats.completed} color="#22c55e" />
          <StatBox label="Dismissed" value={stats.dismissed} color="#64748b" />
          <StatBox label="Critical" value={stats.critical} color="#ef4444" />
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {(["all", "recommended", "accepted", "running", "completed", "dismissed"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
              statusFilter === s
                ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                : "bg-white/5 text-slate-400 hover:text-white border border-transparent"
            }`}
          >
            {s === "all" ? "All Tasks" : s}
          </button>
        ))}
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <svg className="w-12 h-12 text-slate-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <p className="text-slate-400 mb-1">No tasks {statusFilter !== "all" ? `with status "${statusFilter}"` : ""} yet.</p>
          <p className="text-xs text-slate-500">Generate recommendations from the AI Command Center to create tasks.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTasks.map((task, i) => {
            const typeMeta = TASK_TYPE_META[task.task_type] ?? TASK_TYPE_META.general;
            const priorityMeta = PRIORITY_META[task.priority] ?? PRIORITY_META.medium;
            const statusMeta = STATUS_META[task.status] ?? STATUS_META.recommended;
            return (
              <div
                key={task.id}
                className="glass-card p-5 animate-fade-up cursor-pointer"
                style={{ animationDelay: `${i * 50}ms` }}
                onClick={() => setSelectedTask(task)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ background: typeMeta.color + "20", color: typeMeta.color }}>
                      {typeMeta.label}
                    </span>
                    <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ background: priorityMeta.bg, color: priorityMeta.color }}>
                      {priorityMeta.label}
                    </span>
                  </div>
                  <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ background: statusMeta.bg, color: statusMeta.color }}>
                    {statusMeta.label}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">{task.title}</h3>
                <p className="text-xs text-slate-400 line-clamp-2">{task.description}</p>
                <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                  <span>Confidence: {(task.confidence * 100).toFixed(0)}%</span>
                  {task.affected_customers > 0 && <span>{task.affected_customers} customers affected</span>}
                </div>
                {task.status === "recommended" && (
                  <div className="flex gap-2 mt-3">
                    <button onClick={(e) => { e.stopPropagation(); handleAction(task.id, "accepted"); }} className="btn-primary text-xs py-1.5 px-3">
                      Accept
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleAction(task.id, "dismissed"); }} className="btn-ghost text-xs py-1.5 px-3">
                      Dismiss
                    </button>
                  </div>
                )}
                {task.status === "accepted" && (
                  <div className="flex gap-2 mt-3">
                    <button onClick={(e) => { e.stopPropagation(); handleAction(task.id, "completed"); }} className="btn-primary text-xs py-1.5 px-3">
                      Mark Complete
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleAction(task.id, "dismissed"); }} className="btn-ghost text-xs py-1.5 px-3">
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedTask(null)}>
          <div className="glass-strong p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto scrollbar-thin" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-bold text-white">{selectedTask.title}</h2>
              <button onClick={() => setSelectedTask(null)} className="btn-ghost p-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-1">Description</h3>
                <p className="text-sm text-slate-200">{selectedTask.description}</p>
              </div>

              <div>
                <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-1">AI Reasoning</h3>
                <p className="text-sm text-slate-200">{selectedTask.reasoning}</p>
              </div>

              <div>
                <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-1">Evidence</h3>
                <pre className="text-xs text-slate-300 bg-black/30 p-3 rounded-lg overflow-x-auto">{JSON.stringify(selectedTask.evidence, null, 2)}</pre>
              </div>

              <div>
                <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-1">Expected Impact</h3>
                <p className="text-sm text-green-400">{selectedTask.expected_impact}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-1">Confidence</h3>
                  <p className="text-sm text-white">{(selectedTask.confidence * 100).toFixed(0)}%</p>
                </div>
                <div>
                  <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-1">Affected Customers</h3>
                  <p className="text-sm text-white">{selectedTask.affected_customers}</p>
                </div>
              </div>

              {selectedTask.status === "recommended" && (
                <div className="flex gap-2 pt-2">
                  <button onClick={() => handleAction(selectedTask.id, "accepted")} className="btn-primary flex-1 justify-center">Accept Task</button>
                  <button onClick={() => handleAction(selectedTask.id, "dismissed")} className="btn-ghost flex-1 justify-center">Dismiss</button>
                </div>
              )}
              {selectedTask.status === "accepted" && (
                <div className="flex gap-2 pt-2">
                  <button onClick={() => handleAction(selectedTask.id, "completed")} className="btn-primary flex-1 justify-center">Mark Complete</button>
                  <button onClick={() => handleAction(selectedTask.id, "dismissed")} className="btn-ghost flex-1 justify-center">Cancel</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="stat-tile-3d" style={{ padding: "1rem" }}>
      <div className="text-2xl font-bold" style={{ color }}>{value}</div>
      <div className="text-xs text-slate-400 mt-0.5">{label}</div>
    </div>
  );
}

function TaskSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 skeleton" />
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">{Array.from({ length: 7 }).map((_, i) => <div key={i} className="h-16 skeleton" />)}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-40 skeleton" />)}</div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <svg className="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
      <p className="text-slate-400">{message}</p>
    </div>
  );
}
