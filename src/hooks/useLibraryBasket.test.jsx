// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useLibraryBasket } from "./useLibraryBasket.js";
import SOURCE_INDEX from "../data/sourceRecipes.index.js";

const LS_KEY = "embb_library_basket";
const [first, second] = SOURCE_INDEX.map((r) => r.id);

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("useLibraryBasket", () => {
  it("starts empty", () => {
    const { result } = renderHook(() => useLibraryBasket());
    expect(result.current.ids).toEqual([]);
    expect(result.current.count).toBe(0);
  });

  it("toggles an id on and back off", () => {
    const { result } = renderHook(() => useLibraryBasket());
    act(() => result.current.toggle(first));
    expect(result.current.has(first)).toBe(true);
    act(() => result.current.toggle(first));
    expect(result.current.has(first)).toBe(false);
  });

  it("keeps the order recipes were added in", () => {
    const { result } = renderHook(() => useLibraryBasket());
    act(() => result.current.toggle(second));
    act(() => result.current.toggle(first));
    expect(result.current.ids).toEqual([second, first]);
  });

  it("persists to localStorage and reads back on mount", () => {
    const { result, unmount } = renderHook(() => useLibraryBasket());
    act(() => result.current.toggle(first));
    expect(JSON.parse(localStorage.getItem(LS_KEY))).toEqual([first]);
    unmount();

    const { result: reopened } = renderHook(() => useLibraryBasket());
    expect(reopened.current.ids).toEqual([first]);
  });

  it("resolves ids to full records with ingredients", async () => {
    const { result } = renderHook(() => useLibraryBasket());
    act(() => result.current.toggle(first));
    await waitFor(() => expect(result.current.recipes).toHaveLength(1));
    // Ingredients live only in the lazy payload, so this proves it resolved.
    expect(result.current.recipes[0].ingredients.length).toBeGreaterThan(0);
  });

  it("drops an id that is no longer in the corpus rather than leaving a hole", async () => {
    localStorage.setItem(LS_KEY, JSON.stringify([first, "recipe-that-was-removed"]));
    const { result } = renderHook(() => useLibraryBasket());
    await waitFor(() => expect(result.current.recipes).toHaveLength(1));
    expect(result.current.recipes[0].id).toBe(first);
  });

  it("remove and clear both work", () => {
    const { result } = renderHook(() => useLibraryBasket());
    act(() => result.current.toggle(first));
    act(() => result.current.toggle(second));
    act(() => result.current.remove(first));
    expect(result.current.ids).toEqual([second]);
    act(() => result.current.clear());
    expect(result.current.ids).toEqual([]);
    expect(JSON.parse(localStorage.getItem(LS_KEY))).toEqual([]);
  });

  it("survives unreadable or non-array stored values", () => {
    localStorage.setItem(LS_KEY, "{not json");
    expect(renderHook(() => useLibraryBasket()).result.current.ids).toEqual([]);
    localStorage.setItem(LS_KEY, JSON.stringify({ nope: true }));
    expect(renderHook(() => useLibraryBasket()).result.current.ids).toEqual([]);
    localStorage.setItem(LS_KEY, JSON.stringify([first, 42, null]));
    expect(renderHook(() => useLibraryBasket()).result.current.ids).toEqual([first]);
  });

  it("does not throw when localStorage refuses to write", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    const { result } = renderHook(() => useLibraryBasket());
    expect(() => act(() => result.current.toggle(first))).not.toThrow();
    expect(result.current.has(first)).toBe(true);
  });

  it("ignores a falsy id", () => {
    const { result } = renderHook(() => useLibraryBasket());
    act(() => result.current.toggle(null));
    expect(result.current.ids).toEqual([]);
  });
});
