import { useState } from "react";
import { MEALS, LENSES, mealByDay } from "../data/mealStats";
import { COLORS, FONTS, EASE, label, mono, display, parch, hairline } from "../theme";

// Calendar — "the contents page". Thirty nights as dotted-leader lines,
// ordered by one lens at a time; the right rail is the chosen night's
// plate caption, macro donut and value gauge.

const DONUT_C = 2 * Math.PI * 54;
const ARC_LEN = Math.PI * 70;

function LensToggle({ lens, onLens }) {
  return (
    <div style={{ display: "flex", gap: 4, padding: 4, border: `1px solid ${parch(0.14)}`, borderRadius: 999 }}>
      {Object.keys(LENSES).map((k) => {
        const on = k === lens;
        return (
          <div key={k} onClick={() => onLens(k)} style={{
            ...label(11, on ? COLORS.ground : "#8d8578", ".16em"),
            padding: "9px 17px", borderRadius: 999, cursor: "pointer",
            transition: `all 320ms ${EASE}`,
            background: on ? COLORS.gold : "transparent",
          }}>{LENSES[k].label}</div>
        );
      })}
    </div>
  );
}

export default function CalendarRoom({ onOpenRecipe }) {
  const [lens, setLens] = useState("value");
  const [selDay, setSelDay] = useState(1);

  const L = LENSES[lens];
  const sorted = [...MEALS].sort((a, b) => (L.high ? b[L.key] - a[L.key] : a[L.key] - b[L.key]));
  const sel = mealByDay(selDay) ?? MEALS[0];

  const gTotal = sel.p + sel.carbs + sel.fat;
  const segP = (sel.p / gTotal) * DONUT_C;
  const segC = (sel.carbs / gTotal) * DONUT_C;
  const segF = (sel.fat / gTotal) * DONUT_C;

  const vb = LENSES.value;
  const gT = Math.max(0, Math.min(1, (sel.cpd - vb.min) / (vb.max - vb.min)));
  const gaugeColor = gT > 0.55 ? COLORS.green : gT > 0.25 ? COLORS.gold : COLORS.amber;
  const gaugeVerdict = gT > 0.55 ? "Pantry money." : gT > 0.25 ? "Fair trade." : "A treat night.";

  const bars = sorted.slice(0, 5);
  const topVal = bars[0][L.key];

  return (
    <div style={{ flex: 1, display: "flex", minHeight: 0 }}>

      {/* Left page — the contents list */}
      <div style={{ flex: 1, minWidth: 0, background: COLORS.page, borderRight: hairline, padding: "34px 40px 26px", display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingBottom: 16, borderBottom: `1px solid ${parch(0.14)}`, gap: 20, flexWrap: "wrap" }}>
          <div>
            <div style={{ ...label(10, COLORS.gold, ".3em"), marginBottom: 8 }}>Contents · thirty nights</div>
            <div style={{ ...display(38, 1), color: COLORS.parchment }}>
              Ordered by <span style={{ fontStyle: "italic" }}>{L.label.toLowerCase()}</span>
            </div>
          </div>
          <LensToggle lens={lens} onLens={setLens} />
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 44, gridAutoRows: "min-content", paddingTop: 8 }}>
          {sorted.map((m) => {
            const raw = (m[L.key] - L.min) / (L.max - L.min);
            const t = Math.max(0, Math.min(1, L.high ? raw : 1 - raw));
            const on = m.day === selDay;
            return (
              <div key={m.day} onClick={() => setSelDay(m.day)} style={{
                display: "flex", alignItems: "baseline", gap: 12, padding: "9px 10px",
                cursor: "pointer", borderRadius: 8, transition: `background 320ms ${EASE}`,
                background: on ? "rgba(232,160,32,0.10)" : "transparent",
              }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", flex: "0 0 7px", transform: "translateY(-1px)", background: m.color }} />
                <span style={{ ...mono(11, parch(0.34)), width: 26, flex: "0 0 26px" }}>{String(m.day).padStart(2, "0")}</span>
                <span style={{ fontFamily: FONTS.body, fontSize: 16, color: COLORS.listInk, whiteSpace: "nowrap" }}>{m.short}</span>
                <span style={{ flex: 1, height: 1, borderBottom: `1px dotted ${parch(0.18)}`, transform: "translateY(-4px)" }} />
                <span style={mono(15, t > 0.45 ? L.color : "#9c9486")}>{m[L.key]}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right rail — the chosen night */}
      <div style={{ width: 430, flex: "0 0 430px", background: COLORS.pageAlt, padding: "34px 34px 28px", display: "flex", flexDirection: "column", gap: 22, overflowY: "auto" }}>

        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <div style={{
            width: 120, height: 120, flex: "0 0 120px", borderRadius: "50%",
            background: `linear-gradient(0deg,${sel.color}4d,${sel.color}4d), ${COLORS.plate}`,
            border: `1px solid ${parch(0.14)}`,
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...label(10, sel.color), marginBottom: 7 }}>{sel.cuisine} · day {sel.day}</div>
            <div style={{ ...display(29, 1.05), color: COLORS.parchment, textWrap: "pretty" }}>{sel.meal}</div>
            <div style={{ fontFamily: FONTS.body, fontStyle: "italic", fontSize: 14, color: COLORS.faint, marginTop: 7 }}>from {sel.anchor}</div>
          </div>
        </div>

        <div style={{ display: "flex", borderTop: hairline, borderBottom: hairline, padding: "14px 0" }}>
          {[
            ["Serves", "2", COLORS.parchment],
            ["Cost", `$${sel.cost.toFixed(2)}`, COLORS.green],
            ["Energy", sel.kcal, COLORS.amber],
            ["Value", sel.cpd, gaugeColor],
          ].map(([k, v, c]) => (
            <div key={k} style={{ flex: 1 }}>
              <div style={label(9, parch(0.36), ".16em")}>{k}</div>
              <div style={{ ...mono(16, c), marginTop: 5 }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Macro donut */}
        <div style={{ display: "flex", gap: 22, alignItems: "center" }}>
          <div style={{ position: "relative", width: 126, height: 126, flex: "0 0 126px" }}>
            <svg width="126" height="126" viewBox="0 0 140 140">
              <circle cx="70" cy="70" r="54" fill="none" stroke={parch(0.09)} strokeWidth="14" />
              <circle cx="70" cy="70" r="54" fill="none" stroke={COLORS.gold} strokeWidth="14"
                strokeDasharray={`${segP.toFixed(1)} ${(DONUT_C - segP).toFixed(1)}`} transform="rotate(-90 70 70)" />
              <circle cx="70" cy="70" r="54" fill="none" stroke={COLORS.amber} strokeWidth="14"
                strokeDasharray={`${segC.toFixed(1)} ${(DONUT_C - segC).toFixed(1)}`} strokeDashoffset={(-segP).toFixed(1)} transform="rotate(-90 70 70)" />
              <circle cx="70" cy="70" r="54" fill="none" stroke={parch(0.34)} strokeWidth="14"
                strokeDasharray={`${segF.toFixed(1)} ${(DONUT_C - segF).toFixed(1)}`} strokeDashoffset={(-(segP + segC)).toFixed(1)} transform="rotate(-90 70 70)" />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              <div style={{ ...mono(24), lineHeight: 1 }}>{sel.kcal}</div>
              <div style={{ ...mono(10, parch(0.34)), letterSpacing: ".18em", marginTop: 4 }}>KCAL</div>
            </div>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 11 }}>
            {[
              ["Protein", sel.p, COLORS.gold],
              ["Carbohydrate", sel.carbs, COLORS.amber],
              ["Fat", sel.fat, parch(0.34)],
            ].map(([name, g, c]) => (
              <div key={name} style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: c }} />
                <span style={{ fontFamily: FONTS.label, fontSize: 12, color: parch(0.62), flex: 1 }}>{name}</span>
                <span style={mono(14)}>{g} g</span>
              </div>
            ))}
          </div>
        </div>

        {/* Value gauge */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 }}>
            <span style={label(9, parch(0.36))}>Value against the month</span>
            <span style={mono(10, parch(0.30))}>{vb.min} → {vb.max}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <svg width="160" height="94" viewBox="0 0 168 98">
              <path d="M14 88 A70 70 0 0 1 154 88" fill="none" stroke={parch(0.09)} strokeWidth="12" strokeLinecap="round" />
              <path d="M14 88 A70 70 0 0 1 154 88" fill="none" stroke="url(#embGauge)" strokeWidth="12" strokeLinecap="round"
                strokeDasharray={`${(ARC_LEN * gT).toFixed(1)} ${ARC_LEN.toFixed(1)}`} />
              <defs>
                <linearGradient id="embGauge" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={COLORS.amber} />
                  <stop offset="55%" stopColor={COLORS.gold} />
                  <stop offset="100%" stopColor={COLORS.green} />
                </linearGradient>
              </defs>
              <g style={{ transform: `rotate(${Math.round(-90 + 180 * gT)}deg)`, transformOrigin: "84px 88px", transition: `transform 420ms ${EASE}` }}>
                <line x1="84" y1="88" x2="84" y2="36" stroke={COLORS.parchment} strokeWidth="2" strokeLinecap="round" />
              </g>
              <circle cx="84" cy="88" r="4.5" fill={COLORS.parchment} />
            </svg>
            <div>
              <div style={{ ...mono(30, gaugeColor), lineHeight: 1 }}>{sel.cpd}</div>
              <div style={{ fontFamily: FONTS.body, fontStyle: "italic", fontSize: 14, color: COLORS.faint, marginTop: 8 }}>{gaugeVerdict}</div>
            </div>
          </div>
        </div>

        <button onClick={() => onOpenRecipe(sel.day)} style={{
          ...label(11, COLORS.ground, ".16em"),
          background: COLORS.gold, border: "none", borderRadius: 999,
          padding: "13px 22px", cursor: "pointer", alignSelf: "flex-start",
          boxShadow: "0 0 24px rgba(232,160,32,0.35)",
        }}>Open the recipe</button>

        {/* Best five */}
        <div style={{ marginTop: "auto", borderTop: hairline, paddingTop: 16 }}>
          <div style={{ ...label(9, parch(0.36)), marginBottom: 12 }}>Best five · {L.label.toLowerCase()}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {bars.map((m) => {
              const pct = Math.round((L.high ? m[L.key] / topVal : topVal / m[L.key]) * 100);
              return (
                <div key={m.day} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontFamily: FONTS.body, fontSize: 14, color: "#b8b0a1" }}>{m.short}</span>
                    <span style={mono(12, L.color)}>{m[L.key]} {L.unit}</span>
                  </div>
                  <div style={{ height: 3, borderRadius: 999, background: parch(0.09), overflow: "hidden" }}>
                    <div style={{ height: 3, borderRadius: 999, transition: `width 420ms ${EASE}`, width: `${pct}%`, background: L.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
