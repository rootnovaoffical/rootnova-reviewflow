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
    const { businessId, reviews } = await req.json();

    if (!businessId || !Array.isArray(reviews)) {
      return new Response(
        JSON.stringify({ error: "businessId and reviews array are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const reviewsWithContent = reviews.filter(
      (r: any) => r.ai_generated_review && r.ai_generated_review.trim().length > 0,
    );

    if (reviewsWithContent.length < 3) {
      return new Response(
        JSON.stringify({
          priorities: [],
          message: "Not enough reviews with generated content for reliable analysis. At least 3 reviews with AI-generated content are needed.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    const apiKey = Deno.env.get("XAI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "AI service is not configured. Missing XAI_API_KEY secret." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const reviewSummaries = reviewsWithContent.slice(0, 50).map((r: any, i: number) => ({
      id: i + 1,
      rating: r.rating,
      review: r.ai_generated_review,
      date: r.created_at?.slice(0, 10) || "unknown",
    }));

    const systemPrompt = `You are a business intelligence analyst for a review management platform. You analyze REAL customer review data and produce structured, actionable business priorities.

You NEVER fabricate reviews or customer feedback. You only identify patterns clearly present in the provided data. If there is not enough data to identify a pattern, return an empty priorities array.

You must respond with a JSON object matching this exact structure:
{
  "priorities": [
    {
      "title": "Short, clear title (5-10 words)",
      "explanation": "1-2 sentence plain-English explanation of what is happening",
      "why_it_matters": "1-2 sentences explaining the business impact",
      "recommended_action": "1 concrete, actionable recommendation the business owner can take",
      "priority_level": "critical" | "high" | "medium" | "low",
      "confidence": "high" | "medium" | "low",
      "evidence": {
        "review_ids": [1, 3, 5],
        "summary": "Brief description of the evidence from reviews"
      }
    }
  ],
  "nextBestAction": "The single most important recommended action for this business right now, in one sentence",
  "healthSummary": {
    "overall": "improving" | "stable" | "needs_attention",
    "sentiment": "1-2 sentence summary of customer sentiment",
    "ratingMomentum": "1 sentence about rating trend",
    "responseActivity": "1 sentence about response activity",
    "recurringComplaints": "1 sentence about recurring complaints or 'No significant recurring complaints identified'",
    "positiveTrends": "1 sentence about positive trends or 'No significant positive trends identified'"
  }
}

Rules:
- Every priority must be grounded in the actual review text provided.
- Use plain, non-technical language a small business owner would understand.
- Be specific and practical, not generic.
- Generate 1-5 priorities maximum — only include priorities you are confident about.
- Priority levels: critical = needs immediate action, high = important soon, medium = worth addressing, low = minor improvement.
- Confidence: high = strong evidence across multiple reviews, medium = moderate evidence, low = limited evidence.
- evidence.review_ids should reference the review IDs from the provided data.
- If there are no clear priorities, return an empty array.
- Do not include any text outside the JSON object.`;

    const userPrompt = `Analyze these ${reviewSummaries.length} customer reviews for business ${businessId} and produce actionable business priorities:

${JSON.stringify(reviewSummaries, null, 2)}

Base your analysis ONLY on the review content above. Return the JSON object as specified.`;

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
        temperature: 0.4,
        max_tokens: 2000,
      }),
    });

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      console.error("Groq API error:", errText);
      return new Response(
        JSON.stringify({ error: "AI analysis service returned an error. Please try again." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const groqData = await groqResponse.json();
    const content = groqData?.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "AI analysis returned no content." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch {
      return new Response(
        JSON.stringify({ error: "AI analysis returned an unparseable response. Please try again." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        priorities: result.priorities || [],
        nextBestAction: result.nextBestAction || null,
        healthSummary: result.healthSummary || null,
        reviewCount: reviewsWithContent.length,
        analyzedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    console.error("action-priorities error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
