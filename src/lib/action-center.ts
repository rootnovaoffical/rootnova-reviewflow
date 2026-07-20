import { supabase } from "./supabase";

export interface ActionPriority {
  title: string;
  explanation: string;
  why_it_matters: string;
  recommended_action: string;
  priority_level: "critical" | "high" | "medium" | "low";
  confidence: "high" | "medium" | "low";
  evidence: {
    review_ids?: number[];
    summary?: string;
  };
}

export interface HealthSummary {
  overall: "improving" | "stable" | "needs_attention";
  sentiment: string;
  ratingMomentum: string;
  responseActivity: string;
  recurringComplaints: string;
  positiveTrends: string;
}

export interface ActionPrioritiesResponse {
  priorities: ActionPriority[];
  nextBestAction: string | null;
  healthSummary: HealthSummary | null;
  reviewCount?: number;
  analyzedAt?: string;
  message?: string;
  error?: string;
}

export async function fetchActionPriorities(
  businessId: string,
  reviews: { ai_generated_review: string | null; rating: number; created_at: string }[],
): Promise<ActionPrioritiesResponse> {
  try {
    const { data, error } = await supabase.functions.invoke("action-priorities", {
      body: { businessId, reviews },
    });

    if (error) {
      return { priorities: [], nextBestAction: null, healthSummary: null, error: error.message };
    }

    if (!data) {
      return { priorities: [], nextBestAction: null, healthSummary: null, error: "No response from action priorities service" };
    }

    return data as ActionPrioritiesResponse;
  } catch (e) {
    return {
      priorities: [],
      nextBestAction: null,
      healthSummary: null,
      error: e instanceof Error ? e.message : "Failed to analyze priorities",
    };
  }
}

export async function saveActionItems(
  businessId: string,
  priorities: ActionPriority[],
): Promise<{ error: string | null; savedCount: number }> {
  const rows = priorities.map((p) => ({
    business_id: businessId,
    title: p.title,
    explanation: p.explanation,
    why_it_matters: p.why_it_matters,
    recommended_action: p.recommended_action,
    priority_level: p.priority_level,
    confidence: p.confidence,
    evidence: p.evidence,
    status: "open",
  }));

  const { error } = await supabase.from("action_items").insert(rows);
  return { error: error?.message ?? null, savedCount: error ? 0 : rows.length };
}

export async function updateActionItemStatus(
  itemId: string,
  status: "open" | "in_progress" | "resolved" | "dismissed",
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("action_items")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", itemId);
  return { error: error?.message ?? null };
}

export async function updateActionItemNotes(
  itemId: string,
  notes: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("action_items")
    .update({ internal_notes: notes.trim() || null, updated_at: new Date().toISOString() })
    .eq("id", itemId);
  return { error: error?.message ?? null };
}
