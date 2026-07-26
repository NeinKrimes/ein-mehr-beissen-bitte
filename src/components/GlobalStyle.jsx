import { T } from "../theme";

// One injected stylesheet for what inline styles can't do: resets, fonts, keyframes,
// hover/focus, dotted contents leaders, and reduced-motion (which keeps final state).
export default function GlobalStyle() {
  return (
    <style>{`
      * { box-sizing: border-box; }
      html, body, #root { height: 100%; }
      body {
        margin: 0; background: ${T.page}; color: ${T.ink};
        font-family: ${T.body};
        -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility;
      }
      ::selection { background: ${T.gold}; color: ${T.bg}; }
      ::-webkit-scrollbar { width: 10px; height: 10px; }
      ::-webkit-scrollbar-thumb { background: #2a2a33; border-radius: 999px; border: 2px solid ${T.page}; }
      ::-webkit-scrollbar-track { background: transparent; }
      button { font-family: ${T.sans}; }
      .mono { font-family: ${T.mono}; font-variant-numeric: tabular-nums; }
      .serif { font-family: ${T.display}; font-weight: 400; }
      .sans { font-family: ${T.sans}; }

      :focus-visible { outline: none; box-shadow: ${T.focus}; border-radius: 6px; }

      /* Motion — nothing snaps. */
      @keyframes embRise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
      @keyframes embBranch { from { opacity: 0; transform: translateX(-18px); } to { opacity: 1; transform: none; } }
      @keyframes embGlow { 0%,100% { opacity: .5; } 50% { opacity: .9; } }
      .rise { animation: embRise ${T.durSlow} ${T.ease} both; }
      .branch { animation: embBranch 520ms ${T.ease} both; }

      /* Hover — 2px lift on interactive cards, glow on gold, coral-free hairline warm */
      .lift { transition: transform ${T.durBase} ${T.ease}, border-color ${T.durBase} ${T.ease}, box-shadow ${T.durBase} ${T.ease}; }
      .lift:hover { transform: translateY(-2px); }
      .navlink { transition: color ${T.durFast} ${T.ease}, opacity ${T.durFast} ${T.ease}; opacity: .62; }
      .navlink:hover { opacity: 1; }
      .navlink.on { opacity: 1; }
      .pin:hover .save { opacity: 1; }
      .save { transition: opacity ${T.durFast} ${T.ease}; }
      .leader:hover { color: ${T.ink}; }
      .leader:hover .leader-fill { border-color: ${T.gold}88; }

      /* Contents-page dotted leader: name ......... value */
      .leader { display: flex; align-items: baseline; gap: 10px; cursor: pointer; }
      .leader-fill { flex: 1; border-bottom: 1px dotted ${T.ink3}; transform: translateY(-3px); transition: border-color ${T.durFast} ${T.ease}; }

      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after { animation-duration: .001ms !important; animation-delay: 0ms !important; transition: none !important; }
        .lift:hover, .pin:hover { transform: none; }
      }
    `}</style>
  );
}
