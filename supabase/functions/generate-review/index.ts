import { createClient } from "npm:@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { sessionId } = await req.json();
    if (!sessionId) return new Response(JSON.stringify({ error: "sessionId is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: session, error: sessionErr } = await supabase.from("review_sessions").select("*").eq("id", sessionId).single();
    if (sessionErr || !session) return new Response(JSON.stringify({ error: "Session not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const rating = session.rating as number;
    const answers = (session.answers as Record<string, string>) || {};

    const { data: business } = await supabase.from("businesses").select("name, google_place_id, google_review_url, google_review_url_derived").eq("id", session.business_id).single();
    const businessName = (business as { name?: string })?.name || "this business";

    // Build google_review_url_derived if not already set
    const bizData = business as { google_place_id?: string; google_review_url?: string; google_review_url_derived?: string };
    let derivedUrl: string | null = bizData?.google_review_url || bizData?.google_review_url_derived || null;
    if (!derivedUrl && bizData?.google_place_id) {
      derivedUrl = `https://search.google.com/local/writereview?placeid=${bizData.google_place_id}`;
    }

    // Update the business with derived URL if it was missing
    if (derivedUrl && !bizData?.google_review_url_derived && bizData?.google_place_id) {
      await supabase.from("businesses").update({ google_review_url_derived: derivedUrl }).eq("id", session.business_id);
    }

    // Ensure google_place_id_snapshot is set on the session
    if (!session.google_place_id_snapshot && bizData?.google_place_id) {
      await supabase.from("review_sessions").update({ google_place_id_snapshot: bizData.google_place_id }).eq("id", sessionId);
    }

    const { data: questions } = await supabase.from("questions").select("id, question_text").eq("business_id", session.business_id);
    const questionMap = new Map<string, string>();
    for (const q of (questions as { id: string; question_text: string }[] || [])) questionMap.set(q.id, q.question_text);

    const answerParts: string[] = [];
    for (const [qId, ans] of Object.entries(answers)) {
      const qText = questionMap.get(qId);
      if (qText && ans) answerParts.push(`${qText}: ${ans}`);
    }

    let review = "";
    if (rating >= 4) {
      const openers = [`I had a fantastic experience at ${businessName}!`, `Absolutely loved my visit to ${businessName}.`, `${businessName} exceeded all my expectations.`, `What a wonderful experience at ${businessName}!`];
      review = openers[Math.floor(Math.random() * openers.length)];
      if (answerParts.length > 0) {
        const highlights = answerParts.slice(0, 2).map((a) => { const [q, ans] = a.split(": "); return ans && ans.length > 2 ? `The ${q.toLowerCase()} was outstanding — ${ans}.` : null; }).filter(Boolean);
        if (highlights.length > 0) review += " " + highlights.join(" ");
      }
      const closers = [`The staff was friendly and attentive, and the overall atmosphere was welcoming.`, `Everything was handled professionally and with great care.`, `I would definitely recommend ${businessName} to friends and family.`, `I'll be coming back for sure. Five stars well deserved!`];
      review += " " + closers[Math.floor(Math.random() * closers.length)];
      review += ` Overall, I'd rate my experience ${rating} out of 5 stars. Highly recommended!`;
    } else if (rating === 3) {
      review = `My experience at ${businessName} was decent but had room for improvement.`;
      if (answerParts.length > 0) { const parts = answerParts.slice(0, 2).map((a) => { const [q, ans] = a.split(": "); return ans && ans.length > 2 ? `Regarding ${q.toLowerCase()}, ${ans}.` : null; }).filter(Boolean); if (parts.length > 0) review += " " + parts.join(" "); }
      review += ` The service was okay, but I think a few things could be refined. I'd give it ${rating} out of 5 stars.`;
    } else {
      review = `I had some concerns about my visit to ${businessName}.`;
      if (answerParts.length > 0) { const parts = answerParts.slice(0, 2).map((a) => { const [q, ans] = a.split(": "); return ans && ans.length > 2 ? `Regarding ${q.toLowerCase()}, ${ans}.` : null; }).filter(Boolean); if (parts.length > 0) review += " " + parts.join(" "); }
      review += ` While I appreciate the effort, there are areas that need attention. I hope the team takes this feedback constructively. Rating: ${rating} out of 5 stars.`;
    }

    await supabase.from("review_sessions").update({
      ai_generated_review: review,
      ai_status: "completed",
      completed_at: new Date().toISOString(),
    }).eq("id", sessionId);

    return new Response(JSON.stringify({ review, sessionId, googleReviewUrl: derivedUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
