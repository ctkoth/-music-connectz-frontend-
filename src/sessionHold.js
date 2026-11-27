// A live BodieZ session kept on screen while other apps are open.
//
// The session already lives on the server (an open BodieZSession) and the shell can keep an app mounted
// while another is in front (recordingHold.js does it for a take). This is the same idea for a workout:
// BodieZ says "a session is running here", the shell keeps BodieZ mounted — hidden, not gone, so its rest
// clock and its beep keep running — and a bar says which lift is next and how long the rest has left.
//
// This module is the registry and the words, with no React in it, so both can be tested.
// `useSessionHold.js` is the thin hook that feeds it.
//
// What a tier buys is HOW OFTEN a day this is on (the server's `bodiez_float`: Free 3, Premium 6, StatZ
// 12), never whether the session runs. The price is worded here from the server's state and decides nothing.

import { restClock } from "./restBeep.js";

// `base` is what BodieZ says about the session; `rest` is what its rest timer says. They are kept apart because
// the timer is a CHILD of BodieZ, so its effect runs first — a rest published before the hold exists must not be
// dropped. `hold` is the merged snapshot readers get, the same object until something changes.
let base = null;               // { tab, sessionId, title, since, off, again, againLabel, undo, seeded }
let rest = null;               // { startMs, target, exercise, next }
let hold = null;
const listeners = new Set();

function emit() {
  hold = base ? { ...base, rest } : null;
  listeners.forEach((fn) => fn());
}

export const getSessionHold = () => hold;
export function subscribeSession(fn) { listeners.add(fn); return () => { listeners.delete(fn); }; }

/**
 * The session BodieZ is running.
 *
 *   again / againLabel — repeat the last set exactly, from the bar, and what that set is ("Bench Press · 10 × 60 kg").
 *                        No label means there is nothing to repeat yet, and the bar offers nothing.
 *   undo               — take a set back by id, for the bar's own Undo.
 */
export function setSessionHold({ tab, sessionId, title = "", since = null, off = null, again = null, againLabel = "", undo = null }) {
  if (!tab || !sessionId) return;
  if (base && !base.seeded && base.tab === tab && base.sessionId === sessionId && base.title === title
      && base.since === since && base.off === off && base.again === again && base.againLabel === againLabel
      && base.undo === undo) return;
  base = { tab, sessionId, title, since, off, again, againLabel, undo, seeded: false };
  emit();
}

/** Before BodieZ has loaded (a reload with a kept session): keep the tab mounted so it can load and take over. */
export function seedSessionHold(tab, sessionId) {
  if (base || !tab || !sessionId) return;
  base = { tab, sessionId, title: "", since: null, off: null, again: null, againLabel: "", undo: null, seeded: true };
  emit();
}

/** The rest timer's clock: when this rest began on THIS device's clock, how long it is, and what comes next. */
export function setRest(next) {
  const b = next || null;
  if (rest === b || (rest && b && rest.startMs === b.startMs && rest.target === b.target
                     && rest.exercise === b.exercise && rest.next === b.next)) return;
  rest = b;
  if (base) emit();
}

export function clearSessionHold() {
  if (!base) return;
  base = null;
  emit();
}

/** Tests only. */
export function resetSessionHold() { base = null; rest = null; hold = null; listeners.clear(); }

/** Rest left right now: {left, over, done, pct}. null until a set has been logged. */
export function restNow(rest, nowMs) {
  if (!rest || !Number.isFinite(rest.startMs) || !(rest.target > 0)) return null;
  const elapsed = Math.max(0, Math.floor((nowMs - rest.startMs) / 1000));
  const c = restClock(elapsed, rest.target);
  return { ...c, pct: Math.min(100, (elapsed / rest.target) * 100) };
}

/** m:ss, or h:mm:ss — the same shape BodieZ's own clocks use. */
export function clockText(sec) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}` : `${m}:${String(x).padStart(2, "0")}`;
}

/** The bar's one line about the rest. */
export function restLineText(r, next = "") {
  // No rest clock: before the first set, or BodieZ is on a tab that has no timer. Say only what is true.
  if (!r) return "Session running.";
  if (r.done) return `Rest over${r.over > 0 ? ` by ${clockText(r.over)}` : ""} — ${next ? `${next} is next.` : "go."}`;
  return `${clockText(r.left)} rest left${next ? ` · ${next} next` : ""}`;
}

/**
 * The price of the control, worded from the server's state (`GET /bodiez/float/`) BEFORE it is pressed.
 *
 *   cost    — what the press uses (null when it uses nothing: already on, or unlimited)
 *   after   — how many are left after it
 *   free    — the part that is always true: no ⚡ 🍥 🏷️
 *   blocked — a refusal in advance, with the next plan's number
 *
 * Never invents a number: with no state it says nothing.
 */
export function floatPrice(st) {
  if (!st || typeof st !== "object") return null;
  const free = "Costs no ⚡ 🍥 🏷️.";
  if (st.already) return { cost: null, after: null, blocked: null, free, text: "Already counted today — turning it off and on again is free." };
  if (st.unlimited || st.limit == null) return { cost: null, after: null, blocked: null, free, text: "Unlimited on your plan." };
  const left = Math.max(0, Number(st.left ?? 0));
  if (!st.can || left <= 0) {
    const n = st.next_limit;
    const up = n === false ? "" : n == null ? " The next plan up has no limit." : ` The next plan up keeps ${n} a day.`;
    return { cost: null, after: null, free,
      blocked: `You've kept ${st.used} of ${st.limit} sessions on screen in the last ${st.window_hours || 24} hours.${up} Your session still runs in BodieZ.`,
      text: "" };
  }
  return { cost: `−1 of today's ${st.limit}`, after: left - 1, blocked: null, free,
    text: `${left - 1} left after this one` };
}

/** "Bench Press · 10 × 60 kg (left)" — the set the bar would repeat, named before it is pressed. Empty when there is none. */
export function againLabelFor(set, fmtWeight) {
  if (!set || !set.exercise_name || !(set.reps > 0)) return "";
  const w = set.weight_kg != null ? fmtWeight(set.weight_kg) : "bodyweight";
  const side = set.one_sided ? ` (${set.one_sided})` : "";
  return `${set.exercise_name} · ${set.reps} × ${w}${side}`;
}

/** The set most recently logged, by the server's own clock. */
export function lastLogged(sets) {
  let last = null;
  for (const s of Array.isArray(sets) ? sets : []) if (s?.created_at && (!last || s.created_at > last.created_at)) last = s;
  return last;
}
