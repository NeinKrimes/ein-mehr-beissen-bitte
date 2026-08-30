"""Stage 1: structure-aware extraction of recipes from the source magazine PDFs.

    RECIPE_PDF_DIR=~/path/to/pdfs python3 scripts/extract-source-recipes.py

Writes data/source-recipes.raw.json, which is gitignored: it holds the source
publisher's method prose. Only ingredient lists (uncopyrightable) and our own
rewritten steps in data/authored-steps.json reach src/. Run stage 2 with
`npm run build:recipes`.

Structure-aware because the magazine's own typography encodes the schema.

The magazine sets every element in a distinct style, so we read the layout
rather than guessing from word order:

    12.0pt red            -> recipe title (+ second line = subtitle)
     9.0pt red bold       -> the bold lead-in that opens each method step
     9.3pt black          -> ingredient lines
     9.0pt black          -> method body
     8.0pt black          -> "Makes N servings" / "Total time:"
     6.0pt black          -> "Per serving:" nutrition footer (ends the recipe)
     8.8pt semibold       -> photo caption / sidebar tip (dropped)
     9.0pt italic         -> headnote prose (dropped - copyrightable, unused)

Emits parsed.json: verbatim ingredients + the source method, split into steps
with the magazine's own lead-in as each step's title. Stage 2 rewrites the step
prose in the app's voice; nothing from `sourceText` is ever committed.
"""
import glob, json, os, re, unicodedata, collections
import pymupdf

SRC = os.environ.get("RECIPE_PDF_DIR", "")
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")

def is_red(c):
    """Accent red varies by issue (c4151c, c4161c, bf0d3e...), so test the channels."""
    r, g, b = (c >> 16) & 255, (c >> 8) & 255, c & 255
    return r >= 0x90 and g <= 0x75 and b <= 0x75


def is_bold(font):
    # "Semibold" deliberately excluded - that weight is captions and sidebar tips.
    return "Bold" in font or "Black" in font
FRACTIONS = {"¼": "1/4", "½": "1/2", "¾": "3/4", "⅓": "1/3", "⅔": "2/3", "⅛": "1/8", "⅜": "3/8", "⅝": "5/8", "⅞": "7/8"}
UNITS = ["Tbsp.", "Tbsp", "tsp.", "tsp", "cups", "cup", "oz.", "oz", "lbs.", "lb.", "lb", "pkg.", "pkg",
         "cloves", "clove", "sprigs", "sprig", "cans", "can", "bunch", "heads", "head", "ribs", "rib",
         "slices", "slice", "strips", "strip", "sheets", "sheet", "quarts", "quart", "pints", "pint",
         "sticks", "stick", "ears", "ear", "bags", "bag", "boxes", "box", "pinch", "dash", "qt.", "gal."]

CUISINE_HINTS = [
    ("Mexican", r"tortilla|salsa|jalape|chipotle|poblano|tomatillo|carnitas|enchilada|pozole|masa harina|queso|adobo|cotija|chorizo|hominy|ancho"),
    ("Italian", r"parmesan|risotto|pesto|mozzarella|marinara|pancetta|prosciutto|polenta|gnocchi|lasagna|mascarpone|pappardelle|ricotta"),
    ("Thai", r"fish sauce|lemongrass|red curry paste|green curry paste|galangal|kaffir"),
    ("Chinese", r"hoisin|five-spice|oyster sauce|bok choy|wonton|szechuan|sichuan|char siu|shaoxing"),
    ("Japanese", r"miso|dashi|mirin|sake\b|panko|wasabi|nori|teriyaki|tamari|udon|soba|edamame"),
    ("Indian", r"garam masala|curry powder|turmeric|basmati|naan|tikka|tandoori|cardamom|ghee"),
    ("French", r"gruy|beurre|baguette|tarragon|herbes de provence|creme fra|brie\b|nicoise"),
    ("Greek", r"feta|kalamata|tzatziki|phyllo|halloumi|avgolemono|orzo"),
    ("Jamaican", r"jerk|scotch bonnet|callaloo|plantain"),
    ("Vietnamese", r"\bpho\b|banh mi|nuoc cham|rice stick noodle"),
]


# An ingredient line that ends mid-phrase is continued on the next row.
CONT_RE = re.compile(r"(,|\band|\bor|\bwith|\bof|\bin|\beach|\(|-|–)\s*$", re.I)


