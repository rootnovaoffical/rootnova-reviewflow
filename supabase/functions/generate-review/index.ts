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

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function trimToMaxWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text.trim();

  const trimmed = words.slice(0, maxWords).join(" ");

  // Try to cut at last sentence boundary within the trimmed text
  const lastPeriod = Math.max(trimmed.lastIndexOf("."), trimmed.lastIndexOf("!"), trimmed.lastIndexOf("?"));
  if (lastPeriod > maxWords * 0.6) {
    return trimmed.slice(0, lastPeriod + 1).trim();
  }

  // No clean sentence boundary — find next sentence end in full text
  const fullText = text.trim();
  let count = 0;
  let cutIdx = fullText.length;
  for (let i = 0; i < fullText.length; i++) {
    if (fullText[i] === " " || i === fullText.length - 1) {
      count++;
      if (count > maxWords) {
        cutIdx = i;
        break;
      }
    }
  }

  // Find next sentence end after cutIdx
  const nextEnd = Math.max(
    fullText.indexOf(".", cutIdx),
    fullText.indexOf("!", cutIdx),
    fullText.indexOf("?", cutIdx),
  );

  if (nextEnd !== -1 && countWords(fullText.slice(0, nextEnd + 1)) <= maxWords + 15) {
    return fullText.slice(0, nextEnd + 1).trim();
  }

  return trimmed.replace(/[,;]$/, "") + ".";
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

    const seed = typeof variationSeed === "number" ? variationSeed : Math.floor(Math.random() * 1000);
    const openingStyle = pickVariation(seed, OPENING_STYLES);
    const structureStyle = pickVariation(seed + 1, STRUCTURE_STYLES);
    const voiceStyle = pickVariation(seed + 2, VOICE_STYLES);

    const systemPrompt = `You are a review writing assistant. Write a natural, authentic-sounding review based on the customer's actual experience. Rules:
- Write in first person as the customer
- Use only details provided by the customer — never invent menu items, employee names, services, or events
- Keep it to 35-70 words (hard max 90 words) — one compact paragraph, 2-3 sentences
- Match the tone to the rating
- Make it sound human, not robotic or generic
- Do not use phrases like "highly recommend" unless the customer's input supports it
- Do not start with "I had a great experience" generically
- Avoid excessive adjectives, exclamation marks, and marketing language
- ${openingStyle}
- ${structureStyle}
- ${voiceStyle}`;

    const userPrompt = `Write a Google review for "${business?.name || "this business"}".
Rating: ${rating} out of 5 stars (${sentiment} sentiment, ${toneInstruction} tone).
Customer feedback: ${answerText || "No specific details provided, but the rating reflects their overall experience."}

Write a concise, natural review (35-70 words) that reflects this customer's actual experience. Do not invent details not mentioned by the customer. Do not add filler. Keep it to one short paragraph.${regenerate ? " This is a regeneration — write a distinctly different version from any previous attempt, using different wording, sentence structure, and emphasis." : ""}`;

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
          max_tokens: 160,
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
            max_tokens: 160,
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

    // Fallback: contextual templates with variation (all concise)
    if (!review) {
      const bizName = business?.name || "this place";
      const templates = rating >= 4 ? [
        `Really enjoyed ${bizName}. ${answerText}. Would come back.`,
        `${bizName} was a great choice. ${answerText}. Glad I stopped by.`,
        `Loved it at ${bizName}. ${answerText}. Definitely returning.`,
      ] : rating === 3 ? [
        `${bizName} was okay. ${answerText}. Some room to improve.`,
        `Decent visit to ${bizName}. ${answerText}. Could be better.`,
        `Stopped by ${bizName}. ${answerText}. Fine but has room to grow.`,
      ] : [
        `Disappointed with ${bizName}. ${answerText}. Hope they improve.`,
        `${bizName} fell short. ${answerText}. Hope things get better.`,
        `Not great at ${bizName}. ${answerText}. Hopefully they address this.`,
      ];
      review = templates[seed % templates.length];
    }

    // Final safety: enforce 90-word hard max with sentence-preserving trim
    if (countWords(review) > 90) {
      review = trimToMaxWords(review, 90);
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
