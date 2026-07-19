import { supabase } from "./supabase";
import { uuid } from "./utils";
import type { ReviewSession } from "./types";

export async function createReviewSession(businessId: string, rating: number, answers: Record<string, unknown>): Promise<string> {
  const id = uuid();
  const { error } = await supabase.from("review_sessions").insert({
    id, business_id: businessId, rating, answers, ai_status: "pending",
  });
  if (error) throw error;
  return id;
}

export async function generateReview(sessionId: string): Promise<{ review: string | null; status: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke("generate-review", { body: { sessionId } });
  if (error) return { review: null, status: "error", error: error.message };
  if (!data) return { review: null, status: "error", error: "No response from edge function" };
  if (data.error) return { review: null, status: "error", error: data.error };
  return { review: data.review ?? null, status: data.status ?? "completed" };
}

export async function fetchReviewSession(id: string): Promise<ReviewSession | null> {
  const { data, error } = await supabase.from("review_sessions").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as ReviewSession | null;
}

export async function trackEvent(eventType: string, businessId?: string, sessionId?: string, metadata?: Record<string, unknown>): Promise<void> {
  await supabase.from("analytics_events").insert({
    event_type: eventType, business_id: businessId ?? null, session_id: sessionId ?? null, metadata: metadata ?? {},
  });
}
