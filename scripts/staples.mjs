/**
 * Which ingredients are staples — things worth keeping in the house — and how
 * to recognise one in a recipe's ingredient line.
 *
 * Used by build-source-recipes.mjs to precompute the pantry summary into the
 * eager index, so the app can show it without pulling the corpus chunk.
 */

// Prep and grade words describe what you do to a thing, or which shelf it came
// from. "minced fresh garlic" and "garlic cloves" are one shopping item.
const PREP = [
  "minced", "chopped", "diced", "sliced", "grated", "shredded", "crushed", "cubed",
  "julienned", "halved", "quartered", "trimmed", "peeled", "seeded", "stemmed",
  "drained", "rinsed", "melted", "softened", "toasted", "roasted", "cooked", "uncooked",
  "fresh", "freshly", "frozen", "thawed", "dried", "canned", "jarred", "packed",
  "divided", "optional", "low.sodium", "reduced.sodium", "unsalted", "salted", "kosher",
  "coarse", "fine", "extra.virgin", "virgin", "whole", "skim", "large", "small", "medium",
  "thick.sliced", "thin.sliced", "boneless", "skinless", "bone.in", "lean", "thick", "thin",
  "ripe", "purchased", "refrigerated", "prepared", "store.bought", "room.temperature",
  "cold", "warm", "hot", "good.quality",
].join("|");
const PREP_RE = new RegExp(`\\b(${PREP})\\b`, "gi");

// Hyphenated grade compounds have to go as a unit. Dropping only "whole" from
// "whole-milk ricotta" leaves "milk" behind and books the ricotta as a milk
// purchase. The spaced form ("whole milk") is left alone — that really is milk.
const GRADE_RE = /\b(whole|part|low|non|full|reduced|extra)-(milk|skim|fat|free|sodium|virgin)\b/gi;

