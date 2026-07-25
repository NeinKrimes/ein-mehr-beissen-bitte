#!/usr/bin/env bash
# Build the SPA locally (bakes VITE_* from .env.local) and sync it to a Hetzner
# server where Caddy serves the static files. Build happens here because the
# VITE_ vars must be present at build time; the server only serves dist/.
#
# Usage:
#   SSH_HOST=root@203.0.113.10 ./scripts/deploy-hetzner.sh
#   SSH_HOST=deploy@embb.example.com REMOTE_DIR=/var/www/embb ./scripts/deploy-hetzner.sh
set -euo pipefail

: "${SSH_HOST:?set SSH_HOST=user@server-ip (e.g. root@203.0.113.10)}"
REMOTE_DIR="${REMOTE_DIR:-/var/www/embb}"

if [ ! -f .env.local ]; then
  echo "!! .env.local not found — the build needs VITE_SUPABASE_URL/ANON_KEY." >&2
  exit 1
fi

echo "==> Building (VITE_* baked from .env.local)…"
npm ci
npm run build

echo "==> Syncing dist/ -> ${SSH_HOST}:${REMOTE_DIR}/"
rsync -avz --delete dist/ "${SSH_HOST}:${REMOTE_DIR}/"

echo "==> Done. Live at your Caddy domain (run once: sudo systemctl reload caddy after Caddyfile changes)."
