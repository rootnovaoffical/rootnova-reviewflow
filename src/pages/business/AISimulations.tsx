import { useEffect, useState, useCallback } from "react";
import { getActiveBusiness, getSimulations, deleteSimulation, callAIAgent, SIMULATION_TYPE_META } from "../../lib/ai-agent";
import type { AISimulation, SimulationType } from "../../lib/types";

export default function AISimulations() {
  const [simulations, setSimulations] = useState<AISimulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [generating, setGenerating] = useState<SimulationType | null>(null);
  const [selectedSim, setSelectedSim] = useState<AISimulation | null>(null);

  const loadData = useCallback(async (bid: string) => {
    try {
      const data = await getSimulations(bid);
      setSimulations(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load simulations");
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

  const handleGenerate = async (type: SimulationType) => {
    if (!businessId) return;
    setGenerating(type);
    try {
      const { error: err } = await callAIAgent(businessId, "generate_simulation", {
        scenario: type,
        scenarioLabel: SIMULATION_TYPE_META[type].label,
      });
      if (err) throw new Error(err);
      await loadData(businessId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate simulation");
    } finally {
      setGenerating(null);
    }
  };

  const handleDelete = async (simId: string) => {
    await deleteSimulation(simId);
    if (businessId) await loadData(businessId);
    setSelectedSim(null);
  };

  if (loading) return <SimSkeleton />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6 animate-page-enter">
      <div>
        <h1 className="text-2xl font-bold text-white">AI Simulations</h1>
        <p className="text-sm text-slate-400 mt-1">Forecast business outcomes based on real data</p>
      </div>

      {/* Estimate Warning Banner */}
      <div className="glass-strong p-4 border-amber-500/20">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <div>
            <p className="text-sm font-medium text-amber-400">All simulations are estimates</p>
            <p className="text-xs text-slate-400 mt-0.5">Projections are based on industry benchmarks and your current data. They are not guaranteed results.</p>
          </div>
        </div>
      </div>

      {/* Simulation Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(Object.entries(SIMULATION_TYPE_META) as [SimulationType, { label: string; icon: string }][]).map(([type, meta]) => (
          <div key={type} className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-2">{meta.label}</h3>
            <p className="text-xs text-slate-400 mb-3">Project the impact of {meta.label.toLowerCase()} on your business metrics.</p>
            <button onClick={() => handleGenerate(type)} disabled={generating === type} className="btn-primary w-full justify-center text-xs">
              {generating === type ? "Simulating..." : "Run Simulation"}
            </button>
          </div>
        ))}
      </div>

      {/* Simulation Results */}
      <div>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Past Simulations ({simulations.length})</h2>
        {simulations.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <svg className="w-12 h-12 text-slate-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104c.251.023.501.05.75.082m0 0a8.25 8.25 0 015.6 1.667c.344.247.67.52.977.813m-6.327-2.48a8.25 8.25 0 00-5.6 1.667c-.344.247-.67.52-.977.813M3 3l1.5 1.5m0 0L3 6m1.5-1.5L6 3M3 21l1.5-1.5m0 0L3 18m1.5 1.5L6 21" /></svg>
            <p className="text-slate-400 mb-1">No simulations run yet.</p>
            <p className="text-xs text-slate-500">Run a simulation above to see projected business outcomes.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {simulations.map((sim, i) => {
              const meta = SIMULATION_TYPE_META[sim.simulation_type] ?? SIMULATION_TYPE_META.custom;
              return (
                <div
                  key={sim.id}
                  className="glass-card p-5 animate-fade-up cursor-pointer"
                  style={{ animationDelay: `${i * 50}ms` }}
                  onClick={() => setSelectedSim(sim)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-500/15 text-blue-400">{meta.label}</span>
                    <span className="text-xs text-slate-500">{new Date(sim.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-slate-200 line-clamp-2">{sim.projected_outcome}</p>
                  <div className="flex items-center gap-3 mt-3 text-xs">
                    <span className="text-blue-400">Confidence: {(sim.confidence * 100).toFixed(0)}%</span>
                    <span className="text-amber-400">Estimate</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Simulation Detail Modal */}
      {selectedSim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedSim(null)}>
          <div className="glass-strong p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto scrollbar-thin" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-white">{SIMULATION_TYPE_META[selectedSim.simulation_type]?.label ?? "Simulation"}</h2>
                <p className="text-xs text-slate-400">{new Date(selectedSim.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleDelete(selectedSim.id)} className="btn-ghost text-xs text-red-400 p-1.5">Delete</button>
                <button onClick={() => setSelectedSim(null)} className="btn-ghost p-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            <div className="space-y-5">
              {/* Estimate Warning */}
              <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                <p className="text-xs text-amber-400 font-medium">This is a Prediction / Estimate</p>
                <p className="text-xs text-slate-400 mt-0.5">This projection is based on industry benchmarks and current data. It is not a guaranteed result.</p>
              </div>

              <div>
                <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-1">Scenario</h3>
                <p className="text-sm text-slate-200">{selectedSim.scenario}</p>
              </div>

              <div>
                <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-1">Projected Outcome</h3>
                <p className="text-sm text-green-400">{selectedSim.projected_outcome}</p>
              </div>

              <div>
                <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-1">Current State</h3>
                <pre className="text-xs text-slate-300 bg-black/30 p-3 rounded-lg overflow-x-auto">{JSON.stringify(selectedSim.current_state, null, 2)}</pre>
              </div>

              <div>
                <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-1">Projected State</h3>
                <pre className="text-xs text-slate-300 bg-black/30 p-3 rounded-lg overflow-x-auto">{JSON.stringify(selectedSim.projected_state, null, 2)}</pre>
              </div>

              <div>
                <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-2">Assumptions</h3>
                <div className="space-y-2">
                  {selectedSim.assumptions.map((a, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-white/5">
                      <svg className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                      <p className="text-sm text-slate-200">{a}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-1">Confidence Level</h3>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-blue-500" style={{ width: `${selectedSim.confidence * 100}%` }} />
                  </div>
                  <span className="text-sm font-medium text-white">{(selectedSim.confidence * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SimSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 skeleton" />
      <div className="h-16 skeleton" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-32 skeleton" />)}</div>
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
