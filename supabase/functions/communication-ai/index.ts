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
    const body = await req.json();
    const { task } = body;

    const apiKey = Deno.env.get("XAI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "AI service is not configured. Missing XAI_API_KEY secret." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (task === "generate_message") {
      return await handleGenerateMessage(body, apiKey);
    } else if (task === "optimize_template") {
      return await handleOptimizeTemplate(body, apiKey);
    }

    return new Response(
      JSON.stringify({ error: "Unknown task. Use 'generate_message' or 'optimize_template'." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("communication-ai error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

// =========================================================
// MESSAGE GENERATION
// =========================================================

async function handleGenerateMessage(body: any, apiKey: string): Promise<Response> {
  const { businessName, messageType, channel, customerName, rating, reviewText, businessContext, locale } = body;

  if (!businessName || !messageType) {
    return new Response(
      JSON.stringify({ error: "businessName and messageType are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const messageTypeMeta: Record<string, { label: string; description: string; defaultChannel: string }> = {
    review_request: { label: "Review Request", description: "a friendly request asking a customer to leave a Google review", defaultChannel: "sms" },
    thank_you: { label: "Thank You", description: "a heartfelt thank-you message to a happy customer", defaultChannel: "sms" },
    recovery: { label: "Recovery", description: "a sincere service recovery message to an unhappy customer", defaultChannel: "sms" },
    festival: { label: "Festival Greeting", description: "a warm festival greeting with optional offer", defaultChannel: "whatsapp" },
    birthday: { label: "Birthday Wish", description: "a personal birthday wish with a special offer", defaultChannel: "whatsapp" },
    coupon: { label: "Coupon", description: "a friendly discount offer message", defaultChannel: "sms" },
    follow_up: { label: "Follow-up", description: "a gentle follow-up message to check in with a customer", defaultChannel: "sms" },
    reminder: { label: "Reminder", description: "a gentle reminder message", defaultChannel: "sms" },
    general: { label: "General", description: "a general-purpose customer message", defaultChannel: "sms" },
  };

  const meta = messageTypeMeta[messageType];
  if (!meta) {
    return new Response(
      JSON.stringify({ error: "Invalid messageType" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const targetChannel = channel || meta.defaultChannel;

  const systemPrompt = `You are a warm, professional customer communication assistant for a business called "${businessName}". You write ${meta.description} for the ${targetChannel} channel.

Channel constraints:
- SMS: max 160 characters, no subject, concise and direct
- WhatsApp: max 4096 characters, warm and conversational, can use emojis sparingly
- Email: includes subject line (3-6 words) and body (2-4 paragraphs), professional tone
- Push: max 100 characters, punchy and actionable
- In-App: max 500 characters, friendly and informative

Rules:
- Be genuine, warm, and human — never robotic or spammy.
- Use the customer's name if provided, otherwise use a friendly generic greeting.
- Never fabricate facts about the customer or business that aren't provided.
- If reviewText is provided, acknowledge their specific feedback naturally.
- Be respectful of the customer's time. No pressure or urgency.
- For recovery messages: acknowledge the issue, apologize sincerely, offer a concrete solution.
- For review requests: make it easy and natural, mention Google reviews specifically.
- For birthday/festival: include a warm personal touch and optional special offer.
- Return JSON only, no other text.

Return a JSON object with this exact structure:
{
  "messages": [
    {
      "subject": "Subject line for email, empty string for other channels",
      "body": "The full message body appropriate for the channel",
      "tone": "warm" | "professional" | "celebratory" | "apologetic" | "casual",
      "optimization_score": 0-100 (how well optimized this message is),
      "suggested_channel": "${targetChannel}",
      "suggested_timing": "Best time to send (e.g. 'morning', 'afternoon', 'evening', 'immediate')"
    }
  ]
}

Generate exactly 2 message variants with slightly different tones.`;

  const contextParts: string[] = [`Business: ${businessName}`];
  if (customerName) contextParts.push(`Customer name: ${customerName}`);
  if (rating !== undefined && rating !== null) contextParts.push(`Customer rating: ${rating}/5`);
  if (reviewText) contextParts.push(`Customer review: "${reviewText}"`);
  if (businessContext) contextParts.push(`Business context: ${businessContext}`);
  if (locale) contextParts.push(`Language/locale: ${locale}`);

  const userPrompt = `Write ${meta.label} message(s) for the following context:\n\n${contextParts.join("\n")}`;

  return await callGroq(apiKey, systemPrompt, userPrompt, 1200, 0.7);
}

// =========================================================
// TEMPLATE OPTIMIZATION
// =========================================================

async function handleOptimizeTemplate(body: any, apiKey: string): Promise<Response> {
  const { templateId, businessName, body: templateBody, category, channel, customerName } = body;

  if (!templateBody || !businessName || !category || !channel) {
    return new Response(
      JSON.stringify({ error: "templateId, businessName, body, category, and channel are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const systemPrompt = `You are an AI message optimization expert for "${businessName}". You optimize customer message templates for maximum engagement while maintaining warmth and authenticity.

Analyze the provided template and return an optimized version with specific improvements.

Rules:
- Keep the same intent and message type
- Improve clarity, warmth, and personalization
- Respect channel constraints (SMS: 160 chars, WhatsApp: conversational, Email: structured, Push: punchy)
- Never fabricate facts — only suggest improvements to the existing content
- Preserve template variables like {{customer_name}} — do not replace them with actual values
- Return JSON only, no other text

Return a JSON object with this exact structure:
{
  "optimized_body": "The improved message body",
  "score": 0-100 (optimization quality score),
  "suggestions": ["Specific improvement 1", "Specific improvement 2", ...]
}`;

  const userPrompt = `Optimize this ${category} template for ${channel} channel:

Business: ${businessName}
Category: ${category}
Channel: ${channel}
${customerName ? `Sample customer: ${customerName}` : ""}

Current template body:
"""
${templateBody}
"""

Return the optimized version with suggestions.`;

  return await callGroq(apiKey, systemPrompt, userPrompt, 1000, 0.5);
}

// =========================================================
// SHARED GROQ CALL
// =========================================================

async function callGroq(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  temperature: number,
): Promise<Response> {
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
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!groqResponse.ok) {
    const errText = await groqResponse.text();
    console.error("Groq API error:", errText);
    return new Response(
      JSON.stringify({ error: "AI service returned an error. Please try again." }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const groqData = await groqResponse.json();
  const content = groqData?.choices?.[0]?.message?.content;

  if (!content) {
    return new Response(
      JSON.stringify({ error: "AI returned no content." }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let result;
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    result = JSON.parse(jsonMatch ? jsonMatch[0] : content);
  } catch {
    return new Response(
      JSON.stringify({ error: "AI returned an unparseable response. Please try again." }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify(result),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
  );
}
