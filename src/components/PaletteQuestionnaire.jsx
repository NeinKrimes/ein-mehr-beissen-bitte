import { useEffect, useState } from "react";
import { usePalate } from "../hooks/usePalate";

// ─── Static data ─────────────────────────────────────────────────────────────

const COOKING_METHODS = ["saute","boil","bake","grill","braise","steam","raw","fry"];

const PROTEINS = [
  "chicken","beef","pork","lamb","fish","shellfish",
  "eggs","tofu","tempeh","lentils/beans","turkey","duck",
];

const FLAVOURS = [
  "spicy","umami","smoky","sweet","sour","bitter",
  "salty","herby","tangy","rich/creamy","nutty","fermented",
];

const CUISINES = [
  "Mexican","Italian","Indian","French","Jamaican","Thai",
  "Chinese","American","Japanese","Vietnamese","Greek",
  "Ethiopian","Korean","Moroccan","Spanish","Middle Eastern",
];

const WEEKDAY_OPTIONS = [
  { label: "Under 20 min",  value: 15 },
  { label: "20–30 min",     value: 25 },
  { label: "30–45 min",     value: 38 },
  { label: "Up to an hour", value: 60 },
];

const WEEKEND_OPTIONS = [
  { label: "Under 30 min", value: 25  },
  { label: "30–60 min",    value: 45  },
  { label: "1–2 hours",    value: 90  },
  { label: "All day fine", value: 240 },
];

const SKILL_OPTIONS = [
  { value: "novice",     label: "Novice",     desc: "I follow recipes step-by-step and prefer simple techniques." },
  { value: "experienced",label: "Experienced",desc: "I'm comfortable with most methods and improvise occasionally." },
  { value: "master",     label: "Master",     desc: "I cook by feel, modify recipes freely, and tackle anything." },
];

const HOUSEHOLD_OPTIONS = ["1","2","3–4","5+"];

const TOTAL_STEPS = 8;

// ─── Tier chip helpers ────────────────────────────────────────────────────────

const TIER_CONFIG = {
  like:  { bg: "#22c55e18", border: "#22c55e", text: "#22c55e", dot: "●", label: "Like"  },
  avoid: { bg: "#f59e0b18", border: "#f59e0b", text: "#f59e0b", dot: "●", label: "Avoid" },
  never: { bg: "#e8404018", border: "#e84040", text: "#e84040", dot: "●", label: "Never" },
};

// ─── Shared primitives ────────────────────────────────────────────────────────

function ProgressBar({ step }) {
  const pct = Math.round((step / (TOTAL_STEPS - 1)) * 100);
  return (
    <div style={{ padding: "16px 20px 0", position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: "#666", letterSpacing: 2, textTransform: "uppercase" }}>
          Step {step + 1} of {TOTAL_STEPS}
        </span>
        <span style={{ fontSize: 11, color: "#444" }}>{pct}%</span>
      </div>
      <div style={{ height: 3, background: "#1e1e2e", borderRadius: 2, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: "linear-gradient(90deg, #e8a020, #f0c040)",
          borderRadius: 2, transition: "width 0.3s ease",
        }} />
      </div>
    </div>
  );
}

function StepHeading({ title, sub }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: "clamp(18px,3.5vw,24px)", fontWeight: "normal", margin: "0 0 6px", color: "#f0e8d8" }}>
        {title}
      </h2>
      {sub && <p style={{ fontSize: 13, color: "#555", margin: 0, fontStyle: "italic", lineHeight: 1.5 }}>{sub}</p>}
    </div>
  );
}

function NavButtons({ step, onBack, onNext, nextLabel = "Next", nextDisabled = false }) {
  return (
    <div style={{ display: "flex", gap: 10, marginTop: 32, justifyContent: "flex-end" }}>
      {step > 0 && (
        <button onClick={onBack} style={{
          background: "none", border: "1px solid #2a2a3a", color: "#888",
          padding: "10px 20px", borderRadius: 6, cursor: "pointer",
          fontSize: 13, fontFamily: "inherit",
        }}>
          ← Back
        </button>
      )}
      <button onClick={onNext} disabled={nextDisabled} style={{
        background: nextDisabled ? "#1e1e2e" : "#e8a020",
        color: nextDisabled ? "#444" : "#0c0c0f",
        border: "none", padding: "10px 24px", borderRadius: 6,
        cursor: nextDisabled ? "default" : "pointer",
        fontSize: 13, fontWeight: "bold", fontFamily: "inherit",
        transition: "background 0.2s",
      }}>
        {nextLabel} →
      </button>
    </div>
  );
}

