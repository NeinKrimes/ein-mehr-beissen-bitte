// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import LibraryRoom from "./LibraryRoom.jsx";
import { SOURCE_INDEX } from "../data/sourceRecipes.js";

afterEach(cleanup);

describe("LibraryRoom renders", () => {
  it("mounts and lists the library without fetching the corpus", () => {
    render(<LibraryRoom />);
    expect(screen.getByLabelText("Search the library")).toBeTruthy();
    expect(screen.getByText(`${SOURCE_INDEX.length} recipes`)).toBeTruthy();
    // The first row's title comes from the index alone — no ingredients needed.
    expect(screen.getAllByRole("button").length).toBeGreaterThan(1);
  });

  it("filters as you type, and says so when nothing matches", () => {
    render(<LibraryRoom />);
    fireEvent.change(screen.getByLabelText("Search the library"), { target: { value: "zzzznotarecipe" } });
    expect(screen.getByText("Nothing on that shelf.")).toBeTruthy();
  });

  it("opens a recipe and pulls its steps out of the lazy chunk", async () => {
    render(<LibraryRoom />);
    const first = SOURCE_INDEX.slice().sort((a, b) => a.title.localeCompare(b.title))[0];
    fireEvent.click(screen.getByText(first.title));
    // Ingredients live only in the payload module, so seeing one proves the
    // dynamic import resolved.
    await waitFor(() => expect(screen.getByText("Ingredients")).toBeTruthy());
    expect(screen.getByText(/Adapted from/)).toBeTruthy();
  });
});

describe("closing the recipe", () => {
  it("Escape closes an open recipe", async () => {
    render(<LibraryRoom />);
    const first = SOURCE_INDEX.slice().sort((a, b) => a.title.localeCompare(b.title))[0];
    fireEvent.click(screen.getByText(first.title));
    await waitFor(() => expect(screen.getByText("Ingredients")).toBeTruthy());
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByText("Ingredients")).toBeNull());
  });

  it("the close button closes it too", async () => {
    render(<LibraryRoom />);
    const first = SOURCE_INDEX.slice().sort((a, b) => a.title.localeCompare(b.title))[0];
    fireEvent.click(screen.getByText(first.title));
    await waitFor(() => expect(screen.getByLabelText("Close recipe")).toBeTruthy());
    fireEvent.click(screen.getByLabelText("Close recipe"));
    await waitFor(() => expect(screen.queryByText("Ingredients")).toBeNull());
  });
});

describe("adding to the shopping list", () => {
  function fakeBasket() {
    const ids = new Set();
    return {
      ids: [...ids], count: 0,
      has: (id) => ids.has(id),
      toggle: vi.fn((id) => (ids.has(id) ? ids.delete(id) : ids.add(id))),
    };
  }

  it("offers the button only when a basket is wired in", async () => {
    const first = SOURCE_INDEX.slice().sort((a, b) => a.title.localeCompare(b.title))[0];

    const { unmount } = render(<LibraryRoom />);
    fireEvent.click(screen.getByText(first.title));
    await waitFor(() => expect(screen.getByText("Ingredients")).toBeTruthy());
    expect(screen.queryByText("Add to shopping list")).toBeNull();
    unmount();

    render(<LibraryRoom basket={fakeBasket()} />);
    fireEvent.click(screen.getByText(first.title));
    await waitFor(() => expect(screen.getByText("Add to shopping list")).toBeTruthy());
  });

  it("toggles the recipe onto the basket", async () => {
    const basket = fakeBasket();
    const first = SOURCE_INDEX.slice().sort((a, b) => a.title.localeCompare(b.title))[0];
    render(<LibraryRoom basket={basket} />);
    fireEvent.click(screen.getByText(first.title));
    await waitFor(() => expect(screen.getByText("Add to shopping list")).toBeTruthy());
    fireEvent.click(screen.getByText("Add to shopping list"));
    expect(basket.toggle).toHaveBeenCalledWith(first.id);
  });

  it("marks rows already on the list, and links to it", () => {
    const first = SOURCE_INDEX.slice().sort((a, b) => a.title.localeCompare(b.title))[0];
    const basket = { ...fakeBasket(), count: 2, has: (id) => id === first.id };
    render(<LibraryRoom basket={basket} onOpenShopping={() => {}} />);
    expect(screen.getAllByText("On list")).toHaveLength(1);
    expect(screen.getByText("2 on the shopping list — open it")).toBeTruthy();
  });
});
