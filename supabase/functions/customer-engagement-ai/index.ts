import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { task } = body;

    const apiKey = Deno.env.get("XAI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "AI service is not configured. Missing XAI_API_KEY secret." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (task === "write_followup") {
      return await handleFollowUpWriter(body, apiKey);
    } else if (task === "customer_insights") {
      return await handleCustomerInsights(body, apiKey);
    }

    return new Response(
      JSON.stringify({ error: "Unknown task. Use 'write_followup' or 'customer_insights'." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("customer-engagement-ai error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

// =========================================================
// FOLLOW-UP WRITER
// =========================================================

async function handleFollowUpWriter(body: any, apiKey: string): Promise<Response> {
  const { businessName, messageType, customerName, rating, reviewText, businessContext } = body;

  if (!businessName || !messageType) {
    return new Response(
      JSON.stringify({ error: "businessName and messageType are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const messageTypeMeta: Record<string, { label: string; description: string }> = {
    thank_you: { label: "Thank You", description: "a heartfelt thank-you message to a happy customer" },
    recovery: { label: "Recovery", description: "a sincere service recovery message to an unhappy customer" },
    discount: { label: "Discount", description: "a friendly discount offer message" },
    reminder: { label: "Reminder", description: "a gentle reminder message to visit again" },
    festival: { label: "Festival Greeting", description: "a warm festival greeting" },
    birthday: { label: "Birthday Wish", description: "a personal birthday wish with a special offer" },
    visit_again: { label: "Visit Again", description: "a warm invitation to visit again" },
  };

  const meta = messageTypeMeta[messageType];
  if (!meta) {
    return new Response(
      JSON.stringify({ error: "Invalid messageType" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const systemPrompt = `You are a warm, professional customer relationship assistant for a business called "${businessName}". You write ${meta.description}.

Rules:
- Be genuine, warm, and human — never robotic or spammy.
- Keep messages concise (2-4 sentences for body).
- Use the customer's name if provided, otherwise use a friendly generic greeting.
- Never make up facts about the customer or business that aren't provided.
- If reviewText is provided, acknowledge their specific feedback naturally.
- Be respectful of the customer's time. No pressure or urgency.
- Return JSON only, no other text.

Return a JSON object with this exact structure:
{
  "messages": [
    {
      "subject": "Short subject line (3-6 words)",
      "body": "The full message body (2-4 sentences)",
      "tone": "warm" | "professional" | "celebratory" | "apologetic"
    }
  ]
}

Generate exactly 2 message variants with slightly different tones.`;

  const contextParts: string[] = [`Business: ${businessName}`];
  if (customerName) contextParts.push(`Customer name: ${customerName}`);
  if (rating !== undefined && rating !== null) contextParts.push(`Customer rating: ${rating}/5`);
  if (reviewText) contextParts.push(`Customer review: "${reviewText}"`);
  if (businessContext) contextParts.push(`Business context: ${businessContext}`);

  const userPrompt = `Write ${meta.label} message(s) for the following context:\n\n${contextParts.join("\n")}`;

  return await callGroq(apiKey, systemPrompt, userPrompt, 1000, 0.7);
}

// =========================================================
// CUSTOMER INSIGHTS
// =========================================================

async function handleCustomerInsights(body: any, apiKey: string): Promise<Response> {
  const { businessId, customers, reviews } = body;

  if (!businessId || !Array.isArray(customers) || !Array.isArray(reviews)) {
    return new Response(
      JSON.stringify({ error: "businessId, customers, and reviews arrays are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (customers.length === 0 && reviews.length === 0) {
    return new Response(
      JSON.stringify({ insights: [], message: "Not enough customer data yet for reliable insights." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  }

  const customerSummary = customers.slice(0, 100).map((c: any, i: number) => ({
    id: i + 1,
    name: c.display_name || "Anonymous",
    visits: c.total_visits,
    reviews: c.total_reviews,
    avg_rating: c.avg_rating,
    segment: c.segment,
    last_visit: c.last_visit_at?.slice(0, 10) || "never",
  }));

  const reviewSummary = reviews
    .filter((r: any) => r.ai_generated_review && r.ai_generated_review.trim().length > 0)
    .slice(0, 30)
    .map((r: any, i: number) => ({
      id: i + 1,
      rating: r.rating,
      review: r.ai_generated_review?.slice(0, 200),
      date: r.created_at?.slice(0, 10) || "unknown",
    }));

  const systemPrompt = `You are a customer relationship intelligence analyst. You analyze REAL customer data and produce structured, actionable insights.

You NEVER fabricate data. You only identify patterns clearly present in the provided data. If there is insufficient data, return an empty insights array.

Return a JSON object with this exact structure:
{
  "insights": [
    {
      "title": "Short title (5-10 words)",
      "insight": "1-2 sentence plain-English description of what is happening",
      "recommendation": "1 concrete, actionable recommendation",
      "confidence": "high" | "medium" | "low",
      "customer_ids": [1, 3, 5]
    }
  ]
}

Rules:
- Generate 1-5 insights maximum — only include insights you are confident about.
- Use plain language a small business owner would understand.
- Be specific and practical, not generic.
- customer_ids should reference the customer IDs from the provided data.
- If there are no clear insights, return an empty array.
- Do not include any text outside the JSON object.`;

  const userPrompt = `Analyze these customers and reviews for business ${businessId}:

CUSTOMERS (${customerSummary.length}):
${JSON.stringify(customerSummary, null, 2)}

REVIEWS WITH CONTENT (${reviewSummary.length}):
${JSON.stringify(reviewSummary, null, 2)}

Base your analysis ONLY on the data above. Return the JSON object as specified.`;

  return await callGroq(apiKey, systemPrompt, userPrompt, 1500, 0.4);
}

// =========================================================
// SHARED GROQ CALL
// =========================================================

async function callGroq(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  temperature: number,
): Promise<Response> {
  const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      stream: false,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!groqResponse.ok) {
    const errText = await groqResponse.text();
    console.error("Groq API error:", errText);
    return new Response(
      JSON.stringify({ error: "AI service returned an error. Please try again." }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const groqData = await groqResponse.json();
  const content = groqData?.choices?.[0]?.message?.content;

  if (!content) {
    return new Response(
      JSON.stringify({ error: "AI returned no content." }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let result;
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    result = JSON.parse(jsonMatch ? jsonMatch[0] : content);
  } catch {
    return new Response(
      JSON.stringify({ error: "AI returned an unparseable response. Please try again." }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify(result),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
  );
}