def clean_group(t):
    """'FOR THE DRUMSTICKS, COMBINE:' -> 'For the drumsticks'."""
    g = norm(t).rstrip(":")
    g = re.sub(r"^FOR THE\s+", "", g, flags=re.I)
    g = re.sub(r",\s*[A-Z ]+$", "", g)
    g = g.strip(" ,")
    return (g[:1].upper() + g[1:].lower()) if g.isupper() else g


def norm(s):
    return re.sub(r"\s+", " ", unicodedata.normalize("NFC", s)).strip()


def slug(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"-+", "-", re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower())


def page_lines(page):
    """Flatten a page into styled lines, dropping furniture we never want."""
    out = []
    for b in page.get_text("dict")["blocks"]:
        for l in b.get("lines", []):
            spans = [s for s in l["spans"] if s["text"].strip()]
            if not spans:
                continue
            # Rebuild the line, closing up the gaps that split stacked fractions.
            text, prev = "", None
            for s in spans:
                if prev is not None and s["bbox"][0] - prev > 1.2:
                    text += " "
                text += s["text"]
                prev = s["bbox"][2]
            text = norm(text)
            if not text:
                continue
            big = max(s["size"] for s in spans)
            lead = spans[0]
            # The magazine sets each step's lead-in in bold; capture it from the
            # spans rather than guessing at the words later.
            bold_text, i = "", 0
            while i < len(spans) and is_bold(spans[i]["font"]):
                bold_text += (" " if bold_text else "") + spans[i]["text"]
                i += 1
            all_bold = i == len(spans)
            out.append({
                "text": text,
                "size": round(big, 1),
                "color": lead["color"],
                "font": lead["font"],
                # Later issues set the step lead-in in black bold instead of red,
                # so key on weight and size, not colour.
                "redlead": is_bold(lead["font"]) and lead["size"] < 11,
                "red": is_red(lead["color"]),
                "italic": "It" in lead["font"] and "Bold" not in lead["font"],
                "semibold": "Semibold" in lead["font"],
                "boldText": norm(bold_text), "allBold": all_bold,
                "x": round(l["bbox"][0]), "y": round(l["bbox"][1]),
            })
    return out


def classify(l):
    sz, t = l["size"], l["text"]
    if sz <= 9.6 and re.fullmatch(r"[\d/⁄]+", t):
        return "ing"
    if sz >= 11.5 and (is_bold(l["font"]) or is_red(l["color"])):
        return "title"
    if sz <= 6.6:
        return "nutrition"
    if l["semibold"] or l["italic"]:
        return "drop"
    if 7.6 <= sz <= 8.4 and re.match(r"^(Makes|Serves|Total time)", t, re.I):
        return "meta"
    if 7.4 <= sz <= 8.4 and is_bold(l["font"]):
        return "group"
    if 9.15 <= sz <= 9.6:
        return "ing"
    if 8.6 <= sz <= 9.14:
        return "step"
    return "drop"


def order_reading(lines):
    """Column-major: cluster left edges into columns, then top-to-bottom.

    Within a column, fragments sharing a visual row are merged left-to-right —
    an ingredient's quantity and its text, or a step's bold lead-in and body,
    are separate PDF lines at the same y."""
    xs = sorted({l["x"] for l in lines})
    cols, cur = [], []
    for x in xs:
        if cur and x - cur[-1] > 40:
            cols.append(cur); cur = []
        cur.append(x)
    if cur:
        cols.append(cur)
    idx = {x: i for i, c in enumerate(cols) for x in c}
    # Stacked fractions sit at slightly different y ("1" / "/" / "4"), so snap
    # y into rows first; otherwise they sort after the text and read "1 / 4".
    ys = sorted({l["y"] for l in lines})
    row, rows = 0, {}
    for n, y in enumerate(ys):
        if n and y - ys[n - 1] > 3:
            row += 1
        rows[y] = row
    ordered = sorted(lines, key=lambda l: (idx[l["x"]], rows[l["y"]], l["x"]))

    merged = []
    for l in ordered:
        p = merged[-1] if merged else None
        if (p and idx[p["x"]] == idx[l["x"]] and rows[p["_y0"]] == rows[l["y"]]
                and l["x"] - p["_xr"] < 90):
            p["text"] = norm(p["text"] + " " + l["text"])
            p["size"] = max(p["size"], l["size"])
            p["_xr"] = max(p["_xr"], l["x"])
            if p["_leadOpen"]:
                if l["boldText"]:
                    p["boldText"] = norm(p["boldText"] + " " + l["boldText"])
                p["_leadOpen"] = l["allBold"]
            continue
        m = dict(l)
        m["_y0"], m["_xr"], m["_leadOpen"] = l["y"], l["x"], l["allBold"]
        merged.append(m)
    return merged


