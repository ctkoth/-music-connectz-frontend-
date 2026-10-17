// Remembered choices: a form field opens on what the member last picked there,
// or failing that what they pick most. Per device, in localStorage — a
// convenience, never state anything depends on, so every read and write is
// guarded and a blocked store just means the field opens on its own default.
//
// Pure functions up top (tested under plain node); the hook is below.
const PREFIX = "mcz_pref:";
const MAX_VALUES = 40; // a free-text field must not grow this without bound

function load(field) {
  try {
    const row = JSON.parse(localStorage.getItem(PREFIX + field) || "null");
    if (row && typeof row === "object" && typeof row.counts === "object") return row;
  } catch { /* unreadable → no memory */ }
  return { last: null, counts: {} };
}

// What to open on. `allowed` is the list of values the field can currently
// hold (undefined = anything); a remembered value that is no longer offered is
// never returned, so a retired option can't be restored into a select that
// has no such row. Last used wins; the most used is the fallback.
export function pick(row, allowed) {
  const ok = (v) => v != null && v !== "" && (!allowed || allowed.includes(v));
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
