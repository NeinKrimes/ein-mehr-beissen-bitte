import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

// Default/empty palate shape
const EMPTY_PALATE = {
  // Legacy fields (also derived from questionnaire for API prompt use)
  proteinBlocks: [],   // hard excludes — never generate recipes with these
  dislikes: [],        // soft avoids — mention as "if possible, avoid"
  likedFlavours: [],   // e.g. ["spicy", "umami", "smoky"]
  likedProteins: [],   // e.g. ["chicken", "pork", "lentils"]
  // Extended questionnaire fields
  householdSize: null,
  skillLevel: null,
  weekdayTimeMins: null,
  weekendTimeMins: null,
  cookingMethods: [],
  proteinRatings: {},
  flavourRatings: {},
  cuisinePriorities: [],
};

const LS_KEY = "embb_palate";

function readFromLocalStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? { ...EMPTY_PALATE, ...JSON.parse(raw) } : { ...EMPTY_PALATE };
  } catch {
    return { ...EMPTY_PALATE };
  }
}

function writeToLocalStorage(palate) {
  localStorage.setItem(LS_KEY, JSON.stringify(palate));
}

// Serialize palate into a prompt fragment for the Anthropic API.
// Callers can append this to any system/user prompt.
export function toPalatePrompt(palate) {
  if (!palate) return "";

  const parts = [];

  if (palate.proteinBlocks?.length) {
    parts.push(
      `HARD EXCLUDE — do NOT use these proteins under any circumstances: ${palate.proteinBlocks.join(", ")}.`
    );
  }

  if (palate.dislikes?.length) {
    parts.push(
      `Soft avoid — omit or minimise these ingredients/flavours where possible: ${palate.dislikes.join(", ")}.`
    );
  }

  if (palate.likedProteins?.length) {
    parts.push(
      `Preferred proteins: ${palate.likedProteins.join(", ")}.`
    );
  }

  if (palate.likedFlavours?.length) {
    parts.push(
      `Preferred flavour profiles: ${palate.likedFlavours.join(", ")}.`
    );
  }

  if (!parts.length) return "";

  return `\n\nUser dietary preferences:\n${parts.join("\n")}`;
}

export function usePalate() {
  const [palate, setPalateState] = useState(() => readFromLocalStorage());
  const [user, setUser] = useState(null);
  const [syncing, setSyncing] = useState(false);

  // Subscribe to auth changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // When user signs in, load their palate from Supabase
  useEffect(() => {
    if (!user) return;

    setSyncing(true);
    supabase
      .from("user_preference_palate")
      .select("protein_blocks, dislikes, liked_flavours, liked_proteins, household_size, skill_level, weekday_time_mins, weekend_time_mins, cooking_methods, protein_ratings, flavour_ratings, cuisine_priorities")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error && data) {
          const loaded = {
            proteinBlocks: data.protein_blocks ?? [],
            dislikes: data.dislikes ?? [],
            likedFlavours: data.liked_flavours ?? [],
            likedProteins: data.liked_proteins ?? [],
            householdSize: data.household_size ?? null,
            skillLevel: data.skill_level ?? null,
            weekdayTimeMins: data.weekday_time_mins ?? null,
            weekendTimeMins: data.weekend_time_mins ?? null,
            cookingMethods: data.cooking_methods ?? [],
            proteinRatings: data.protein_ratings ?? {},
            flavourRatings: data.flavour_ratings ?? {},
            cuisinePriorities: data.cuisine_priorities ?? [],
          };
          setPalateState(loaded);
          writeToLocalStorage(loaded);
        }
        setSyncing(false);
      });
  }, [user]);

  const savePalate = useCallback(async (next) => {
    setPalateState(next);
    writeToLocalStorage(next);

    if (!user) return;

    await supabase
      .from("user_preference_palate")
      .upsert(
        {
          user_id: user.id,
          protein_blocks: next.proteinBlocks,
          dislikes: next.dislikes,
          liked_flavours: next.likedFlavours,
          liked_proteins: next.likedProteins,
          household_size: next.householdSize ?? null,
          skill_level: next.skillLevel ?? null,
          weekday_time_mins: next.weekdayTimeMins ?? null,
          weekend_time_mins: next.weekendTimeMins ?? null,
          cooking_methods: next.cookingMethods ?? [],
          protein_ratings: next.proteinRatings ?? {},
          flavour_ratings: next.flavourRatings ?? {},
          cuisine_priorities: next.cuisinePriorities ?? [],
        },
        { onConflict: "user_id" }
      );
  }, [user]);

  return { palate, savePalate, syncing, user };
}
