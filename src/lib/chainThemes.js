const ANIMAL_FLESH_TAGS = new Set([
  "contains_meat",
  "contains_poultry",
  "contains_fish",
  "contains_shellfish",
  "meat",
  "poultry",
  "fish",
  "shellfish",
]);

function requireRecipes(recipes) {
  if (!Array.isArray(recipes)) {
    throw new TypeError("recipes must be an array");
  }
}

function normalize(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function nonNegativeNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

/**
 * Returns the estimated total recipe cost; lower scores are more economical.
 * A recipe-level estimate takes precedence over ingredient estimate rows.
 */
export function scoreMostEconomical(recipe) {
  const directEstimate = nonNegativeNumber(recipe?.estimated_cost_usd)
    ?? nonNegativeNumber(recipe?.est_cost_usd);

  if (directEstimate !== null) {
    return directEstimate;
  }

  if (!Array.isArray(recipe?.price_estimates) || recipe.price_estimates.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  let total = 0;
  for (const estimate of recipe.price_estimates) {
    const value = nonNegativeNumber(estimate?.estimated_cost_usd);
    if (value === null) {
      return Number.POSITIVE_INFINITY;
    }
    total += value;
  }

  return total;
}

/** Ranks all candidates and never removes a recipe. */
export function rankMostEconomical(recipes) {
  requireRecipes(recipes);

  return recipes
    .map((recipe, index) => ({ recipe, index, score: scoreMostEconomical(recipe) }))
    .sort((left, right) => left.score - right.score || left.index - right.index)
    .map(({ recipe }) => recipe);
}

/** Hard filter: every returned recipe has the requested structured cuisine. */
export function filterSameCuisine(recipes, cuisine) {
  requireRecipes(recipes);
  const expectedCuisine = normalize(cuisine);
  if (!expectedCuisine) {
    throw new TypeError("cuisine must be a non-empty string");
  }

  return recipes.filter((recipe) => normalize(recipe?.cuisine) === expectedCuisine);
}

/**
 * Hard filter implementing vegetarian meatless semantics.
 * Dairy and egg are allowed; meat, poultry, fish, and shellfish are excluded.
 */
export function filterMeatless(recipes) {
  requireRecipes(recipes);

  return recipes.filter((recipe) => {
    if (!Array.isArray(recipe?.dietary_tags)) {
      return false;
    }

    return recipe.dietary_tags.every((tag) => !ANIMAL_FLESH_TAGS.has(normalize(tag)));
  });
}

/** Hard filter: the cap applies to each recipe's per-serving calories. */
export function filterCalorieCapped(recipes, maxCaloriesPerServing) {
  requireRecipes(recipes);
  const cap = nonNegativeNumber(maxCaloriesPerServing);
  if (cap === null) {
    throw new TypeError("calorie cap must be a finite non-negative number");
  }

  return recipes.filter((recipe) => {
    const calories = nonNegativeNumber(recipe?.calories_per_serving);
    return calories !== null && calories <= cap;
  });
}

export function applyChainTheme(recipes, theme, options = {}) {
  switch (theme) {
    case "most-economical":
      return rankMostEconomical(recipes);
    case "same-cuisine":
      return filterSameCuisine(recipes, options.cuisine);
    case "meatless":
      return filterMeatless(recipes);
    case "calorie-capped":
      return filterCalorieCapped(recipes, options.maxCaloriesPerServing);
    default:
      throw new RangeError(`Unknown chain theme: ${String(theme)}`);
  }
}
