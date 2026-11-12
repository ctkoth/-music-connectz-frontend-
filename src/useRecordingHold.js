// The React side of recordingHold.js: what an app calls to say "I am recording",
// and what the shell reads to know which apps it must not unmount.
import { createContext, useContext, useEffect, useId, useRef, useSyncExternalStore } from "react";
import { clearHold, getHolds, nextPhase, setHold, subscribe } from "./recordingHold.js";

/**
 * Which tab an app is mounted in, and whether that tab is the one on screen.
 * `null` outside the shell (the trial door, the SkillZ app, a mini pane) — an
 * app there has no tab to keep alive, so a hold would have nothing to hold.
 */
export const TabSlotContext = createContext(null);

/** Every hold right now. Re-renders the reader when one is added, changed or released. */
export const useHolds = () => useSyncExternalStore(subscribe, getHolds, getHolds);

/** False only for an app whose tab is mounted but hidden behind another. Global key handlers ask this. */
export function useTabActive() {
  const slot = useContext(TabSlotContext);
  return slot ? slot.active : true;
}

/**
 * Say that this app is recording.
 *
 *   recording — is its recorder running (the app already has this as state)
 *   label     — what the bar calls it ("a take", "your composer"); optional
 *   stop      — how to end the recording from outside the app. The latest one is
 *               always used, so it may close over fresh state.
 *
 * While `recording` is true the shell keeps this app mounted wherever the member
 * goes. When it stops out of sight the finished take is kept too, until the
 * member comes back for it (see nextPhase). Releases on unmount.
 */
export function useRecordingHold({ recording, label = "", stop }) {
  const slot = useContext(TabSlotContext);
  const id = useId();
  const latest = useRef(stop);
  useEffect(() => { latest.current = stop; });
  const viaBar = useRef(() => latest.current?.());
  const phase = useRef(null);
  const tab = slot?.tab || "";
  const active = slot ? slot.active : true;

  useEffect(() => {
    if (!tab) return;
    const next = nextPhase(phase.current, { recording: !!recording, active });
    phase.current = next;
    if (next) setHold(id, { tab, phase: next, label, stop: viaBar.current });
    else clearHold(id);
  }, [id, tab, recording, active, label]);

  useEffect(() => () => clearHold(id), [id]);
}
