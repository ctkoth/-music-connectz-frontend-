// How many times a day the DAW's tuner may be switched on: the plan's count (Free 3 / Premium 6 / StatZ unlimited,
// the served `imagez_layers`). Kept on this device by LOCAL date, so a day is the member's own. A tier says how
// often, never whether, and switching it on again for the same take costs nothing. null cap = unlimited.
const KEY = "mcz_daw_tuner_uses";

const dayOf = (now) => { const d = new Date(now); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };

export function usedToday(store, now = Date.now()) {
  try { const v = JSON.parse(store.getItem(KEY) || "null"); return v && v.day === dayOf(now) ? Number(v.n) || 0 : 0; } catch { return 0; }
}
export function leftToday(store, cap, now = Date.now()) { return cap == null ? Infinity : Math.max(0, cap - usedToday(store, now)); }
/** Count one switch-on. Returns false (and counts nothing) when none are left. */
export function spendOne(store, cap, now = Date.now()) {
  if (leftToday(store, cap, now) <= 0) return false;
  try { store.setItem(KEY, JSON.stringify({ day: dayOf(now), n: usedToday(store, now) + 1 })); } catch { /* blocked storage: it just isn't counted */ }
  return true;
}
