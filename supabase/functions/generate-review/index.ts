import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  try {
    const { sessionId, rating, answers, businessId, businessName, regenerate } = await req.json();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    let bizName = businessName || "this business";
    if (!businessName && businessId) { try { const r = await fetch(`${supabaseUrl}/rest/v1/businesses?id=eq.${businessId}&select=name`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }); const b = await r.json(); if (b[0]?.name) bizName = b[0].name; } catch {} }
    const answerText = Array.isArray(answers) && answers.length > 0 ? answers.map((a: { answer: string }) => a.answer).join(", ") : "great service and a wonderful atmosphere";
    const variant = (regenerate || 0) % 3;
    const ratingText = rating >= 4 ? "amazing" : rating === 3 ? "good" : "poor";
    let review: string;
    if (rating >= 4) { review = [`I had an ${ratingText} experience at ${bizName}! ${answerText}. The staff was incredibly attentive and made sure everything was perfect. I would absolutely recommend this place to friends and family. Can't wait to come back!`, `What a fantastic visit to ${bizName}! ${answerText}. From the moment I walked in, I felt welcomed. The team went above and beyond. Highly recommend to anyone looking for a great experience!`, `Absolutely loved my time at ${bizName}. ${answerText}. The quality and service exceeded my expectations. This is now one of my favorite spots. Five stars well deserved!`][variant]; }
    else if (rating === 3) { review = [`My experience at ${bizName} was ${ratingText}. ${answerText}. There's some room for improvement, but the staff was friendly and I appreciate the effort. I'd consider giving it another try.`, `Decent visit to ${bizName}. ${answerText}. It was a solid experience with a few highlights. With some small tweaks, this could be really great.`, `Had an okay time at ${bizName}. ${answerText}. The service was decent and there were some good moments. Hope to see improvements on future visits.`][variant]; }
    else { review = [`Unfortunately, my experience at ${bizName} was ${ratingText}. ${answerText}. I hope management can look into these issues to improve future visits.`, `I had a disappointing visit to ${bizName}. ${answerText}. There were several areas that need attention. I hope they take this feedback constructively.`, `My visit to ${bizName} fell short of expectations. ${answerText}. I'm sharing this in hopes it helps them improve.`][variant]; }
    return new Response(JSON.stringify({ review, sessionId, regenerate: variant }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, review: "Thank you for your feedback! We appreciate you sharing your experience." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
