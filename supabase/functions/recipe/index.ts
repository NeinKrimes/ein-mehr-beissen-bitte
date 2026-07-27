// Edge Function: recipe
// Server-side proxy for the Anthropic API. The ANTHROPIC_API_KEY lives here as a
// Supabase secret and is NEVER shipped to the browser bundle. The client calls
// this function via supabase.functions.invoke("recipe", { body: { prompt } }).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { SYSTEM_PROMPT } from "./prompt.js";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// Initialize Supabase Client with the service role key to check rate limits via RPC
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const WINDOW_SECONDS = Number(Deno.env.get("RATE_LIMIT_WINDOW_SECONDS")) || 3600; // 1 hour
const MAX_REQUESTS = Number(Deno.env.get("RATE_LIMIT_MAX_REQUESTS")) || 30; // 30 requests per hour

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";

  // Base list of allowed origins
  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:4173",
    "https://neinkrimes.github.io",
  ];

  // Optional ALLOWED_ORIGINS env variable (comma-separated list of origins)
  const envOrigins = Deno.env.get("ALLOWED_ORIGINS");
  if (envOrigins) {
    allowedOrigins.push(...envOrigins.split(",").map(o => o.trim()));
  }

  let allowedOrigin = "";
  if (allowedOrigins.includes(origin)) {
    allowedOrigin = origin;
  } else if (origin.endsWith(".vercel.app")) {
    // Also support custom/preview Vercel deployments
    allowedOrigin = origin;
  }

  // Fallback to primary deployed domain if no match to avoid "*"
  if (!allowedOrigin) {
    allowedOrigin = "https://neinkrimes.github.io";
  }

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(body: unknown, status = 200, req?: Request) {
  const headers = req
    ? { ...getCorsHeaders(req), "Content-Type": "application/json" }
    : {
        "Access-Control-Allow-Origin": "https://neinkrimes.github.io",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Content-Type": "application/json",
      };
  return new Response(JSON.stringify(body), {
    status,
    headers,
  });
}

// Strictly validate prompt structure and check for injection vectors
function validatePrompt(prompt: string): boolean {
  if (typeof prompt !== "string" || !prompt.trim()) {
    return false;
  }
  // Sane prompt length limit (enough for typical preferences, but prevents huge prompt spamming)
  if (prompt.length > 1000) {
    return false;
  }
  // Enforce structured recipe generation format only
  if (!prompt.startsWith('Give a complete recipe for "')) {
    return false;
  }

  const lower = prompt.toLowerCase();
  // Safe guard against jailbreak / general instructions overrides
  const forbidden = [
    "ignore previous instructions",
    "ignore system prompt",
    "ignore system instruction",
    "override system",
    "system override",
    "you are now",
    "instead of",
    "forget everything",
    "forget previous",
    "do not follow",
    "as an assistant",
    "write an essay",
    "translate",
    "coding",
    "javascript",
    "python",
    "html"
  ];
  for (const term of forbidden) {
    if (lower.includes(term)) {
      return false;
    }
  }
  return true;
}

// Derive rate limiting key: User ID if authenticated, otherwise Client IP address
async function getRateLimitKey(req: Request): Promise<string> {
  const authHeader = req.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    if (token) {
      try {
        const { data: { user }, error } = await supabaseClient.auth.getUser(token);
        if (user && user.id && !error) {
          return `user:${user.id}`;
        }
      } catch {
        // Fallback to IP on auth verification failure
      }
    }
  }

  const clientIp = req.headers.get("x-real-ip") ||
                   req.headers.get("cf-connecting-ip") ||
                   req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
                   "unknown-ip";
  return `ip:${clientIp}`;
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, req);
  }
  if (!ANTHROPIC_API_KEY) {
    return json({ error: "ANTHROPIC_API_KEY is not configured on the server" }, 500, req);
  }

  let prompt = "";
  let max_tokens = 2000;

  try {
    const body = await req.json();
    prompt = typeof body?.prompt === "string" ? body.prompt : "";
    if (typeof body?.max_tokens === "number") {
      // Sane per-request cost ceiling: cap max tokens at 4000
      max_tokens = Math.min(body.max_tokens, 4000);
    }
  } catch {
    return json({ error: "Invalid JSON body" }, 400, req);
  }

  // Strict prompt validation to prevent arbitrary prompt execution (anti-abuse)
  if (!validatePrompt(prompt)) {
    return json({ error: "Invalid, unauthorized, or malformed prompt" }, 400, req);
  }

  // Sane per-window cost ceiling via atomic, concurrent-safe database rate limiting
  try {
    const rateKey = await getRateLimitKey(req);
    const { data: limitData, error: rpcError } = await supabaseClient.rpc("check_rate_limit", {
      p_rate_key: rateKey,
      p_window_seconds: WINDOW_SECONDS,
      p_max_requests: MAX_REQUESTS,
    });

    if (rpcError) {
      console.error("Rate limit check RPC failed:", rpcError);
      return json({ error: "Internal server error during rate verification" }, 500, req);
    }

    if (limitData && limitData.length > 0) {
      const { allowed } = limitData[0];
      if (!allowed) {
        return json({ error: "Rate limit exceeded. Please try again later." }, 429, req);
      }
    }
  } catch (e) {
    console.error("Rate limit check exception:", e);
    return json({ error: "Internal server error during rate verification" }, 500, req);
  }

  // Sane per-request cost ceiling: strictly enforce the required recipe generation model
  const model = "claude-sonnet-5";

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

    const data = await res.json();
    if (!res.ok) {
      return json(
        { error: data?.error?.message ?? "Anthropic API error" },
        res.status,
        req
      );
    }

    const text =
      data.content?.find((b: { type: string }) => b.type === "text")?.text ?? "";
    return json({ text }, 200, req);
  } catch (e) {
    return json({ error: `Upstream request failed: ${String(e)}` }, 502, req);
  }
});
