import { useEffect, useState, useCallback } from "react";
import { getActiveBusiness, getBriefings, callAIAgent, BRIEFING_PERIOD_META } from "../../lib/ai-agent";
import type { AIBriefing, BriefingPeriod } from "../../lib/types";

export default function AIBriefings() {
  const [briefings, setBriefings] = useState<AIBriefing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState<BriefingPeriod | "all">("all");
  const [generating, setGenerating] = useState<BriefingPeriod | null>(null);
  const [selectedBriefing, setSelectedBriefing] = useState<AIBriefing | null>(null);

  const loadData = useCallback(async (bid: string) => {
    try {
      const data = await getBriefings(bid);
      setBriefings(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load briefings");
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

  const handleGenerate = async (period: BriefingPeriod) => {
    if (!businessId) return;
    setGenerating(period);
    try {
      const { error: err } = await callAIAgent(businessId, "generate_briefing", { period });
      if (err) throw new Error(err);
      await loadData(businessId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate briefing");
    } finally {
      setGenerating(null);
    }
  };

  const filteredBriefings = periodFilter === "all" ? briefings : briefings.filter((b) => b.period === periodFilter);

  if (loading) return <BriefingSkeleton />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6 animate-page-enter">
      <div>
        <h1 className="text-2xl font-bold text-white">AI Briefings</h1>
        <p className="text-sm text-slate-400 mt-1">Daily, weekly, and monthly intelligence summaries</p>
      </div>

      {/* Generate buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(["daily", "weekly", "monthly"] as BriefingPeriod[]).map((period) => {
          const meta = BRIEFING_PERIOD_META[period];
          return (
            <div key={period} className="glass-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">{meta.label}</h3>
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
              </div>
              <p className="text-xs text-slate-400 mb-3">Generate a {period} summary of your business performance, wins, risks, and recommendations.</p>
              <button onClick={() => handleGenerate(period)} disabled={generating === period} className="btn-primary w-full justify-center text-xs">
                {generating === period ? "Generating..." : `Generate ${meta.label}`}
              </button>
            </div>
          );
        })}
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {(["all", "daily", "weekly", "monthly"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriodFilter(p)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
              periodFilter === p ? "bg-blue-500/15 text-blue-400 border border-blue-500/30" : "bg-white/5 text-slate-400 hover:text-white border border-transparent"
            }`}
          >
            {p === "all" ? "All Briefings" : BRIEFING_PERIOD_META[p as BriefingPeriod].label}
          </button>
        ))}
      </div>

      {/* Briefing List */}
      {filteredBriefings.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <svg className="w-12 h-12 text-slate-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
          <p className="text-slate-400 mb-1">No briefings generated yet.</p>
          <p className="text-xs text-slate-500">Generate a briefing above to get AI-powered business summaries.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBriefings.map((briefing, i) => {
            const meta = BRIEFING_PERIOD_META[briefing.period] ?? BRIEFING_PERIOD_META.daily;
            return (
              <div
                key={briefing.id}
                className="glass-card p-5 animate-fade-up cursor-pointer"
                style={{ animationDelay: `${i * 50}ms` }}
                onClick={() => setSelectedBriefing(briefing)}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-500/15 text-blue-400">{meta.label}</span>
                  <span className="text-xs text-slate-500">{briefing.briefing_date}</span>
                </div>
                <p className="text-sm text-slate-200 line-clamp-3">{briefing.summary}</p>
                <div className="flex items-center gap-3 mt-3 text-xs">
                  <span className="text-green-400">{briefing.wins.length} wins</span>
                  <span className="text-red-400">{briefing.risks.length} risks</span>
                  <span className="text-blue-400">{briefing.recommendations.length} recommendations</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Briefing Detail Modal */}
      {selectedBriefing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedBriefing(null)}>
          <div className="glass-strong p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto scrollbar-thin" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-white">{BRIEFING_PERIOD_META[selectedBriefing.period]?.label ?? "Briefing"}</h2>
                <p className="text-xs text-slate-400">{selectedBriefing.briefing_date}</p>
              </div>
              <button onClick={() => setSelectedBriefing(null)} className="btn-ghost p-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-1">Summary</h3>
                <p className="text-sm text-slate-200">{selectedBriefing.summary}</p>
              </div>

              {selectedBriefing.wins.length > 0 && (
                <div>
                  <h3 className="text-xs text-green-400 uppercase tracking-wider mb-2">Wins</h3>
                  <div className="space-y-2">
                    {selectedBriefing.wins.map((w, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-green-500/5">
                        <svg className="w-4 h-4 text-green-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        <p className="text-sm text-slate-200">{w}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedBriefing.risks.length > 0 && (
                <div>
                  <h3 className="text-xs text-red-400 uppercase tracking-wider mb-2">Risks</h3>
                  <div className="space-y-2">
                    {selectedBriefing.risks.map((r, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-red-500/5">
                        <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        <p className="text-sm text-slate-200">{r}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedBriefing.recommendations.length > 0 && (
                <div>
                  <h3 className="text-xs text-blue-400 uppercase tracking-wider mb-2">Recommendations</h3>
                  <div className="space-y-2">
                    {selectedBriefing.recommendations.map((r, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-blue-500/5">
                        <svg className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                        <p className="text-sm text-slate-200">{r}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedBriefing.progress.length > 0 && (
                <div>
                  <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-2">Progress</h3>
                  <div className="space-y-2">
                    {selectedBriefing.progress.map((p, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-white/5">
                        <svg className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                        <p className="text-sm text-slate-200">{p}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedBriefing.upcoming_opportunities.length > 0 && (
                <div>
                  <h3 className="text-xs text-amber-400 uppercase tracking-wider mb-2">Upcoming Opportunities</h3>
                  <div className="space-y-2">
                    {selectedBriefing.upcoming_opportunities.map((o, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/5">
                        <svg className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        <p className="text-sm text-slate-200">{o}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BriefingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 skeleton" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 skeleton" />)}</div>
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
