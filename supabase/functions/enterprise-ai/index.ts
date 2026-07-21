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
    const { orgId, dashboardData } = await req.json();

    if (!orgId || !dashboardData) {
      return new Response(
        JSON.stringify({ error: "orgId and dashboardData are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiKey = Deno.env.get("XAI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "AI service is not configured. Missing XAI_API_KEY secret." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const systemPrompt = `You are an enterprise intelligence analyst for a multi-location business platform. You analyze REAL cross-location data and extract actionable insights. You NEVER fabricate data. Every recommendation must be grounded in the provided metrics.

You must respond with a JSON object matching this exact structure:
{
  "insights": [
    {
      "type": "performance_gap|risk|opportunity|trend|benchmark",
      "title": "Short title",
      "description": "2-3 sentence plain-English explanation",
      "evidence": ["Specific data points that support this insight"],
      "confidence": 0.0-1.0,
      "severity": "info|warning|critical|positive",
      "recommended_action": "Concrete next step",
      "affected_branches": ["Branch names affected"]
    }
  ]
}

Rules:
- Every insight must reference actual data from the provided metrics.
- If there is not enough data, return an empty insights array.
- Be specific about which branches are affected.
- Focus on cross-location patterns, not single-branch issues.
- Do not include any text outside the JSON object.`;

    const userPrompt = `Analyze this enterprise dashboard data for organization ${orgId}:

Total Branches: ${dashboardData.total_branches}
Active Branches: ${dashboardData.active_branches}
Total Regions: ${dashboardData.total_regions}
Total Managers: ${dashboardData.total_managers}
Total Reviews: ${dashboardData.total_reviews}
Average Rating: ${dashboardData.avg_rating?.toFixed(2) ?? 0}
Total Customers: ${dashboardData.total_customers}
Total Campaigns: ${dashboardData.total_campaigns}
Response Rate: ${dashboardData.response_rate?.toFixed(1) ?? 0}%

Top Performers:
${JSON.stringify(dashboardData.top_performers ?? [], null, 2)}

Lowest Performers:
${JSON.stringify(dashboardData.low_performers ?? [], null, 2)}

Regional Breakdown:
${JSON.stringify(dashboardData.regional_breakdown ?? [], null, 2)}

Recent Events:
${JSON.stringify((dashboardData.recent_events ?? []).map((e: any) => ({ title: e.title, type: e.event_type, severity: e.severity })), null, 2)}

Extract enterprise-level insights based ONLY on the data above. Return the JSON object as specified.`;

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
        JSON.stringify({ error: "AI analysis service returned an error." }),
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

    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch {
      return new Response(
        JSON.stringify({ error: "AI analysis returned an unparseable response." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        insights: parsed.insights ?? [],
        analyzedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    console.error("enterprise-ai error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
