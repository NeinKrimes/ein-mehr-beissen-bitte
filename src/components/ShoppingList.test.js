import { describe, it, expect } from "vitest";
import { aggregate, weekTotalCost } from "./ShoppingList.jsx";

describe("ShoppingList helpers", () => {
  describe("aggregate", () => {
    it("combines like items with matching units and sums their amounts", () => {
      const recipes = [
        {
          ingredients: [
            { amount: "2", unit: "lbs", item: "chicken thighs" },
            { amount: "1", unit: "cup", item: "rice" }
          ]
        },
        {
          ingredients: [
            { amount: "1.5", unit: "lbs", item: "chicken thighs" },
            { amount: "2", unit: "cups", item: "water" }
          ]
        }
      ];

      const result = aggregate(recipes);

      expect(result.get("chicken thighs").get("lbs")).toBe(3.5);
      expect(result.get("rice").get("cup")).toBe(1);
      expect(result.get("water").get("cups")).toBe(2);
    });

    it("keeps the same item with different units separate", () => {
      const recipes = [
        {
          ingredients: [
            { amount: "1", unit: "tbsp", item: "soy sauce" }
          ]
        },
        {
          ingredients: [
            { amount: "2", unit: "tsp", item: "soy sauce" }
          ]
        }
      ];

      const result = aggregate(recipes);

      expect(result.get("soy sauce").get("tbsp")).toBe(1);
      expect(result.get("soy sauce").get("tsp")).toBe(2);
    });

    it("skips missing/null recipes / ingredients safely", () => {
      const recipes = [
        {
          ingredients: [
            { amount: "2", unit: "pcs", item: "eggs" }
          ]
        },
        {
          // missing ingredients field
        },
        {
          ingredients: null // null ingredients
        },
        {
          ingredients: [
            { amount: "non-numeric", unit: "pinch", item: "salt" },
            { amount: null, unit: "pinch", item: "pepper" },
            { item: "" } // empty item
          ]
        }
      ];

      const result = aggregate(recipes);

      expect(result.get("eggs").get("pcs")).toBe(2);
      expect(result.get("salt").get("pinch")).toBeNull();
      expect(result.get("pepper").get("pinch")).toBeNull();
      expect(result.has("")).toBe(false);
    });
  });

  describe("weekTotalCost", () => {
    it("sums est_cost_usd sensibly with nulls present", () => {
      const recipes = [
        { est_cost_usd: "2.50", servings: 4 }, // 10.00
        { est_cost_usd: null, servings: 2 }, // Number(null) is 0 -> 0.00
        { est_cost_usd: 1.25 }, // default servings is 4 -> 5.00
        { est_cost_usd: undefined, servings: 3 }, // Number(undefined) is NaN -> skipped
        { est_cost_usd: "invalid", servings: 2 } // Number("invalid") is NaN -> skipped
      ];

      const total = weekTotalCost(recipes);
      expect(total).toBe(15.00); // 10 + 0 + 5
    });
  });
});
