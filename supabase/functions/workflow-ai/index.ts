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

    if (task === "generate_workflow") {
      return await handleGenerateWorkflow(body, apiKey);
    }

    return new Response(
      JSON.stringify({ error: "Unknown task. Use 'generate_workflow'." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("workflow-ai error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

// =========================================================
// WORKFLOW GENERATION
// =========================================================

async function handleGenerateWorkflow(body: any, apiKey: string): Promise<Response> {
  const { businessName, prompt, businessContext } = body;

  if (!businessName || !prompt) {
    return new Response(
      JSON.stringify({ error: "businessName and prompt are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const systemPrompt = `You are an intelligent workflow builder for a customer review and engagement platform called ReviewFlow, used by a business called "${businessName}".

You generate visual automation workflows from natural language descriptions. Each workflow has:
1. A trigger node (what starts the workflow)
2. Optional condition nodes (branching logic)
3. Optional delay nodes (wait periods)
4. Action nodes (what to do)

Available trigger types:
- qr_scanned, review_submitted, negative_review, positive_review
- customer_created, segment_changed, campaign_completed, reward_earned
- message_delivered, message_failed, birthday, festival
- manual, scheduled, webhook, api_event

Available node types for actions:
- communication (send_message): config: { channel: "sms"|"whatsapp"|"email"|"push"|"in_app", template: category, message: string }
- loyalty (add_loyalty_points): config: { points: number }
- action_center (create_action_item): config: { title: string, priority: "high"|"medium"|"low" }
- campaign (trigger_campaign): config: { campaign_type: string }
- notification (notify_manager): config: { message: string, severity: "info"|"warning"|"critical" }
- action (update_segment): config: { new_segment: string }

Available condition fields:
- rating, sentiment, segment, loyalty_level, review_count, visit_count, days_since_last_visit, channel, time, day_of_week

Rules:
- Generate a practical, working workflow that a small business owner would find useful.
- Keep it simple: 1 trigger + 1-4 action/condition nodes.
- Use {{customer_name}}, {{business_name}}, {{rating}} for variables in messages.
- Position nodes left-to-right: trigger at x=0, then each subsequent node at x+300.
- Position nodes vertically centered at y=200, branching conditions at y±100.
- Never fabricate capabilities — only use the node types listed above.
- Always explain WHY you created this workflow and what each node does.
- Return JSON only, no other text.

Return a JSON object with this exact structure:
{
  "workflow": {
    "name": "Short workflow name",
    "description": "1-2 sentence description",
    "trigger_type": "one of the trigger types",
    "trigger_config": {},
    "nodes": [
      {
        "key": "trigger_1",
        "node_type": "trigger",
        "node_category": "trigger",
        "label": "Human-readable label",
        "config": {},
        "position_x": 0,
        "position_y": 200
      },
      {
        "key": "action_1",
        "node_type": "communication",
        "node_category": "action",
        "label": "Send Thank You",
        "config": { "channel": "sms", "template": "thank_you", "message": "Thank you {{customer_name}} for your review!" },
        "position_x": 300,
        "position_y": 200
      }
    ],
    "edges": [
      { "source": "trigger_1", "target": "action_1" }
    ],
    "variables": ["customer_name", "business_name"]
  },
  "explanation": "Explain why you created this workflow, what each node does, and what the expected outcome is. Write in plain language a business owner would understand."
}`;

  const contextParts: string[] = [`Business: ${businessName}`];
  if (businessContext) contextParts.push(`Business context: ${businessContext}`);
  contextParts.push(`User request: ${prompt}`);

  const userPrompt = `Generate a workflow for the following:\n\n${contextParts.join("\n")}`;

  return await callGroq(apiKey, systemPrompt, userPrompt, 2000, 0.6);
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