function SelectionChip({ label, selected, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: selected ? "#e8a02020" : "#131318",
      border: `1px solid ${selected ? "#e8a020" : "#2a2a3a"}`,
      color: selected ? "#e8a020" : "#888",
      padding: "10px 18px", borderRadius: 6,
      cursor: "pointer", fontSize: 13, fontFamily: "inherit",
      transition: "all 0.15s", whiteSpace: "nowrap",
    }}>
      {selected && <span style={{ marginRight: 6 }}>✓</span>}
      {label}
    </button>
  );
}

function TierChip({ label, tier, activeTier, onClick }) {
  const cfg = tier ? TIER_CONFIG[tier] : null;
  return (
    <button onClick={onClick} aria-label={`${label}: ${tier ?? "neutral"}. Set to ${activeTier}.`} style={{
      background: cfg ? cfg.bg : "#131318",
      border: `1px solid ${cfg ? cfg.border : "#2a2a3a"}`,
      color: cfg ? cfg.text : "#555",
      padding: "8px 14px", borderRadius: 6,
      cursor: "pointer", fontSize: 12, fontFamily: "inherit",
      display: "flex", alignItems: "center", gap: 6,
      transition: "all 0.15s",
      userSelect: "none",
    }}>
      {cfg && <span style={{ fontSize: 8 }}>{cfg.dot}</span>}
      {label}
      {cfg && <span style={{ fontSize: 10, opacity: 0.8 }}>({cfg.label})</span>}
    </button>
  );
}

// ─── Step screens ─────────────────────────────────────────────────────────────

function StepHousehold({ answers, setAnswer, onNext }) {
  return (
    <div>
      <StepHeading title="How many people are you cooking for?" sub="This shapes portion sizes and how we scale ingredients." />
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {HOUSEHOLD_OPTIONS.map(opt => (
          <SelectionChip
            key={opt} label={opt === "1" ? "Just me" : `${opt} people`}
            selected={answers.householdSize === opt}
            onClick={() => setAnswer("householdSize", opt)}
          />
        ))}
      </div>
      <NavButtons step={0} onNext={onNext} nextDisabled={!answers.householdSize} />
    </div>
  );
}

function StepSkill({ answers, setAnswer, onBack, onNext }) {
  return (
    <div>
      <StepHeading title="How would you rate your cooking skill?" sub="We'll adjust recipe complexity and technique detail to match." />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {SKILL_OPTIONS.map(opt => {
          const sel = answers.skillLevel === opt.value;
          return (
            <button key={opt.value} onClick={() => setAnswer("skillLevel", opt.value)} style={{
              background: sel ? "#e8a02012" : "#131318",
              border: `1px solid ${sel ? "#e8a020" : "#2a2a3a"}`,
              color: sel ? "#f0e8d8" : "#888",
              padding: "14px 18px", borderRadius: 8,
              cursor: "pointer", textAlign: "left", fontFamily: "inherit",
              transition: "all 0.15s",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 14, fontWeight: sel ? "bold" : "normal", color: sel ? "#e8a020" : "#c0b8a8" }}>
                  {opt.label}
                </span>
                {sel && <span style={{ color: "#e8a020", fontSize: 14 }}>✓</span>}
              </div>
              <div style={{ fontSize: 12, color: "#555", marginTop: 4, fontStyle: "italic", lineHeight: 1.4 }}>{opt.desc}</div>
            </button>
          );
        })}
      </div>
      <NavButtons step={1} onBack={onBack} onNext={onNext} nextDisabled={!answers.skillLevel} />
    </div>
  );
}

