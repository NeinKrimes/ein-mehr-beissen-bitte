/**
 * Validates a parsed recipe JSON object against the expected recipe schema.
 * Returns an array of error messages. If empty, the object is valid.
 */
export function validateRecipe(recipe: any): string[] {
  const errors: string[] = [];

  if (!recipe || typeof recipe !== "object") {
    errors.push("Recipe must be a JSON object.");
    return errors;
  }

  // 1. description (2-sentence description)
  if (typeof recipe.description !== "string" || recipe.description.trim() === "") {
    errors.push("Missing or invalid 'description' (must be a non-empty string).");
  }

  // 2. servings
  if (
    typeof recipe.servings !== "string" &&
    typeof recipe.servings !== "number"
  ) {
    errors.push("Missing or invalid 'servings' (must be a string or number).");
  } else if (String(recipe.servings).trim() === "") {
    errors.push("'servings' cannot be empty.");
  }

  // 3. prepTime
  if (typeof recipe.prepTime !== "string" || recipe.prepTime.trim() === "") {
    errors.push("Missing or invalid 'prepTime' (must be a non-empty string).");
  }

  // 4. cookTime
  if (typeof recipe.cookTime !== "string" || recipe.cookTime.trim() === "") {
    errors.push("Missing or invalid 'cookTime' (must be a non-empty string).");
  }

  // 5. passiveTip
  if (typeof recipe.passiveTip !== "string") {
    errors.push("Missing or invalid 'passiveTip' (must be a string).");
  }

  // 6. ingredients
  if (!Array.isArray(recipe.ingredients)) {
    errors.push("Missing or invalid 'ingredients' (must be an array).");
  } else {
    recipe.ingredients.forEach((ing: any, i: number) => {
      if (!ing || typeof ing !== "object") {
        errors.push(`Ingredient at index ${i} is not an object.`);
      } else {
        if (typeof ing.item !== "string" || ing.item.trim() === "") {
          errors.push(`Ingredient at index ${i} has a missing or invalid 'item' (must be a non-empty string).`);
        }
        if (ing.amount !== undefined && ing.amount !== null && typeof ing.amount !== "string" && typeof ing.amount !== "number") {
          errors.push(`Ingredient at index ${i} has an invalid 'amount' (must be a string or number).`);
        }
        if (ing.unit !== undefined && ing.unit !== null && typeof ing.unit !== "string") {
          errors.push(`Ingredient at index ${i} has an invalid 'unit' (must be a string).`);
        }
      }
    });
  }

  // 7. steps
  if (!Array.isArray(recipe.steps) || recipe.steps.length === 0) {
    errors.push("Missing or invalid 'steps' (must be a non-empty array).");
  } else {
    recipe.steps.forEach((step: any, i: number) => {
      if (!step || typeof step !== "object") {
        errors.push(`Step at index ${i} is not an object.`);
      } else {
        if (typeof step.n !== "number") {
          errors.push(`Step at index ${i} has a missing or invalid 'n' (must be a number).`);
        }
        if (typeof step.title !== "string" || step.title.trim() === "") {
          errors.push(`Step at index ${i} has a missing or invalid 'title' (must be a non-empty string).`);
        }
        if (typeof step.text !== "string" || step.text.trim() === "") {
          errors.push(`Step at index ${i} has a missing or invalid 'text' (must be a non-empty string).`);
        }
      }
    });
  }

  // 8. frugalTips
  if (!Array.isArray(recipe.frugalTips)) {
    errors.push("Missing or invalid 'frugalTips' (must be an array).");
  } else {
    recipe.frugalTips.forEach((tip: any, i: number) => {
      if (typeof tip !== "string" || tip.trim() === "") {
        errors.push(`Frugal tip at index ${i} must be a non-empty string.`);
      }
    });
  }

  // 9. leftoversUse
  if (typeof recipe.leftoversUse !== "string" || recipe.leftoversUse.trim() === "") {
    errors.push("Missing or invalid 'leftoversUse' (must be a non-empty string).");
  }

  // 10. calories
  if (typeof recipe.calories !== "number") {
    errors.push("Missing or invalid 'calories' (must be a number).");
  }

  // 11. protein_g
  if (typeof recipe.protein_g !== "number") {
    errors.push("Missing or invalid 'protein_g' (must be a number).");
  }

  // 12. carbs_g
  if (typeof recipe.carbs_g !== "number") {
    errors.push("Missing or invalid 'carbs_g' (must be a number).");
  }

  // 13. fat_g
  if (typeof recipe.fat_g !== "number") {
    errors.push("Missing or invalid 'fat_g' (must be a number).");
  }

  // 14. est_cost_usd
  if (typeof recipe.est_cost_usd !== "number") {
    errors.push("Missing or invalid 'est_cost_usd' (must be a number).");
  }

  return errors;
}
