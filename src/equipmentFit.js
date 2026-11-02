// Fitting a routine to the equipment a member has. Pure, so it runs under plain node.
//
// "I have dumbbells and a band — make this routine use only those." The Planner does it from the
// library and nothing else: no AI, no price. For each lift that needs gear the member did not pick, it
// offers lifts in the SAME muscle group that use only what they picked, ranked by how much of the
// movement's name they share ("Bench Press" → "Dumbbell Bench Press" before "Dumbbell Fly"), and
// otherwise in the library's own curated order. Every swap is shown with its reason and can be changed;
// nothing is saved here.
//
// What it will not do, on purpose:
//  * **Carry a weight across lifts.** 60 kg on a barbell is not 60 kg in a dumbbell; the swapped row's weight
//    is cleared and the logger fills in the member's own last weight for the NEW lift.
//  * **Invent a substitute.** A lift with no same-muscle option in the picked equipment is reported, and
//    is kept unless the member chooses to remove it — a shorter routine is theirs to decide.
//  * **Hide what the server hides.** Candidates come from `pickable` (the server's own `accessible` flag),
//    so the equipment fit never offers a lift the member's movement settings rule out.
import { normalize } from "./supersets.js";

// Words that say WHAT you hold, not WHICH movement it is, so they are dropped before comparing names.
const GEAR_WORDS = new Set(["barbell", "dumbbell", "dumbbells", "machine", "cable", "band", "bands",
  "kettlebell", "smith", "ez", "bar", "bodyweight", "weighted", "seated", "standing"]);
const STOP = new Set(["the", "a", "of", "with", "to", "on"]);

/** The movement a lift is, in lowercase words: "Incline Dumbbell Press" → {incline, press}. */
export function nameCore(name) {
  return new Set(String(name || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ")
    .filter((w) => w && !GEAR_WORDS.has(w) && !STOP.has(w)));
}

/** How many movement words two lifts share. */
export function similarity(a, b) {
  const A = nameCore(a), B = nameCore(b);
  let n = 0;
  for (const w of A) if (B.has(w)) n += 1;
  return n;
}

const byId = (list) => new Map(list.map((e) => [e.id, e]));

/** Shared words, in the order they read in `a`, for the "why" line. */
function sharedWords(a, b) {
  const B = nameCore(b);
  return [...nameCore(a)].filter((w) => B.has(w));
}

/**
 * @param rows       the routine's exercise rows ({exercise_id, order, sets, reps, weight_kg, group?})
 * @param exercises  the whole library (names stay resolvable for old routines)
 * @param pickable   what this member may use (the server's `accessible` flag applied)
 * @param equipment  the equipment keys the member picked; empty means "any" and nothing is changed
 * @returns one entry per row, in routine order:
 *   { index, row, ex, ok, candidates, best, why }
 *   ok = the lift already uses only what was picked; best = the first candidate, or null (no option).
 */
export function fitRoutine({ rows, exercises, pickable, equipment }) {
  const lib = byId(exercises);
  const want = new Set(equipment || []);
  const inRoutine = new Set(rows.map((r) => r.exercise_id));
  const taken = new Set();                         // a lift offered to one row is not offered to another
  const pool = (pickable || exercises).slice().sort((a, b) => a.id - b.id);   // the library's curated order
  return rows.map((row, index) => {
    const ex = lib.get(row.exercise_id) || null;
    if (want.size === 0 || (ex && want.has(ex.equipment))) {
      return { index, row, ex, ok: true, candidates: [], best: null, why: "" };
    }
    const candidates = ex ? pool
      .filter((c) => c.muscle_group === ex.muscle_group && want.has(c.equipment) && !inRoutine.has(c.id))
      .map((c) => ({ c, s: similarity(ex.name, c.name) }))
      .sort((a, b) => b.s - a.s || a.c.id - b.c.id)
      .map((x) => x.c) : [];
    const best = candidates.find((c) => !taken.has(c.id)) || null;
    if (best) taken.add(best.id);
    const shared = best ? sharedWords(ex.name, best.name) : [];
    return {
      index, row, ex, ok: false, candidates, best,
      why: best ? (shared.length ? `same muscle, “${shared.join(" ")}” in both` : "same muscle, closest option")
                : "",
    };
  });
}

/**
 * The rows the member ends up with. `choices` maps a row index to a lift id the member picked, or to
 * "remove"; any row without one takes the Planner's `best` (and an unresolvable row is KEPT). Swapped rows
 * lose their weight; sets, reps, order and a superset's place are kept, then superset labels are re-checked.
 */
export function applyFit(plan, choices = {}) {
  const out = [];
  for (const p of plan) {
    const pick = choices[p.index];
    if (pick === "remove") continue;
    const id = pick != null ? pick : (p.ok ? p.row.exercise_id : p.best?.id);
    if (id == null || id === p.row.exercise_id) { out.push({ ...p.row }); continue; }
    const { weight_input: _w, lb_fixed: _lb, ...rest } = p.row;
    out.push({ ...rest, exercise_id: id, weight_kg: null });
  }
  return normalize(out.map((r, i) => ({ ...r, order: i })));
}

/** Rows that still need gear the member did not pick after `choices` — what the screen warns about. */
export function stillOff({ plan, choices = {}, exercises, equipment }) {
  const want = new Set(equipment || []);
  if (want.size === 0) return [];
  const lib = byId(exercises);
  return plan.filter((p) => {
    const pick = choices[p.index];
    if (pick === "remove") return false;
    const id = pick != null ? pick : (p.ok ? p.row.exercise_id : p.best?.id ?? p.row.exercise_id);
    const ex = lib.get(id);
    return !ex || !want.has(ex.equipment);
  });
}

/** Every lift that uses the picked equipment, grouped by muscle — "just show me what I can do". */
export function showByEquipment({ pickable, equipment }) {
  const want = new Set(equipment || []);
  const out = {};
  for (const e of (pickable || []).slice().sort((a, b) => a.id - b.id)) {
    if (want.size && !want.has(e.equipment)) continue;
    (out[e.muscle_group] ||= []).push(e);
  }
  return out;
}

/** "Dumbbell + Band" — the equipment a routine's lifts use, for the start list. */
export function equipmentOf(rows, exercises, labels) {
  const lib = byId(exercises);
  const seen = [];
  for (const r of rows) {
    const k = lib.get(r.exercise_id)?.equipment;
    if (k && !seen.includes(k)) seen.push(k);
  }
  return seen.map((k) => labels[k] || k);
}
