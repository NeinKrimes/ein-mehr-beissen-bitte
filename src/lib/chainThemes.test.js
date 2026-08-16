import { test } from "vitest";
import assert from "node:assert/strict";

import {
  applyChainTheme,
  filterCalorieCapped,
  filterMeatless,
  filterSameCuisine,
  rankMostEconomical,
  scoreMostEconomical,
} from "./chainThemes.js";

const recipes = [
  {
    id: "dal",
    cuisine: "indian",
    dietary_tags: [],
    calories_per_serving: 410,
    price_estimates: [{ estimated_cost_usd: 1.25 }, { estimated_cost_usd: 0.75 }],
  },
  {
    id: "shakshuka",
    cuisine: "middle_eastern",
    dietary_tags: ["contains_egg", "contains_dairy"],
    calories_per_serving: 520,
    estimated_cost_usd: 3.5,
  },
  {
    id: "chicken",
    cuisine: "indian",
    dietary_tags: ["contains_meat", "contains_poultry"],
    calories_per_serving: 390,
    estimated_cost_usd: 4.25,
  },
  {
    id: "unknown",
    cuisine: null,
    dietary_tags: null,
    calories_per_serving: null,
  },
];

test("most-economical ranks every recipe by estimated total cost without filtering", () => {
  const ranked = rankMostEconomical(recipes);

  assert.deepEqual(ranked.map(({ id }) => id), ["dal", "shakshuka", "chicken", "unknown"]);
  assert.equal(ranked.length, recipes.length);
  assert.deepEqual(recipes.map(({ id }) => id), ["dal", "shakshuka", "chicken", "unknown"]);
  assert.equal(scoreMostEconomical(recipes[0]), 2);
  assert.equal(scoreMostEconomical(recipes[3]), Number.POSITIVE_INFINITY);
});

test("same-cuisine returns only exact structured-cuisine matches", () => {
  const result = filterSameCuisine(recipes, " INDIAN ");

  assert.deepEqual(result.map(({ id }) => id), ["dal", "chicken"]);
  assert.ok(result.every(({ cuisine }) => cuisine === "indian"));
});

test("meatless means vegetarian: dairy and egg are allowed but animal flesh is not", () => {
  const candidates = [
    ...recipes,
    { id: "fish", dietary_tags: ["contains_fish"] },
    { id: "shellfish", dietary_tags: ["contains_shellfish"] },
    { id: "explicit-vegetarian", dietary_tags: ["vegetarian", "contains_egg"] },
  ];

  const result = filterMeatless(candidates);

  assert.deepEqual(result.map(({ id }) => id), ["dal", "shakshuka", "explicit-vegetarian"]);
  assert.ok(result.every(({ dietary_tags: tags }) =>
    !tags.some((tag) => ["contains_meat", "contains_poultry", "contains_fish", "contains_shellfish"].includes(tag)),
  ));
});

test("calorie-capped uses per-serving calories and excludes unknown or over-cap recipes", () => {
  const candidates = [
    ...recipes,
    { id: "low-average-high-serving", calories_per_serving: 601, calories_per_chain_average: 200 },
  ];

  const result = filterCalorieCapped(candidates, 500);

  assert.deepEqual(result.map(({ id }) => id), ["dal", "chicken"]);
  assert.ok(result.every(({ calories_per_serving: calories }) => calories <= 500));
});

test("theme dispatcher preserves hard filters even when economical ordering is requested", () => {
  assert.deepEqual(
    applyChainTheme(recipes, "same-cuisine", { cuisine: "indian" }).map(({ id }) => id),
    ["dal", "chicken"],
  );
  assert.deepEqual(
    applyChainTheme(recipes, "meatless").map(({ id }) => id),
    ["dal", "shakshuka"],
  );
  assert.deepEqual(
    applyChainTheme(recipes, "calorie-capped", { maxCaloriesPerServing: 400 }).map(({ id }) => id),
    ["chicken"],
  );
  assert.equal(applyChainTheme(recipes, "most-economical").length, recipes.length);
});

test("invalid theme arguments fail closed instead of weakening a hard constraint", () => {
  assert.throws(() => filterSameCuisine(recipes, ""), /cuisine/i);
  assert.throws(() => filterCalorieCapped(recipes, Number.NaN), /calorie cap/i);
  assert.throws(() => applyChainTheme(recipes, "surprise"), /unknown chain theme/i);
});
