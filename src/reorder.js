// Drag-to-reorder for BodieZ lists: pure helpers (the hook is useDragReorder.js,
// kept apart so this runs under plain node). The designer, the live session and
// the logged-workout editor all move things the same way. Dragging is a convenience over the
// up/down arrows, which stay: the HTML5 drag events do not fire on most touch
// screens, and a control that works only with a mouse would be a tier by device.
import { blocks } from "./supersets.js";

/** A copy of `list` with the item at `from` moved to index `to`. */
export function reorderList(list, from, to) {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const out = list.slice();
  const [item] = out.splice(from, 1);
  out.splice(to, 0, item);
  return out;
}

/** Plan rows reordered as BLOCKS, so a superset pair always travels together. */
export function reorderBlocks(rows, from, to) {
  const bs = blocks(rows);
  return reorderList(bs, from, to).flatMap((b) => (b.pair ? b.pair : [b.single]));
}

/** `rows` sorted so blocks whose lead lift is in `ids` follow that order; the
 *  rest keep their place after them. Unknown ids are ignored. */
export function applyBlockOrder(rows, ids) {
  if (!ids || !ids.length) return rows;
  const bs = blocks(rows);
  const rank = (b) => {
    const k = ids.indexOf((b.pair ? b.pair[0] : b.single).exercise_id);
    return k === -1 ? ids.length : k;
  };
  return bs.map((b, i) => ({ b, i })).sort((x, y) => rank(x.b) - rank(y.b) || x.i - y.i)
    .flatMap(({ b }) => (b.pair ? b.pair : [b.single]));
}

/** Lead exercise id of each block, in order — what is stored as the order. */
export const blockIds = (rows) => blocks(rows).map((b) => (b.pair ? b.pair[0] : b.single).exercise_id);
