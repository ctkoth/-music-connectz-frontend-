// One player for the whole app. A track started in one tab keeps playing in
// the bar above the dock while the member moves to another — the pattern
// exchange apps use, so listening and browsing are not either/or.
//
// Listening still counts the honest way: the bar's <audio> is handed to
// trackListening (listen.js), so seconds are banked only while it actually
// plays and the tab is visible, and what a card shows is what the SERVER
// credited. Cards subscribe to `heard[item]` to unlock rating in place.
import { useEffect, useState } from "react";

let state = { track: null, heard: {} };   // track: {item, src, title, author, url}
const subs = new Set();
const set = (patch) => { state = { ...state, ...patch }; subs.forEach((f) => f(state)); };

export function playTrack(track) {
  if (state.track?.item === track.item) {
    window.dispatchEvent(new Event("mcz-player-toggle"));
    return;
  }
  set({ track });
}
export const stopTrack = () => set({ track: null });

/** Called by the bar with the server's answer to each listening heartbeat. */
export function noteHeard(item, r) {
  // Heartbeats can answer out of order (a track ending fires "pause" and
  // "ended" back to back), so progress only moves forward: a late reply from
  // the earlier beat must never take back the "finished" the later one gave.
  const prev = state.heard[item] || {};
  const merged = {
    ...r,
    listened_sec: Math.max(prev.listened_sec || 0, r?.listened_sec || 0),
    finished: !!(prev.finished || r?.finished),
  };
  set({ heard: { ...state.heard, [item]: merged } });
}

export function useNowPlaying() {
  const [s, setS] = useState(state);
  useEffect(() => { subs.add(setS); return () => subs.delete(setS); }, []);
  return s;
}
