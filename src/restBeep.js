// The beep that says "rest is over — start your next set".
//
// It is its own thing and not SoundZ (`sound.js`): that one is an opt-in header
// toggle, off until asked for, because it decorates. This one is the timer's
// whole job for somebody whose phone is propped on a bench — so it is on by
// default, has its own switch on the rest card, and a member who has SoundZ off
// still hears it. It is never the only signal: the card turns green and says
// "go", and vibration fires alongside where the device has it.
//
// The reason this exists as a module rather than the three lines it replaced:
// those built a NEW AudioContext inside a useEffect, i.e. not in a user gesture.
// Chrome and Safari start a context made like that SUSPENDED, so on a phone the
// beep was silently never played, with nothing to say so. One shared context,
// resumed from a real tap (`unlockAudio`), is what makes it sound at all — and
// `playNewSetBeep` reports what the context was doing so the card can say
// "tap anywhere to turn the beep on" instead of failing quietly.

const KEY = "bodiez.restSound";

export function restSoundOn() {
  try { return localStorage.getItem(KEY) !== "0"; } catch { return true; }
}

export function setRestSoundOn(on) {
  try { localStorage.setItem(KEY, on ? "1" : "0"); } catch { /* not remembered, still works this page */ }
}

let ctx = null;

function context() {
  if (ctx) return ctx;
  const Ctor = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
  if (!Ctor) return null;
  try { ctx = new Ctor(); } catch { ctx = null; }
  return ctx;
}

/** Call from a tap/keypress. Returns the context's state, or "unsupported". */
export function unlockAudio() {
  const c = context();
  if (!c) return "unsupported";
  if (c.state === "suspended") { try { c.resume()?.catch?.(() => {}); } catch { /* still locked */ } }
  return c.state;
}

/** Rising three-note chirp: distinct from a notification ping, short enough not to
 *  startle between reps. Each note has a gain envelope so it does not click. */
const NOTES = [
  { hz: 660, at: 0, len: 0.14 },
  { hz: 880, at: 0.18, len: 0.14 },
  { hz: 1175, at: 0.36, len: 0.28 },
];

/** Returns "played" | "locked" (context suspended — needs a tap) | "off" | "unsupported". */
export function playNewSetBeep() {
  if (!restSoundOn()) return "off";
  const c = context();
  if (!c) return "unsupported";
  if (c.state === "suspended") { try { c.resume()?.catch?.(() => {}); } catch { /* ignore */ } }
  if (c.state !== "running") return "locked";
  const t0 = c.currentTime;
  for (const n of NOTES) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.value = n.hz;
    g.gain.setValueAtTime(0.0001, t0 + n.at);
    g.gain.exponentialRampToValueAtTime(0.35, t0 + n.at + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + n.at + n.len);
    o.connect(g); g.connect(c.destination);
    o.start(t0 + n.at);
    o.stop(t0 + n.at + n.len + 0.02);
  }
  return "played";
}

/** For tests only: forget the shared context. */
export function _resetRestBeep() { ctx = null; }
