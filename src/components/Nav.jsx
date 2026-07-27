import { T } from "../theme";

const ROOMS = [
  { key: "board", label: "Board" },
  { key: "calendar", label: "Calendar" },
  { key: "chains", label: "Chains" },
  { key: "kitchen", label: "My Kitchen" },
];

// Masthead. Four rooms, one lit — only the gold underline moves when you switch.
export default function Nav({ room, setRoom, onOpenShopping }) {
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 30, background: `${T.page}f2`,
      borderBottom: `1px solid ${T.line}`, backdropFilter: "blur(8px)",
    }}>
      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        <div style={{ marginRight: "auto", display: "flex", alignItems: "baseline", gap: 12 }}>
          <span className="serif" style={{ fontSize: 24, color: T.ink, letterSpacing: ".01em" }}>Ein Mehr Beissen Bitte</span>
          <span style={{ fontFamily: T.sans, fontWeight: 700, fontSize: 9, letterSpacing: ".24em", textTransform: "uppercase", color: T.ink3 }}>cookbook · after dark</span>
        </div>

        <nav style={{ display: "flex", gap: 26 }}>
          {ROOMS.map((r) => {
            const on = room === r.key;
            return (
              <button key={r.key} onClick={() => setRoom(r.key)} className={`navlink${on ? " on" : ""}`} style={{
                cursor: "pointer", border: "none", background: "none", padding: "4px 0",
                fontFamily: T.sans, fontWeight: on ? 700 : 500, fontSize: 13, color: T.ink,
                borderBottom: `2px solid ${on ? T.gold : "transparent"}`, letterSpacing: ".01em",
              }}>{r.label}</button>
            );
          })}
        </nav>

        <button onClick={onOpenShopping} className="navlink" style={{
          cursor: "pointer", border: "none", background: "none", padding: "4px 0",
          fontFamily: T.sans, fontWeight: 500, fontSize: 12, color: T.ink3, letterSpacing: ".04em",
        }}>Shopping list →</button>
      </div>
    </header>
  );
}
