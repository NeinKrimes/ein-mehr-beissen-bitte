import { supabase } from "./supabase";

// Calls the server-side "recipe" Edge Function, which proxies the Anthropic API.
// The Anthropic key lives as a Supabase secret and never reaches the browser.
// Returns the parsed recipe JSON. Throws on network/API/parse errors.
export async function callClaude(payload, { maxTokens = 3500, model } = {}) {
  let body;
  if (typeof payload === "string") {
    body = { prompt: payload, max_tokens: maxTokens, ...(model ? { model } : {}) };
  } else {
    body = { ...payload, max_tokens: maxTokens, ...(model ? { model } : {}) };
  }

  const { data, error } = await supabase.functions.invoke("recipe", {
    body,
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);

  // If the Edge function returned an already parsed JSON recipe object (structured mode),
  // return it directly. Otherwise, clean and parse the text response (legacy fallback).
  if (data && typeof data === "object" && !data.text) {
    return data;
  }

  const clean = (data?.text ?? "").replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}
