// Edge Function: shopping-cart
// Server-side proxy that turns a week's aggregated ingredient list into a
// shoppable link at a retailer (Instacart, Walmart, ...). Retailer API keys
// live here as Supabase secrets and are NEVER shipped to the browser bundle.
// The client calls this via supabase.functions.invoke("shopping-cart",
// { body: { retailer, items } }) — see src/lib/shoppingCart.js.
//
// Same shape as the "recipe" function: shared CORS/json helpers, the same
// OPTIONS/method/parse/validate/upstream-fetch/error sequence. A `retailer`
// dispatch map keeps each integration's request-shaping isolated so adding
// or losing a retailer (Walmart's API access is manual-approval-gated and
// may never land) doesn't touch the others.

const INSTACART_API_KEY = Deno.env.get("INSTACART_API_KEY");
const WALMART_API_KEY = Deno.env.get("WALMART_API_KEY");

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

type CartItem = { name: string; quantity: number | null; unit: string | null };

// TODO(instacart): Instacart Developer Platform's "Create Recipe Page" API
// (docs.instacart.com/developer_platform_api) is the fit for this — submit
// ingredients, get back a shoppable products_link_url. The exact endpoint,
// auth header, and request/response shape are deliberately NOT guessed here;
// verify against the real docs once Developer Platform access is granted,
// then replace this placeholder. Do not ship a fabricated request shape.
async function buildInstacartCart(_items: CartItem[], _apiKey: string): Promise<string> {
  throw new Error(
    "Instacart integration is scaffolded but not wired up yet — fill in buildInstacartCart against the real Developer Platform API docs.",
  );
}

// TODO(walmart): Walmart's Affiliate API / Commerce "AddToCart proxy service"
// (walmart.io/docs/affiliate) needs manual account approval; the exact
// request shape is unverified. Fill in once access is granted.
async function buildWalmartCart(_items: CartItem[], _apiKey: string): Promise<string> {
  throw new Error(
    "Walmart integration is scaffolded but not wired up yet — fill in buildWalmartCart against the real Affiliate/Commerce API docs.",
  );
}

const RETAILERS: Record<string, { key: string | undefined; handler: (items: CartItem[], key: string) => Promise<string> }> = {
  instacart: { key: INSTACART_API_KEY, handler: buildInstacartCart },
  walmart: { key: WALMART_API_KEY, handler: buildWalmartCart },
};

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let retailer: unknown, items: unknown;
  try {
    const body = await req.json();
    retailer = body?.retailer;
    items = body?.items;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (typeof retailer !== "string" || !(retailer in RETAILERS)) {
    return json({ error: `Unknown retailer '${String(retailer)}'` }, 400);
  }

  const entry = RETAILERS[retailer];
  if (!entry.key) {
    return json({ error: `${retailer.toUpperCase()}_API_KEY is not configured on the server` }, 500);
  }

  if (!Array.isArray(items) || items.length === 0) {
    return json({ error: "Missing or empty 'items'" }, 400);
  }
  if (items.length > 500) {
    return json({ error: "'items' too large" }, 413);
  }
  const cartItems: CartItem[] = items.map((it) => ({
    name: String(it?.name ?? "").trim(),
    quantity: Number.isFinite(Number(it?.quantity)) ? Number(it.quantity) : null,
    unit: it?.unit ? String(it.unit) : null,
  })).filter((it) => it.name);
  if (cartItems.length === 0) {
    return json({ error: "No valid items to send" }, 400);
  }

  try {
    const url = await entry.handler(cartItems, entry.key);
    return json({ url, retailer });
  } catch (e) {
    return json({ error: `Upstream request failed: ${String(e instanceof Error ? e.message : e)}` }, 502);
  }
});
