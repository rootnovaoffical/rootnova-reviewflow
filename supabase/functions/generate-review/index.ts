import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { sessionId, rating, answers, businessId } = await req.json();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    const businessRes = await fetch(`${supabaseUrl}/rest/v1/businesses?id=eq.${businessId}&select=name,welcome_message,google_maps_url`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
    });
    const businesses = await businessRes.json();
    const business = businesses[0];

    const answerText = Array.isArray(answers) && answers.length > 0
      ? answers.map((a: any) => typeof a === "string" ? a : (a.answer || a.text || JSON.stringify(a))).join("; ")
      : "";

    let review: string;

    if (openaiKey) {
      review = await generateWithOpenAI(openaiKey, business?.name || "this business", rating, answerText, business?.welcome_message || "");
    } else {
      review = fallbackReview(business?.name || "this business", rating, answerText);
    }

    return new Response(JSON.stringify({ review, sessionId, status: "completed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, review: "Thank you for sharing your feedback!", status: "completed" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function generateWithOpenAI(apiKey: string, businessName: string, rating: number, answerText: string, welcomeMessage: string): Promise<string> {
  const tone = rating >= 4 ? "positive and appreciative" : rating === 3 ? "balanced and fair" : "constructive but polite";
  const ratingWord = rating >= 4 ? "great" : rating === 3 ? "okay" : "disappointing";

  const systemPrompt = `You are a helpful assistant that writes natural, personalized Google reviews based on a customer's actual experience. Write in first person as the customer. Keep it concise (2-4 sentences). Use only the details provided — never invent menu items, employee names, specific dishes, or events the customer didn't mention. Sound human and genuine, not robotic or generic. Match the tone to the rating.`;

  const userPrompt = `Business: ${businessName}
Rating: ${rating} stars (${ratingWord} experience)
Tone: ${tone}
${welcomeMessage ? `Business welcome message: ${welcomeMessage}` : ""}
${answerText ? `Customer's feedback highlights: ${answerText}` : "No specific details provided — write a brief review based on the rating alone."}

Write a natural Google review for this customer. Do not use generic filler like "highly recommend" unless the customer's feedback supports it. Do not invent details.`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 200,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("OpenAI error:", errText);
    return fallbackReview(businessName, rating, answerText);
  }

  const data = await res.json();
  const generated = data.choices?.[0]?.message?.content?.trim();
  if (!generated) return fallbackReview(businessName, rating, answerText);
  return generated;
}

function fallbackReview(businessName: string, rating: number, answerText: string): string {
  const ratingWord = rating >= 4 ? "great" : rating === 3 ? "decent" : "disappointing";
  if (answerText) {
    return rating >= 4
      ? `I had a ${ratingWord} experience at ${businessName}. ${answerText}. I'd come back again.`
      : `My visit to ${businessName} was ${ratingWord}. ${answerText}. I hope they can improve on these points.`;
  }
  return `I had a ${ratingWord} experience at ${businessName}. ${rating >= 4 ? "I'd recommend it." : rating === 3 ? "It was okay overall." : "I hope things improve."}`;
}
