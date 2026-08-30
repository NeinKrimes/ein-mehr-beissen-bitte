import { createClient } from "@supabase/supabase-js";

// createClient throws on a missing URL, and it runs at import time — so without
// these variables the whole app used to fail to boot rather than lose one
// feature. It is null when unconfigured instead, and callers degrade: the source
// library falls back to its bundled chunks, the API-backed features report that
// the backend is unavailable. Keeps `npm run build` honest with no .env, keeps
// the test suite off the network, and keeps a misconfigured deploy legible.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
