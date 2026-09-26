import { useState, useCallback, useEffect, useMemo } from "react";
import { loadSourceRecipe } from "../data/sourceRecipes";

// Library recipes the user wants on the shopping list. The calendar half of
// that list is derived from the 46 nights; this is the part you choose, so it
// is persisted per-browser like the recipe tin.
//
// Only ids are stored. The full records live in the lazily-imported corpus
// chunk and are re-fetched on load, which keeps the stored value small and
// means a rebuilt corpus is picked up rather than a stale copy replayed.
const LS_KEY = "embb_library_basket";

function read() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
    return Array.isArray(raw) ? raw.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function write(ids) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(ids)); } catch { /* quota */ }
}

export function useLibraryBasket() {
  const [ids, setIds] = useState(read);
  const [recipes, setRecipes] = useState([]);

  const idsSet = useMemo(() => new Set(ids), [ids]);

  const toggle = useCallback((id) => {
    if (!id) return;
    setIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      write(next);
      return next;
    });
  }, []);

  const remove = useCallback((id) => {
    setIds((prev) => {
      const next = prev.filter((x) => x !== id);
      write(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => { setIds([]); write([]); }, []);

  const has = useCallback((id) => idsSet.has(id), [idsSet]);

  // Resolve ids to full records. An id that no longer exists in the corpus is
  // dropped rather than left as a hole in the list.
  useEffect(() => {
    if (!ids.length) { setRecipes([]); return; }
    let live = true;
    Promise.all(ids.map((id) => loadSourceRecipe(id).catch(() => null)))
      .then((loaded) => live && setRecipes(loaded.filter(Boolean)));
    return () => { live = false; };
  }, [ids]);

  return { ids, recipes, count: ids.length, has, toggle, remove, clear };
}
