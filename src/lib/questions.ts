// Questions service.

import { supabase } from "./supabase";
import type { Question, FlowType } from "../types";

export async function listQuestions(businessId: string, activeOnly = false): Promise<Question[]> {
  let q = supabase
    .from("questions")
    .select("*")
    .eq("business_id", businessId)
    .order("sort_order", { ascending: true });
  if (activeOnly) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as Question[];
}

export async function listPublicQuestions(businessId: string): Promise<Question[]> {
  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data || []) as Question[];
}

export type QuestionInput = {
  question_text: string;
  flow_type: FlowType;
  options: string[];
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
};

export async function createQuestion(businessId: string, input: QuestionInput): Promise<Question> {
  const { data, error } = await supabase
    .from("questions")
    .insert({ ...input, business_id: businessId })
    .select("*")
    .single();
  if (error) throw error;
  return data as Question;
}

export async function updateQuestion(id: string, patch: Partial<QuestionInput>): Promise<Question> {
  const { data, error } = await supabase
    .from("questions")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Question;
}

export async function deleteQuestion(id: string): Promise<void> {
  const { error } = await supabase.from("questions").delete().eq("id", id);
  if (error) throw error;
}

export async function reorderQuestions(_businessId: string, orderedIds: string[]): Promise<void> {
  const updates = orderedIds.map((id, idx) => ({ id, sort_order: idx }));
  const { error } = await supabase
    .from("questions")
    .upsert(updates, { onConflict: "id" });
  if (error) throw error;
}
