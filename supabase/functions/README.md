# Supabase Edge Functions

## `recipe` — Anthropic proxy

Keeps `ANTHROPIC_API_KEY` server-side. The browser calls it via
`supabase.functions.invoke("recipe", { body: { prompt } })` (see `src/lib/claude.js`).

### One-time deploy

You need the Supabase CLI (already installed) and your project's ref (the
`xxxx` in your `VITE_SUPABASE_URL=https://xxxx.supabase.co`).

```bash
# 1. Log in (opens a browser to authorize the CLI)
supabase login

# 2. Link this repo to your Supabase project
supabase link --project-ref <your-project-ref>

# 3. Store the Anthropic key as a server-side secret (NOT a VITE_ var).
#    Use the value currently in your local .env (VITE_ANTHROPIC_API_KEY).
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

# 4. Deploy the function
supabase functions deploy recipe
```

### After deploying

- The client already points at this function — no frontend change needed.
- You can **remove `VITE_ANTHROPIC_API_KEY` from `.env`**; the client no longer uses it.
  Keep `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (those are public by design).

### Notes / follow-ups

- `verify_jwt = true` (in `supabase/config.toml`) means callers must send a valid
  Supabase JWT — the public anon key qualifies. This ties the proxy to your project
  but does **not** stop a determined abuser who reads the anon key from the bundle.
- For real abuse protection, add rate limiting or require authenticated users, and
  consider restricting `Access-Control-Allow-Origin` to your deployed domain.

## `shopping-cart` — retailer cart proxy (Instacart / Walmart)

Turns a week's aggregated ingredient list into a shoppable link. The browser calls
it via `supabase.functions.invoke("shopping-cart", { body: { retailer, items } })`
(see `src/lib/shoppingCart.js`), with buttons in `ShoppingList.jsx`.

**Code is scaffolded but not wired to a live retailer yet** — `buildInstacartCart`
and `buildWalmartCart` in `index.ts` are placeholders that throw a clear error until
the real upstream request is filled in against each retailer's current docs. Both
buttons render regardless and fail cleanly ("not configured") until their secret is
set, so this doesn't block anything else in the app.

### Getting Instacart live

1. Apply for [Instacart Developer Platform](https://docs.instacart.com/developer_platform_api)
   access and, separately, enroll in their affiliate program (via Impact) for
   commission tracking on attributed orders.
2. Once you have an API key, fill in `buildInstacartCart` in
   `supabase/functions/shopping-cart/index.ts` against their current "Create Recipe
   Page" API docs — don't reuse an assumed shape, their contract may have changed.
3. `supabase secrets set INSTACART_API_KEY=...`
4. `supabase functions deploy shopping-cart`

### Getting Walmart live

Same steps, but Walmart's Commerce/Affiliate API requires manual account approval
("a sound business case") — treat this as possibly slow or denied, and don't let it
block Instacart. `WALMART_API_KEY` unset just means that button stays disabled.
