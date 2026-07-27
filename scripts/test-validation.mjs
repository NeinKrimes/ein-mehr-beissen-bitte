import { validateRecipe } from "../supabase/functions/recipe/validator.ts";

const validRecipe = {
  description: "A delicious frugal chicken dish.",
  servings: "4",
  prepTime: "15 min",
  cookTime: "45 min",
  passiveTip: "Enjoy a cup of tea while it simmers.",
  ingredients: [
    { amount: "2", unit: "lbs", item: "chicken thighs" }
  ],
  steps: [
    { n: 1, title: "Prep chicken", text: "Cut chicken thighs into bite-sized pieces." }
  ],
  frugalTips: ["Save the bones for stock.", "Buy in bulk."],
  leftoversUse: "Shred the remaining chicken for tacos tomorrow.",
  calories: 540,
  protein_g: 32,
  carbs_g: 48,
  fat_g: 22,
  est_cost_usd: 2.10
};

const testCases = [
  {
    name: "Valid Recipe",
    recipe: validRecipe,
    expectedErrors: 0
  },
  {
    name: "Missing description",
    recipe: { ...validRecipe, description: "" },
    expectedErrors: 1,
    mustContain: "description"
  },
  {
    name: "Empty servings",
    recipe: { ...validRecipe, servings: "" },
    expectedErrors: 1,
    mustContain: "servings"
  },
  {
    name: "Missing passiveTip",
    recipe: { ...validRecipe, passiveTip: undefined },
    expectedErrors: 1,
    mustContain: "passiveTip"
  },
  {
    name: "Missing ingredients array",
    recipe: { ...validRecipe, ingredients: undefined },
    expectedErrors: 1,
    mustContain: "ingredients"
  },
  {
    name: "Ingredient with missing item",
    recipe: {
      ...validRecipe,
      ingredients: [{ amount: "1", unit: "cup", item: "" }]
    },
    expectedErrors: 1,
    mustContain: "item"
  },
  {
    name: "Empty steps array",
    recipe: { ...validRecipe, steps: [] },
    expectedErrors: 1,
    mustContain: "steps"
  },
  {
    name: "Step with invalid n type",
    recipe: {
      ...validRecipe,
      steps: [{ n: "1", title: "Step 1", text: "Prep" }]
    },
    expectedErrors: 1,
    mustContain: "n"
  },
  {
    name: "Missing nutrition / cost fields (calories is string)",
    recipe: { ...validRecipe, calories: "540" },
    expectedErrors: 1,
    mustContain: "calories"
  },
  {
    name: "Missing cost",
    recipe: { ...validRecipe, est_cost_usd: undefined },
    expectedErrors: 1,
    mustContain: "est_cost_usd"
  }
];

let failedTests = 0;

console.log("Running validator tests...\n");

for (const tc of testCases) {
  const errors = validateRecipe(tc.recipe);
  const passedCount = errors.length === tc.expectedErrors;
  let passedMatch = true;
  if (tc.mustContain) {
    passedMatch = errors.some(e => e.includes(tc.mustContain));
  }

  if (passedCount && passedMatch) {
    console.log(`✓ Passed: [${tc.name}]`);
  } else {
    failedTests++;
    console.error(`✗ Failed: [${tc.name}]`);
    console.error(`  Expected ${tc.expectedErrors} errors containing '${tc.mustContain || ""}'`);
    console.error(`  Got ${errors.length} errors:`, errors);
  }
}

console.log(`\nTests finished. Failed: ${failedTests}/${testCases.length}`);
if (failedTests > 0) {
  process.exit(1);
} else {
  console.log("All validator tests passed successfully!");
}