/** Reduce an ingredient line to the thing itself. */
export function cleanItem(item) {
  return String(item ?? "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")   // (15 oz.), (such as Barilla)
    .split(",")[0]                 // ", diced" and friends
    .replace(GRADE_RE, " ")
    .replace(PREP_RE, " ")
    .replace(/[^\p{L}' ]+/gu, " ") // keep letters so jalapeño survives
    .replace(/\s+/g, " ")
    .trim();
}

// Comes from the tap or the cupboard-forever shelf; not a shopping decision.
const NOT_SHOPPING = /^(water|ice|ice cubes|nonstick spray|cooking spray)$/i;

// name -> pattern tested against the cleaned line. `group` is where it lives in
// a kitchen, which is also the order you shop in.
export const STAPLES = [
  ["Salt", "seasoning", /\bsalt\b/],
  ["Black pepper", "seasoning", /black pepper|^pepper$|peppercorn/],
  ["Olive oil", "oil & vinegar", /olive oil/],
  ["Garlic", "produce", /\bgarlic\b(?! powder| salt)/],
  ["Onion", "produce", /\bonions?\b(?! powder)|shallot/],
  ["Butter", "dairy", /\bbutter\b(?!milk)/],
  ["Chicken broth", "pantry", /chicken (broth|stock)/],
  ["Vinegar", "oil & vinegar", /vinegar/],
  ["All-purpose flour", "baking", /all.purpose flour|^flour$/],
  ["Vegetable oil", "oil & vinegar", /vegetable oil|canola oil|^oil$|peanut oil|grapeseed oil/],
  ["Eggs", "dairy", /^eggs?$|^egg (yolk|white)/],
  ["Carrots", "produce", /\bcarrots?\b/],
  ["Milk", "dairy", /\bmilk\b/],
  ["Fresh tomatoes", "produce", /^tomato(es)?$|roma tomato|cherry tomato|grape tomato|plum tomato/],
  ["Thyme", "herbs & spices", /\bthyme\b/],
  ["Scallions", "produce", /scallion|green onion/],
  ["Dry white wine", "pantry", /white wine(?! vinegar)|dry vermouth|sherry/],
  ["Tomato paste", "pantry", /tomato paste/],
  ["Cilantro", "produce", /cilantro/],
  ["Potatoes", "produce", /\bpotato(es)?\b/],
  ["Parmesan", "dairy", /parmesan|pecorino/],
  ["Sugar", "baking", /granulated sugar|^sugar$|brown sugar|powdered sugar/],
  ["Mushrooms", "produce", /mushroom/],
  ["Bell peppers", "produce", /bell pepper/],
  ["Parsley", "produce", /parsley/],
  ["Ginger", "produce", /\bginger\b(?!snap| ale)/],
  ["Canned tomatoes", "pantry", /(diced|crushed|whole|stewed|fire.roasted) tomatoes|tomato sauce|tomatoes in/],
  ["Lemons", "produce", /lemon (juice|zest)|^lemons?$/],
  ["Cumin", "herbs & spices", /\bcumin\b/],
  ["Bay leaves", "herbs & spices", /bay lea/],
  ["Heavy cream", "dairy", /heavy cream|whipping cream|^cream$/],
  ["Bacon", "meat", /\bbacon\b/],
  ["Beef broth", "pantry", /beef (broth|stock)/],
  ["Celery", "produce", /\bcelery\b(?! root| salt)/],
  ["Dried oregano", "herbs & spices", /\boregano\b/],
  ["Jalapeños", "produce", /jalape/],
  ["Limes", "produce", /lime (juice|zest)|^limes?$/],
  ["Red pepper flakes", "herbs & spices", /pepper flakes/],
  ["Soy sauce", "pantry", /soy sauce|tamari/],
  ["Dijon mustard", "pantry", /dijon|mustard(?! seed| powder| greens)/],
  ["Spinach", "produce", /spinach/],
  ["Rice", "pantry", /\brice\b(?! vinegar| wine| noodles| paper)/],
  ["Rosemary", "herbs & spices", /rosemary/],
  ["Basil", "produce", /\bbasil\b/],
  ["Cayenne", "herbs & spices", /cayenne/],
  ["Panko/breadcrumbs", "pantry", /panko|bread ?crumbs/],
  ["Ground beef", "meat", /ground (beef|chuck|round|sirloin)/],
  ["Nutmeg", "herbs & spices", /nutmeg/],
  ["Coriander", "herbs & spices", /\bcoriander\b/],
  ["Dry red wine", "pantry", /red wine(?! vinegar)/],
  ["Honey", "pantry", /\bhoney\b/],
  ["Chives", "produce", /chives/],
  ["Sage", "herbs & spices", /\bsage\b/],
  ["Black beans", "pantry", /black beans/],
  ["Half-and-half", "dairy", /half.and.half/],
  ["Cream cheese", "dairy", /cream cheese/],
  ["Avocado", "produce", /avocado/],
  ["Chili powder", "herbs & spices", /chili powder|chile powder/],
  ["Cornstarch", "baking", /cornstarch/],
  ["Chicken thighs/breasts", "meat", /chicken (thigh|breast|drumstick|leg)/],
  ["Sour cream", "dairy", /sour cream/],
  ["Italian seasoning", "herbs & spices", /italian seasoning/],
  ["Mayonnaise", "pantry", /mayonnaise|\bmayo\b/],
  ["Worcestershire", "pantry", /worcestershire/],
  ["Paprika", "herbs & spices", /paprika/],
  ["Garlic powder", "herbs & spices", /garlic powder/],
  ["Cheddar", "dairy", /cheddar/],
  ["Baking powder", "baking", /baking powder/],
  ["Sesame oil", "oil & vinegar", /sesame oil/],
  ["Cinnamon", "herbs & spices", /cinnamon/],
  ["Vegetable broth", "pantry", /vegetable (broth|stock)/],
  ["Mozzarella", "dairy", /mozzarella/],
  ["Baking soda", "baking", /baking soda/],
];

/**
 * Every staple named by one ingredient line. A line can name more than one —
 * "salt and black pepper" is two things you keep in the house — so this tests
 * every pattern rather than stopping at the first hit.
 */
export function staplesIn(cleaned) {
  if (!cleaned || NOT_SHOPPING.test(cleaned)) return [];
  return STAPLES.filter(([, , rx]) => rx.test(cleaned)).map(([name]) => name);
}

/**
 * Rank staples by how many recipes call for them, and measure how far a pantry
 * of the top N gets you.
 */
export function analyseStaples(recipes) {
  const usedBy = new Map(STAPLES.map(([name]) => [name, new Set()]));
  const group = new Map(STAPLES.map(([name, g]) => [name, g]));
  // Per recipe: the cleaned lines and the staples each names, kept so the
  // coverage curve does not have to re-clean everything for each pantry size.
  const perRecipe = recipes.map((r) => ({
    id: r.id,
    lines: (r.ingredients ?? [])
      .map((ing) => cleanItem(ing.item))
      .filter((c) => c && !NOT_SHOPPING.test(c))
      .map((c) => staplesIn(c)),
  }));

  for (const { id, lines } of perRecipe) {
    for (const names of lines) for (const n of names) usedBy.get(n).add(id);
  }

  const ranked = [...usedBy.entries()]
    .map(([name, ids]) => ({
      name,
      group: group.get(name),
      recipes: ids.size,
      share: recipes.length ? ids.size / recipes.length : 0,
    }))
    .filter((s) => s.recipes > 0)
    .sort((a, b) => b.recipes - a.recipes || a.name.localeCompare(b.name));

  // How much of the shopping a pantry of the top N actually removes.
  const totalLines = perRecipe.reduce((n, r) => n + r.lines.length, 0);
  const coverage = [10, 20, 30, 40, 50, ranked.length]
    .filter((n, i, a) => n <= ranked.length && a.indexOf(n) === i)
    .map((n) => {
      const have = new Set(ranked.slice(0, n).map((s) => s.name));
      let covered = 0;
      let withinFour = 0;
      for (const { lines } of perRecipe) {
        let extras = 0;
        for (const names of lines) {
          if (names.some((x) => have.has(x))) covered++;
          else extras++;
        }
        if (extras <= 4) withinFour++;
      }
      return {
        pantry: n,
        linesCovered: totalLines ? covered / totalLines : 0,
        recipesWithinFourExtras: withinFour,
      };
    });

  return { ranked, coverage, totalLines, recipeCount: recipes.length };
}
