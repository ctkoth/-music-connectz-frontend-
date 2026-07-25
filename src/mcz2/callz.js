// CallZ config. StatZ-only. Calls are billed against the cash wallet — AI by
// the minute (rate depends on the model), users by the hour (rate depends on
// their skill level). SpinAZ payment is "coming soon".

// Per-minute rates for AI calls, by model choice.
export const AI_MODELS = [
  { id: "lite", name: "Lite Assistant", emoji: "⚡", perMin: 0.05, desc: "Fast, lightweight — quick feedback and idea bouncing." },
  { id: "studio", name: "Studio Pro", emoji: "🎛️", perMin: 0.15, desc: "Mix/master coaching and detailed production notes." },
  { id: "maestro", name: "Maestro", emoji: "🎼", perMin: 0.40, desc: "Top-tier composition, theory, and arrangement guidance." },
];

// Callable users; hourly rate scales with skill level.
export const CALLABLE_USERS = [
  { id: "u-kaya", name: "Kaya", skill: "Vocalist · Pro", perHour: 45 },
  { id: "u-diego", name: "Diego", skill: "Producer · Expert", perHour: 80 },
  { id: "u-lilith", name: "Lilith", skill: "Mix Engineer · Master", perHour: 120 },
  { id: "u-sam", name: "Sam", skill: "Songwriter · Intermediate", perHour: 25 },
];

// Billing unit in seconds: AI charges per minute, user calls per hour. Cost is
// prorated by elapsed seconds against the unit so short calls are cheap.
export const AI_UNIT_SECONDS = 60;
export const USER_UNIT_SECONDS = 3600;

// Prorated cost in dollars for `seconds` elapsed at `ratePerUnit` / `unit`.
export function callCost(seconds, ratePerUnit, unitSeconds) {
  return (ratePerUnit * seconds) / unitSeconds;
}

export function fmtDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
