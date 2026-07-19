// Review sessions service.

import { supabase } from "./supabase";
import type { ReviewSession } from "../types";

export async function listSessions(
  businessId?: string | null,
  limit = 100,
): Promise<ReviewSession[]> {
  let q = supabase
    .from("review_sessions")
    .select("*,businesses:business_id(name,slug)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (businessId) q = q.eq("business_id", businessId);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as ReviewSession[];
}

export async function getSession(id: string): Promise<ReviewSession | null> {
  const { data, error } = await supabase
    .from("review_sessions")
    .select("*,businesses:business_id(name,slug)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as ReviewSession) || null;
}
