import { COLORS, label, parch, rgba, hairline } from "../theme";

// A strip of every meal in this chain — where the current recipe came from,
// and what it becomes next. Lives inside RecipePage, between the header and
// the stat strip. Reuses the plate-circle language from ChainsRoom.

export default function ChainFilmstrip({ chainMeals, currentDay, onOpenRecipe }) {
  if (!chainMeals || chainMeals.length < 2) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, padding: "18px 2px", borderBottom: hairline, marginBottom: 22, overflowX: "auto" }}>
      {chainMeals.map((m, i) => {
        const isCurrent = m.day === currentDay;
        return (
          <div key={m.day} style={{ display: "flex", alignItems: "center", flex: "0 0 auto" }}>
            {i > 0 && <div style={{ width: 22, height: 1, background: parch(0.14), flexShrink: 0 }} />}
            <div
              onClick={() => !isCurrent && onOpenRecipe?.(m.day)}
              title={m.meal}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                cursor: isCurrent ? "default" : "pointer", minWidth: 66, padding: "0 4px",
              }}
            >
              <div style={{
                width: isCurrent ? 46 : 36, height: isCurrent ? 46 : 36, borderRadius: "50%", flexShrink: 0,
                background: `linear-gradient(0deg,${rgba(m.color, isCurrent ? 0.5 : 0.26)},${rgba(m.color, isCurrent ? 0.5 : 0.26)}), ${COLORS.plate}`,
                border: isCurrent ? "1px solid rgba(232,160,32,0.55)" : `1px solid ${rgba(m.color, 0.28)}`,
                boxShadow: isCurrent ? "0 0 0 5px rgba(232,160,32,0.10)" : "none",
                transition: "all 220ms ease",
              }} />
              <div style={{ ...label(8, isCurrent ? COLORS.gold : parch(0.42), ".08em"), textAlign: "center", whiteSpace: "nowrap" }}>
                {m.type === "ANCHOR" ? "anchor" : `day ${m.day}`}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