def split_ingredient(text, group):
    s = text
    for k, v in FRACTIONS.items():
        s = s.replace(k, v)
    s = norm(s)
    m = re.match(r"^((?:\d+\s+)?\d+\s*/\s*\d+|\d+(?:\.\d+)?(?:\s*[-–]\s*\d+(?:\.\d+)?)?)\s+(.*)$", s)
    amount, rest = (norm(m.group(1)).replace(" /", "/").replace("/ ", "/"), m.group(2)) if m else ("", s)
    amount = re.sub(r"^(\d+?)(\d/\d)$", r"\1 \2", amount)
    unit = ""
    for u in UNITS:
        if rest.lower().startswith(u.lower() + " "):
            unit, rest = u, rest[len(u):].strip()
            break
    return {"amount": amount, "unit": unit, "item": norm(rest), "group": group}


def guess_cuisine(blob):
    b = blob.lower()
    best, score = "American", 0
    for name, pat in CUISINE_HINTS:
        n = len(re.findall(pat, b))
        if n > score:
            best, score = name, n
    return best


def parse_nutrition(text):
    out = {}
    for key, pat in [("calories", r"([\d,]+)\s*cal"), ("fat_g", r"([\d.]+)g\s+total fat"),
                     ("carbs_g", r"([\d.]+)g\s+carb"), ("protein_g", r"([\d.]+)g\s+protein"),
                     ("fiber_g", r"([\d.]+)g\s+fiber"), ("sodium_mg", r"([\d,]+)mg\s+sodium")]:
        m = re.search(pat, text, re.I)
        if m:
            try:
                out[key] = round(float(m.group(1).replace(",", "")))
            except ValueError:
                pass
    return out


def flush(rec):
    """Turn an accumulated recipe buffer into the structured record."""
    if not rec.get("title") or len(rec["ing"]) < 3 or not rec["steps"]:
        return None
    steps, n = [], 0
    for lead, body in rec["steps"]:
        text = norm((lead + " " + body) if lead else body)
        if len(text) < 12:
            continue
        n += 1
        steps.append({"n": n, "lead": norm(lead).rstrip(":") or None, "sourceText": text})
    if not steps:
        return None
    ings = [split_ingredient(t, g) for g, t in rec["ing"]]
    ings = [i for i in ings if len(i["item"]) > 2]
    if len(ings) < 3:
        return None
    blob = rec["title"] + " " + " ".join(i["item"] for i in ings)
    out = {
        "id": slug(rec["title"] + ("-" + rec["subtitle"] if rec["subtitle"] else ""))[:64],
        "title": rec["title"], "subtitle": rec["subtitle"],
        "source": rec["source"], "page": rec["page"],
        "servings": rec["servings"], "totalTime": rec["totalTime"],
        "cuisine": guess_cuisine(blob),
        "ingredients": ings, "steps": steps,
    }
    out.update(parse_nutrition(rec["nutrition"]))
    return out


