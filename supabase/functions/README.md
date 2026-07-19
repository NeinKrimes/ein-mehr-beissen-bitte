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