function StepTime({ answers, setAnswer, onBack, onNext }) {
  function TimeSelector({ label, options, value, field }) {
    return (
      <div>
        <div style={{ fontSize: 11, letterSpacing: 2, color: "#555", textTransform: "uppercase", marginBottom: 10 }}>
          {label}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {options.map(opt => {
            const sel = value === opt.value;
            return (
              <button key={opt.value} onClick={() => setAnswer(field, opt.value)} style={{
                background: sel ? "#e8a02012" : "#131318",
                border: `1px solid ${sel ? "#e8a020" : "#2a2a3a"}`,
                color: sel ? "#e8a020" : "#888",
                padding: "10px 16px", borderRadius: 6,
                cursor: "pointer", textAlign: "left",
                fontFamily: "inherit", fontSize: 13,
                transition: "all 0.15s",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                {opt.label}
                {sel && <span style={{ fontSize: 12 }}>✓</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const bothSet = answers.weekdayTimeMins !== null && answers.weekendTimeMins !== null;
  return (
    <div>
      <StepHeading title="How much time can you spend cooking?" sub="Weekday vs. weekend — we'll plan around your real schedule." />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <TimeSelector label="Weekday evenings" options={WEEKDAY_OPTIONS} value={answers.weekdayTimeMins} field="weekdayTimeMins" />
        <TimeSelector label="Weekends" options={WEEKEND_OPTIONS} value={answers.weekendTimeMins} field="weekendTimeMins" />
      </div>
      <NavButtons step={2} onBack={onBack} onNext={onNext} nextDisabled={!bothSet} />
    </div>
  );
}

function StepMethods({ answers, setAnswer, onBack, onNext }) {
  function toggle(method) {
    const cur = answers.cookingMethods;
    setAnswer("cookingMethods", cur.includes(method) ? cur.filter(m => m !== method) : [...cur, method]);
  }
  return (
    <div>
      <StepHeading title="Which cooking methods are you comfortable with?" sub="Select all that apply — we'll avoid the rest in your calendar." />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {COOKING_METHODS.map(m => (
          <SelectionChip
            key={m} label={m.charAt(0).toUpperCase() + m.slice(1)}
            selected={answers.cookingMethods.includes(m)}
            onClick={() => toggle(m)}
          />
        ))}
      </div>
      <NavButtons step={3} onBack={onBack} onNext={onNext} nextDisabled={answers.cookingMethods.length === 0} />
    </div>
  );
}

function StepTierChips({ title, sub, step, items, ratings, setRatings, onBack, onNext }) {
  const [activeTier, setActiveTier] = useState("like");

  function rate(item) {
    setRatings(prev => {
      const next = { ...prev };
      if (next[item] === activeTier) delete next[item];
      else next[item] = activeTier;
      return next;
    });
  }

  const counts = Object.values(ratings).reduce((acc, tier) => ({ ...acc, [tier]: (acc[tier] ?? 0) + 1 }), {});
  return (
    <div>
      <StepHeading title={title} sub={sub} />
      <div style={{
        display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap",
        padding: 5, background: "#0d0d12", border: "1px solid #1e1e2e", borderRadius: 8,
      }}>
        {[
          { tier: "like",  label: "Like",  color: "#22c55e" },
          { tier: "avoid", label: "Avoid", color: "#f59e0b" },
          { tier: "never", label: "Never", color: "#e84040" },
        ].map(({ tier, label, color }) => (
          <button key={tier} onClick={() => setActiveTier(tier)} style={{
            flex: 1, minWidth: 100, padding: "10px 12px", borderRadius: 6, cursor: "pointer",
            border: `1px solid ${activeTier === tier ? color : "transparent"}`,
            background: activeTier === tier ? `${color}18` : "transparent",
            color: activeTier === tier ? color : "#666", fontFamily: "inherit",
            fontSize: 11, fontWeight: "bold", letterSpacing: 1, textTransform: "uppercase",
          }}>
            {activeTier === tier ? "✓ " : ""}{label} <span style={{ opacity: .6 }}>· {counts[tier] ?? 0}</span>
          </button>
        ))}
      </div>
      <div style={{ fontSize: 11, color: "#555", margin: "-8px 0 12px", fontStyle: "italic" }}>
        “{TIER_CONFIG[activeTier].label}” is selected — tap as many items as you want. Tap an assigned item again to clear it.
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {items.map(item => (
          <TierChip key={item} label={item} tier={ratings[item] ?? null} activeTier={activeTier} onClick={() => rate(item)} />
        ))}
      </div>
      <NavButtons step={step} onBack={onBack} onNext={onNext} />
    </div>
  );
}

function StepCuisines({ answers, setAnswer, onBack, onNext }) {
  const priorities = answers.cuisinePriorities;

  function toggle(cuisine) {
    if (priorities.includes(cuisine)) {
      setAnswer("cuisinePriorities", priorities.filter(c => c !== cuisine));
    } else if (priorities.length < 3) {
      setAnswer("cuisinePriorities", [...priorities, cuisine]);
    }
  }

  const rankLabels = ["1st", "2nd", "3rd"];

  return (
    <div>
      <StepHeading title="Favourite cuisines — pick up to 3" sub="Tap in priority order. We'll feature these prominently in your calendar." />

      {/* Ranked selection display */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, minHeight: 44 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            flex: 1, background: priorities[i] ? "#e8a02018" : "#0d0d12",
            border: `1px solid ${priorities[i] ? "#e8a020" : "#1e1e2e"}`,
            borderRadius: 6, padding: "8px 10px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
          }}>
            <span style={{ fontSize: 10, color: "#444", letterSpacing: 1, textTransform: "uppercase" }}>{rankLabels[i]}</span>
            {priorities[i]
              ? <span style={{ fontSize: 13, color: "#e8a020" }}>{priorities[i]}</span>
              : <span style={{ fontSize: 12, color: "#333", fontStyle: "italic" }}>—</span>
            }
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {CUISINES.map(c => {
          const rank = priorities.indexOf(c);
          const selected = rank !== -1;
          const full = priorities.length >= 3 && !selected;
          return (
            <button key={c} onClick={() => !full && toggle(c)} style={{
              background: selected ? "#e8a02020" : "#131318",
              border: `1px solid ${selected ? "#e8a020" : full ? "#1a1a26" : "#2a2a3a"}`,
              color: selected ? "#e8a020" : full ? "#333" : "#888",
              padding: "8px 14px", borderRadius: 6,
              cursor: full ? "default" : "pointer",
              fontSize: 12, fontFamily: "inherit",
              transition: "all 0.15s",
            }}>
              {selected && <span style={{ marginRight: 5, fontSize: 10, fontWeight: "bold" }}>{rank + 1}</span>}
              {c}
            </button>
          );
        })}
      </div>
      <NavButtons step={6} onBack={onBack} onNext={onNext} nextLabel="Review" />
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "9px 0", borderBottom: "1px solid #1a1a26", alignItems: "flex-start" }}>
      <span style={{ fontSize: 11, color: "#555", letterSpacing: 1, textTransform: "uppercase", minWidth: 140, flexShrink: 0, marginTop: 1 }}>
        {label}
      </span>
      <span style={{ fontSize: 13, color: "#c0b8a8", lineHeight: 1.5 }}>{value || <em style={{ color: "#333" }}>not set</em>}</span>
    </div>
  );
}

function StepSummary({ answers, onBack, onFinish, saving }) {
  const { proteinRatings, flavourRatings } = answers;

  function formatRatings(ratings) {
    const liked = Object.entries(ratings).filter(([, v]) => v === "like").map(([k]) => k);
    const avoided = Object.entries(ratings).filter(([, v]) => v === "avoid").map(([k]) => k);
    const never = Object.entries(ratings).filter(([, v]) => v === "never").map(([k]) => k);
    const parts = [];
    if (liked.length) parts.push(`Like: ${liked.join(", ")}`);
    if (avoided.length) parts.push(`Avoid: ${avoided.join(", ")}`);
    if (never.length) parts.push(`Never: ${never.join(", ")}`);
    return parts.join(" · ") || "No preferences set";
  }

  function timeLabel(mins, opts) {
    return opts.find(o => o.value === mins)?.label ?? `${mins} min`;
  }

  return (
    <div>
      <StepHeading title="Your palate summary" sub="Everything looks good? Hit the button to build your personalised calendar." />
      <div style={{ background: "#0d0d12", border: "1px solid #1e1e2e", borderRadius: 8, padding: "4px 16px", marginBottom: 24 }}>
        <SummaryRow label="Household" value={answers.householdSize ? `${answers.householdSize} ${answers.householdSize === "1" ? "person" : "people"}` : null} />
        <SummaryRow label="Skill level" value={answers.skillLevel} />
        <SummaryRow label="Weekday time" value={answers.weekdayTimeMins ? timeLabel(answers.weekdayTimeMins, WEEKDAY_OPTIONS) : null} />
        <SummaryRow label="Weekend time" value={answers.weekendTimeMins ? timeLabel(answers.weekendTimeMins, WEEKEND_OPTIONS) : null} />
        <SummaryRow label="Methods" value={answers.cookingMethods.length ? answers.cookingMethods.join(", ") : null} />
        <SummaryRow label="Proteins" value={Object.keys(proteinRatings).length ? formatRatings(proteinRatings) : null} />
        <SummaryRow label="Flavours" value={Object.keys(flavourRatings).length ? formatRatings(flavourRatings) : null} />
        <SummaryRow
          label="Cuisine priorities"
          value={answers.cuisinePriorities.length
            ? answers.cuisinePriorities.map((c, i) => `${i + 1}. ${c}`).join("  ")
            : null}
        />
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onBack} style={{
          background: "none", border: "1px solid #2a2a3a", color: "#888",
          padding: "10px 20px", borderRadius: 6, cursor: "pointer",
          fontSize: 13, fontFamily: "inherit",
        }}>
          ← Back
        </button>
        <button onClick={onFinish} disabled={saving} style={{
          background: saving ? "#1e1e2e" : "#e8a020",
          color: saving ? "#444" : "#0c0c0f",
          border: "none", padding: "12px 28px", borderRadius: 6,
          cursor: saving ? "default" : "pointer",
          fontSize: 14, fontWeight: "bold", fontFamily: "inherit",
          letterSpacing: 0.5,
        }}>
          {saving ? "Saving…" : "Build my calendar →"}
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const EMPTY_ANSWERS = {
  householdSize: null,
  skillLevel: null,
  weekdayTimeMins: null,
  weekendTimeMins: null,
  cookingMethods: [],
  proteinRatings: {},
  flavourRatings: {},
  cuisinePriorities: [],
};

const DRAFT_KEY = "embb_palate_draft";

function answersFromPalate(palate) {
  return {
    ...EMPTY_ANSWERS,
    householdSize: palate?.householdSize ?? null,
    skillLevel: palate?.skillLevel ?? null,
    weekdayTimeMins: palate?.weekdayTimeMins ?? null,
    weekendTimeMins: palate?.weekendTimeMins ?? null,
    cookingMethods: palate?.cookingMethods ?? [],
    proteinRatings: palate?.proteinRatings ?? {},
    flavourRatings: palate?.flavourRatings ?? {},
    cuisinePriorities: palate?.cuisinePriorities ?? [],
  };
}

function initialAnswers(palate) {
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null");
    return draft ? { ...answersFromPalate(palate), ...draft } : answersFromPalate(palate);
  } catch {
    return answersFromPalate(palate);
  }
}

export default function PaletteQuestionnaire({ onComplete }) {
  const { palate, savePalate } = usePalate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(() => initialAnswers(palate));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(answers));
  }, [answers]);

  function setAnswer(key, value) {
    setAnswers(prev => ({ ...prev, [key]: value }));
  }

  function setRatings(key) {
    return (updater) => setAnswers(prev => ({
      ...prev,
      [key]: typeof updater === "function" ? updater(prev[key]) : updater,
    }));
  }

  const next = () => setStep(s => s + 1);
  const back = () => setStep(s => s - 1);

  async function finish() {
    setSaving(true);
    try {
      // Derive the legacy palate fields from ratings
      const { proteinRatings, flavourRatings } = answers;

      const likedProteins = Object.entries(proteinRatings).filter(([, v]) => v === "like").map(([k]) => k);
      const avoidProteins = Object.entries(proteinRatings).filter(([, v]) => v === "avoid").map(([k]) => k);
      const neverProteins = Object.entries(proteinRatings).filter(([, v]) => v === "never").map(([k]) => k);
      const likedFlavours = Object.entries(flavourRatings).filter(([, v]) => v === "like").map(([k]) => k);
      const avoidFlavours = Object.entries(flavourRatings).filter(([, v]) => v === "avoid").map(([k]) => k);

      const fullPalate = {
        // Legacy fields (kept for API prompt compatibility)
        proteinBlocks: neverProteins,
        dislikes: [...avoidProteins, ...avoidFlavours],
        likedProteins,
        likedFlavours,
        // Extended questionnaire fields
        householdSize: answers.householdSize,
        skillLevel: answers.skillLevel,
        weekdayTimeMins: answers.weekdayTimeMins,
        weekendTimeMins: answers.weekendTimeMins,
        cookingMethods: answers.cookingMethods,
        proteinRatings,
        flavourRatings,
        cuisinePriorities: answers.cuisinePriorities,
      };

      await savePalate(fullPalate);
      localStorage.removeItem(DRAFT_KEY);
      onComplete?.(fullPalate);
    } finally {
      setSaving(false);
    }
  }

  const containerStyle = {
    minHeight: "100vh",
    background: "#0c0c0f",
    fontFamily: "'Palatino Linotype', Palatino, serif",
    color: "#e0d8c8",
    display: "flex",
    flexDirection: "column",
  };

  const cardStyle = {
    flex: 1,
    maxWidth: 640,
    width: "100%",
    margin: "0 auto",
    padding: "0 0 40px",
    display: "flex",
    flexDirection: "column",
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={{ background: "#0e0e16", borderBottom: "1px solid #1e1e2e", padding: "16px 20px", textAlign: "center", position: "relative" }}>
        {onClose && (
          <button onClick={onClose} style={{
            position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)",
            background: "none", border: "1px solid #2a2a3a", color: "#888",
            padding: "6px 12px", borderRadius: 4, cursor: "pointer",
            fontSize: 12, fontFamily: "inherit", transition: "all 0.15s",
          }}>
            Close
          </button>
        )}
        <div style={{ fontSize: 10, letterSpacing: 5, color: "#555", marginBottom: 4, textTransform: "uppercase" }}>
          Ein Mehr Beissen Bitte
        </div>
        <h1 style={{ fontSize: "clamp(16px,3vw,22px)", fontWeight: "normal", margin: 0, color: "#f0e8d8" }}>
          Build your palate profile
        </h1>
      </div>

      <div style={cardStyle}>
        <ProgressBar step={step} />

        <div style={{ flex: 1, padding: "28px 20px 0" }}>
          {step === 0 && (
            <StepHousehold answers={answers} setAnswer={setAnswer} onNext={next} />
          )}
          {step === 1 && (
            <StepSkill answers={answers} setAnswer={setAnswer} onBack={back} onNext={next} />
          )}
          {step === 2 && (
            <StepTime answers={answers} setAnswer={setAnswer} onBack={back} onNext={next} />
          )}
          {step === 3 && (
            <StepMethods answers={answers} setAnswer={setAnswer} onBack={back} onNext={next} />
          )}
          {step === 4 && (
            <StepTierChips
              step={4}
              title="Rate your protein preferences"
              sub="Choose a rating, then paint it onto as many proteins as you like. Leave neutral if you're indifferent."
              items={PROTEINS}
              ratings={answers.proteinRatings}
              setRatings={setRatings("proteinRatings")}
              onBack={back}
              onNext={next}
            />
          )}
          {step === 5 && (
            <StepTierChips
              step={5}
              title="Rate your flavour preferences"
              sub="Choose a rating once, then tap every flavour it applies to. Neutral means no strong feeling."
              items={FLAVOURS}
              ratings={answers.flavourRatings}
              setRatings={setRatings("flavourRatings")}
              onBack={back}
              onNext={next}
            />
          )}
          {step === 6 && (
            <StepCuisines answers={answers} setAnswer={setAnswer} onBack={back} onNext={next} />
          )}
          {step === 7 && (
            <StepSummary answers={answers} onBack={back} onFinish={finish} saving={saving} />
          )}
        </div>
      </div>
    </div>
  );
}