def parse_pdf(path):
    doc = pymupdf.open(path)
    src = os.path.basename(path)[:-4]
    found = []
    for pno, page in enumerate(doc):
        lines = [l for l in page_lines(page) if classify(l) != "drop"]
        rec, group = None, ""
        for l in order_reading(lines):
            kind, t = classify(l), l["text"]
            if kind == "title":
                # A title often runs to a second line ("Ginger-Jasmine Tea" /
                # "Sushi Rice") or is followed by a lowercase subtitle ("with
                # broccoli & shiitake mushrooms"). Neither starts a new recipe.
                if rec and not rec["ing"] and not rec["steps"]:
                    # Only a genuine second line of the title, never a headnote
                    # that happens to be set large ("Baked ziti is something...").
                    joined = norm(rec["title"] + " " + t)
                    if t[:1].islower():
                        rec["subtitle"] = norm(rec["subtitle"] + " " + t)
                        continue
                    if len(joined) <= 46 and len(joined.split()) <= 7 and not re.search(r"[.!?,;]", joined):
                        rec["title"] = joined
                        continue
                    r = flush(rec)
                    if r:
                        found.append(r)
                if rec:
                    r = flush(rec)
                    if r:
                        found.append(r)
                rec = {"title": t, "subtitle": "", "ing": [], "steps": [], "servings": "",
                       "totalTime": "", "nutrition": "", "source": src, "page": pno + 1,
                       "ingX": None, "closing": False}
                group = ""
                continue
            if rec is None:
                continue
            if rec["closing"] and kind != "nutrition":
                r = flush(rec)
                if r:
                    found.append(r)
                rec = None
                continue
            if kind == "title":
                continue
            if kind == "group":
                group = clean_group(t)
                continue
            if kind == "meta":
                if re.match(r"^Total time", t, re.I):
                    rec["totalTime"] = norm(re.sub(r"^Total time:\s*", "", t))
                else:
                    rec["servings"] = t
                continue
            if kind == "ing":
                if not rec["steps"]:
                    if t.isupper() or (t.endswith(":") and len(t) < 46):
                        group = clean_group(t)
                        continue
                    # A wrapped ingredient ("shiitake mushrooms," / "stemmed")
                    # continues the line above; a genuinely new unquantified one
                    # ("Salt and black pepper") does not. The previous line's
                    # trailing punctuation is what tells them apart.
                    indented = rec["ingX"] is not None and l["x"] > rec["ingX"] + 4
                    if rec["ingX"] is None or l["x"] < rec["ingX"]:
                        rec["ingX"] = l["x"]
                    if rec["ing"] and indented and (t[:1].islower() or CONT_RE.search(rec["ing"][-1][1])):
                        rec["ing"][-1] = (rec["ing"][-1][0], norm(rec["ing"][-1][1] + " " + t))
                    else:
                        rec["ing"].append((group, t))
                continue
            if kind == "step":
                # A second red 12pt line right under the title is the subtitle;
                # a red bold lead-in at 9pt opens a new step.
                if l["redlead"]:
                    m = re.match(r"^((?:[A-Z][\w’'-]*\s*){1,4}?)\s+(?=[a-z0-9])(.*)$", t)
                    if m:
                        rec["steps"].append([m.group(1), m.group(2)])
                    else:
                        rec["steps"].append(["", t])
                elif rec["steps"]:
                    rec["steps"][-1][1] += " " + t
                elif not rec["ing"]:
                    # red subtitle line set at body size
                    if not rec["subtitle"] and (l["red"] or is_bold(l["font"])):
                        rec["subtitle"] = t
                continue
            if kind == "nutrition":
                rec["nutrition"] += " " + t
                rec["closing"] = True
                continue
        if rec:
            r = flush(rec)
            if r:
                found.append(r)
    return found


if not SRC:
    raise SystemExit(
        "Set RECIPE_PDF_DIR to the folder holding the source PDFs, e.g.\n"
        "  RECIPE_PDF_DIR=~/recipes python3 scripts/extract-source-recipes.py")

all_r = []
for p in sorted(glob.glob(os.path.expanduser(SRC) + "/*.pdf")):
    got = parse_pdf(p)
    all_r.extend(got)
    print(f"  {os.path.basename(p):32} {len(got):4} recipes")

seen, out = {}, []
for r in all_r:
    if r["id"] in seen:
        continue
    seen[r["id"]] = 1
    out.append(r)

json.dump(out, open(os.path.join(OUT, "source-recipes.raw.json"), "w"), indent=1, ensure_ascii=False)
print("\ntotal unique:", len(out))
print("by cuisine:", dict(collections.Counter(r["cuisine"] for r in out).most_common()))
print("with calories:", sum(1 for r in out if "calories" in r))
print("avg ingredients:", round(sum(len(r["ingredients"]) for r in out) / len(out), 1),
      "| avg steps:", round(sum(len(r["steps"]) for r in out) / len(out), 1))
print("steps carrying a lead-in title:",
      sum(1 for r in out for s in r["steps"] if s["lead"]), "/",
      sum(len(r["steps"]) for r in out))
