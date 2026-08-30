import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// The rest of the suite runs with Supabase unconfigured (see vite.config), which
// exercises the bundled fallback. This file covers the other branch: what
// happens when a project IS configured, answers, answers wrongly, or hangs.
//
// The module memoises its client and its index, so every test re-imports it
// fresh via vi.resetModules().

const ROW = {
  id: "coq-au-vin-stew",
  title: "Coq au Vin Stew",
  subtitle: "with bacon",
  cuisine: "French",
  calories: 610,
  est_cost_usd: "2.40",        // Postgres numerics arrive as strings
  cal_per_dollar: "254.1666",
  servings: "4",
  total_time: "2 hrs",
  ingredients: [{ amount: "1", unit: "", item: "chicken" }],
  steps: [{ n: 1, title: "Brown it", text: "Brown the chicken." }],
  attribution: "Cuisine at Home",
  protein_g: "38",
};

/** A Supabase stub whose query builder resolves to whatever we hand it. */
function stubClient(result, { onSelect } = {}) {
  const builder = {
    select: (...args) => { onSelect?.(...args); return builder; },
    order: () => builder,
    range: () => Promise.resolve(result),
    eq: () => builder,
    maybeSingle: () => Promise.resolve(result),
  };
  return { from: () => builder };
}

async function loadWith(client) {
  vi.resetModules();
  vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");
  vi.doMock("../lib/supabase", () => ({ supabase: client, isSupabaseConfigured: true }));
  return import("./sourceRecipes.js");
}

beforeEach(() => vi.resetModules());
afterEach(() => { vi.unstubAllEnvs(); vi.doUnmock("../lib/supabase"); vi.useRealTimers(); });

describe("reading the library from Supabase", () => {
  it("uses the rows Postgres returns, not the bundled chunk", async () => {
    const { loadSourceIndex } = await loadWith(stubClient({ data: [ROW], error: null }));
    const index = await loadSourceIndex();
    expect(index).toHaveLength(1);
    expect(index[0].title).toBe("Coq au Vin Stew");
  });

  it("asks only for the index columns, so ingredients never cross the wire", async () => {
    let selected = null;
    const client = stubClient({ data: [ROW], error: null }, { onSelect: (cols) => { selected = cols; } });
    const { loadSourceIndex } = await loadWith(client);
    await loadSourceIndex();
    expect(selected).not.toContain("ingredients");
    expect(selected).not.toContain("steps");
    expect(selected).toContain("title");
  });

  it("coerces Postgres numerics, which arrive as strings", async () => {
    const { loadSourceRecipe } = await loadWith(stubClient({ data: ROW, error: null }));
    const r = await loadSourceRecipe("coq-au-vin-stew");
    // "2.40" sorts before "10.00" as a string; the cost lens would be nonsense.
    expect(r.est_cost_usd).toBe(2.4);
    expect(r.cal_per_dollar).toBe(254);
    expect(r.protein_g).toBe(38);
  });

  it("maps snake_case columns onto the shape the app renders", async () => {
    const { loadSourceRecipe } = await loadWith(stubClient({ data: ROW, error: null }));
    const r = await loadSourceRecipe("coq-au-vin-stew");
    expect(r.totalTime).toBe("2 hrs");
    expect(r.steps[0].title).toBe("Brown it");
    expect(r.ingredients).toHaveLength(1);
  });

  it("falls back to the bundled index when the query errors", async () => {
    const { loadSourceIndex } = await loadWith(stubClient({ data: null, error: { message: "boom" } }));
    const index = await loadSourceIndex();
    // The real library, not the one-row stub.
    expect(index.length).toBeGreaterThan(400);
  });

  it("falls back when the table is empty, so a half-seeded project is not a blank room", async () => {
    const { loadSourceIndex } = await loadWith(stubClient({ data: [], error: null }));
    expect((await loadSourceIndex()).length).toBeGreaterThan(400);
  });

  it("a missing row is a miss, not a reason to pull the whole corpus", async () => {
    // No error and no row means the id is genuinely gone. Returning null here is
    // what stops a stale basket entry costing a 1.2 MB download.
    const { loadSourceRecipe } = await loadWith(stubClient({ data: null, error: null }));
    expect(await loadSourceRecipe("recipe-that-was-removed")).toBeNull();
  });

  it("gives up on a hanging project rather than leaving the room spinning", async () => {
    vi.useFakeTimers();
    const hanging = { from: () => ({
      select: () => hanging.from(), order: () => hanging.from(),
      range: () => new Promise(() => {}), eq: () => hanging.from(),
      maybeSingle: () => new Promise(() => {}),
    }) };
    const { loadSourceIndex } = await loadWith(hanging);
    const pending = loadSourceIndex();
    await vi.advanceTimersByTimeAsync(3000);
    vi.useRealTimers();
    expect((await pending).length).toBeGreaterThan(400);
  });
});
