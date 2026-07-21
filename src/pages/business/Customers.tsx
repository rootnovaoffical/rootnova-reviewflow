import { useEffect, useState, useMemo, useCallback } from "react";
import BusinessShell from "./BusinessShell";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { SkeletonCard, SkeletonList } from "../../components/Skeleton";
import { EmptyState, ErrorState } from "../../components/States";
import { timeAgo, formatDateTime } from "../../lib/utils";
import {
  fetchCustomers,
  fetchCustomerTimeline,
  segmentMeta,
} from "../../lib/engagement";
import type { Customer, CustomerEvent, CustomerSegment, ReviewSession } from "../../lib/types";

type SegmentFilter = "all" | CustomerSegment;

const eventMeta: Record<string, { label: string; icon: string; color: string }> = {
  qr_scanned: { label: "QR Scanned", icon: "📱", color: "text-primary-300" },
  review_submitted: { label: "Review Submitted", icon: "⭐", color: "text-warning-400" },
  ai_review_generated: { label: "AI Review Generated", icon: "✨", color: "text-accent-400" },
  google_review_completed: { label: "Google Review Completed", icon: "🔍", color: "text-success-400" },
  business_replied: { label: "Business Replied", icon: "💬", color: "text-primary-300" },
  follow_up_sent: { label: "Follow-up Sent", icon: "✉️", color: "text-accent-300" },
  customer_returned: { label: "Customer Returned", icon: "🔄", color: "text-success-400" },
  reward_redeemed: { label: "Reward Redeemed", icon: "🎁", color: "text-warning-400" },
  became_loyal: { label: "Became Loyal", icon: "💎", color: "text-success-400" },
};

export default function BusinessCustomers() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [reviews, setReviews] = useState<ReviewSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [segmentFilter, setSegmentFilter] = useState<SegmentFilter>("all");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [timeline, setTimeline] = useState<CustomerEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

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

      const [custRes, revRes] = await Promise.all([
        fetchCustomers(link.business_id),
        supabase.from("review_sessions").select("*").eq("business_id", link.business_id).order("created_at", { ascending: false }),
      ]);
      if (custRes.error) throw new Error(custRes.error);
      if (revRes.error) throw revRes.error;
      setCustomers(custRes.data || []);
      setReviews((revRes.data || []) as ReviewSession[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const loadTimeline = useCallback(async (customerId: string) => {
    if (!businessId) return;
    setTimelineLoading(true);
    const { data, error } = await fetchCustomerTimeline(businessId, customerId);
    if (error) { showToast("Failed to load timeline", "error"); setTimeline([]); }
    else setTimeline(data || []);
    setTimelineLoading(false);
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
    loadTimeline(customer.id);
  };

  if (loading) return (
    <BusinessShell title="Customers">
      <div className="p-4 md:p-8 space-y-6">
        <SkeletonCard className="!min-h-[60px]" />
        <SkeletonList items={5} />
      </div>
    </BusinessShell>
  );

  if (error) return (
    <BusinessShell title="Customers">
      <div className="p-4 md:p-8"><ErrorState message={error} onRetry={load} /></div>
    </BusinessShell>
  );

  if (customers.length === 0) return (
    <BusinessShell title="Customers">
      <div className="p-4 md:p-8 page-enter">
        <EmptyState
          title="No customers yet"
          subtitle="Customer profiles are automatically created when someone scans your QR code and submits a review. Share your review link to start building your customer base."
        />
      </div>
    </BusinessShell>
  );

  return (
    <BusinessShell title="Customers">
      <div className="p-4 md:p-8 space-y-6 page-enter">
        {/* Header */}
        <div className="animate-fade-up">
          <h2 className="text-xl font-bold text-white">Customer Profiles</h2>
          <p className="text-sm text-slate-400 mt-1">Every customer's journey, in one place.</p>
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
              />
            ))}
          </div>
        )}
      </div>

      {/* Customer detail panel */}
      {selected && (
        <CustomerDetailPanel
          customer={selected}
          reviews={reviews}
          timeline={timeline}
          timelineLoading={timelineLoading}
          onClose={() => setSelected(null)}
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

function CustomerCard({ customer, delay, onClick }: { customer: Customer; delay: number; onClick: () => void }) {
  const meta = segmentMeta(customer.segment);
  const initials = (customer.display_name || "A").slice(0, 2).toUpperCase();

  return (
    <div
      className={`glass rounded-2xl p-5 card-hover cursor-pointer animate-fade-up border ${meta.border}`}
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
        <span>{customer.avg_rating > 0 ? `${customer.avg_rating.toFixed(1)}⭐` : "No rating"}</span>
        <span>{customer.last_visit_at ? `Last visit ${timeAgo(customer.last_visit_at)}` : "First visit"}</span>
      </div>
    </div>
  );
}

function CustomerDetailPanel({ customer, reviews, timeline, timelineLoading, onClose }: {
  customer: Customer;
  reviews: ReviewSession[];
  timeline: CustomerEvent[];
  timelineLoading: boolean;
  onClose: () => void;
}) {
  const meta = segmentMeta(customer.segment);
  const customerReviews = reviews.filter((r) => {
    const event = timeline.find((e) => e.review_session_id === r.id);
    return event !== undefined;
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
      <div
        className="glass-strong rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto page-enter"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500/30 to-accent-500/30 flex items-center justify-center text-white font-bold">
              {(customer.display_name || "A").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{customer.display_name || "Anonymous Customer"}</h3>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${meta.bg} ${meta.color} mt-1`}>
                {meta.icon} {meta.label}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-slate-900/50 rounded-xl p-3 border border-white/5 text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Visits</p>
            <p className="text-xl font-bold text-white mt-1">{customer.total_visits}</p>
          </div>
          <div className="bg-slate-900/50 rounded-xl p-3 border border-white/5 text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Reviews</p>
            <p className="text-xl font-bold text-white mt-1">{customer.total_reviews}</p>
          </div>
          <div className="bg-slate-900/50 rounded-xl p-3 border border-white/5 text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Avg Rating</p>
            <p className="text-xl font-bold text-white mt-1">{customer.avg_rating > 0 ? customer.avg_rating.toFixed(1) : "—"}</p>
          </div>
        </div>

        {/* Timeline */}
        <div className="mb-5">
          <h4 className="text-xs text-slate-500 uppercase tracking-wide mb-3">Customer Timeline</h4>
          {timelineLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
            </div>
          ) : timeline.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">No timeline events recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {timeline.map((event) => {
                const em = eventMeta[event.event_type] || { label: event.event_type, icon: "📌", color: "text-slate-400" };
                return (
                  <div key={event.id} className="flex items-start gap-3 animate-fade-up">
                    <div className="w-8 h-8 rounded-full bg-slate-800/50 flex items-center justify-center text-sm shrink-0">
                      {em.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${em.color}`}>{em.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{formatDateTime(event.created_at)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Reviews */}
        {customerReviews.length > 0 && (
          <div>
            <h4 className="text-xs text-slate-500 uppercase tracking-wide mb-3">Reviews from this customer</h4>
            <div className="space-y-2">
              {customerReviews.slice(0, 5).map((r) => (
                <div key={r.id} className="bg-slate-900/40 rounded-xl p-3 border border-white/5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">{"⭐".repeat(r.rating)}</span>
                    <span className="text-xs text-slate-500">{timeAgo(r.created_at)}</span>
                  </div>
                  {r.ai_generated_review && (
                    <p className="text-sm text-slate-300 line-clamp-3">{r.ai_generated_review}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
