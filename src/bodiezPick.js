// The one pure lookup both BodieZ.jsx's member SplitBuilder and
// BodieZTrial.jsx's trial-door split builder need: which real exercise
// covers a muscle group, given the exercise library and an equipment filter.
//
// Pulled out of BodieZ.jsx on purpose. That file is the whole member Coach
// app — BodyMap, sessions, progress, recovery, the works — and every route
// here is lazy() specifically so a deploy doesn't cost every open tab a
// reload (see the frontend CLAUDE.md). Register.jsx already imports
// BodieZTrial.jsx's trial-split helpers to carry a built week across
// registration; if BodieZTrial.jsx also imported pickForDay FROM BodieZ.jsx,
// Register's chunk would drag the entire member Coach app into whatever
// bundle Register lands in. A stranger filling out the signup form has no
// reason to download BodyMap.
//
// `bodymap` is optional: a trial visitor has no fatigue history (no account
// yet), and this degrades cleanly to picking in the day's own muscle order
// when there is none to sort by.
const NEED_ORDER = { untrained: 0, undertrained: 1, balanced: 2, recent: 3, overworked: 4 };

export function pickForDay(dayMuscles, bodymap, exercises, equipment) {
  const statusByMuscle = {};
  for (const m of (bodymap?.muscles || [])) statusByMuscle[m.muscle_group] = m.status;
  const ordered = dayMuscles.slice().sort(
    (a, b) => (NEED_ORDER[statusByMuscle[a]] ?? 9) - (NEED_ORDER[statusByMuscle[b]] ?? 9));
  const picked = [];
  for (const muscle of ordered) {
    const pool = exercises.filter((ex) => ex.muscle_group === muscle
      && (!equipment || ex.equipment === equipment));
    if (pool.length > 0) picked.push(pool[0]);
  }
  return picked;
}
