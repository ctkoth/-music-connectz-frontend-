// Carry a thing from one app into another.
//
// `goToSpot(tab, target)` already lands a member on the exact control in the
// destination app. What it never carried was the WORK — so "take this post to
// SingZ" landed you on the recorder with an empty take, and the only way to
// have the track you were just listening to coached was to find the file again
// and upload it a second time. A jump that arrives empty-handed is a tab
// switch wearing a handoff's clothes.
//
// So: a payload is parked under the destination app's key, the jump happens,
// and the destination picks it up when it mounts. Two details matter and both
// were learned the hard way:
//
//   * It survives a MOUNT, not just a render. The destination tab isn't
//     mounted when the handoff is made, so an event alone would fire into
//     nothing. sessionStorage holds it; the event is only there so an app
//     that IS already mounted reacts without waiting to be remounted.
//   * It is taken, not read. `takeHandoff` clears the slot, so a second visit
//     to SingZ doesn't silently reload somebody's old post over a take they
//     are part way through recording.
//
// sessionStorage, not localStorage: a handoff belongs to the tab that started
// it and should not still be sitting there tomorrow morning.
//
// Taking on the first read is safe under <React.StrictMode>, which runs every
// effect twice in dev: state set by the first run survives into the second, so
// the destination is already holding the post by the time the second run finds
// an empty slot.

import { goToSpot } from "./goto.js";

const KEY = (app) => `mcz_handoff_${app}`;
const EVENT = "mcz-handoff";

/** Park `payload` for `app` and jump to it. Returns goToSpot's promise. */
export function handOff(app, target, payload) {
  try {
    sessionStorage.setItem(KEY(app), JSON.stringify({ ...payload, at: Date.now() }));
  } catch {
    // A full or blocked sessionStorage must not swallow the navigation — the
    // member still gets to the app, just without the prefill.
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { app, target } }));
  return goToSpot(app, target);
}

/** Take whatever is waiting for `app`, clearing it. Null when there's nothing. */
export function takeHandoff(app) {
  let raw = null;
  try {
    raw = sessionStorage.getItem(KEY(app));
    sessionStorage.removeItem(KEY(app));
  } catch { return null; }
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

/**
 * Run `onPayload` with whatever was handed to `app` — on mount, and again if
 * another app hands something over while this one is already open.
 *
 * A plain hook rather than context: the destination decides what to do with
 * the payload, and nothing about a post needs to be global state to be handed
 * across one tab switch.
 */
export function onHandoff(app, handler) {
  const first = takeHandoff(app);
  if (first) handler(first);
  const listen = (e) => {
    if (e.detail?.app !== app) return;
    const payload = takeHandoff(app);
    if (payload) handler(payload);
  };
  window.addEventListener(EVENT, listen);
  return () => window.removeEventListener(EVENT, listen);
}
