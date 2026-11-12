// Recording holds — "a take is running (or has just finished) inside this app; do
// not take it away from the member".
//
// Opening another app used to UNMOUNT the one being recorded in. The recorder
// lived in a ref inside that component, so the tab switch dropped the only
// reference to a live MediaRecorder: it kept running, the microphone stayed open
// under a screen nobody could see, and whatever it caught could never be
// reached again. A member who wanted the metronome under a take, the tuner
// before one, or a chord chart during one had to choose between the tool and
// the take.
//
// A hold is how an app says "I am recording". While any app holds, the shell
// keeps that app MOUNTED — hidden, not gone — wherever the member goes, and a
// bar says which app is recording, for how long, with a Stop and a way back.
//
// Two phases, because the take does not end when the recorder does:
//
//   recording — the recorder is running. Held until it stops.
//   ready     — it stopped while the member was somewhere else. The finished
//               take is sitting in the app's state, unsent; the app stays
//               mounted until the member comes back to look at it. Only a take
//               that finished while its app was out of sight gets this; one the
//               member stopped on the screen itself is already in front of them.
//
// This module is the registry and the phase rule, with no React in it, so both
// can be tested. `useRecordingHold.js` is the thin hook that feeds it.

const holds = new Map();      // id → { id, tab, phase, label, since, stop }
let snapshot = [];            // the same array until something changes, for useSyncExternalStore
const listeners = new Set();

function emit() {
  snapshot = [...holds.values()];
  listeners.forEach((fn) => fn());
}

export const PHASES = Object.freeze({ recording: "recording", ready: "ready" });

/**
 * The phase a hold is in after something changed.
 *
 *   prev      — the phase it was in (null for none)
 *   recording — is the recorder running now
 *   active    — is the app's tab the one on screen
 */
export function nextPhase(prev, { recording, active }) {
  if (recording) return PHASES.recording;
  // It was recording and just stopped. In front of the member: nothing to keep
  // alive. Out of sight: keep the finished take until they come back for it.
  if (prev === PHASES.recording) return active ? null : PHASES.ready;
  if (prev === PHASES.ready) return active ? null : PHASES.ready;
  return null;
}

/** Register or update a hold. `since` survives updates within one phase, so a bar's clock never restarts. */
export function setHold(id, { tab, phase, label = "", stop = null }) {
  if (!id || !tab || !phase) return;
  const cur = holds.get(id);
  if (cur && cur.tab === tab && cur.phase === phase && cur.label === label && cur.stop === stop) return;
  holds.set(id, {
    id, tab, phase, label, stop,
    since: cur && cur.phase === phase ? cur.since : Date.now(),
  });
  emit();
}

export function clearHold(id) {
  if (holds.delete(id)) emit();
}

export const getHolds = () => snapshot;

export function subscribe(fn) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** The tabs that must stay mounted, each once, in the order they first held. */
export function heldTabs(list = snapshot) {
  const seen = [];
  for (const h of list) if (!seen.includes(h.tab)) seen.push(h.tab);
  return seen;
}

/** Holds whose recorder is running right now. */
export const recordingNow = (list = snapshot) => list.filter((h) => h.phase === PHASES.recording);

/**
 * The slots to render, in a stable order.
 *
 * A mounted app must keep its place among its siblings. React moves a keyed
 * child whose position changed with insertBefore, and a moved node loses its
 * focus, restarts its CSS animation, pauses its media and reloads its iframes —
 * the Stop button the member just pressed would vanish from under their finger.
 * So a slot that is still wanted keeps its index, and new ones go on the end.
 *
 *   previous — the order rendered last time
 *   wanted   — the tabs that must be mounted now (held ones + the active one)
 */
export function stableSlots(previous, wanted) {
  const want = new Set(wanted.filter(Boolean));
  const kept = previous.filter((k) => want.has(k));
  const added = [...want].filter((k) => !kept.includes(k));
  return [...kept, ...added];
}

/** Stop every running recorder. The shell calls this when the member signs out. */
export function stopAll(list = snapshot) {
  for (const h of recordingNow(list)) {
    try { h.stop?.(); } catch { /* one stuck recorder must not leave the others running */ }
  }
}

/** m:ss for a recording's age, never negative. */
export function holdClock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Tests only: forget every hold. */
export function resetHolds() {
  holds.clear();
  listeners.clear();
  snapshot = [];
}
