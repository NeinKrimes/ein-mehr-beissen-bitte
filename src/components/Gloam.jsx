import { useState } from "react";
import { T } from "../theme";

// ── Button — always a pill. Variants: gold (the one raised voice) / ghost-dark.
const BTN_PAD = { sm: "9px 20px", md: "13px 30px" };
const BTN_FONT = { sm: "12px", md: "13px" };
const BTN_TONE = {
  gold: { background: T.gold, color: T.bg, border: "1px solid transparent" },
  "ghost-dark": { background: "transparent", color: T.ink, border: `1px solid ${T.line}` },
};
export function Button({ variant = "gold", size = "md", glow = false, children, onClick, style, ...rest }) {
  const [hover, setHover] = useState(false);
  const tone = BTN_TONE[variant] || BTN_TONE.gold;
  return (
    <button type="button" onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        fontFamily: T.sans, fontWeight: 700, fontSize: BTN_FONT[size], letterSpacing: ".02em",
        padding: BTN_PAD[size], borderRadius: T.rPill, cursor: "pointer",
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
        transition: `transform ${T.durFast} ${T.ease}, box-shadow ${T.durBase} ${T.ease}`,
        transform: hover ? "translateY(-1px)" : "none",
        boxShadow: (glow || hover) && variant === "gold" ? T.glowGold : (hover ? T.lift : "none"),
        ...tone, ...style,
      }} {...rest}>{children}</button>
  );
}

// ── Tag — uppercase "plate" pill (the brand's recurring micro-label).
export function Tag({ children, style, color, ...rest }) {
  return (
    <span style={{
      fontFamily: T.sans, fontWeight: 700, fontSize: 10, letterSpacing: ".16em", textTransform: "uppercase",
      padding: "5px 11px", borderRadius: T.rPill, color: color || T.ink2, border: `1px solid ${T.line}`,
      display: "inline-block", whiteSpace: "nowrap", ...style,
    }} {...rest}>{children}</span>
  );
}

// ── Badge — small mono/label pill; gold or dark.
export function Badge({ tone = "gold", children, style }) {
  const t = tone === "gold" ? { background: T.gold, color: T.bg } : { background: "transparent", color: T.ink2, border: `1px solid ${T.line}` };
  return (
    <span className="mono" style={{
      fontWeight: 600, fontSize: 11, letterSpacing: ".14em", padding: "4px 10px", borderRadius: T.rPill,
      display: "inline-block", whiteSpace: "nowrap", ...t, ...style,
    }}>{children}</span>
  );
}

// ── Eyebrow — a 1px rule flanked by a numeral badge and an uppercase tag.
export function Eyebrow({ numeral, children, style }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, ...style }}>
      {numeral && <Badge>{numeral}</Badge>}
      <span style={{ flex: "0 0 auto", height: 1, width: 34, background: T.line }} />
      <span style={{ fontFamily: T.sans, fontWeight: 700, fontSize: 11, letterSpacing: ".2em", textTransform: "uppercase", color: T.ink2 }}>{children}</span>
    </div>
  );
}

// ── Plate — labelled gradient image slot (no photography exists). Cuisine hue as
//    a wash under 8%, never a fill. shape: "round" (board plates) or "rect".
export function Plate({ shape = "rect", tint, label = "Photograph", height, style, children }) {
  const round = shape === "round";
  return (
    <div style={{
      position: "relative", width: round ? height : "100%", height, aspectRatio: round ? "1 / 1" : undefined,
      borderRadius: round ? "50%" : T.rMd, overflow: "hidden", flexShrink: 0,
      background: `
        linear-gradient(rgba(36,26,46,0.34), rgba(8,8,10,0.72)),
        ${tint ? `linear-gradient(0deg, ${tint}14, ${tint}14),` : ""}
        radial-gradient(ellipse at 40% 20%, #2a2130, #14121a 70%)`,
      border: `1px solid ${T.line}`, ...style,
    }}>
      {label && (
        <span style={{
          position: "absolute", top: 12, left: round ? "50%" : 14, transform: round ? "translateX(-50%)" : "none",
          fontFamily: T.sans, fontWeight: 700, fontSize: 9, letterSpacing: ".16em", textTransform: "uppercase", color: "rgba(236,227,210,0.5)",
        }}>{label}</span>
      )}
      {children}
    </div>
  );
}
