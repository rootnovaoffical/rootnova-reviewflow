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

    // Fetch business details for context
    const businessRes = await fetch(`${supabaseUrl}/rest/v1/businesses?id=eq.${businessId}&select=name,welcome_message,google_place_id`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
    });
    const businesses = await businessRes.json();
    const business = businesses[0];

    // Build context from customer answers
    const answerText = Array.isArray(answers) && answers.length > 0
      ? answers.map((a: any) => a.answer).join(", ")
      : "";

    // Determine sentiment and tone
    const sentiment = rating >= 4 ? "positive" : rating === 3 ? "mixed" : "negative";
    const toneInstruction = rating >= 5
      ? "enthusiastic and specific"
      : rating === 4
      ? "warm and satisfied"
      : rating === 3
      ? "balanced and constructive"
      : "honest but respectful";

    // Build the AI prompt
    const systemPrompt = `You are a review writing assistant. Write a natural, authentic-sounding review based on the customer's actual experience. Rules:
- Write in first person as the customer
- Use only details provided by the customer — never invent menu items, employee names, services, or events
- Keep it concise (2-4 sentences)
- Match the tone to the rating
- Make it sound human, not robotic or generic
- Do not use phrases like "highly recommend" unless the customer's input supports it
- Do not start with "I had a great experience" generically`;

    const userPrompt = `Write a Google review for "${business?.name || "this business"}".
Rating: ${rating} out of 5 stars (${sentiment} sentiment, ${toneInstruction} tone).
Customer feedback: ${answerText || "No specific details provided, but the rating reflects their overall experience."}

Write a natural, specific review that reflects this customer's actual experience. Do not invent details not mentioned by the customer.`;

    // Try OpenAI first
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    let review: string | null = null;

    if (openaiKey) {
      const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 200,
          temperature: 0.8,
        }),
      });

      if (aiRes.ok) {
        const aiData = await aiRes.json();
        review = aiData.choices?.[0]?.message?.content?.trim() ?? null;
      }
    }

    // Fallback to Groq if OpenAI failed or no key
    if (!review) {
      const groqKey = Deno.env.get("GROQ_API_KEY") || Deno.env.get("XAI_API_KEY");
      if (groqKey) {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            max_tokens: 200,
            temperature: 0.8,
          }),
        });

        if (groqRes.ok) {
          const groqData = await groqRes.json();
          review = groqData.choices?.[0]?.message?.content?.trim() ?? null;
        }
      }
    }

    // Final fallback: contextual template (not generic)
    if (!review) {
      const bizName = business?.name || "this place";
      if (rating >= 4) {
        review = answerText
          ? `Really enjoyed my visit to ${bizName}. ${answerText}. Would come back again based on this experience.`
          : `Had a great visit to ${bizName}. The ${rating >= 5 ? "experience was excellent" : "service was good"} and I'd return.`;
      } else if (rating === 3) {
        review = answerText
          ? `My visit to ${bizName} was okay. ${answerText}. There are some areas that could be improved.`
          : `My experience at ${bizName} was decent. Some things worked well, others could use attention.`;
      } else {
        review = answerText
          ? `I was disappointed with my visit to ${bizName}. ${answerText}. I hope they can address these issues.`
          : `My experience at ${bizName} fell short of expectations. I hope they can improve.`;
      }
    }

    return new Response(JSON.stringify({ review, sessionId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, review: "Thank you for sharing your feedback!" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
