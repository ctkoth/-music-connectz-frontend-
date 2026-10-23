// The drag half of `dragReorder.js`. Pointer events, not HTML5 drag-and-drop, which
// never fires for a finger on a phone.
//
//   const d = useDragReorder("sets-3", (from, to) => setRows(moveItem(rows, from, to)));
//   <div {...d.row(i)} className={d.rowClass(i)}> <DragGrip {...d.grip(i)} /> … </div>
//
// `name` keeps nested lists apart: a set dragged inside an exercise only ever lands on
// another set of that exercise, never on the exercise around it. `canDrop(from, to)`
// narrows one flat list the same way (a set only onto a set of its own exercise).
import { useState } from "react";
import { GripVertical } from "lucide-react";
import { INTERACTIVE } from "./dragReorder.js";

export function useDragReorder(name, onMove, canDrop = () => true) {
  const [drag, setDrag] = useState(null); // {from, over}
  const attr = "data-drag";
  const start = (i) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* old browser */ }
    setDrag({ from: i, over: i });
  };
  const follow = {
    onPointerMove: (e) => {
      if (!drag) return;
      e.stopPropagation();
      const el = document.elementFromPoint(e.clientX, e.clientY)?.closest(`[${attr}^="${name}:"]`);
      if (el) {
        const over = Number(el.getAttribute(attr).slice(name.length + 1));
        setDrag((d) => (d && d.over !== over && canDrop(d.from, over) ? { ...d, over } : d));
      }
    },
    onPointerUp: (e) => {
      if (!drag) return;
      e.stopPropagation();
      if (drag.from !== drag.over) onMove(drag.from, drag.over);
      setDrag(null);
    },
    onPointerCancel: () => setDrag(null),
  };
  return {
    drag,
    // On the grip: any pointer, finger included.
    grip: (i) => ({ onPointerDown: start(i), ...follow }),
    // On the row: a mouse may grab anywhere that is not a control. A finger may not,
    // or the page could never be scrolled past the list.
    row: (i) => ({
      [attr]: `${name}:${i}`,
      onPointerDown: (e) => {
        if (e.pointerType !== "mouse" || e.button !== 0 || e.target.closest(INTERACTIVE)) return;
        start(i)(e);
      },
      ...follow,
    }),
    rowClass: (i) => (drag?.from === i ? " opacity-40"
      : drag && drag.over === i ? " ring-1 ring-mcz-cyan/70" : ""),
  };
}

export function DragGrip({ label = "Drag to reorder", size = 15, ...props }) {
  return (
    <button type="button" aria-label={label} title={label}
            className="shrink-0 cursor-grab touch-none select-none rounded p-1 text-white/35 hover:text-white active:cursor-grabbing"
            {...props}>
      <GripVertical size={size} />
    </button>
  );
}
