// A panel that floats above everything, placed beside the button that opened it. The track headers sit inside a rounded,
// overflow-clipped frame, so a panel drawn INSIDE them is cut off at the frame's edge (the last track's FX panel was
// unreadable for that reason). This one is drawn on the page itself, kept inside the window, scrolls if it is tall, and
// closes on Escape or a click outside it.
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export default function Popover({ rect, onClose, label, width = 288, children }) {
  const box = useRef(null);
  useEffect(() => {
    const key = (e) => { if (e.key === "Escape") onClose(); };
    const away = (e) => { if (box.current && !box.current.contains(e.target) && !e.target.closest?.("[data-popover-anchor]")) onClose(); };
    window.addEventListener("keydown", key); document.addEventListener("pointerdown", away);
    return () => { window.removeEventListener("keydown", key); document.removeEventListener("pointerdown", away); };
  }, [onClose]);
  if (!rect || typeof document === "undefined") return null;
  const vw = window.innerWidth, vh = window.innerHeight;
  const w = Math.min(width, vw - 16);
  const left = Math.max(8, Math.min(rect.left, vw - w - 8));
  const top = Math.max(8, Math.min(rect.bottom + 4, vh - 260));
  return createPortal(
    <div ref={box} role="dialog" aria-label={label} className="fixed z-[70] space-y-2 overflow-y-auto rounded-lg border border-white/20 bg-[#12121c] p-3 text-xs text-white shadow-2xl"
         style={{ left, top, width: w, maxHeight: vh - top - 8 }}>
      {children}
    </div>, document.body);
}
