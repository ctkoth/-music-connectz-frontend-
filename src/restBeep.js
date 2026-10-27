// The rest timer's beep. Separate from sound.js on purpose: that module's sounds
// are decoration that starts OFF, while this one is the timer doing its one job —
// telling a member who is looking at a barbell, not the phone, that rest is over.
//
// The reason it exists as its own file is autoplay. A browser starts an
// AudioContext SUSPENDED unless it was made (or resumed) inside a user gesture, and
// the old beep made its context at the moment rest ended — no tap anywhere near it
// — so on most phones it was silent and nothing said so. So the context is made and
// resumed on the member's own taps while the timer is on screen (`primeRestBeep`),
// and the beep later plays into an already-running one.

let ctx = null;

function context() {
  if (ctx) return ctx;
  const Ctor = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
  if (!Ctor) return null;
  try { ctx = new Ctor(); } catch { ctx = null; }
  return ctx;
}

/** Call from a gesture. Safe to call on every tap: it only does work while suspended. */
export function primeRestBeep() {
  const c = context();
  if (c && c.state === "suspended") { try { c.resume(); } catch { /* refused; the next tap tries again */ } }
  return !!c && c.state !== "closed";
}

// Three short beeps, the last one longer — one blip is easy to miss over music.
// Each has a ramped envelope, because a hard start or stop on a raw oscillator
// clicks, and a click does not read as "rest is over".
const BEEPS = [{ at: 0, dur: 0.16, hz: 880 }, { at: 0.24, dur: 0.16, hz: 880 }, { at: 0.48, dur: 0.38, hz: 1175 }];

/** Plays the rest-over beep. Returns true if it was handed to a running context. */
export function restBeep(gain = 0.35) {
  const c = context();
  if (!c) return false;
  if (c.state === "suspended") { try { c.resume(); } catch { /* see primeRestBeep */ } }
  if (c.state !== "running" && c.state !== "suspended") return false;
  const t0 = c.currentTime + 0.02;
  for (const b of BEEPS) {
    try {
      const o = c.createOscillator(), g = c.createGain();
      o.type = "sine"; o.frequency.value = b.hz;
      const at = t0 + b.at;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(gain, at + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, at + b.dur);
      o.connect(g).connect(c.destination);
      o.start(at); o.stop(at + b.dur + 0.03);
    } catch { return false; }
  }
  return c.state === "running";
}

// What the timer shows and when it fires, kept pure so it can be tested.

/** Seconds left of the rest, never negative; `over` is how far past the target it is. */
export function restClock(elapsed, target) {
  return { left: Math.max(0, target - elapsed), over: Math.max(0, elapsed - target), done: elapsed >= target };
}

/** Beep only when rest ends WHILE the member is here. A page loaded long after the last
 *  set is not "rest just ended", and a beep on every reload would teach them to mute it. */
export const STALE_AFTER_SECONDS = 15;
export function shouldBeep({ done, over, alreadyAlerted }) {
  return done && !alreadyAlerted && over <= STALE_AFTER_SECONDS;
}
