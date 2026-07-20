import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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

    if (reviewsWithContent.length === 0) {
      return new Response(
        JSON.stringify({
          insights: null,
          message: "No reviews with generated content available for analysis.",
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

    const systemPrompt = `You are a review intelligence analyst for a business platform. You analyze REAL customer review data and extract actionable insights. You NEVER fabricate reviews or customer feedback. You only report patterns that are clearly present in the provided data. If there is not enough data to identify a pattern, say so honestly.

You must respond with a JSON object matching this exact structure:
{
  "sentimentSummary": "A 2-3 sentence plain-English summary of overall customer sentiment",
  "whatCustomersLove": ["2-4 specific things customers frequently praise — only if clearly present in the data"],
  "commonComplaints": ["2-4 specific recurring issues — only if clearly present in the data, empty array if none"],
  "recurringThemes": ["3-6 themes/topics that appear across multiple reviews"],
  "emergingIssues": ["Any recent issues that appear to be trending — empty array if none identified"],
  "positiveTrends": ["Any positive patterns or improvements noted — empty array if none"],
  "suggestedActions": ["3-5 concrete, actionable recommendations for the business owner"],
  "priorityAreas": ["1-3 areas that need the most immediate attention based on the data"]
}

Rules:
- Every item must be grounded in the actual review text provided.
- Use plain, non-technical language a small business owner would understand.
- Be specific and practical, not generic.
- If a category has no clear data, return an empty array for that field.
- Do not include any text outside the JSON object.`;

    const userPrompt = `Analyze these ${reviewSummaries.length} customer reviews for business ${businessId}:

${JSON.stringify(reviewSummaries, null, 2)}

Extract actionable intelligence based ONLY on the review content above. Return the JSON object as specified.`;

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
        max_tokens: 1500,
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

    let insights;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      insights = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch {
      return new Response(
        JSON.stringify({ error: "AI analysis returned an unparseable response. Please try again." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        insights,
        reviewCount: reviewsWithContent.length,
        analyzedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    console.error("review-intelligence error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
