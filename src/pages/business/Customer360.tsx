import { useEffect, useState, useMemo, useCallback } from "react";
import BusinessShell from "./BusinessShell";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { SkeletonCard, SkeletonList } from "../../components/Skeleton";
import { EmptyState, ErrorState } from "../../components/States";
import { timeAgo, formatDateTime } from "../../lib/utils";
import { fetchCustomers, segmentMeta } from "../../lib/engagement";
import {
  fetchCustomer360,
  healthBandMeta,
  relationshipBandMeta,
  insightCategoryMeta,
  confidenceMeta,
  generateAICustomerInsights,
  type Customer360Data,
  type Customer360Insight,
  type TimelineEvent,
  type FuturePrediction,
} from "../../lib/customer360";
import type { Customer, CustomerSegment } from "../../lib/types";

type SegmentFilter = "all" | CustomerSegment;

export default function BusinessCustomer360() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [segmentFilter, setSegmentFilter] = useState<SegmentFilter>("all");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [detail, setDetail] = useState<Customer360Data | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [aiInsights, setAIInsights] = useState<Customer360Insight[]>([]);
  const [aiLoading, setAILoading] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    setError(null);
    setLoading(true);
    try {
      const { data: link, error: linkErr } = await supabase
        .from("business_admins")
        .select("business_id")
        .eq("user_id", profile.id)
        .maybeSingle();
      if (linkErr) throw linkErr;
      if (!link?.business_id) { setCustomers([]); setLoading(false); return; }
      setBusinessId(link.business_id);

      const { data, error: custErr } = await fetchCustomers(link.business_id);
      if (custErr) throw new Error(custErr);
      setCustomers(data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const loadDetail = useCallback(async (customerId: string) => {
    if (!businessId) return;
    setDetailLoading(true);
    setDetail(null);
    setAIInsights([]);
    const { data, error: err } = await fetchCustomer360(businessId, customerId);
    if (err || !data) {
      showToast(err ?? "Failed to load customer profile", "error");
    } else {
      setDetail(data);
      // Fetch AI insights in background
      setAILoading(true);
      const aiRes = await generateAICustomerInsights({
        businessId,
        customer: data.customer,
        reviews: data.reviews,
        messages: data.messages,
        healthScore: data.healthScore,
        relationshipScore: data.relationshipScore,
      });
      if (aiRes.error) {
        showToast("AI insights unavailable — showing data-driven insights", "info");
      } else {
        setAIInsights(aiRes.insights || []);
      }
      setAILoading(false);
    }
    setDetailLoading(false);
  }, [businessId, showToast]);

  const filtered = useMemo(() => {
    if (segmentFilter === "all") return customers;
    return customers.filter((c) => c.segment === segmentFilter);
  }, [customers, segmentFilter]);

  const segmentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    customers.forEach((c) => { counts[c.segment] = (counts[c.segment] || 0) + 1; });
    return counts;
  }, [customers]);

  const handleSelectCustomer = (customer: Customer) => {
    setSelected(customer);
    loadDetail(customer.id);
  };

  if (loading) return (
    <BusinessShell title="Customer 360">
      <div className="p-4 md:p-8 space-y-6">
        <SkeletonCard className="!min-h-[60px]" />
        <SkeletonList items={5} />
      </div>
    </BusinessShell>
  );

  if (error) return (
    <BusinessShell title="Customer 360">
      <div className="p-4 md:p-8"><ErrorState message={error} onRetry={load} /></div>
    </BusinessShell>
  );

  if (customers.length === 0) return (
    <BusinessShell title="Customer 360">
      <div className="p-4 md:p-8 page-enter">
        <EmptyState
          title="No customers yet"
          subtitle="Customer 360 profiles are built automatically from reviews, messages, campaigns, and workflows. Share your review link to start building customer intelligence."
        />
      </div>
    </BusinessShell>
  );

  return (
    <BusinessShell title="Customer 360">
      <div className="p-4 md:p-8 space-y-6 page-enter">
        {/* Header */}
        <div className="animate-fade-up">
          <h2 className="text-xl font-bold text-white">Customer Intelligence</h2>
          <p className="text-sm text-slate-400 mt-1">The definitive customer record — unified across every module.</p>
        </div>

        {/* Segment filter pills */}
        <div className="flex gap-2 flex-wrap animate-fade-up" style={{ animationDelay: "80ms" }}>
          <FilterPill active={segmentFilter === "all"} onClick={() => setSegmentFilter("all")} label={`All (${customers.length})`} />
          {(Object.keys(segmentCounts) as CustomerSegment[]).sort((a, b) => segmentCounts[b] - segmentCounts[a]).map((seg) => {
            const meta = segmentMeta(seg);
            return (
              <FilterPill
                key={seg}
                active={segmentFilter === seg}
                onClick={() => setSegmentFilter(seg)}
                label={`${meta.icon} ${meta.label} (${segmentCounts[seg]})`}
              />
            );
          })}
        </div>

        {/* Customer list */}
        {filtered.length === 0 ? (
          <EmptyState title="No customers in this segment" subtitle="Try a different filter." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((customer, i) => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                delay={i * 40}
                onClick={() => handleSelectCustomer(customer)}
                isSelected={selected?.id === customer.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Customer 360 detail panel */}
      {selected && (
        <Customer360Panel
          customer={selected}
          detail={detail}
          detailLoading={detailLoading}
          aiInsights={aiInsights}
          aiLoading={aiLoading}
          onClose={() => { setSelected(null); setDetail(null); setAIInsights([]); }}
        />
      )}
    </BusinessShell>
  );
}

function FilterPill({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${active ? "btn-primary text-white" : "btn-ghost text-slate-300"}`}
    >
      {label}
    </button>
  );
}

function CustomerCard({ customer, delay, onClick, isSelected }: { customer: Customer; delay: number; onClick: () => void; isSelected: boolean }) {
  const meta = segmentMeta(customer.segment);
  const initials = (customer.display_name || "A").slice(0, 2).toUpperCase();

  return (
    <div
      className={`glass rounded-2xl p-5 card-hover cursor-pointer animate-fade-up border transition-all ${isSelected ? "border-primary-500/50 ring-1 ring-primary-500/30" : meta.border}`}
      style={{ animationDelay: `${delay}ms` }}
      onClick={onClick}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500/30 to-accent-500/30 flex items-center justify-center text-white font-semibold text-sm shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white text-sm font-semibold truncate">{customer.display_name || "Anonymous Customer"}</h3>
          <p className="text-xs text-slate-500">{customer.total_visits} visit{customer.total_visits !== 1 ? "s" : ""} · {customer.total_reviews} review{customer.total_reviews !== 1 ? "s" : ""}</p>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${meta.bg} ${meta.color} shrink-0`}>
          {meta.icon} {meta.label}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-white/5">
        <span>{(customer.avg_rating ?? 0) > 0 ? `${(customer.avg_rating as number).toFixed(1)}⭐` : "No rating"}</span>
        <span>{customer.last_visit_at ? `Last visit ${timeAgo(customer.last_visit_at)}` : "First visit"}</span>
      </div>
    </div>
  );
}

// =========================================================
// CUSTOMER 360 DETAIL PANEL
// =========================================================

function Customer360Panel({ customer, detail, detailLoading, aiInsights, aiLoading, onClose }: {
  customer: Customer;
  detail: Customer360Data | null;
  detailLoading: boolean;
  aiInsights: Customer360Insight[];
  aiLoading: boolean;
  onClose: () => void;
}) {
  const meta = segmentMeta(customer.segment);
  const initials = (customer.display_name || "A").slice(0, 2).toUpperCase();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
      <div
        className="glass-strong rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto page-enter"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur-md px-6 py-4 border-b border-white/5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-500/30 to-accent-500/30 flex items-center justify-center text-white font-bold text-lg">
              {initials}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{customer.display_name || "Anonymous Customer"}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${meta.bg} ${meta.color}`}>
                  {meta.icon} {meta.label}
                </span>
                <span className="text-xs text-slate-500">{customer.identifier}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {detailLoading ? (
          <div className="p-6 flex items-center justify-center py-16">
            <div className="w-10 h-10 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          </div>
        ) : !detail ? (
          <div className="p-6"><p className="text-sm text-slate-500 text-center py-8">Unable to load customer data.</p></div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatBox label="Visits" value={customer.total_visits} />
              <StatBox label="Reviews" value={customer.total_reviews} />
              <StatBox label="Avg Rating" value={(customer.avg_rating ?? 0) > 0 ? (customer.avg_rating as number).toFixed(1) : "—"} />
              <StatBox label="Messages" value={detail.messages.length} />
            </div>

            {/* Score rings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ScoreRing
                score={detail.healthScore.score}
                band={detail.healthScore.band}
                label="Health Score"
                bandMeta={healthBandMeta(detail.healthScore.band)}
                explanation={detail.healthScore.explanation}
                confidence={detail.healthScore.confidence}
                factors={detail.healthScore.factors}
                recommendation={detail.healthScore.recommendation}
              />
              <ScoreRing
                score={detail.relationshipScore.score}
                band={detail.relationshipScore.band}
                label="Relationship Score"
                bandMeta={relationshipBandMeta(detail.relationshipScore.band)}
                explanation={detail.relationshipScore.explanation}
                confidence={detail.relationshipScore.confidence}
                factors={detail.relationshipScore.factors.map((f) => ({ label: f.label, value: f.value, weight: 0, contribution: f.contribution }))}
                recommendation={null}
              />
            </div>

            {/* AI Insights */}
            <div>
              <h4 className="text-xs text-slate-500 uppercase tracking-wide mb-3">AI Insights</h4>
              {aiLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <div className="w-4 h-4 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
                  Analyzing customer data...
                </div>
              ) : aiInsights.length > 0 ? (
                <div className="space-y-2">
                  {aiInsights.map((insight, i) => (
                    <InsightCard key={i} insight={insight} />
                  ))}
                </div>
              ) : null}

              {/* Data-driven insights (always available) */}
              {detail.insights.length > 0 && (
                <div className="space-y-2 mt-2">
                  {detail.insights.map((insight, i) => (
                    <InsightCard key={`data-${i}`} insight={insight} />
                  ))}
                </div>
              )}

              {aiInsights.length === 0 && detail.insights.length === 0 && !aiLoading && (
                <p className="text-sm text-slate-500 py-2">No insights available yet — more interaction data is needed.</p>
              )}
            </div>

            {/* Future Predictions */}
            <div>
              <h4 className="text-xs text-slate-500 uppercase tracking-wide mb-3">Future Predictions</h4>
              {detail.predictions.length === 0 ? (
                <p className="text-sm text-slate-500 py-2">Not enough data for predictions yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {detail.predictions.map((pred, i) => (
                    <PredictionCard key={i} prediction={pred} delay={i * 40} />
                  ))}
                </div>
              )}
              <p className="text-[10px] text-slate-600 mt-2 italic">Predictions are estimates based on existing data — not guarantees.</p>
            </div>

            {/* Unified Timeline */}
            <div>
              <h4 className="text-xs text-slate-500 uppercase tracking-wide mb-3">Unified Timeline</h4>
              {detail.timeline.length === 0 ? (
                <p className="text-sm text-slate-500 py-4 text-center">No timeline events recorded yet.</p>
              ) : (
                <Timeline events={detail.timeline.slice(0, 50)} />
              )}
            </div>

            {/* Reviews */}
            {detail.reviews.length > 0 && (
              <div>
                <h4 className="text-xs text-slate-500 uppercase tracking-wide mb-3">Reviews ({detail.reviews.length})</h4>
                <div className="space-y-2">
                  {detail.reviews.slice(0, 5).map((r) => (
                    <div key={r.id} className="bg-slate-900/40 rounded-xl p-3 border border-white/5">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">{"⭐".repeat(r.rating ?? 0)}</span>
                        <span className="text-xs text-slate-500">{timeAgo(r.created_at)}</span>
                        {r.business_response && <span className="text-xs text-success-400">Replied</span>}
                      </div>
                      {r.ai_generated_review && <p className="text-sm text-slate-300 line-clamp-3">{r.ai_generated_review}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {detail.messages.length > 0 && (
              <div>
                <h4 className="text-xs text-slate-500 uppercase tracking-wide mb-3">Messages ({detail.messages.length})</h4>
                <div className="space-y-2">
                  {detail.messages.slice(0, 5).map((m) => (
                    <div key={m.id} className="bg-slate-900/40 rounded-xl p-3 border border-white/5">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-accent-300 uppercase">{m.channel}</span>
                        <span className="text-xs text-slate-500">{m.status}</span>
                        <span className="text-xs text-slate-500 ml-auto">{timeAgo(m.created_at)}</span>
                      </div>
                      <p className="text-sm text-slate-300 line-clamp-2">{m.subject || m.body.slice(0, 100)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Loyalty */}
            {detail.loyalty.length > 0 && (
              <div>
                <h4 className="text-xs text-slate-500 uppercase tracking-wide mb-3">Loyalty ({detail.loyalty.length})</h4>
                <div className="space-y-2">
                  {detail.loyalty.map((l) => (
                    <div key={l.id} className="bg-slate-900/40 rounded-xl p-3 border border-white/5 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white font-medium">{l.points} points</p>
                        <p className="text-xs text-slate-500">{l.visits_counted} visits counted</p>
                      </div>
                      {l.reward_unlocked
                        ? <span className="text-xs text-warning-400 font-medium">Reward Unlocked</span>
                        : <span className="text-xs text-slate-500">In Progress</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Campaigns */}
            {detail.campaigns.length > 0 && (
              <div>
                <h4 className="text-xs text-slate-500 uppercase tracking-wide mb-3">Campaigns ({detail.campaigns.length})</h4>
                <div className="space-y-2">
                  {detail.campaigns.slice(0, 8).map((c) => (
                    <div key={c.id} className="bg-slate-900/40 rounded-xl p-3 border border-white/5">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-accent-300 uppercase">{c.campaign_type}</span>
                        <span className={`text-xs ${c.status === "sent" ? "text-success-400" : "text-slate-500"}`}>{c.status}</span>
                        <span className="text-xs text-slate-500 ml-auto">{timeAgo(c.created_at)}</span>
                      </div>
                      <p className="text-sm text-slate-300 line-clamp-2">{c.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Workflow Executions */}
            {detail.workflowExecutions.length > 0 && (
              <div>
                <h4 className="text-xs text-slate-500 uppercase tracking-wide mb-3">Workflows ({detail.workflowExecutions.length})</h4>
                <div className="space-y-2">
                  {detail.workflowExecutions.slice(0, 8).map((w) => (
                    <div key={w.id} className="bg-slate-900/40 rounded-xl p-3 border border-white/5 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white font-medium">Workflow {w.workflow_id.slice(0, 8)}</p>
                        <p className="text-xs text-slate-500">{w.status} · {timeAgo(w.started_at)}</p>
                      </div>
                      <span className={`text-xs font-medium ${w.status === "completed" ? "text-success-400" : w.status === "failed" ? "text-error-400" : "text-warning-400"}`}>{w.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Tasks */}
            {detail.aiTasks.length > 0 && (
              <div>
                <h4 className="text-xs text-slate-500 uppercase tracking-wide mb-3">AI Actions ({detail.aiTasks.length})</h4>
                <div className="space-y-2">
                  {detail.aiTasks.slice(0, 8).map((t) => (
                    <div key={t.id} className="bg-slate-900/40 rounded-xl p-3 border border-white/5">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-primary-300 uppercase">{t.task_type}</span>
                        <span className={`text-xs ${t.status === "completed" ? "text-success-400" : "text-slate-500"}`}>{t.status}</span>
                        <span className="text-xs text-slate-500 ml-auto">{timeAgo(t.created_at)}</span>
                      </div>
                      <p className="text-sm text-slate-300 line-clamp-2">{t.description || t.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Recommendations */}
            {detail.aiRecommendations.length > 0 && (
              <div>
                <h4 className="text-xs text-slate-500 uppercase tracking-wide mb-3">AI Recommendations ({detail.aiRecommendations.length})</h4>
                <div className="space-y-2">
                  {detail.aiRecommendations.slice(0, 8).map((r) => (
                    <div key={r.id} className="bg-slate-900/40 rounded-xl p-3 border border-white/5">
                      <p className="text-sm text-white font-medium mb-1">{r.title}</p>
                      <p className="text-xs text-slate-400 line-clamp-3">{r.description}</p>
                      <span className="inline-block text-[10px] text-slate-600 mt-1">{timeAgo(r.created_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// =========================================================
// SUB-COMPONENTS
// =========================================================

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-slate-900/50 rounded-xl p-3 border border-white/5 text-center">
      <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold text-white mt-1">{value}</p>
    </div>
  );
}

function ScoreRing({ score, label, bandMeta, explanation, confidence, factors, recommendation }: {
  score: number;
  band: string;
  label: string;
  bandMeta: { label: string; color: string; bg: string; icon: string };
  explanation: string;
  confidence: number;
  factors: Array<{ label: string; value: string; weight: number; contribution: number }>;
  recommendation: string | null;
}) {
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="glass rounded-2xl p-5 border border-white/5">
      <div className="flex items-center gap-4 mb-4">
        {/* Score ring */}
        <div className="relative w-24 h-24 shrink-0">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
            <circle
              cx="50" cy="50" r="42" fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className={bandMeta.color}
              style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-white">{score}</span>
            <span className="text-[10px] text-slate-500">/100</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${bandMeta.bg} ${bandMeta.color} mt-1`}>
            {bandMeta.icon} {bandMeta.label}
          </span>
          <p className="text-xs text-slate-500 mt-1">Confidence: {Math.round(confidence * 100)}%</p>
        </div>
      </div>

      {/* Factors */}
      <div className="space-y-1.5 mb-3">
        {factors.map((f, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span className="text-slate-400">{f.label}</span>
            <span className="text-slate-300">{f.value}</span>
          </div>
        ))}
      </div>

      {/* Explanation */}
      <p className="text-xs text-slate-400 leading-relaxed mb-2">{explanation}</p>

      {/* Recommendation */}
      {recommendation && (
        <div className="bg-primary-500/5 border border-primary-500/10 rounded-lg p-2.5 mt-2">
          <p className="text-xs text-primary-300">{recommendation}</p>
        </div>
      )}
    </div>
  );
}

