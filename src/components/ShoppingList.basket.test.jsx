// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import ShoppingList from "./ShoppingList.jsx";

// Vitest globals are off in this repo, so cleanup is explicit or renders stack.
afterEach(cleanup);

const noRecipes = () => null;

const basket = [
  { id: "a", title: "Beef Daube", servings: "6", est_cost_usd: 3, ingredients: [
    { amount: "2", unit: "lbs", item: "beef chuck" },
    { amount: "1", unit: "cup", item: "red wine" },
  ] },
  { id: "b", title: "Coq au Vin", servings: "4", est_cost_usd: 2, ingredients: [
    { amount: "3", unit: "lbs", item: "beef chuck" },
    { amount: "2", unit: "", item: "bay leaves" },
  ] },
];

describe("ShoppingList library basket", () => {
  it("shows no library section when the basket is empty", () => {
    render(<ShoppingList flatDays={[]} getRecipe={noRecipes} onClose={() => {}} />);
    expect(screen.queryByText(/From the library/)).toBeNull();
  });

  it("aggregates basket ingredients across recipes, same as a week", () => {
    render(<ShoppingList flatDays={[]} getRecipe={noRecipes} basket={basket} onClose={() => {}} />);
    expect(screen.getByText("From the library · 2 recipes")).toBeTruthy();
    // 2 lbs + 3 lbs of the same item collapses to one line.
    expect(screen.getByText("beef chuck")).toBeTruthy();
    expect(screen.getByText("5 lbs")).toBeTruthy();
  });

  it("costs the basket by servings, not per plate", () => {
    render(<ShoppingList flatDays={[]} getRecipe={noRecipes} basket={basket} onClose={() => {}} />);
    // 3*6 + 2*4 = 26
    expect(screen.getByText("$26.00")).toBeTruthy();
  });

  it("lets you take a recipe back off the list", () => {
    const removed = [];
    render(<ShoppingList flatDays={[]} getRecipe={noRecipes} basket={basket} onRemoveFromBasket={(id) => removed.push(id)} onClose={() => {}} />);
    fireEvent.click(screen.getByLabelText("Remove Beef Daube from the shopping list"));
    expect(removed).toEqual(["a"]);
  });

  it("singularises the heading for one recipe", () => {
    render(<ShoppingList flatDays={[]} getRecipe={noRecipes} basket={basket.slice(0, 1)} onClose={() => {}} />);
    expect(screen.getByText("From the library · 1 recipe")).toBeTruthy();
  });
});
