// Remembered choices: a form field opens on what the member last picked there,
// or failing that what they pick most. Per device, in localStorage — a
// convenience, never state anything depends on, so every read and write is
// guarded and a blocked store just means the field opens on its own default.
//
// Pure functions up top (tested under plain node); the hook is below.
const PREFIX = "mcz_pref:";
export const SUGGEST_SHARE = 0.65;   // "most used" means at least this much of the time
export const SUGGEST_MIN_USES = 5;   // …and enough uses that a share means something
const MAX_VALUES = 40; // a free-text field must not grow this without bound

function load(field) {
  try {
    const row = JSON.parse(localStorage.getItem(PREFIX + field) || "null");
    if (row && typeof row === "object" && typeof row.counts === "object") return row;
  } catch { /* unreadable → no memory */ }
  return { last: null, counts: {} };
}

// The value carrying >= 65% of >= 5 (still-offered) uses, else null.
export function topShare(row, allowed) {
  const entries = Object.entries(row.counts || {}).filter(([v]) => !allowed || allowed.includes(v));
  const total = entries.reduce((n, [, c]) => n + c, 0);
  if (total < SUGGEST_MIN_USES) return null;
  const [value, n] = entries.sort((a, b) => b[1] - a[1])[0];
  return n / total >= SUGGEST_SHARE ? { value, share: n / total, n: total } : null;
}

// What to open on. `allowed` is the list of values the field can currently
// hold (undefined = anything); a remembered value that is no longer offered is
// never returned, so a retired option can't be restored into a select that
// has no such row.
//
// Last used wins — UNLESS one value is a habit (>= 65% of >= 5 uses) and the
// last one was a one-off, in which case the habit opens: somebody who sends
// Drill nine times in ten and Trap once should not find Trap waiting.
export function pick(row, allowed) {
  const ok = (v) => v != null && v !== "" && (!allowed || allowed.includes(v));
  const habit = topShare(row, allowed);
  if (habit) return habit.value;
  if (ok(row.last)) return row.last;
  let best = null;
  for (const [v, n] of Object.entries(row.counts || {})) {
    if (ok(v) && (best === null || n > row.counts[best])) best = v;
  }
  return best;
}

export function bump(row, value) {
  if (value == null || value === "") return row;
  const counts = { ...(row.counts || {}) };
  counts[value] = (counts[value] || 0) + 1;
  const keys = Object.keys(counts);
  if (keys.length > MAX_VALUES) {
    const drop = keys.filter((k) => k !== value).sort((a, b) => counts[a] - counts[b])[0];
    delete counts[drop];
  }
  return { last: value, counts };
}

export function recall(field, allowed) {
  return pick(load(field), allowed);
}

export function remember(field, value) {
  try { localStorage.setItem(PREFIX + field, JSON.stringify(bump(load(field), String(value)))); }
  catch { /* per-device convenience only */ }
}

// For form objects: overlay remembered values for `keys` onto the defaults.
export function seed(prefix, defaults, keys) {
  const out = { ...defaults };
  for (const k of keys) { const v = recall(`${prefix}.${k}`); if (v != null) out[k] = v; }
  return out;
}


// A suggestion, when the member's usual choice differs from what is showing.
// The default stays their LAST choice; this only speaks when one other value
// carries >= 65% of their uses, so it is a habit and not a coincidence.
export function suggestion(row, current, allowed) {
  const t = topShare(row, allowed);
  return t && String(t.value) !== String(current) ? t : null;
}

export function suggest(field, current, allowed) {
  return suggestion(load(field), current, allowed);
}
