import { vi, describe, it, expect } from "vitest";

// Mock supabase client to avoid initialization errors during test execution
vi.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(),
  },
}));

import { toPalatePrompt } from "../hooks/usePalate";

describe("toPalatePrompt", () => {
  it("should return empty string for null, undefined, or empty palate", () => {
    expect(toPalatePrompt(null)).toBe("");
    expect(toPalatePrompt(undefined)).toBe("");
    expect(toPalatePrompt({})).toBe("");
    expect(toPalatePrompt({
      proteinBlocks: [],
      dislikes: [],
      likedProteins: [],
      likedFlavours: [],
    })).toBe("");
  });

  it("should serialize proteinBlocks (hard excludes)", () => {
    const palate = {
      proteinBlocks: ["pork", "shrimp"],
    };
    const result = toPalatePrompt(palate);
    expect(result).toContain("User dietary preferences:");
    expect(result).toContain("HARD EXCLUDE — do NOT use these proteins under any circumstances: pork, shrimp.");
  });

  it("should serialize dislikes (soft avoids)", () => {
    const palate = {
      dislikes: ["cilantro", "onion"],
    };
    const result = toPalatePrompt(palate);
    expect(result).toContain("User dietary preferences:");
    expect(result).toContain("Soft avoid — omit or minimise these ingredients/flavours where possible: cilantro, onion.");
  });

  it("should serialize likedProteins", () => {
    const palate = {
      likedProteins: ["chicken", "tofu"],
    };
    const result = toPalatePrompt(palate);
    expect(result).toContain("User dietary preferences:");
    expect(result).toContain("Preferred proteins: chicken, tofu.");
  });

  it("should serialize likedFlavours", () => {
    const palate = {
      likedFlavours: ["spicy", "umami"],
    };
    const result = toPalatePrompt(palate);
    expect(result).toContain("User dietary preferences:");
    expect(result).toContain("Preferred flavour profiles: spicy, umami.");
  });

  it("should serialize multiple preferences combined correctly", () => {
    const palate = {
      proteinBlocks: ["beef"],
      dislikes: ["coriander"],
      likedProteins: ["fish"],
      likedFlavours: ["sour"],
    };
    const result = toPalatePrompt(palate);
    const expectedPrefix = "\n\nUser dietary preferences:\n";
    const expectedBody = [
      "HARD EXCLUDE — do NOT use these proteins under any circumstances: beef.",
      "Soft avoid — omit or minimise these ingredients/flavours where possible: coriander.",
      "Preferred proteins: fish.",
      "Preferred flavour profiles: sour.",
    ].join("\n");

    expect(result).toBe(expectedPrefix + expectedBody);
  });
});
