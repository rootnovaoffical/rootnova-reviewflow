import { supabase } from './supabase'
import type { DashboardMetrics, RatingDistribution, SessionsOverTimePoint, SentimentSplit, CategoryCount } from '../types';

export interface AnalyticsFilters {
  businessId?: string;
}

export async function trackEvent(
  eventType: string,
  businessId: string | null = null,
  sessionId: string | null = null,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  try {
    await supabase.from('analytics_events').insert({
      business_id: businessId, session_id: sessionId, event_type: eventType, metadata,
    })
  } catch { /* never break user flow */ }
}

export const EventType = {
  REVIEW_PAGE_VIEWED: 'REVIEW_PAGE_VIEWED',
  RATING_SELECTED: 'RATING_SELECTED',
  QUESTION_ANSWERED: 'QUESTION_ANSWERED',
  SESSION_SUBMITTED: 'SESSION_SUBMITTED',
  AI_REVIEW_GENERATED: 'AI_REVIEW_GENERATED',
  REVIEW_COPIED: 'REVIEW_COPIED',
  GOOGLE_REVIEW_CLICKED: 'GOOGLE_REVIEW_CLICKED',
  ERROR: 'ERROR',
} as const

function filtersToQuery(filters: AnalyticsFilters) {
  let q = supabase.from("review_sessions").select("*");
  if (filters.businessId) q = q.eq("business_id", filters.businessId);
  return q;
}

export async function getDashboardMetrics(filters: AnalyticsFilters = {}): Promise<DashboardMetrics> {
  const q = filtersToQuery(filters);
  const { data, error } = await q;
  if (error || !data) return { totalBusinesses: 0, activeBusinesses: 0, totalSessions: 0, sessionsLast30Days: 0, averageRating: 0, aiReviewsGenerated: 0 };
  const sessions = data as { rating: number; ai_generated_review: string | null; created_at: string }[];
  const thirtyDaysAgo = Date.now() - 30 * 86400000;
  return {
    totalBusinesses: 0,
    activeBusinesses: 0,
    totalSessions: sessions.length,
    sessionsLast30Days: sessions.filter((s) => new Date(s.created_at).getTime() >= thirtyDaysAgo).length,
    averageRating: sessions.length > 0 ? sessions.reduce((sum, s) => sum + s.rating, 0) / sessions.length : 0,
    aiReviewsGenerated: sessions.filter((s) => s.ai_generated_review).length,
  };
}

export async function getRatingDistribution(filters: AnalyticsFilters = {}): Promise<RatingDistribution[]> {
  const { data, error } = await filtersToQuery(filters);
  if (error || !data) return [];
  const sessions = data as { rating: number }[];
  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  sessions.forEach((s) => { if (dist[s.rating] !== undefined) dist[s.rating]++; });
  return Object.entries(dist).map(([rating, count]) => ({ rating: Number(rating), count }));
}

export async function getSessionsOverTime(filters: AnalyticsFilters = {}, days = 30): Promise<SessionsOverTimePoint[]> {
  const { data, error } = await filtersToQuery(filters);
  if (error || !data) return [];
  const sessions = data as { created_at: string }[];
  const map: Record<string, number> = {};
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    map[d.toISOString().slice(0, 10)] = 0;
  }
  sessions.forEach((s) => {
    const day = new Date(s.created_at).toISOString().slice(0, 10);
    if (map[day] !== undefined) map[day]++;
  });
  return Object.entries(map).map(([date, count]) => ({ date, count }));
}

export async function getSentimentSplit(filters: AnalyticsFilters = {}): Promise<SentimentSplit> {
  const { data, error } = await filtersToQuery(filters);
  if (error || !data) return { positive: 0, neutral: 0, negative: 0 };
  const sessions = data as { rating: number }[];
  return {
    positive: sessions.filter((s) => s.rating >= 4).length,
    neutral: sessions.filter((s) => s.rating === 3).length,
    negative: sessions.filter((s) => s.rating <= 2).length,
  };
}

export async function getTopCategories(filters: AnalyticsFilters = {}, sentiment: "POSITIVE" | "NEGATIVE" = "POSITIVE"): Promise<CategoryCount[]> {
  const { data, error } = await filtersToQuery(filters);
  if (error || !data) return [];
  const sessions = data as { rating: number; answers: { selected: string[] }[] }[];
  const counts: Record<string, number> = {};
  const targetSessions = sentiment === "POSITIVE" ? sessions.filter((s) => s.rating >= 4) : sessions.filter((s) => s.rating <= 2);
  targetSessions.forEach((s) => {
    if (Array.isArray(s.answers)) {
      s.answers.forEach((a) => {
        if (a?.selected) a.selected.forEach((sel) => { counts[sel] = (counts[sel] || 0) + 1; });
      });
    }
  });
  return Object.entries(counts).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count).slice(0, 10);
}

export async function getEventCounts(filters: AnalyticsFilters = {}): Promise<{ copied: number; googleClicked: number }> {
  let q = supabase.from("analytics_events").select("*");
  if (filters.businessId) q = q.eq("business_id", filters.businessId);
  const { data, error } = await q;
  if (error || !data) return { copied: 0, googleClicked: 0 };
  const events = data as { event_type: string }[];
  return {
    copied: events.filter((e) => e.event_type === "REVIEW_COPIED").length,
    googleClicked: events.filter((e) => e.event_type === "GOOGLE_REVIEW_CLICKED").length,
  };
}

export async function getRecentEvents(businessId: string | null, limit = 10): Promise<unknown[]> {
  let q = supabase.from("analytics_events").select("*").order("created_at", { ascending: false }).limit(limit);
  if (businessId) q = q.eq("business_id", businessId);
  const { data, error } = await q;
  if (error || !data) return [];
  return data;
}
