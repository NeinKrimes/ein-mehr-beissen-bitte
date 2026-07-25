# Deploying — Ein Mehr Beissen Bitte

The app is a static Vite build. The backend (Postgres `meal_library` + the `recipe`
edge function) lives on Supabase project **EBBM2** (`unhwjxccbknojmllmdjx`) and is
already live. This file covers hosting the **frontend** on Vercel.

## Backend status (already done)

- ✅ `meal_library` table created on EBBM2, seeded with all 30 core meals (nutrition + cost).
- ✅ `recipe` edge function redeployed (returns JSON + nutrition; the older deploy returned Markdown).
- ✅ `ANTHROPIC_API_KEY` is set server-side as a Supabase secret (used only by the edge function).
- ✅ Anon read access verified; the service-role key is **never** shipped to the browser.

## Frontend → Vercel

### Option A — Dashboard (no CLI)

1. Push this branch to GitHub.
2. In Vercel → **Add New Project** → import the repo. Framework auto-detects as **Vite**
   (`vercel.json` pins build = `npm run build`, output = `dist`).
3. Add **Environment Variables** (Production + Preview):
   | Name | Value |
   |------|-------|
   | `VITE_SUPABASE_URL` | `https://unhwjxccbknojmllmdjx.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | *(the anon key from `.env.local` — public by design)* |
   > Do **not** add `SUPABASE_SERVICE_ROLE_KEY` here. It is server-only (seeding).
4. Deploy. Every push to the branch auto-deploys thereafter.

### Option B — CLI

```bash
npm i -g vercel
vercel link
vercel env add VITE_SUPABASE_URL production      # paste the URL
vercel env add VITE_SUPABASE_ANON_KEY production  # paste the anon key
vercel --prod
```

## After deploying — lock down CORS (recommended)

The edge function currently sends `Access-Control-Allow-Origin: *`. Once you know the
Vercel domain, restrict it in `supabase/functions/recipe/index.ts` (`corsHeaders`) to
that origin and redeploy:

```bash
SUPABASE_ACCESS_TOKEN=$(cat ~/.supabase/access-token) \
  supabase functions deploy recipe --project-ref unhwjxccbknojmllmdjx
```

## Re-seeding the library

The 30 core meals are already seeded. If you change `src/data/chains.js` or the prompt
(`supabase/functions/recipe/prompt.js`, bump `PROMPT_VERSION`), re-seed with the cheaper
batch seeder — it needs `ANTHROPIC_API_KEY` locally in `.env.local`:

```bash
npm run seed   # idempotent: only regenerates changed/missing meals
```
