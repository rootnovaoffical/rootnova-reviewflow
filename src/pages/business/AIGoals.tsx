import { useEffect, useState, useCallback } from "react";
import { getActiveBusiness, getGoals, createGoal, updateGoalStatus, deleteGoal, callAIAgent, GOAL_TYPE_META } from "../../lib/ai-agent";
import { supabase } from "../../lib/supabase";
import type { BusinessGoal, GoalType, GoalStatus } from "../../lib/types";

export default function AIGoals() {
  const [goals, setGoals] = useState<BusinessGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [strategyGoal, setStrategyGoal] = useState<BusinessGoal | null>(null);
  const [strategyText, setStrategyText] = useState<string | null>(null);
  const [generatingStrategy, setGeneratingStrategy] = useState(false);

  const loadData = useCallback(async (bid: string) => {
    try {
      const data = await getGoals(bid);
      setGoals(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load goals");
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

  const handleCreate = async (goal: { goal_type: GoalType; title: string; target_value: number; unit: string; deadline?: string | null }) => {
    if (!businessId) return;
    await createGoal(businessId, goal);
    await loadData(businessId);
    setShowCreate(false);
  };

  const handleStatusChange = async (goalId: string, status: GoalStatus) => {
    await updateGoalStatus(goalId, status);
    if (businessId) await loadData(businessId);
  };

  const handleDelete = async (goalId: string) => {
    await deleteGoal(goalId);
    if (businessId) await loadData(businessId);
  };

  const handleGenerateStrategy = async (goal: BusinessGoal) => {
    if (!businessId) return;
    setStrategyGoal(goal);
    setGeneratingStrategy(true);
    setStrategyText(null);
    try {
      const { data, error: err } = await callAIAgent(businessId, "generate_goal_strategy", {
        goal_type: goal.goal_type,
        target_value: goal.target_value,
      });
      if (err) throw new Error(err);
      setStrategyText((data as { strategy?: string })?.strategy ?? "Unable to generate strategy.");
    } catch (err) {
      setStrategyText(err instanceof Error ? err.message : "Failed to generate strategy");
    } finally {
      setGeneratingStrategy(false);
    }
  };

  if (loading) return <GoalsSkeleton />;
  if (error) return <ErrorState message={error} />;

  const activeGoals = goals.filter((g) => g.status === "active");
  const achievedGoals = goals.filter((g) => g.status === "achieved");

  return (
    <div className="space-y-6 animate-page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Goals</h1>
          <p className="text-sm text-slate-400 mt-1">Define targets and let AI work toward them</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Create Goal
        </button>
      </div>

      {/* Active Goals */}
      <div>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Active Goals ({activeGoals.length})</h2>
        {activeGoals.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <svg className="w-12 h-12 text-slate-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
            <p className="text-slate-400 mb-1">No active goals yet.</p>
            <p className="text-xs text-slate-500">Create a goal and AI will generate a strategy to achieve it.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeGoals.map((goal, i) => {
              const meta = GOAL_TYPE_META[goal.goal_type] ?? GOAL_TYPE_META.custom;
              const progress = Math.min((goal.current_value / goal.target_value) * 100, 100);
              return (
                <div key={goal.id} className="glass-card p-5 animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{goal.title}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{meta.label}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-500/15 text-blue-400">{goal.status}</span>
                  </div>

                  {goal.description && <p className="text-xs text-slate-400 mb-3">{goal.description}</p>}

                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-slate-400">Progress</span>
                      <span className="text-xs font-medium text-white">{goal.current_value} / {goal.target_value} {goal.unit}</span>
                    </div>
                    <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${progress}%`, background: progress >= 100 ? "#22c55e" : "linear-gradient(90deg, #3b82f6, #2563eb)" }}
                      />
                    </div>
                    <div className="text-right text-xs text-slate-500 mt-1">{progress.toFixed(0)}%</div>
                  </div>

                  {goal.deadline && (
                    <p className="text-xs text-slate-500 mb-3">Deadline: {new Date(goal.deadline).toLocaleDateString()}</p>
                  )}

                  {goal.ai_strategy && (
                    <div className="mb-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
                      <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">AI Strategy</p>
                      <p className="text-xs text-slate-200">{goal.ai_strategy}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => handleGenerateStrategy(goal)} className="btn-ghost text-xs py-1.5 px-3">
                      {goal.ai_strategy ? "Regenerate Strategy" : "Generate AI Strategy"}
                    </button>
                    <button onClick={() => handleStatusChange(goal.id, "paused")} className="btn-ghost text-xs py-1.5 px-3">Pause</button>
                    <button onClick={() => handleStatusChange(goal.id, "archived")} className="btn-ghost text-xs py-1.5 px-3">Archive</button>
                    <button onClick={() => handleDelete(goal.id)} className="btn-ghost text-xs py-1.5 px-3 text-red-400">Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Achieved Goals */}
      {achievedGoals.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Achieved Goals ({achievedGoals.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {achievedGoals.map((goal) => (
              <div key={goal.id} className="glass-card p-5 border-green-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <h3 className="text-sm font-semibold text-white">{goal.title}</h3>
                </div>
                <p className="text-xs text-slate-400">Achieved: {goal.achieved_at ? new Date(goal.achieved_at).toLocaleDateString() : "N/A"}</p>
                <p className="text-xs text-green-400 mt-1">{goal.current_value} / {goal.target_value} {goal.unit}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Goal Modal */}
      {showCreate && businessId && (
        <CreateGoalModal onCreate={handleCreate} onClose={() => setShowCreate(false)} />
      )}

      {/* Strategy Modal */}
      {strategyGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => { setStrategyGoal(null); setStrategyText(null); }}>
          <div className="glass-strong p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto scrollbar-thin" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-bold text-white">AI Strategy for "{strategyGoal.title}"</h2>
              <button onClick={() => { setStrategyGoal(null); setStrategyText(null); }} className="btn-ghost p-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {generatingStrategy ? (
              <div className="flex items-center justify-center py-12">
                <svg className="w-8 h-8 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-200">{strategyText}</p>
                {strategyText && strategyText !== "Unable to generate strategy." && (
                  <button
                    onClick={async () => {
                      if (businessId && strategyGoal) {
                        await supabaseUpdateGoalStrategy(businessId, strategyGoal.id, strategyText);
                        setStrategyGoal(null);
                        setStrategyText(null);
                        await loadData(businessId);
                      }
                    }}
                    className="btn-primary"
                  >
                    Apply Strategy to Goal
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

async function supabaseUpdateGoalStrategy(_bid: string, goalId: string, strategy: string) {
  await supabase.from("business_goals").update({ ai_strategy: strategy }).eq("id", goalId);
}

function CreateGoalModal({ onCreate, onClose }: { onCreate: (goal: { goal_type: GoalType; title: string; target_value: number; unit: string; deadline?: string | null }) => void; onClose: () => void }) {
  const [goalType, setGoalType] = useState<GoalType>("rating_target");
  const [title, setTitle] = useState("");
  const [targetValue, setTargetValue] = useState(4.8);
  const [unit, setUnit] = useState("stars");
  const [deadline, setDeadline] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({ goal_type: goalType, title: title || GOAL_TYPE_META[goalType].label, target_value: targetValue, unit, deadline: deadline || null });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-strong p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Create New Goal</h2>
          <button onClick={onClose} className="btn-ghost p-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wider">Goal Type</label>
            <select value={goalType} onChange={(e) => { const t = e.target.value as GoalType; setGoalType(t); setUnit(GOAL_TYPE_META[t].unit); }} className="input-field mt-1">
              {Object.entries(GOAL_TYPE_META).map(([key, meta]) => (
                <option key={key} value={key}>{meta.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wider">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={GOAL_TYPE_META[goalType].label} className="input-field mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wider">Target Value</label>
              <input type="number" step="0.1" value={targetValue} onChange={(e) => setTargetValue(parseFloat(e.target.value))} className="input-field mt-1" />
            </div>
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wider">Unit</label>
              <input value={unit} onChange={(e) => setUnit(e.target.value)} className="input-field mt-1" />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wider">Deadline (optional)</label>
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="input-field mt-1" />
          </div>
          <button type="submit" className="btn-primary w-full justify-center">Create Goal</button>
        </form>
      </div>
    </div>
  );
}

function GoalsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 skeleton" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-48 skeleton" />)}</div>
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
