import { useEffect, useRef } from "react";

// Swipe, as a first-class way to move through MCZ.
//
// The dock is thirty apps on a phone screen. Reaching the one you want means
// opening a drawer, and getting back means finding a small X — both of which
// are TAPS on targets, when the gesture your thumb is already making is a
// swipe. `Interaction Design` (Rogers/Sharp/Preece) would call the mismatch an
// affordance problem: the interface affords swiping (it is a horizontal strip
// of cards on a touch screen) and then does not accept one.
//
// Three rules this follows, and they are what keep a gesture layer from being
// an irritation:
//
//   * NEVER THE ONLY WAY. Every swipe here has a visible control that does the
//     same thing. Same rule sound.js follows — a gesture nobody discovers is a
//     feature nobody has, and a gesture somebody CANNOT make is a wall.
//   * IT LOSES TO THE CONTENT. A swipe that starts on a scrollable row, a
//     slider, a text field or an audio scrubber belongs to that thing. Hijacking
//     it is how a gesture layer breaks the app it was added to.
//   * IT HAS TO BE DELIBERATE. A short drag is a scroll that wandered. The
//     distance and speed thresholds below are what separate "swiped" from
//     "tried to scroll and the page moved".
const MIN_DISTANCE = 56;      // px — shorter than this is a wobble, not a swipe
const MAX_OFF_AXIS = 0.6;     // a swipe is mostly one direction, or it's a drag
const MAX_DURATION = 700;     // ms — slower than this is a drag, and drags select

// Things that own their own horizontal movement. A swipe starting inside one
// of these is theirs, not ours.
const OWNS_HORIZONTAL =
  "input, textarea, select, [contenteditable], [role='slider'], " +
  "audio, video, [data-swipe-ignore], .overflow-x-auto, .scroll";

function ownsGesture(target) {
  return !!(target && target.closest && target.closest(OWNS_HORIZONTAL));
}

/**
 * Watch an element for deliberate swipes.
 *
 * @returns a teardown function — call it on unmount. Passive listeners
 *          throughout: this never calls preventDefault, so it can never be the
 *          reason the page stops scrolling.
 */
export function onSwipe(el, { onLeft, onRight, onDown } = {}) {
  if (!el) return () => {};
  let x0 = 0, y0 = 0, t0 = 0, live = false;

  const start = (e) => {
    const t = e.changedTouches ? e.changedTouches[0] : null;
    if (!t) return;
    live = !ownsGesture(e.target);
    x0 = t.clientX; y0 = t.clientY; t0 = Date.now();
  };

  const end = (e) => {
    if (!live) return;
    live = false;
    const t = e.changedTouches ? e.changedTouches[0] : null;
    if (!t) return;
    const dx = t.clientX - x0;
    const dy = t.clientY - y0;
    if (Date.now() - t0 > MAX_DURATION) return;

    const ax = Math.abs(dx), ay = Math.abs(dy);
    if (ax >= MIN_DISTANCE && ay / (ax || 1) < MAX_OFF_AXIS) {
      (dx < 0 ? onLeft : onRight)?.();
    } else if (ay >= MIN_DISTANCE && ax / (ay || 1) < MAX_OFF_AXIS && dy > 0) {
      onDown?.();
    }
  };

  el.addEventListener("touchstart", start, { passive: true });
  el.addEventListener("touchend", end, { passive: true });
  return () => {
    el.removeEventListener("touchstart", start);
    el.removeEventListener("touchend", end);
  };
}

/**
 * A sheet or modal you can swipe DOWN to dismiss.
 *
 * The gesture a phone has taught everybody for "put this away" is a downward
 * flick, and MCZ's overlays answered only to a small ✕ in a corner and to
 * Escape — a key a phone does not have. Returns a ref to spread onto the
 * panel; `onClose` must also stay reachable as a real control, which every
 * caller here already has.
 */
export function useSwipeAway(onClose) {
  const ref = useRef(null);
  const fn = useRef(onClose);
  fn.current = onClose;
  useEffect(() => onSwipe(ref.current, { onDown: () => fn.current?.() }), []);
  return ref;
}
