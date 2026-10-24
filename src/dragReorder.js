// One way to reorder a list, everywhere: drag the ⋮⋮ grip (finger or mouse), or with a
// mouse grab the row itself. The arrows stay beside it where a screen had them, because
// a drag is not something everybody can do.
//
// Pure helpers here (tested under plain node); the hook is `useDragReorder.jsx`.

/** `list` with the item at `from` moved to `to`. A new array; out of range is a no-op. */
export function moveItem(list, from, to) {
  const n = list.length;
  if (from === to || from < 0 || to < 0 || from >= n || to >= n) return list.slice();
  const next = list.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/** Split a flat list into runs of neighbours sharing `keyOf` — sets into exercises. */
export function runs(list, keyOf) {
  const out = [];
  list.forEach((item, i) => {
    const last = out[out.length - 1];
    if (last && last.key === keyOf(item)) last.items.push({ item, i });
    else out.push({ key: keyOf(item), items: [{ item, i }] });
  });
  return out;
}

/** Move a whole run (an exercise and all its sets) from run `from` to run `to`. */
export function moveRun(list, keyOf, from, to) {
  const r = runs(list, keyOf);
  return moveItem(r, from, to).flatMap((x) => x.items.map((y) => y.item));
}

/** Move one item inside its run, by positions within that run. */
export function moveWithinRun(list, keyOf, run, from, to) {
  const r = runs(list, keyOf);
  if (!r[run]) return list.slice();
  r[run] = { ...r[run], items: moveItem(r[run].items, from, to) };
  return r.flatMap((x) => x.items.map((y) => y.item));
}

/** Things a press on a row must still reach rather than start a drag. */
export const INTERACTIVE = "input,select,textarea,button,a,label,[contenteditable],[role=button],video,audio,iframe";
