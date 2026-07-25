# Deploying — Ein Mehr Beissen Bitte

The app is a static Vite build. The backend (Postgres `meal_library` + the `recipe`
edge function) lives on Supabase project **EBBM2** (`unhwjxccbknojmllmdjx`) and is
already live. This file covers hosting the **frontend** on Vercel.

## Backend status (already done)

- ✅ `meal_library` table created on EBBM2, seeded with all 30 core meals (nutrition + cost).
- ✅ `recipe` edge function redeployed (returns JSON + nutrition; the older deploy returned Markdown).
- ✅ `ANTHROPIC_API_KEY` is set server-side as a Supabase secret (used only by the edge function).
- ✅ Anon read access verified; the service-role key is **never** shipped to the browser.

## Frontend hosting

The app is a static SPA with **no client-side router** (navigation is React state),
which makes every option below straightforward. Whichever you pick, the two public
`VITE_` vars are baked in **at build time**; the `service_role` key is never involved.

Pick one:

### Recommended — GitHub Pages + Actions (builds for you, free)

The workflow [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml)
builds and publishes on every push to `master`. `vite.config.js` serves assets from
`/ein-mehr-beissen-bitte/` when the workflow sets `GITHUB_PAGES=true`.

1. **Settings → Pages → Build and deployment → Source = "GitHub Actions".**
2. **Settings → Secrets and variables → Actions → New repository secret** (add both):
   | Secret | Value |
   |--------|-------|
   | `VITE_SUPABASE_URL` | `https://unhwjxccbknojmllmdjx.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | *(the anon key from `.env.local` — public by design)* |
   > Do **not** add `SUPABASE_SERVICE_ROLE_KEY`. It is server-only (seeding).
3. Push to `master` (or run the workflow via **Actions → Deploy to GitHub Pages →
   Run workflow**). Live at **https://neinkrimes.github.io/ein-mehr-beissen-bitte/**.

Custom domain? Set it in **Settings → Pages**, then change `base` in `vite.config.js`
back to `'/'` (a custom domain serves from the root, not a sub-path).

### Alternative — Hetzner Cloud VPS + Caddy

Build locally (bakes `VITE_*` from `.env.local`) and ship the static `dist/` to a small
server that Caddy serves with automatic HTTPS. Files: [`Caddyfile`](Caddyfile),
[`scripts/deploy-hetzner.sh`](scripts/deploy-hetzner.sh).

```bash
# One-time on the server (Ubuntu 24.04, e.g. Hetzner CX22):
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy rsync
sudo mkdir -p /var/www/embb && sudo chown "$USER" /var/www/embb
# Copy this repo's Caddyfile to /etc/caddy/Caddyfile (edit the domain), point DNS, then:
sudo systemctl reload caddy

# From your machine, each deploy:
SSH_HOST=root@YOUR_SERVER_IP ./scripts/deploy-hetzner.sh
```

### Alternative — Vercel

Import the repo; framework auto-detects as **Vite** ([`vercel.json`](vercel.json) pins
build/output). Add the same two `VITE_` env vars in the Vercel dashboard, then deploy.
Or via CLI: `npm i -g vercel && vercel link && vercel --prod` (add env vars with
`vercel env add`).

## After deploying — lock down CORS (recommended)

The edge function currently sends `Access-Control-Allow-Origin: *`. Once you know the
deployed origin (e.g. `https://neinkrimes.github.io`), restrict it in
`supabase/functions/recipe/index.ts` (`corsHeaders`) and redeploy:

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
