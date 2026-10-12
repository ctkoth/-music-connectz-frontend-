// HTML5 drag props for a reorderable list; the moves themselves are in reorder.js.
import { useRef, useState } from "react";

/** Drag props for item `i`: `drag(i)` spreads onto the row, `over` is the index
 *  currently hovered (for a drop line). */
export function useDragReorder(onMove) {
  const from = useRef(null);
  const [over, setOver] = useState(null);
  const drag = (i) => ({
    draggable: true,
    onDragStart: (e) => { from.current = i; try { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(i)); } catch { /* old browser */ } },
    onDragOver: (e) => { if (from.current !== null) { e.preventDefault(); setOver(i); } },
    onDrop: (e) => {
      e.preventDefault();
      const f = from.current;
      from.current = null; setOver(null);
      if (f !== null && f !== i) onMove(f, i);
    },
    onDragEnd: () => { from.current = null; setOver(null); },
  });
  return { drag, over: over !== null && from.current !== null ? over : null, from: from.current };
}
