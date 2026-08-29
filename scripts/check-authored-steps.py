"""Flag authored steps that stayed too close to the source prose.

  python3 scripts/check-authored-steps.py data/authored-steps.json

Run this over any new tranche before `npm run build:recipes`. It needs
data/source-recipes.raw.json, which is gitignored, so it only works on a machine
that has run the extractor.

Two signals, both computed against the source method for the same recipe:
  overlap  — share of the authored recipe's content words that appear in the
             source. High is expected (they describe the same cooking), so this
             only matters alongside the next one.
  run      — longest run of consecutive words shared verbatim. This is the one
             that matters: a 7+ word run is a copied clause, not a coincidence.
"""
import json, re, sys, os

ROOT = "/home/adamjroder/projects/NEINKRIMES/ein-mehr-beissen-bitte"
RAW = {r["id"]: r for r in json.load(open(os.path.join(ROOT, "data/source-recipes.raw.json")))}

STOP = set("a an the and or of to in on with until for is it its into then over "
           "at by from as up off out about".split())

# A shared run only means something if it is shared *phrasing*. Ingredient names
# are facts, and a technical instruction has one natural wording — "in a large
# sauté pan over medium-high heat" is not authorship, it is the only way to say
# it. Both are stripped before the run is measured, so what is left is sentence
# structure, which is the thing that must not be copied.
TECHNIQUE = set("""
heat oil butter pan skillet saucepan pot dutch oven large medium high low
minutes minute hours hour degrees stir stirring cook cooked cooking add added
transfer remove season salt pepper black boil simmer bake baked baking sheet
dish qt inch cup cups tbsp tsp lb lbs oz slow cooker cover covered covering
setting sides side brown browned browning until soft softened tender combine
combined whisk together mix bowl plate paper towel lined drain drained heat
sauté sweat deglaze reduce reduced thick thickens preheat rack degrees prepared
nonstick spray coat top tops bottom edges centers center thermometer inserted
registers rest let stand serve serving servings garnish each about more remaining
half whisking constantly evenly discard reserved return returns place
shimmers shimmering element burner broiler broil batch batches tablespoon
rounded pliable masher crushing golden crisp wrap plastic sheets piece pieces
overhang chill chilled thickest part gently warm hot cold cool room temperature
skin lid tight fitting foil tent tented strain strained sieve skim fat surface
""".split())


def words(s):
    return re.findall(r"[a-z0-9]+", s.lower())


def longest_run(a, b):
    """Longest common contiguous word run — classic DP, the sequences are short."""
    best = 0
    prev = [0] * (len(b) + 1)
    for i in range(1, len(a) + 1):
        cur = [0] * (len(b) + 1)
        for j in range(1, len(b) + 1):
            if a[i - 1] == b[j - 1]:
                cur[j] = prev[j - 1] + 1
                best = max(best, cur[j])
        prev = cur
    return best


flagged = 0
for path in sys.argv[1:]:
    batch = json.load(open(path))
    print(f"== {os.path.basename(path)}")
    for rid, entry in batch.items():
        if rid == "_skipped":
            for k, why in entry.items():
                print(f"  SKIP {k}: {why}")
            continue
        src = RAW.get(rid)
        if not src:
            print(f"  !! {rid}: not in the extract")
            flagged += 1
            continue
        srcw = words(" ".join(s["sourceText"] for s in src["steps"]))
        srcset = set(srcw)
        ing = set(words(" ".join(i["item"] for i in src["ingredients"])))
        for i, s in enumerate(entry["steps"]):
            aw = words(s["text"])
            content = [w for w in aw if w not in STOP]
            overlap = sum(w in srcset for w in content) / max(len(content), 1)
            # Measure the run over structural words only.
            keep = lambda ws: [w for w in ws if w not in TECHNIQUE and w not in ing]
            run = longest_run(keep(aw), keep(srcw))
            if run >= 6:
                print(f"  COPY {rid} step {i + 1}: {run}-word structural run, {overlap:.0%} overlap")
                print(f"       {s['text'][:160]}")
                flagged += 1
        n = len(entry["steps"])
        if not 3 <= n <= 9:
            print(f"  STEPS {rid}: {n} steps")
            flagged += 1
        if entry.get("cuisine") == src["cuisine"] and src["cuisine"] in ("Mexican", "French", "Italian", "Japanese"):
            print(f"  ? {rid}: kept the extractor's guess '{src['cuisine']}' — verify it")

print(f"\n{flagged} thing(s) to look at")
