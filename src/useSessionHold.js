// The React side of sessionHold.js: what BodieZ calls to say "a session is running here and the member wants it
// on screen", and what the shell reads to know which app it must not unmount.
import { useContext, useEffect, useRef, useSyncExternalStore } from "react";
import { TabSlotContext } from "./useRecordingHold.js";
import { clearSessionHold, getSessionHold, subscribeSession, setSessionHold } from "./sessionHold.js";

export const useSessionHoldState = () => useSyncExternalStore(subscribeSession, getSessionHold, getSessionHold);

/**
 * Say that this app has a live session the member wants kept on screen.
 *
 *   on        — a live session that was chosen to stay (and has not been switched off)
 *   sessionId, title, since — what the bar shows
 *   off       — how the bar's ✕ switches it off; the latest is always used
 *   settled   — the app has finished loading its session. Until then "no live session" means "not known yet", and
 *               clearing would wipe the hold a reload restored (the shell seeds it so the bar comes back).
 *
 * Returns whether this app is mounted in a shell tab at all. In a mini pane, a split pane or a standalone
 * shell it is not: there is nothing to keep alive (it is already on screen, or there are no other apps), so
 * the control is not offered there.
 */
export function useSessionHold({ on, sessionId, title = "", since = null, off, settled = true }) {
  const slot = useContext(TabSlotContext);
  const tab = slot?.tab || "";
  const latest = useRef(off);
  useEffect(() => { latest.current = off; });
  const viaBar = useRef(() => latest.current?.());

  useEffect(() => {
    if (!tab) return;                       // not in a shell tab: never touch the tab's hold
    if (on && sessionId) setSessionHold({ tab, sessionId, title, since, off: viaBar.current });
    else if (settled && getSessionHold()?.tab === tab) clearSessionHold();
  }, [tab, on, sessionId, title, since, settled]);

  // On unmount, let go of the hold — but never of a SEEDED one: that is the shell's own marker that a reload is
  // waiting for this app to load, and React's development double-mount runs this cleanup straight after the first
  // mount, which would wipe it before the session had been read.
  useEffect(() => () => {
    const h = getSessionHold();
    if (tab && h?.tab === tab && !h.seeded) clearSessionHold();
  }, [tab]);

  return !!tab;
}
