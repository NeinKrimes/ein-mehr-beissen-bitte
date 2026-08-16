# Codex Handoff — T7: Community Board Backend

**Objective:** Give BoardRoom real data. Today `src/components/BoardRoom.jsx` renders hardcoded community plates. Build the Supabase backend (schema, RLS, storage) and a thin client data layer so posts are real, then wire BoardRoom to it.

**Repo / branch:** `NeinKrimes/ein-mehr-beissen-bitte`, branch from `master` as `feat/community-board-backend`. Open a PR to `master`; do not merge it.

## Architecture (decided — do not redesign)

1. **Auth:** Supabase email magic-link (OTP) auth. Anonymous visitors can read the board; posting requires a session. No passwords, no social login in this phase.
2. **Schema** (new migration in `supabase/migrations/`):
   - `profiles` — `id uuid PK references auth.users`, `display_name text not null`, `created_at timestamptz default now()`. Auto-created via trigger on auth signup.
   - `board_posts` — `id uuid PK default gen_random_uuid()`, `profile_id uuid references profiles not null`, `day int` (nullable; links a post to a calendar day 1–30), `meal_title text`, `caption text check (char_length(caption) <= 500)`, `photo_path text` (storage path, not URL), `created_at timestamptz default now()`.
   - **RLS on both tables:** public `select`; `insert` only where `profile_id = auth.uid()`; `update`/`delete` only own rows. Enable RLS explicitly.
3. **Storage:** bucket `plates`, public-read, authenticated-write, path convention `{profile_id}/{post_id}.jpg`, max 2 MB enforced client-side and via bucket file-size limit.
4. **Client layer:** `src/hooks/useBoard.js` — `usePosts()` (paged fetch, newest first, page size 12), `createPost({day, mealTitle, caption, file})`, `deletePost(id)`; plus `src/hooks/useAuth.js` for session state + magic-link sign-in/out. Follow the existing hook style in `src/hooks/useRecipe.js` (plain fetch-state hooks, no libraries).
5. **BoardRoom wiring:** replace the hardcoded plates with `usePosts()`; keep the existing visual design untouched (inline styles via `src/theme.js` tokens only). Add a minimal sign-in affordance and post composer consistent with existing rooms — smallest UI that works; a designer pass comes later.

## Constraints

- DB naming trap: the recipe table is `meal_library`; do **not** touch it or the unrelated `recipes` table.
- No new npm dependencies. Functional components + hooks only, inline styles via `theme.js` factories.
- Env: use the existing Supabase client setup (see `src/lib/`); no keys in the bundle beyond the anon key already used.

## Acceptance checks

- `npm run lint`, `npm run build`, and the vitest suite pass.
- Migration applies cleanly on a fresh `supabase db reset`.
- RLS verified: anonymous `select` works; `insert` with mismatched `profile_id` is rejected (include a SQL comment or test notes demonstrating this).
- BoardRoom renders empty-state, posts list, and composer without console errors.

## Do not decide

Visual design changes, auth providers beyond magic link, moderation/reporting features, notification systems, pagination style changes. Flag as open questions instead.

## Handoff back

Compact report: changed files, migration name, evidence for acceptance checks (test output), risks, open questions.
