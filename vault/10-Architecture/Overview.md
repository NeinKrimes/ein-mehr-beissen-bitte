---
type: architecture
updated: 2026-07-21
---

# Architecture: Ein Mehr Beissen Bitte — System Overview

> **TL;DR:** React meal-calendar SPA. Recipes are generated on demand by Anthropic, proxied through a Supabase Edge Function so the API key stays server-side. A Postgres recipe library and localStorage cache back it.

## The shape

```mermaid
flowchart LR
  subgraph CL["Browser · client"]
    UI["React SPA · App.jsx"]:::client
    LS[("localStorage<br/>palate cache")]:::data
  end
  subgraph SV["Supabase · server-side"]
    EF["Edge Fn 'recipe'<br/>holds ANTHROPIC_API_KEY"]:::server
    PG[("Postgres<br/>recipe library")]:::data
  end
  AN["Anthropic API<br/>claude-sonnet-5"]:::external
  UI -->|invoke| EF -->|proxy| AN
  UI <-->|anon key| PG
  UI <--> LS
  classDef client fill:#16324f,stroke:#4a9eff,color:#dbeafe;
  classDef server fill:#16371f,stroke:#4ade80,color:#dcfce7;
  classDef data fill:#3a2f14,stroke:#fbbf24,color:#fef3c7;
  classDef external fill:#3a1630,stroke:#f472b6,color:#fce7f3;
  classDef artifact fill:#2a2440,stroke:#a78bfa,color:#ede9fe;
  classDef planned fill:#1a1f2b,stroke:#64748b,color:#94a3b8,stroke-dasharray:4 3;
```

## Scope & surface
- **Trust boundary:** client vs. Supabase. The `ANTHROPIC_API_KEY` is correctly **server-side** in the Edge Function — never in the client bundle.
- **No WAF.** DB access from the client rides the Supabase **anon key + RLS** only; the client trusts its own localStorage.
- Data flow: UI event → `callClaude` → `supabase.functions.invoke("recipe")` → Edge Function → Anthropic → JSON recipe.

## Invariants
- `src/App.jsx` holds the inline `chains` meal data (single source of truth) and calls generation directly.
- `useRecipe` / `usePalate` / `PaletteQuestionnaire` are richer machinery **not yet wired** into `App.jsx`.

## Where things live
See `CLAUDE.md` (L0 map) for core files and data shapes.

## Related
- [[00-Index/Home]]
