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

    const businessRes = await fetch(`${supabaseUrl}/rest/v1/businesses?id=eq.${businessId}&select=name,welcome_message`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
    });
    const businesses = await businessRes.json();
    const business = businesses[0];

    const ratingText = rating >= 4 ? "excellent" : rating === 3 ? "good" : "poor";
    const answerText = Array.isArray(answers) && answers.length > 0
      ? answers.map((a: any) => a.answer).join(", ")
      : "No specific feedback provided";

    const review = rating >= 4
      ? `I had an ${ratingText} experience at ${business?.name || "this business"}. ${answerText}. The service was attentive and I would definitely recommend it to others. Thank you for the wonderful experience!`
      : rating === 3
      ? `My experience at ${business?.name || "this business"} was ${ratingText}. ${answerText}. There is room for improvement but the staff was friendly.`
      : `I had a ${ratingText} experience at ${business?.name || "this business"}. ${answerText}. I hope management can address these issues.`;

    return new Response(JSON.stringify({ review, sessionId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, review: "Thank you for your feedback!" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
