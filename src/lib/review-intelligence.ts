import { supabase } from "./supabase";

export interface ReviewInsights {
  sentimentSummary: string;
  whatCustomersLove: string[];
  commonComplaints: string[];
  recurringThemes: string[];
  emergingIssues: string[];
  positiveTrends: string[];
  suggestedActions: string[];
  priorityAreas: string[];
}

export interface IntelligenceResponse {
  insights: ReviewInsights | null;
  message?: string;
  reviewCount?: number;
  analyzedAt?: string;
  error?: string;
}

export async function fetchReviewIntelligence(
  businessId: string,
  reviews: { ai_generated_review: string | null; rating: number; created_at: string }[],
): Promise<IntelligenceResponse> {
  try {
    const { data, error } = await supabase.functions.invoke("review-intelligence", {
      body: { businessId, reviews },
    });

    if (error) {
      return { insights: null, error: error.message };
    }

    if (!data) {
      return { insights: null, error: "No response from intelligence service" };
    }

    return data as IntelligenceResponse;
  } catch (e) {
    return {
      insights: null,
      error: e instanceof Error ? e.message : "Failed to analyze reviews",
    };
  }
}

export interface ReviewResponseUpdate {
  id: string;
  business_response: string;
}

export async function updateReviewResponse(
  reviewId: string,
  response: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("review_sessions")
    .update({
      business_response: response.trim() || null,
      business_response_at: response.trim() ? new Date().toISOString() : null,
    })
    .eq("id", reviewId);

  return { error: error?.message ?? null };
}
