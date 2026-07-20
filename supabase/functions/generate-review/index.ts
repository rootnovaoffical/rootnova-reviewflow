import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();
    if (!sessionId) {
      return new Response(JSON.stringify({ error: "sessionId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: session, error: sessError } = await supabase
      .from("review_sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessError || !session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("review_sessions")
      .update({ ai_status: "generating" })
      .eq("id", sessionId);

    const { data: business } = await supabase
      .from("businesses")
      .select("name, primary_color, secondary_color")
      .eq("id", session.business_id)
      .maybeSingle();

    const answers = session.answers as Array<{
      question_text: string;
      answer: string;
    }>;

    const rating = session.rating;
    const businessName = business?.name || "this business";

    const reviewText = buildReview(rating, answers, businessName);

    const { error: updateError } = await supabase
      .from("review_sessions")
      .update({
        ai_generated_review: reviewText,
        ai_status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (updateError) {
      return new Response(JSON.stringify({ error: "Failed to save review" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ review: reviewText, sessionId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function buildReview(
  rating: number,
  answers: Array<{ question_text: string; answer: string }>,
  businessName: string
): string {
  const isPositive = rating >= 4;
  const ratingWord =
    rating === 5 ? "exceptional"
    : rating === 4 ? "great"
    : rating === 3 ? "decent"
    : rating === 2 ? "disappointing"
    : "poor";

  let review = `I had a ${ratingWord} experience at ${businessName}. `;

  if (isPositive) {
    review += `From the moment I walked in, everything felt welcoming and well-organized. `;
  } else {
    review += `While there's definitely room for improvement, I appreciate the effort the team put in. `;
  }

  for (const a of answers) {
    const q = a.question_text.toLowerCase();
    const ans = a.answer;

    if (q.includes("service") || q.includes("staff") || q.includes("friendly")) {
      review += `The service was ${ans.toLowerCase()}, and it really shaped my overall impression. `;
    } else if (q.includes("clean") || q.includes("atmosphere") || q.includes("environment")) {
      review += `The atmosphere was ${ans.toLowerCase()}, which added to the experience. `;
    } else if (q.includes("speed") || q.includes("fast") || q.includes("wait")) {
      review += `In terms of timing, things felt ${ans.toLowerCase()}. `;
    } else if (q.includes("quality") || q.includes("product") || q.includes("food")) {
      review += `The quality of what I received was ${ans.toLowerCase()}. `;
    } else if (q.includes("price") || q.includes("value") || q.includes("cost")) {
      review += `For the price, I'd say it was ${ans.toLowerCase()}. `;
    } else if (q.includes("recommend") || q.includes("return") || q.includes("again")) {
      review += `When it comes to whether I'd return: ${ans.toLowerCase()}. `;
    } else {
      review += `Regarding "${a.question_text}", I'd say ${ans.toLowerCase()}. `;
    }
  }

  if (isPositive) {
    review += `I'd happily recommend ${businessName} to friends and family looking for a reliable, quality experience. `;
  } else if (rating === 3) {
    review += `With a few tweaks, ${businessName} could easily turn things around. `;
  } else {
    review += `I hope ${businessName} takes this feedback constructively — there's real potential here. `;
  }

  review += `Overall, I rate them ${rating} out of 5 stars.`;

  return review;
}
