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
    const { sessionId, rating, answers, businessId, businessName, regenerate } = await req.json();

    let name = businessName || "the business";

    if (!businessName && businessId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const res = await fetch(`${supabaseUrl}/rest/v1/businesses?id=eq.${businessId}&select=name`, {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      });
      const data = await res.json();
      if (data && data.length > 0) name = data[0].name;
    }

    const r = Number(rating) || 5;
    const answerTexts = answers ? Object.values(answers).filter((v: unknown) => v && String(v).trim()) : [];

    const variants: string[][] = [
      [
        `I had an absolutely wonderful experience at ${name}! From the moment I walked in, I felt welcomed and well taken care of.`,
        `My visit to ${name} exceeded all expectations. The team was professional, attentive, and genuinely cared about making sure everything was perfect.`,
        `I can't say enough good things about ${name}. The quality of service was outstanding and I left feeling completely satisfied.`,
      ],
      [
        `My experience at ${name} was pretty good overall. The service was solid and I appreciated the attention to detail.`,
        `I had a positive visit to ${name}. Things were handled professionally and I was happy with the results.`,
        `${name} delivered a good experience. The staff was helpful and I'd recommend them to others looking for quality service.`,
      ],
      [
        `My visit to ${name} was okay. Some things were handled well, though there's definitely room for improvement in a few areas.`,
        `The experience at ${name} was average. Not bad, but I've had better. With a few tweaks it could be much better.`,
        `${name} was decent. The service worked but didn't particularly stand out. It gets the job done.`,
      ],
      [
        `Unfortunately, my experience at ${name} fell short of what I expected. There were a few issues that impacted my visit.`,
        `I was somewhat disappointed with my visit to ${name}. The service didn't quite meet the standard I was hoping for.`,
        `${name} has potential but my experience was lacking. A few key areas need attention to improve the overall service.`,
      ],
      [
        `I'm sorry to say my experience at ${name} was quite disappointing. The service fell well below my expectations.`,
        `Unfortunately, my visit to ${name} was not a good experience. There were significant issues that need to be addressed.`,
        `I had a poor experience at ${name}. The level of service was unacceptable and I hope they take steps to improve.`,
      ],
    ];

    const tier = r >= 5 ? 0 : r === 4 ? 1 : r === 3 ? 2 : r === 2 ? 3 : 4;
    const pool = variants[tier];
    const pick = pool[regenerate ? Math.floor(Math.random() * pool.length) : 0];

    let review = pick;
    if (answerTexts.length > 0) {
      const detail = answerTexts.slice(0, 2).map((v) => String(v)).join(". ");
      review += " " + detail + ".";
    }

    if (r >= 4) {
      review += ` I would definitely recommend ${name} to friends and family.`;
    } else if (r <= 2) {
      review += ` I hope ${name} can address these concerns and improve going forward.`;
    }

    if (sessionId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      await fetch(`${supabaseUrl}/rest/v1/review_sessions?id=eq.${sessionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          rating: r,
          ai_generated_review: review,
          answers: answers || {},
          ai_status: "completed",
        }),
      });
    }

    return new Response(JSON.stringify({ review, rating: r }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
