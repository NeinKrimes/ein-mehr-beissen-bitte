import { COLORS } from "../theme";

// One injected stylesheet for what inline styles can't do: resets, focus
// rings, scrollbar cosmetics, and the touch-scroll utility class used by
// every horizontally-scrollable strip on mobile (Nav pills, ChainFilmstrip).
// Colors/fonts/spacing stay inline as everywhere else in the app — this file
// is deliberately small.
export default function GlobalStyle() {
  return (
    <style>{`
      * { box-sizing: border-box; }
      html, body, #root { height: 100%; }
      body {
        margin: 0;
        -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility;
        overflow-x: hidden;
      }
      ::selection { background: ${COLORS.gold}; color: ${COLORS.ground}; }
      ::-webkit-scrollbar { width: 10px; height: 10px; }
      ::-webkit-scrollbar-thumb { background: ${COLORS.border}; border-radius: 999px; border: 2px solid ${COLORS.page}; }
      ::-webkit-scrollbar-track { background: transparent; }

      :focus-visible { outline: 2px solid ${COLORS.gold}; outline-offset: 2px; }

      /* Touch-friendly horizontal scroll strip: room nav pills on mobile,
         ChainFilmstrip, any future filmstrip. Native momentum scroll on iOS,
         slim/near-invisible scrollbar so it doesn't read as a desktop widget. */
      .embb-scrollx {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: thin;
      }

      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after { animation-duration: .001ms !important; animation-delay: 0ms !important; transition: none !important; }
      }
    `}</style>
  );
}
