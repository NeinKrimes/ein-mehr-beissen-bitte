import { useState, useCallback } from "react";

// "Mark as cooked" progress, persisted per-browser in localStorage.
const LS_KEY = "embb_cooked";

function read() {
  try { return new Set(JSON.parse(localStorage.getItem(LS_KEY) || "[]")); }
  catch { return new Set(); }
}

export function useCooked() {
  const [cooked, setCooked] = useState(read);

  const toggle = useCallback((mealId) => {
    setCooked((prev) => {
      const next = new Set(prev);
      next.has(mealId) ? next.delete(mealId) : next.add(mealId);
      try { localStorage.setItem(LS_KEY, JSON.stringify([...next])); } catch { /* quota */ }
      return next;
    });
  }, []);

  const isCooked = useCallback((mealId) => cooked.has(mealId), [cooked]);
  return { cooked, isCooked, toggle };
}
