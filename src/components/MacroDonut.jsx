import { T, macroCals, MACRO_COLORS } from "../theme";

// Macro split. Order is fixed: protein, carbohydrate, fat.
// Colors are fixed: protein gold, carbohydrate amber, fat parchment.
export default function MacroDonut({ recipe, size = 116, compact = false }) {
  const { p, c, f, pg, cg, fg } = macroCals(recipe);
  const total = p + c + f;
  const kcal = Number(recipe?.calories) || Math.round(total) || null;
  if (!total) return null;

  const pPct = (p / total) * 100;
  const cPct = (c / total) * 100;
  const bg = `radial-gradient(closest-side, ${T.surface} 66%, transparent 67% 100%),
    conic-gradient(${MACRO_COLORS.protein} 0 ${pPct}%, ${MACRO_COLORS.carb} 0 ${pPct + cPct}%, ${MACRO_COLORS.fat} 0 100%)`;

  const ring = (
    <div style={{ width: size, height: size, borderRadius: "50%", background: bg, flexShrink: 0, display: "grid", placeItems: "center" }}>
      <div style={{ textAlign: "center" }}>
        <b className="mono" style={{ fontSize: compact ? 16 : 20, color: T.ink, display: "block", lineHeight: 1 }}>{kcal}</b>
        <span className="mono" style={{ fontSize: 8.5, color: T.ink3, letterSpacing: ".14em" }}>KCAL</span>
      </div>
    </div>
  );
  if (compact) return ring;

  const Row = ({ color, label, g }) => (
    <div className="mono" style={{ display: "flex", alignItems: "center", gap: 9, color: T.ink2, fontSize: 11 }}>
      <i style={{ width: 9, height: 9, borderRadius: 2, background: color, display: "inline-block" }} />
      <span style={{ fontFamily: T.sans, letterSpacing: ".02em" }}>{label}</span>
      <span style={{ marginLeft: "auto", color: T.ink }}>{g}g</span>
    </div>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
      {ring}
      <div style={{ display: "flex", flexDirection: "column", gap: 9, minWidth: 130 }}>
        <Row color={MACRO_COLORS.protein} label="Protein" g={pg} />
        <Row color={MACRO_COLORS.carb} label="Carbohydrate" g={cg} />
        <Row color={MACRO_COLORS.fat} label="Fat" g={fg} />
      </div>
    </div>
  );
}
