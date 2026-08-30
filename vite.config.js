import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves a project site from https://<owner>.github.io/<repo>/, so
// assets must be requested under that sub-path. The Pages workflow sets
// GITHUB_PAGES=true at build time. Every other target (local dev, Hetzner,
// Vercel, a custom domain) serves from the root, so base stays "/".
const base = process.env.GITHUB_PAGES ? '/ein-mehr-beissen-bitte/' : '/'

export default defineConfig({
  base,
  plugins: [react()],
  test: {
    // The source library asks Supabase before falling back to the bundled
    // chunks. Blanking these makes the client unavailable, so the suite never
    // depends on a network, a reachable project, or whatever is in the
    // developer's .env.local — and every test exercises the offline fallback,
    // which has to keep working regardless. Tests that want the REMOTE path
    // stub the client themselves; see src/data/sourceRecipes.remote.test.js.
    env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' },
  },
})
