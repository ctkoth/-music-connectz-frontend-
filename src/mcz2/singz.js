// SingZ — vocal training as a skill game. Data + a lightweight score simulator.
// Real pitch detection would use the mic; here scores are modeled from the
// user's check-in, difficulty, and skill so the loop is fully playable now.

export const RANGE_CLASSES = [
  { name: "Bass", emoji: "🧔‍♂️" },
  { name: "Baritone", emoji: "🎙️" },
  { name: "Tenor", emoji: "🎤" },
  { name: "Countertenor", emoji: "🕊️" },
  { name: "Contralto", emoji: "🎻" },
  { name: "Alto", emoji: "🎶" },
  { name: "Mezzo-Soprano", emoji: "🌊" },
  { name: "Soprano", emoji: "☀️" },
];

export const GOAL_PATHS = [
  { id: "strengthen", name: "Safe Strengthen", emoji: "🛡️", note: "Improve tone & consistency inside your current range." },
  { id: "bridge", name: "Bridge", emoji: "🌉", note: "Expand toward your target range in safe steps." },
  { id: "performance", name: "Performance", emoji: "🌟", note: "Apply range control inside songs & recordings." },
];

export const DIFFICULTIES = [
  { id: "starter", name: "Starter", emoji: "🌱", base: 82, note: "Gentle ranges, guided pitch lanes, easier breath demands." },
  { id: "builder", name: "Builder", emoji: "🧩", base: 74, note: "Longer phrases, more range movement, less guidance." },
  { id: "performer", name: "Performer", emoji: "🌟", base: 66, note: "Stronger pitch precision, endurance, harder runs." },
  { id: "boss", name: "Stage Boss", emoji: "👑", base: 58, note: "Audition simulation — limited retries, strict scoring." },
];

export const SCORE_METERS = [
  { id: "pitch", name: "Pitch", emoji: "🎯" },
  { id: "tone", name: "Tone", emoji: "🌈" },
  { id: "breath", name: "Breath", emoji: "🫁" },
  { id: "range", name: "Range", emoji: "📏" },
  { id: "agility", name: "Agility", emoji: "🌪️" },
  { id: "consistency", name: "Consistency", emoji: "📈" },
  { id: "health", name: "Voice Health", emoji: "🛌" },
  { id: "goal", name: "Goal Match", emoji: "☀️" },
];

export const SKILLS = ["Pitch", "Breath", "Range", "Agility", "Resonance", "Diction", "Song Performance"];

// Check-in drives safety + the health/consistency meters. 1–5 each.
export const CHECKIN = [
  { id: "condition", label: "🎤 Voice condition" },
  { id: "hydration", label: "💧 Hydration" },
  { id: "rest", label: "😴 Rest" },
  { id: "energy", label: "⚡ Energy" },
];

// Model a 0–100 score for a meter from difficulty base + check-in wellness.
export function simScore(base, wellness, jitter = 10) {
  const wellBonus = (wellness - 3) * 4; // -8..+8
  const raw = base + wellBonus + (Math.random() * jitter - jitter / 2);
  return Math.max(30, Math.min(100, Math.round(raw)));
}

// Average check-in (1–5). Low → strain risk.
export function wellnessOf(checkin) {
  const vals = CHECKIN.map((c) => checkin?.[c.id] || 3);
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}
