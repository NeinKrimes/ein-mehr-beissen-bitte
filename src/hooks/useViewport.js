import { useState, useEffect } from "react";

// Single shared responsive mechanism for the whole app. Every room/component
// that needs to restructure its layout (not just resize colors/spacing, which
// stays inline-clamp()/flex-wrap as before) reads from this hook instead of
// rolling its own window.innerWidth check. Two breakpoints only:
//   mobile  <= 640px  (phones, incl. 375px)
//   tablet  <= 900px  (phones + tablets, incl. 768px)
// `isTablet` is true whenever `isMobile` is true too — treat them as nested
// ranges, not exclusive buckets.

const MOBILE_QUERY = "(max-width: 640px)";
const TABLET_QUERY = "(max-width: 900px)";

function getSnapshot() {
  if (typeof window === "undefined" || !window.matchMedia) {
    return { isMobile: false, isTablet: false };
  }
  return {
    isMobile: window.matchMedia(MOBILE_QUERY).matches,
    isTablet: window.matchMedia(TABLET_QUERY).matches,
  };
}

export function useViewport() {
  const [state, setState] = useState(getSnapshot);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mobileMql = window.matchMedia(MOBILE_QUERY);
    const tabletMql = window.matchMedia(TABLET_QUERY);
    const update = () => setState({ isMobile: mobileMql.matches, isTablet: tabletMql.matches });
    update();
    mobileMql.addEventListener("change", update);
    tabletMql.addEventListener("change", update);
    return () => {
      mobileMql.removeEventListener("change", update);
      tabletMql.removeEventListener("change", update);
    };
  }, []);

  return state;
}

// Convenience for the (many) call sites that only care about the phone case.
export function useIsMobile() {
  return useViewport().isMobile;
}
