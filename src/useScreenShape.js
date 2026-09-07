// How much screen there is, and what shape it is.
//
// The widget board's whole claim is "the screen could fit more", so something
// has to decide how many widgets fit — and a CSS breakpoint alone cannot,
// because a breakpoint knows the width and nothing else. A 1024px-wide phone
// held sideways and a 1024px-wide laptop window want different answers: the
// phone has 400px of HEIGHT to spend and a thumb doing the pointing, the
// laptop has 700px and a mouse. Same width, different screen.
//
// So three things are measured, not guessed:
//
// * **Width**, against the narrowest a widget can be and still be worth
//   opening. Every player under ~260px is a scrollbar with a play button.
// * **Height and orientation**, because lanes are only half of it — a short
//   landscape screen wants fewer, shorter tiles, not the same tiles squeezed.
// * **Pointer**, via `pointer: coarse`. This is the honest test for "is this a
//   touch device": it asks the browser what the input actually IS rather than
//   pattern-matching a user-agent string, which lies by design and has to be
//   re-taught every time a device ships.
//
// Nothing here reads the user agent. A desktop browser at phone width gets the
// phone layout, which is correct — the layout answers to the screen, not to a
// label we put on the machine.
import { useEffect, useState } from "react";

// The narrowest a widget is still worth looking at, and the gap between them.
export const MIN_LANE_PX = 300;
const GAP_PX = 12;

const mql = (q) => (typeof window !== "undefined" && window.matchMedia
  ? window.matchMedia(q)
  : null);

/** Decide the board's grid from a measured viewport. Exported so it can be
 *  reasoned about (and tested) without a browser to resize. */
export function shapeOf({ w, h, coarse }) {
  const portrait = h >= w;
  // How many MIN_LANE_PX columns fit, before anything else has a say.
  const fits = Math.max(1, Math.floor((w + GAP_PX) / (MIN_LANE_PX + GAP_PX)));

  let lanes = fits;
  // A coarse pointer is a hand, and a hand drags a board it cannot aim at.
  // Touch screens get one fewer lane than they technically fit, so each widget
  // stays big enough for its own controls to be hit rather than aimed at.
  if (coarse) lanes = Math.max(1, Math.min(fits, portrait ? 1 : 2));
  // Above four the tiles are small enough that "more of them" stops being more
  // useful, and the board turns into a contact sheet.
  lanes = Math.min(lanes, 4);

  // How tall a tile may be, so a landscape phone doesn't hand every widget a
  // full screen of height it has to scroll past to reach the next one. Two
  // rows of board should be reachable on any screen that has the height for
  // them; on one that doesn't, one tile filling the view is the honest answer.
  const maxTile = Math.max(200, Math.round(h * (portrait ? 0.62 : 0.78)));

  return {
    w, h, portrait, coarse, lanes, maxTile,
    // A single-lane board is a stack, and a stack of open widgets is a scroll
    // marathon — so on one lane only the focused widget is expanded and the
    // rest collapse to their title bars. This is the flag that says so.
    stacked: lanes === 1,
  };
}

const read = () => shapeOf({
  w: typeof window === "undefined" ? 1280 : window.innerWidth,
  h: typeof window === "undefined" ? 800 : window.innerHeight,
  coarse: !!mql("(pointer: coarse)")?.matches,
});

/** The live screen shape. Re-measures on resize, rotation, and on a pointer
 *  change — a tablet with a keyboard folded on and off is one device that is
 *  genuinely two shapes. */
export function useScreenShape() {
  const [shape, setShape] = useState(read);

  useEffect(() => {
    let frame = 0;
    // Resize fires per pixel of a drag; the layout only needs the last one.
    const remeasure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setShape(read()));
    };
    window.addEventListener("resize", remeasure);
    window.addEventListener("orientationchange", remeasure);
    const pointer = mql("(pointer: coarse)");
    // addEventListener on a MediaQueryList is the modern spelling and Safari
    // under 14 only has addListener. Both are wired rather than picking one
    // and leaving a whole class of device measuring itself once and never again.
    pointer?.addEventListener?.("change", remeasure);
    pointer?.addListener?.(remeasure);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", remeasure);
      window.removeEventListener("orientationchange", remeasure);
      pointer?.removeEventListener?.("change", remeasure);
      pointer?.removeListener?.(remeasure);
    };
  }, []);

  return shape;
}
