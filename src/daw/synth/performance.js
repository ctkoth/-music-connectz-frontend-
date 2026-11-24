// A live performance as a MIDI part. Events are what the player did, timed in seconds from the start of the take:
//   { t, type: "on", pitch, vel }   { t, type: "off", pitch }   { t, type: "sustain", on }
// `eventsToNotes` turns them into [pitch, startBeat, lengthBeats, velocity] with the sustain pedal applied: a key released
// while the pedal is down keeps sounding until the pedal comes up. Pure and tested.
export const MIN_NOTE_SECONDS = 0.04;

export function eventsToNotes(events, bpm, endT) {
  const spb = 60 / bpm;
  const evs = [...events].sort((a, b) => a.t - b.t);
  const open = new Map();                                  // pitch -> { start, vel, keyUp }
  const done = [];
  let pedal = false;
  const close = (pitch, t) => {
    const n = open.get(pitch); if (!n) return;
    open.delete(pitch);
    done.push([pitch, n.start / spb, Math.max(MIN_NOTE_SECONDS, t - n.start) / spb, n.vel]);
  };
  for (const e of evs) {
    if (e.type === "on") { if (open.has(e.pitch)) close(e.pitch, e.t); open.set(e.pitch, { start: Math.max(0, e.t), vel: Math.min(127, Math.max(1, Math.round(e.vel ?? 100))), keyUp: false }); }
    else if (e.type === "off") { const n = open.get(e.pitch); if (!n) continue; if (pedal) n.keyUp = true; else close(e.pitch, e.t); }
    else if (e.type === "sustain") { pedal = !!e.on; if (!pedal) for (const [p, n] of [...open]) if (n.keyUp) close(p, e.t); }
  }
  const end = endT ?? evs.reduce((m, e) => Math.max(m, e.t), 0);
  for (const p of [...open.keys()]) close(p, end);        // anything still held when the take stops ends there
  return done.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}
