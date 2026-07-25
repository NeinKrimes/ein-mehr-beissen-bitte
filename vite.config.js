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
})