function InsightCard({ insight }: { insight: Customer360Insight }) {
  const catMeta = insightCategoryMeta(insight.category);
  const confMeta = confidenceMeta(insight.confidence);

  return (
    <div className="glass rounded-xl p-4 border border-white/5 animate-fade-up">
      <div className="flex items-start gap-2 mb-2">
        <span className="text-lg shrink-0">{catMeta.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h5 className="text-sm font-semibold text-white">{insight.title}</h5>
            <span className={`text-[10px] font-medium ${confMeta.color}`}>{confMeta.label} confidence</span>
          </div>
          <span className={`text-[10px] ${catMeta.color}`}>{catMeta.label}</span>
        </div>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed mb-2">{insight.insight}</p>
      <div className="bg-slate-900/40 rounded-lg p-2 border border-white/5">
        <p className="text-xs text-primary-300">{insight.recommendation}</p>
      </div>
    </div>
  );
}

function PredictionCard({ prediction, delay }: { prediction: FuturePrediction; delay: number }) {
  const confLevel = prediction.confidence >= 0.7 ? "high" : prediction.confidence >= 0.45 ? "medium" : "low";
  const confMeta = confidenceMeta(confLevel);
  const isHigh = prediction.numericEstimate > 0.7;
  const accentColor = prediction.type === "churn_probability"
    ? (isHigh ? "text-error-400" : "text-success-400")
    : prediction.type === "expected_ltv"
    ? "text-primary-300"
    : isHigh ? "text-success-400" : "text-slate-300";

  return (
    <div className="glass rounded-xl p-4 border border-white/5 animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between mb-2">
        <h5 className="text-sm font-semibold text-white">{prediction.label}</h5>
        <span className={`text-[10px] font-medium ${confMeta.color}`}>{confMeta.label} confidence</span>
      </div>
      <p className={`text-2xl font-bold ${accentColor} mb-3`}>{prediction.estimated}</p>
      <div className="space-y-1 mb-2">
        <p className="text-[10px] text-slate-600 uppercase tracking-wide">Evidence</p>
        {prediction.evidence.map((e, i) => (
          <p key={i} className="text-xs text-slate-400 flex items-start gap-1">
            <span className="text-slate-600 shrink-0">•</span>
            <span>{e}</span>
          </p>
        ))}
      </div>
      <div className="space-y-1">
        <p className="text-[10px] text-slate-600 uppercase tracking-wide">Assumptions</p>
        {prediction.assumptions.map((a, i) => (
          <p key={i} className="text-xs text-slate-500 italic flex items-start gap-1">
            <span className="text-slate-600 shrink-0">•</span>
            <span>{a}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <div className="relative pl-6">
      {/* Vertical line */}
      <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-primary-500/20 via-white/5 to-transparent" />

      <div className="space-y-3">
        {events.map((event, i) => (
          <div key={event.id} className="relative animate-fade-up" style={{ animationDelay: `${Math.min(i * 30, 600)}ms` }}>
            {/* Dot */}
            <div className="absolute -left-6 top-0.5 w-6 h-6 rounded-full bg-slate-800/80 border border-white/10 flex items-center justify-center text-xs shrink-0">
              {event.icon}
            </div>
            <div className="ml-2">
              <p className={`text-sm font-medium ${event.color}`}>{event.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{formatDateTime(event.timestamp)}</p>
              {event.detail && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{event.detail}</p>}
              <span className="inline-block text-[10px] text-slate-600 mt-1 uppercase tracking-wide">{event.source}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
