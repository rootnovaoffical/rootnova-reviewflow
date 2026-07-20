import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENING_STYLES = [
  "Start with a specific detail from the customer's feedback rather than a generic statement.",
  "Begin with what the customer noticed or felt first.",
  "Open with the most memorable part of their visit.",
  "Start with why they chose this place or what drew them in.",
];

const STRUCTURE_STYLES = [
  "Structure: one sentence on the overall impression, then specifics from their feedback.",
  "Structure: lead with a highlight, then mention what made it memorable.",
  "Structure: describe the experience chronologically in 2-3 sentences.",
  "Structure: contrast expectation vs reality in a natural way.",
];

const VOICE_STYLES = [
  "Write in a casual, conversational tone — like telling a friend about it.",
  "Write in a warm, genuine tone — like recommending to someone you know.",
  "Write in an enthusiastic but honest tone — not over-the-top.",
  "Write in a measured, thoughtful tone — reflecting on the experience.",
];

function pickVariation(seed: number, arr: string[]): string {
  return arr[seed % arr.length];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { sessionId, rating, answers, businessId, regenerate, variationSeed } = await req.json();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const businessRes = await fetch(`${supabaseUrl}/rest/v1/businesses?id=eq.${businessId}&select=name,welcome_message,google_place_id`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
    });
    const businesses = await businessRes.json();
    const business = businesses[0];

    const answerText = Array.isArray(answers) && answers.length > 0
      ? answers.map((a: any) => a.answer).join(", ")
      : "";

    const sentiment = rating >= 4 ? "positive" : rating === 3 ? "mixed" : "negative";
    const toneInstruction = rating >= 5
      ? "enthusiastic and specific"
      : rating === 4
      ? "warm and satisfied"
      : rating === 3
      ? "balanced and constructive"
      : "honest but respectful";

    // Variation mechanism: each regeneration gets different style instructions
    const seed = typeof variationSeed === "number" ? variationSeed : Math.floor(Math.random() * 1000);
    const openingStyle = pickVariation(seed, OPENING_STYLES);
    const structureStyle = pickVariation(seed + 1, STRUCTURE_STYLES);
    const voiceStyle = pickVariation(seed + 2, VOICE_STYLES);

    const systemPrompt = `You are a review writing assistant. Write a natural, authentic-sounding review based on the customer's actual experience. Rules:
- Write in first person as the customer
- Use only details provided by the customer — never invent menu items, employee names, services, or events
- Keep it concise (2-4 sentences)
- Match the tone to the rating
- Make it sound human, not robotic or generic
- Do not use phrases like "highly recommend" unless the customer's input supports it
- Do not start with "I had a great experience" generically
- ${openingStyle}
- ${structureStyle}
- ${voiceStyle}`;

    const userPrompt = `Write a Google review for "${business?.name || "this business"}".
Rating: ${rating} out of 5 stars (${sentiment} sentiment, ${toneInstruction} tone).
Customer feedback: ${answerText || "No specific details provided, but the rating reflects their overall experience."}

Write a natural, specific review that reflects this customer's actual experience. Do not invent details not mentioned by the customer.${regenerate ? " This is a regeneration — write a distinctly different version from any previous attempt, using different wording, sentence structure, and emphasis." : ""}`;

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    let review: string | null = null;

    if (openaiKey) {
      const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 200,
          temperature: 0.9,
          presence_penalty: regenerate ? 0.6 : 0,
          frequency_penalty: regenerate ? 0.3 : 0,
        }),
      });
      if (aiRes.ok) {
        const aiData = await aiRes.json();
        review = aiData.choices?.[0]?.message?.content?.trim() ?? null;
      }
    }

    if (!review) {
      const groqKey = Deno.env.get("GROQ_API_KEY") || Deno.env.get("XAI_API_KEY");
      if (groqKey) {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            max_tokens: 200,
            temperature: 0.9,
            presence_penalty: regenerate ? 0.6 : 0,
            frequency_penalty: regenerate ? 0.3 : 0,
          }),
        });
        if (groqRes.ok) {
          const groqData = await groqRes.json();
          review = groqData.choices?.[0]?.message?.content?.trim() ?? null;
        }
      }
    }

    // Fallback: contextual templates with variation
    if (!review) {
      const bizName = business?.name || "this place";
      const templates = rating >= 4 ? [
        `Really enjoyed my visit to ${bizName}. ${answerText}. Would come back again based on this experience.`,
        `${bizName} was a great choice. ${answerText}. Glad I stopped by.`,
        `Loved the experience at ${bizName}. ${answerText}. Definitely returning soon.`,
      ] : rating === 3 ? [
        `My visit to ${bizName} was okay. ${answerText}. There are some areas that could be improved.`,
        `${bizName} was decent. ${answerText}. A few things could elevate the experience.`,
        `Stopped by ${bizName}. ${answerText}. It was fine but has room to grow.`,
      ] : [
        `I was disappointed with my visit to ${bizName}. ${answerText}. I hope they can address these issues.`,
        `${bizName} didn't meet expectations. ${answerText}. I hope improvements are on the way.`,
        `My experience at ${bizName} fell short. ${answerText}. Hopefully things improve.`,
      ];
      review = templates[seed % templates.length];
    }

    return new Response(JSON.stringify({ review, sessionId, variationSeed: seed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, review: "Thank you for sharing your feedback!" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
