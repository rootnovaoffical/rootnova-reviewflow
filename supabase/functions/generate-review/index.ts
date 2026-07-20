import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import OpenAI from "npm:openai@4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const AI_TIMEOUT_MS = 25000;
const GROQ_MODEL = "llama-3.3-70b-versatile";
const MAX_REGEN_RETRIES = 2;
const SIMILARITY_THRESHOLD = 0.82;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const {
      sessionId,
      rating,
      answers,
      businessId,
      regenerationAttempt = 0,
      requestId = null,
      previousReview = null,
    } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const groqKey = Deno.env.get("GROQ_API_KEY");

    const businessRes = await fetch(
      `${supabaseUrl}/rest/v1/businesses?id=eq.${businessId}&select=name,welcome_message,google_maps_url,primary_color`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" } }
    );
    const businesses = await businessRes.json();
    const business = businesses[0];

    const structuredAnswers = Array.isArray(answers) && answers.length > 0
      ? answers.map((a: unknown) => {
          if (typeof a === "string") return { answer: a };
          const obj = a as Record<string, unknown>;
          const question = (obj.question as string) || "";
          const answer = (obj.answer || obj.text || obj.value || JSON.stringify(a)) as string;
          return { question, answer };
        })
      : [];
    const answerText = structuredAnswers.map((a) => a.question ? `${a.question}: ${a.answer}` : a.answer).join("; ");

    let review: string;
    let provider = "fallback";
    let rejectedAsDuplicate = 0;

    if (groqKey) {
      try {
        const result = await generateWithGroq(
          groqKey,
          business?.name || "this business",
          rating,
          answerText,
          business?.welcome_message || "",
          regenerationAttempt,
          previousReview,
        );
        review = result.review;
        provider = result.provider;
        rejectedAsDuplicate = result.rejectedAsDuplicate;
      } catch (err) {
        console.error("AI provider error:", err.message);
        review = fallbackReview(business?.name || "this business", rating, answerText);
        provider = "fallback_after_error";
      }
    } else {
      console.error("GROQ_API_KEY not set — using fallback");
      review = fallbackReview(business?.name || "this business", rating, answerText);
    }

    if (sessionId) {
      try {
        await fetch(`${supabaseUrl}/rest/v1/review_sessions?id=eq.${sessionId}`, {
          method: "PATCH",
          headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json", Prefer: "return=minimal" },
          body: JSON.stringify({ ai_generated_review: review, ai_status: "completed", completed_at: new Date().toISOString() }),
        });
      } catch (saveErr) {
        console.error("Failed to save review session:", saveErr.message);
      }
    }

    return new Response(
      JSON.stringify({
        review,
        sessionId,
        status: "completed",
        provider,
        requestId,
        regenerationAttempt,
        rejectedAsDuplicate,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err.message,
        review: "Thank you for sharing your feedback! We appreciate you taking the time.",
        status: "completed",
        provider: "fallback_after_error",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function generateWithGroq(
  apiKey: string,
  businessName: string,
  rating: number,
  answerText: string,
  welcomeMessage: string,
  regenerationAttempt: number,
  previousReview: string | null,
): Promise<{ review: string; provider: string; rejectedAsDuplicate: number }> {
  const tone = rating >= 4 ? "positive and appreciative" : rating === 3 ? "balanced and fair" : "constructive but polite";
  const ratingWord = rating >= 5 ? "excellent" : rating === 4 ? "great" : rating === 3 ? "decent" : "disappointing";

  const isRegeneration = regenerationAttempt > 0 && previousReview;

  const systemPrompt = `You are a skilled writer who crafts natural, personalized Google reviews based on a customer's structured feedback. You treat each selected answer as an experience signal — not a checklist to repeat verbatim.

Rules:
- Write in first person as the customer.
- Sound like a real person, not a marketing template.
- Use ONLY the details the customer provided. Never invent menu items, employee names, specific dishes, prices, or events.
- Vary sentence structure and vocabulary. Never start two reviews the same way.
- Match the rating's tone: 5 stars = enthusiastic, 4 = warm/satisfied, 3 = balanced/mixed, 2 = disappointed, 1 = upset but dignified.
- Avoid generic filler ("highly recommend", "will definitely return") unless the customer's signals support it.
- Do not list the answers back. Weave them into a flowing narrative.
- Keep it 2-4 sentences, max 150 words, suitable for Google Reviews.
- If the customer selected "Exceptional" or "Worth Recommending", the review may express enthusiasm naturally.
- If the customer selected "Good" (3-star range), keep it honest and measured — do not fake enthusiasm.`;

  const signalList = answerText
    ? answerText.split("; ").filter(Boolean).map((a, i) => `Signal ${i + 1}: ${a}`).join("\n")
    : "No specific details provided — write a brief review based on the rating alone.";

  let userPrompt = `Business: ${businessName}
Rating: ${rating} stars (${ratingWord})
Tone: ${tone}

Customer experience signals:
${signalList}

Write a natural, first-person Google review reflecting these signals. Do not repeat the signals as a list. Vary your opening. Sound human.`;

  if (isRegeneration) {
    const attemptLevel = Math.min(regenerationAttempt, 3);
    const intensity = attemptLevel >= 3 ? "strongly" : attemptLevel === 2 ? "substantially" : "clearly";
    userPrompt = `This is a regeneration request (attempt #${regenerationAttempt}). The customer experience signals are unchanged, but the generated review MUST be ${intensity} different from the previous review. Do not reuse the previous wording, sentence structure, opening, or narrative pattern.

Business: ${businessName}
Rating: ${rating} stars (${ratingWord})
Tone: ${tone}

Customer experience signals (unchanged):
${signalList}

Previous review (for comparison reference ONLY — do NOT copy, paraphrase, or reuse its structure):
"""
${previousReview}
"""

Write a COMPLETELY DIFFERENT natural, first-person Google review reflecting the SAME signals. You MUST:
- Use a different opening sentence and structure.
- Rearrange the narrative order of the signals.
- Use different vocabulary and emotional expression.
- Vary the review length within the 2-4 sentence range.
- Weave the customer's answers in a new way.
Do NOT merely replace a few words. Produce a genuinely fresh alternative.`;
  }

  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.groq.com/openai/v1",
    timeout: AI_TIMEOUT_MS,
    maxRetries: 0,
  });

  let rejectedAsDuplicate = 0;

  for (let attempt = 0; attempt <= MAX_REGEN_RETRIES; attempt++) {
    const tempBoost = isRegeneration ? 0.85 + Math.min(attempt * 0.05, 0.15) : 0.85;
    const presenceBoost = isRegeneration ? 0.6 + Math.min(attempt * 0.2, 0.6) : 0.6;
    const freqBoost = isRegeneration ? 0.4 + Math.min(attempt * 0.2, 0.6) : 0.4;

    try {
      const completion = await client.chat.completions.create({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt + (attempt > 0 ? `\n\nVariation nonce: ${crypto.randomUUID()}. Produce yet another distinct version.` : "") },
        ],
        temperature: tempBoost,
        max_tokens: 200,
        presence_penalty: presenceBoost,
        frequency_penalty: freqBoost,
      });

      const generated = completion.choices[0]?.message?.content?.trim();
      if (!generated || generated.length < 10) {
        return { review: fallbackReview(businessName, rating, answerText), provider: "fallback_after_empty", rejectedAsDuplicate };
      }

      if (isRegeneration && previousReview && isTooSimilar(generated, previousReview)) {
        rejectedAsDuplicate++;
        if (attempt < MAX_REGEN_RETRIES) {
          console.log(`Regeneration attempt ${attempt + 1} rejected as too similar (similarity > ${SIMILARITY_THRESHOLD})`);
          continue;
        }
        console.log("Max retries reached — accepting last generation despite similarity");
      }

      return { review: generated, provider: "groq", rejectedAsDuplicate };
    } catch (err) {
      console.error("Groq API error:", err.message);
      return { review: fallbackReview(businessName, rating, answerText), provider: "fallback_after_api_error", rejectedAsDuplicate };
    }
  }

  return { review: fallbackReview(businessName, rating, answerText), provider: "fallback_after_retries", rejectedAsDuplicate };
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

function isTooSimilar(a: string, b: string): boolean {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (na === nb) return true;
  const wordsA = new Set(na.split(" "));
  const wordsB = new Set(nb.split(" "));
  if (wordsA.size === 0 || wordsB.size === 0) return false;
  let intersection = 0;
  for (const w of wordsA) if (wordsB.has(w)) intersection++;
  const union = wordsA.size + wordsB.size - intersection;
  const jaccard = intersection / union;
  return jaccard > SIMILARITY_THRESHOLD;
}

function fallbackReview(businessName: string, rating: number, answerText: string): string {
  const ratingWord = rating >= 5 ? "wonderful" : rating === 4 ? "great" : rating === 3 ? "decent" : "disappointing";
  if (answerText) {
    return rating >= 4
      ? `I had a ${ratingWord} time at ${businessName}. ${answerText}. I'd definitely come back.`
      : `My visit to ${businessName} was ${ratingWord}. ${answerText}. I hope they can address these points.`;
  }
  return `I had a ${ratingWord} experience at ${businessName}. ${rating >= 4 ? "I'd recommend giving it a try." : rating === 3 ? "It was okay overall." : "I hope things improve."}`;
}
