import { supabase } from "./supabase";

export interface GroqChoice {
  index: number;
  message: { role: string; content: string };
  finish_reason: string;
}

export interface GroqResponse {
  id: string;
  choices: GroqChoice[];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  error?: { message: string };
}

/**
 * Sends a message to the Groq API via Supabase Edge Functions.
 */
export async function askGroq(userMessage: string): Promise<GroqResponse> {
  const { data, error } = await supabase.functions.invoke("groq-chat", {
    body: { prompt: userMessage },
  });
  if (error) {
    console.error("Groq Edge Function Error:", error);
    throw error;
  }
  return data as GroqResponse;
}
