// Change a routine's lifts to the equipment a member actually has today.
//
// Kept pure (no React) so the rule can be tested. It decides nothing the library
// has not already declared: a replacement is a lift tagged with the SAME muscle
// group and one of the chosen equipment kinds, and `pool` is the list the server
// says this member can do (`pickable`), so a restriction they set is never undone
// by a swap. The only judgement is the ORDER of the options, and the member sees
// the options and picks — nothing is replaced without a preview.

// Words that name the equipment or the machine rather than the movement, so
// "Barbell Bench Press" and "Dumbbell Bench Press" are read as the same movement.
const GEAR_WORDS = new Set([
  "barbell", "dumbbell", "dumbbells", "db", "bb", "ez", "bar", "kettlebell", "machine", "cable", "cables",
  "pulley", "band", "bands", "bodyweight", "smith", "lever", "seated", "standing", "the", "a", "with", "on",
]);

export function movementWords(name) {
  return String(name || "").toLowerCase().split(/[^a-z0-9]+/).filter((w) => w && !GEAR_WORDS.has(w));
}

function overlap(a, b) {
  const set = new Set(a);
  let n = 0;
  for (const w of new Set(b)) if (set.has(w)) n += 1;
  return n;
}

/** Same-muscle lifts on the chosen equipment, best first: most of the movement's words
 *  shared, then ones the member has done, then A-Z. `taken` is every id already in use. */
export function equivalentsFor(ex, equipment, pool, taken) {
  const words = movementWords(ex.name);
  return pool
    .filter((c) => c.id !== ex.id && !taken.has(c.id)
      && c.muscle_group === ex.muscle_group && equipment.includes(c.equipment))
    .map((c) => ({ c, score: overlap(words, movementWords(c.name)) }))
    .sort((a, b) => b.score - a.score
      || (b.c.times_done > 0) - (a.c.times_done > 0)
      || String(b.c.last_done || "").localeCompare(String(a.c.last_done || ""))
      || a.c.name.localeCompare(b.c.name))
    .map((x) => x.c);
}

/** What switching `rows` to `equipment` would do, without doing it.
 *  `changes`: a lift that does not fit and has options (`pick` is the top one).
 *  `stuck`:   a lift that does not fit and has none, so it is kept and the member told why.
 *  `fits`:    how many already use the chosen equipment.
 *  `unknown`: rows whose lift is not in the library list (left alone, never guessed at). */
export function planEquipmentSwitch(rows, exercises, pool, equipment) {
  const out = { changes: [], stuck: [], fits: 0, unknown: 0 };
  if (!equipment || equipment.length === 0) return out;
  const byId = new Map(exercises.map((e) => [e.id, e]));
  // Greedy and in routine order: an id given to an earlier row is not offered to a later one.
  const taken = new Set(rows.map((r) => r.exercise_id));
  rows.forEach((r, index) => {
    const ex = byId.get(r.exercise_id);
    if (!ex) { out.unknown += 1; return; }
    if (equipment.includes(ex.equipment)) { out.fits += 1; return; }
    const options = equivalentsFor(ex, equipment, pool, taken);
    if (options.length === 0) { out.stuck.push({ index, from: ex }); return; }
    taken.add(options[0].id);
    out.changes.push({ index, from: ex, options, pick: options[0].id });
  });
  return out;
}

/** Apply a plan, with `picks` (index -> chosen id) overriding the top option. Sets, reps,
 *  position and any superset label stay — only the lift changes. The target weight is
 *  CLEARED: a barbell load is not a dumbbell load, and carrying 100 over would be a wrong
 *  number the member has to notice. */
export function applyEquipmentSwitch(rows, changes, picks = {}) {
  const next = rows.map((r) => ({ ...r }));
  for (const ch of changes) {
    const id = picks[ch.index] ?? ch.pick;
    next[ch.index] = {
      ...next[ch.index], exercise_id: id, added: undefined,
      weight_kg: null, weight_input: undefined,
    };
  }
  return next;
}
