import { supabase } from "./supabase";

// Calls the server-side "shopping-cart" Edge Function, which turns a flat
// ingredient list into a shoppable link at the given retailer ("instacart"
// or "walmart"). Retailer API keys live as Supabase secrets and never reach
// the browser. Returns the shoppable URL. Throws on network/API errors —
// including the expected "not configured" error when a retailer's secret
// hasn't been set yet.
export async function sendToRetailer(retailer, items) {
  const { data, error } = await supabase.functions.invoke("shopping-cart", {
    body: { retailer, items },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);

  return data.url;
}
