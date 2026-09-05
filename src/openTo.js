// A tab switch that carries what to DO when it lands.
//
// `goToSpot(tab, target)` scrolls to a `data-tour` anchor and flashes it. That
// is the whole of it — it cannot type in a search box, choose a filter or set
// a sort order. So "click Energy in the header" had nowhere to go: LogZ opens
// on Everything, and the member is looking at SpinaZ, money and XP rows when
// they asked one question about one resource.
//
// This is the missing half. A caller names the tab AND the view it wants;
// the destination applies it on mount.
//
// Two things make it survive a lazy route, which is the part that is easy to
// get wrong: the view is REMEMBERED as well as announced (the destination
// chunk is still downloading when the event fires, so an event alone would be
// shouted at nobody), and it is taken exactly once (a member who then picks a
// different filter must not have their choice undone by a stale intent the
// next time the component remounts).
import { useEffect, useRef } from "react";
import { goToTab } from "./goto.js";

const pending = new Map();

/** Open `tab` showing `view` — any shape the destination understands. */
export function goToView(tab, view) {
  if (view !== undefined) pending.set(tab, view);
  goToTab(tab);
  window.dispatchEvent(new CustomEvent("mcz-view", { detail: { tab, view } }));
}

/** Read and clear a pending view for `tab`. `undefined` when there is none. */
export function takeView(tab) {
  if (!pending.has(tab)) return undefined;
  const v = pending.get(tab);
  pending.delete(tab);
  return v;
}

/**
 * In the destination: apply whatever view a caller asked for.
 *
 * `apply` is held in a ref so a component that re-renders every keystroke does
 * not tear down and re-arm the listener on each one.
 */
export function useOpenView(tab, apply) {
  const fn = useRef(apply);
  fn.current = apply;
  useEffect(() => {
    const v = takeView(tab);
    if (v !== undefined) fn.current?.(v);
    const h = (e) => {
      if (e.detail?.tab !== tab) return;
      takeView(tab);                    // consumed here, not left for a remount
      fn.current?.(e.detail.view);
    };
    window.addEventListener("mcz-view", h);
    return () => window.removeEventListener("mcz-view", h);
  }, [tab]);
}
