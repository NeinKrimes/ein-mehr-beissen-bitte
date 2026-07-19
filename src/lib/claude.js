import { supabase } from "./supabase";

// Calls the server-side "recipe" Edge Function, which proxies the Anthropic API.
// The Anthropic key lives as a Supabase secret and never reaches the browser.
// Returns the parsed recipe JSON. Throws on network/API/parse errors.
export async function callClaude(prompt, { maxTokens = 2000, model } = {}) {
  const { data, error } = await supabase.functions.invoke("recipe", {
    body: { prompt, max_tokens: maxTokens, ...(model ? { model } : {}) },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);

  const clean = (data?.text ?? "").replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}
