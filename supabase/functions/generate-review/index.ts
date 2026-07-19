import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const AI_TIMEOUT_MS = 25000;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { sessionId, rating, answers, businessId } = await req.json();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    const businessRes = await fetch(
      `${supabaseUrl}/rest/v1/businesses?id=eq.${businessId}&select=name,welcome_message,google_maps_url,primary_color,category`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" } }
    );
    const businesses = await businessRes.json();
    const business = businesses[0];

    const answerText = Array.isArray(answers) && answers.length > 0
      ? answers.map((a: unknown) => {
          if (typeof a === "string") return a;
          const obj = a as Record<string, unknown>;
          return (obj.answer || obj.text || obj.value || JSON.stringify(a)) as string;
        }).join("; ")
      : "";

    let review: string;
    let provider = "fallback";

    if (openaiKey) {
      try {
        const result = await generateWithOpenAI(
          openaiKey,
          business?.name || "this business",
          rating,
          answerText,
          business?.welcome_message || "",
          business?.category || ""
        );
        review = result.review;
        provider = result.provider;
      } catch (err) {
        console.error("AI provider error:", err.message);
        review = fallbackReview(business?.name || "this business", rating, answerText);
        provider = "fallback_after_error";
      }
    } else {
      review = fallbackReview(business?.name || "this business", rating, answerText);
    }

    return new Response(
      JSON.stringify({ review, sessionId, status: "completed", provider }),
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

async function generateWithOpenAI(
  apiKey: string,
  businessName: string,
  rating: number,
  answerText: string,
  welcomeMessage: string,
  category: string
): Promise<{ review: string; provider: string }> {
  const tone = rating >= 4 ? "positive and appreciative" : rating === 3 ? "balanced and fair" : "constructive but polite";
  const ratingWord = rating >= 5 ? "excellent" : rating === 4 ? "great" : rating === 3 ? "decent" : "disappointing";

  const systemPrompt = `You are a helpful assistant that writes natural, personalized Google reviews based on a customer's actual experience. Write in first person as the customer. Keep it concise (2-4 sentences, max 150 words). Use ONLY the details the customer provided — never invent menu items, employee names, specific dishes, prices, or events the customer didn't mention. Sound human and genuine, not robotic or generic. Match the tone to the rating. Vary your language — avoid repeating the same phrases across reviews. Do not start every review with "I had a great experience."`;

  const contextParts: string[] = [`Business: ${businessName}`];
  if (category) contextParts.push(`Category: ${category}`);
  contextParts.push(`Rating: ${rating} stars (${ratingWord} experience)`);
  contextParts.push(`Tone: ${tone}`);
  if (welcomeMessage) contextParts.push(`Business welcome message: ${welcomeMessage}`);
  if (answerText) {
    contextParts.push(`Customer's feedback highlights: ${answerText}`);
  } else {
    contextParts.push("No specific details provided — write a brief review based on the rating alone.");
  }

  const userPrompt = `${contextParts.join("\n")}

Write a natural, first-person Google review for this customer. Rules:
- Use only the details provided above — do not invent anything
- Sound like a real customer, not a marketing template
- Do not use generic filler like "highly recommend" unless the customer's feedback supports it
- Keep it 2-4 sentences
- Vary your opening — don't always start with "I had a great experience"`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.85,
        max_tokens: 200,
        presence_penalty: 0.6,
        frequency_penalty: 0.4,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("OpenAI API error:", res.status, errText);
      return { review: fallbackReview(businessName, rating, answerText), provider: "fallback_after_api_error" };
    }

    const data = await res.json();
    const generated = data.choices?.[0]?.message?.content?.trim();
    if (!generated || generated.length < 10) {
      return { review: fallbackReview(businessName, rating, answerText), provider: "fallback_after_empty" };
    }
    return { review: generated, provider: "openai" };
  } finally {
    clearTimeout(timeout);
  }
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
