import { vi, describe, it, expect, beforeEach } from "vitest";

// Set up a mock invoke function that can be updated dynamically per test
const mockInvoke = vi.fn();

vi.mock("../lib/supabase", () => ({
  supabase: {
    functions: {
      invoke: (...args) => mockInvoke(...args),
    },
  },
}));

import { callClaude } from "../lib/claude";

describe("callClaude", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it("should successfully parse and return JSON from a pure JSON response text", async () => {
    const expectedResponse = {
      description: "A simple soup recipe.",
      servings: "2",
      prepTime: "10 mins",
      cookTime: "20 mins",
    };

    mockInvoke.mockResolvedValue({
      data: { text: JSON.stringify(expectedResponse) },
      error: null,
    });

    const result = await callClaude("Give me a soup recipe");

    expect(result).toEqual(expectedResponse);
    expect(mockInvoke).toHaveBeenCalledWith("recipe", {
      body: {
        prompt: "Give me a soup recipe",
        max_tokens: 3500,
      },
    });
  });

  it("should clean and parse markdown-wrapped JSON text correctly", async () => {
    const expectedResponse = {
      description: "Wrapped soup recipe.",
      servings: "4",
    };
    const wrappedText = `
      \`\`\`json
      {
        "description": "Wrapped soup recipe.",
        "servings": "4"
      }
      \`\`\`
    `;

    mockInvoke.mockResolvedValue({
      data: { text: wrappedText },
      error: null,
    });

    const result = await callClaude("Give me a soup recipe");

    expect(result).toEqual(expectedResponse);
  });

  it("should throw a JSON parse error for malformed JSON text input", async () => {
    const malformedText = `{"description": "Incomplete JSON`;

    mockInvoke.mockResolvedValue({
      data: { text: malformedText },
      error: null,
    });

    await expect(callClaude("Give me a soup recipe")).rejects.toThrow(SyntaxError);
  });

  it("should throw the supabase error if invocation fails", async () => {
    const invokeError = new Error("Network connection lost");

    mockInvoke.mockResolvedValue({
      data: null,
      error: invokeError,
    });

    await expect(callClaude("Give me a soup recipe")).rejects.toThrow("Network connection lost");
  });

  it("should throw an error if data contains an error message from the proxy", async () => {
    mockInvoke.mockResolvedValue({
      data: { error: "Anthropic API limit reached or invalid API key" },
      error: null,
    });

    await expect(callClaude("Give me a soup recipe")).rejects.toThrow(
      "Anthropic API limit reached or invalid API key"
    );
  });

  it("should pass custom maxTokens and model parameters if provided", async () => {
    const expectedResponse = { description: "Custom recipe" };
    mockInvoke.mockResolvedValue({
      data: { text: JSON.stringify(expectedResponse) },
      error: null,
    });

    await callClaude("Custom prompt", { maxTokens: 1000, model: "claude-3-opus" });

    expect(mockInvoke).toHaveBeenCalledWith("recipe", {
      body: {
        prompt: "Custom prompt",
        max_tokens: 1000,
        model: "claude-3-opus",
      },
    });
  });
});
