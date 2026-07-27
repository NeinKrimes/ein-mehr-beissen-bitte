// Edge Function: recipe
// Server-side proxy for the Anthropic API. The ANTHROPIC_API_KEY lives here as a
// Supabase secret and is NEVER shipped to the browser bundle. The client calls
// this function via supabase.functions.invoke("recipe", { body: { prompt } }).

import { SYSTEM_PROMPT } from "./prompt.js";
import { validateRecipe } from "./validator.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }
  if (!ANTHROPIC_API_KEY) {
    return json({ error: "ANTHROPIC_API_KEY is not configured on the server" }, 500);
  }

  let prompt: unknown, max_tokens = 2000, model = "claude-sonnet-5";
  try {
    const body = await req.json();
    prompt = body?.prompt;
    if (typeof body?.max_tokens === "number") max_tokens = body.max_tokens;
    if (typeof body?.model === "string") model = body.model;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (typeof prompt !== "string" || !prompt.trim()) {
    return json({ error: "Missing or empty 'prompt'" }, 400);
  }
  // Guard against runaway costs from an oversized prompt.
  if (prompt.length > 200_000) {
    return json({ error: "'prompt' too large" }, 413);
  }

  const maxRetries = 3;
  let attempts = 0;
  let parsedRecipe: any = null;
  let validationErrors: string[] = [];
  let lastErrorMsg = "";

  while (attempts < maxRetries) {
    attempts++;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens,
          // Recipe generation is pure JSON extraction — no reasoning needed.
          // Sonnet 5 runs adaptive thinking by default; disable it so the whole
          // token budget goes to the recipe and latency/cost stay low.
          thinking: { type: "disabled" },
          // Shared frugal / WFH / anchor framing + JSON+nutrition output shape.
          // Cached so the (large, stable) prompt is paid for once across calls.
          system: [
            { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
          ],
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        lastErrorMsg = data?.error?.message ?? `Anthropic API error (status: ${res.status})`;
        continue;
      }

      const data = await res.json();
      const text =
        data.content?.find((b: { type: string }) => b.type === "text")?.text ?? "";

      if (!text) {
        lastErrorMsg = "Received empty text from Anthropic API.";
        continue;
      }

      const clean = text.replace(/```json|```/g, "").trim();
      let jsonObj: any;
      try {
        jsonObj = JSON.parse(clean);
      } catch (e) {
        lastErrorMsg = `Failed to parse JSON: ${String(e)}`;
        continue;
      }

      validationErrors = validateRecipe(jsonObj);
      if (validationErrors.length > 0) {
        lastErrorMsg = `Recipe validation failed: ${validationErrors.join("; ")}`;
        continue;
      }

      parsedRecipe = jsonObj;
      break;
    } catch (e) {
      lastErrorMsg = `Upstream request failed: ${String(e)}`;
    }
  }

  if (parsedRecipe) {
    return json({ text: JSON.stringify(parsedRecipe), recipe: parsedRecipe });
  } else {
    return json(
      { error: `Failed to generate a valid recipe after ${maxRetries} attempts. Last error: ${lastErrorMsg}` },
      422,
    );
  }
});
