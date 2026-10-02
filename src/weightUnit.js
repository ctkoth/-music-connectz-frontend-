// Weights are stored in kg on the server and converted only at the screen.
// The default follows the browser's region: the US, Liberia and Myanmar use
// pounds, everywhere else kilograms. A member's own pick overrides it.
export const LB_PER_KG = 1 / 0.45359237;
const IMPERIAL = new Set(["US", "LR", "MM"]);
const KEY = "mcz.weightUnit";

export function regionDefault(languages) {
  for (const tag of languages || []) {
    const region = String(tag).split(/[-_]/)[1];
    if (region && /^[A-Za-z]{2}$/.test(region)) return IMPERIAL.has(region.toUpperCase()) ? "lb" : "kg";
  }
  return "kg";
}

export function getUnit() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "lb" || saved === "kg") return saved;
  } catch { /* storage blocked */ }
  if (typeof navigator === "undefined") return "kg";
  return regionDefault(navigator.languages?.length ? navigator.languages : [navigator.language]);
}

export function saveUnit(unit) {
  try { localStorage.setItem(KEY, unit); } catch { /* storage blocked */ }
}

const round1 = (n) => Math.round(n * 10) / 10;

// kg (server) -> number in the member's unit, one decimal.
export function fromKg(kg, unit) {
  if (kg == null || kg === "") return null;
  return round1(unit === "lb" ? Number(kg) * LB_PER_KG : Number(kg));
}

// Number typed in the member's unit -> kg for the server, two decimals (the column's precision).
export function toKg(value, unit) {
  if (value == null || value === "") return null;
  const kg = unit === "lb" ? Number(value) / LB_PER_KG : Number(value);
  return Math.round(kg * 100) / 100;
}

export const fmtWeight = (kg, unit) => (kg == null ? "" : `${fromKg(kg, unit)}${unit}`);
