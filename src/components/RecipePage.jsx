import { COLORS, FONTS, EASE, label, mono, display, parch, hairline } from "../theme";

// The recipe page — level two of the cookbook. Opens because you chose a
// line, not because you hovered. Renders over the current room.

function StatCell({ k, v, color = COLORS.parchment }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={label(9, parch(0.36), ".16em")}>{k}</div>
      <div style={{ ...mono(16, color), marginTop: 5 }}>{v}</div>
    </div>
  );
}

export default function RecipePage({ meal, entry, palate, onClose }) {
  const loading = !!entry?.loading;
  const error = !loading && entry?.error;
  const recipe = !loading && entry && !entry.error ? entry : null;

  // DB numbers win over the design-time baseline where they exist.
  const cost = Number.isFinite(Number(recipe?.est_cost_usd)) ? Number(recipe.est_cost_usd) : meal.cost;
  const kcal = Number.isFinite(Number(recipe?.calories)) ? Number(recipe.calories) : meal.kcal;
  const cpd = Number.isFinite(Number(recipe?.cal_per_dollar)) ? Math.round(recipe.cal_per_dollar) : meal.cpd;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(8,8,10,0.72)", display: "flex", justifyContent: "center", overflowY: "auto", padding: "40px 20px" }}>
      <div style={{ width: "min(880px, 100%)", background: COLORS.pageAlt, border: hairline, borderRadius: 20, padding: "46px 52px", height: "fit-content", animation: `embRise 420ms ${EASE} both` }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ width: 16, height: 1, background: meal.color }} />
              <span style={label(10, meal.color)}>{meal.cuisine} · day {meal.day}{meal.type === "ANCHOR" ? " · anchor" : ""}</span>
            </div>
            <div style={{ ...display(40, 1.02), color: COLORS.parchment, textWrap: "pretty" }}>{meal.meal}</div>
            <div style={{ fontFamily: FONTS.body, fontStyle: "italic", fontSize: 15, color: COLORS.faint, marginTop: 8 }}>from {meal.anchor}</div>
          </div>
          <button onClick={onClose} style={{
            ...label(10, parch(0.55), ".14em"),
            background: "transparent", border: `1px solid ${parch(0.18)}`, borderRadius: 999,
            padding: "9px 16px", cursor: "pointer", flexShrink: 0,
          }}>Close</button>
        </div>

        <div style={{ display: "flex", borderTop: hairline, borderBottom: hairline, padding: "14px 0", margin: "22px 0" }}>
          <StatCell k="Cost" v={`$${cost.toFixed(2)}`} color={COLORS.green} />
          <StatCell k="Energy" v={kcal} color={COLORS.amber} />
          <StatCell k="Value" v={`${cpd} cal/$`} color={COLORS.green} />
          <StatCell k="Serves" v={recipe?.servings ?? "2"} />
          <StatCell k="Prep" v={recipe?.prepTime ?? "—"} />
          <StatCell k="Cook" v={recipe?.cookTime ?? "—"} />
        </div>

        {loading && (
          <div style={{ padding: "48px 0", textAlign: "center" }}>
            <div style={{ fontFamily: FONTS.body, fontStyle: "italic", fontSize: 16, color: COLORS.faint, animation: "embPulse 1.6s ease-in-out infinite" }}>
              The kitchen is writing this page…
            </div>
          </div>
        )}

        {error && (
          <div style={{ fontFamily: FONTS.body, fontStyle: "italic", fontSize: 15, color: "#e84040", padding: "24px 0" }}>{entry.error}</div>
        )}

        {recipe && (
          <>
            {recipe.description && (
              <p style={{ fontFamily: FONTS.body, fontSize: 16, lineHeight: 1.7, color: COLORS.muted, maxWidth: "62ch", margin: "0 0 18px", textWrap: "pretty" }}>
                {recipe.description}
              </p>
            )}

            {recipe.passiveTip && (
              <div style={{ fontFamily: FONTS.body, fontStyle: "italic", fontSize: 14, lineHeight: 1.6, color: COLORS.faint, borderLeft: `1px solid ${COLORS.gold}`, paddingLeft: 14, marginBottom: 26 }}>
                While it cooks — {recipe.passiveTip}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, marginBottom: 30 }}>
              <div>
                <div style={{ ...label(10, parch(0.36)), borderBottom: `1px solid ${parch(0.14)}`, paddingBottom: 10, marginBottom: 4 }}>Ingredients</div>
                {recipe.ingredients?.map((ing, i) => {
                  const itemLower = (ing.item || "").toLowerCase();
                  const isBlocked = palate?.proteinBlocks?.some((block) =>
                    itemLower.includes(block.toLowerCase())
                  );
                  const isDisliked = palate?.dislikes?.some((dis) =>
                    itemLower.includes(dis.toLowerCase())
                  );

                  return (
                    <div key={i} style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "baseline",
                      padding: "8px 0",
                      borderBottom: `1px solid ${parch(0.07)}`,
                      opacity: (isBlocked || isDisliked) ? 0.6 : 1,
                    }}>
                      <span style={{
                        ...mono(12, COLORS.gold),
                        minWidth: 74,
                        textAlign: "right",
                        flexShrink: 0,
                        textDecoration: isBlocked ? "line-through" : "none",
                      }}>
                        {[ing.amount, ing.unit].filter(Boolean).join(" ")}
                      </span>
                      <span style={{
                        fontFamily: FONTS.body,
                        fontSize: 15,
                        color: isBlocked ? COLORS.faint : COLORS.listInk,
                        textDecoration: isBlocked ? "line-through" : "none",
                      }}>
                        {ing.item}
                        {isBlocked && (
                          <span style={{
                            ...mono(9, "#e84040"),
                            marginLeft: 8,
                            border: "1px solid #e84040",
                            borderRadius: 3,
                            padding: "1px 4px",
                            textDecoration: "none",
                            display: "inline-block",
                          }}>
                            Avoid: Blocked
                          </span>
                        )}
                        {isDisliked && !isBlocked && (
                          <span style={{
                            ...mono(9, COLORS.gold),
                            marginLeft: 8,
                            border: `1px solid ${COLORS.gold}`,
                            borderRadius: 3,
                            padding: "1px 4px",
                            display: "inline-block",
                          }}>
                            Disliked: Substitute if possible
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div>
                <div style={{ ...label(10, parch(0.36)), borderBottom: `1px solid ${parch(0.14)}`, paddingBottom: 10, marginBottom: 4 }}>Frugal notes</div>
                {recipe.frugalTips?.map((tip, i) => (
                  <div key={i} style={{ fontFamily: FONTS.body, fontSize: 14, lineHeight: 1.55, color: "#8d8578", padding: "8px 0", borderBottom: `1px solid ${parch(0.07)}` }}>
                    {tip}
                  </div>
                ))}
                {recipe.leftoversUse && (
                  <div style={{ fontFamily: FONTS.body, fontStyle: "italic", fontSize: 14, lineHeight: 1.55, color: COLORS.green, marginTop: 14 }}>
                    What&rsquo;s left: {recipe.leftoversUse}
                  </div>
                )}
              </div>
            </div>

            <div style={{ ...label(10, parch(0.36)), borderBottom: `1px solid ${parch(0.14)}`, paddingBottom: 10, marginBottom: 18 }}>Directions</div>
            {recipe.steps?.map((step, i) => (
              <div key={i} style={{ display: "flex", gap: 18, marginBottom: 18 }}>
                <div style={{ ...mono(13, COLORS.gold), minWidth: 26, textAlign: "right", flexShrink: 0, paddingTop: 3 }}>
                  {String(step.n ?? i + 1).padStart(2, "0")}
                </div>
                <div>
                  <div style={{ ...display(19), color: COLORS.parchment, marginBottom: 3 }}>{step.title}</div>
                  <div style={{ fontFamily: FONTS.body, fontSize: 15, color: "#9a9284", lineHeight: 1.65, maxWidth: "62ch" }}>{step.text}</div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}