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

/** Is sound actually going to come out? "unknown" until something has tried. */
export function beepState() {
  if (!ctx) return typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext) ? "locked" : "unsupported";
  return ctx.state === "running" ? "ready" : "locked";
}

// The taps that count as a gesture are NOT the same in every browser. Chrome (Android and
// desktop) only treats a touch as activation on RELEASE — pointerup / touchend / click — and
// not on pointerdown, which counts for a mouse only; Safari wants touchend or click; keydown
// counts everywhere. Listening to all of them is the point: the first one the browser accepts
// unlocks it, and the rest are free (this only works while suspended).
export const UNLOCK_EVENTS = ["pointerup", "touchend", "click", "keydown"];

/** Call from a gesture. Safe to call on every tap: it only does work while not running. */
export function primeRestBeep() {
  const c = context();
  if (!c || c.state === "closed") return false;
  // "interrupted" is iOS Safari after a call, an alarm or the page being backgrounded; it needs
  // a resume from a tap exactly as "suspended" does.
  if (c.state !== "running") { try { c.resume(); } catch { /* refused; the next tap tries again */ } }
  // iOS only counts audio as unlocked once something has been played inside the gesture.
  if (!unlocked) {
    try {
      const b = c.createBuffer(1, 1, 22050), src = c.createBufferSource();
      src.buffer = b; src.connect(c.destination); src.start(0);
      unlocked = true;
    } catch { /* older engines; the beep itself still tries */ }
  }
  return true;
}
let unlocked = false;

// Three short beeps, the last one longer — one blip is easy to miss over music.
// Each has a ramped envelope, because a hard start or stop on a raw oscillator
// clicks, and a click does not read as "rest is over".
const BEEPS = [{ at: 0, dur: 0.16, hz: 880 }, { at: 0.24, dur: 0.16, hz: 880 }, { at: 0.48, dur: 0.38, hz: 1175 }];

// The superset gap ends with ONE short, lower beep — a different sound from the three that mean "rest is over",
// so a member who hears it knows which one it is without looking.
const GAP_BEEPS = [{ at: 0, dur: 0.14, hz: 660 }];

// Builds the oscillators for a pattern starting at audio-clock time `t0` and returns a function that takes
// them back. Returns null if anything throws.
function play(c, pattern, t0, gain) {
  const nodes = [];
  try {
    for (const b of pattern) {
      const o = c.createOscillator(), g = c.createGain();
      o.type = "sine"; o.frequency.value = b.hz;
      const at = t0 + b.at;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(gain, at + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, at + b.dur);
      o.connect(g).connect(c.destination);
      o.start(at); o.stop(at + b.dur + 0.03);
      nodes.push({ o, g });
    }
  } catch { return null; }
  return () => { for (const { o, g } of nodes) { try { o.stop(); } catch { /* not started */ } try { o.disconnect(); g.disconnect(); } catch { /* gone */ } } };
}

/** Plays the rest-over beep. Returns true if it was handed to a running context. */
export function restBeep(gain = 0.35) {
  const c = context();
  if (!c) return false;
  if (c.state !== "running") { try { c.resume(); } catch { /* see primeRestBeep */ } }
  if (c.state === "closed") return false;
  if (!play(c, BEEPS, c.currentTime + 0.02, gain)) return false;
  return c.state === "running";
}

/**
 * Hands a beep to the AUDIO clock to play `delaySeconds` from now, and returns a function that cancels it —
 * or null when that cannot be done (no audio, or the context is still locked), in which case the caller falls
 * back to beeping when its own tick notices the time is up.
 *
 * Why this exists: the beep used to fire from a one-second UI tick, and a locked phone or a backgrounded tab
 * throttles those ticks (a hidden tab can be down to one a minute), so a rest could end with nothing heard.
 * The audio clock keeps its schedule while the page is hidden, so a beep booked at the moment the set was
 * logged sounds when the rest ends, not when the page next wakes up.
 */
export function scheduleBeep(delaySeconds, kind = "rest", gain = 0.35) {
  const c = context();
  if (!c || c.state !== "running") return null;
  const when = c.currentTime + Math.max(0.02, Number(delaySeconds) || 0);
  return play(c, kind === "gap" ? GAP_BEEPS : BEEPS, when, gain);
}

// What the timer shows and when it fires, kept pure so it can be tested.

/** Seconds left of the rest, never negative; `over` is how far past the target it is. */
export function restClock(elapsed, target) {
  return { left: Math.max(0, target - elapsed), over: Math.max(0, elapsed - target), done: elapsed >= target };
}

/** Seconds since a set was logged. `skewMs` is how far this device's clock runs ahead of the server's
 *  (measured when the set was logged — see `clockSkew`); a set's timestamp is the SERVER's, and a phone a
 *  minute behind it would otherwise show a rest that has not started, or one already over with no beep. */
export function sinceLogged(createdAtMs, nowMs, skewMs = 0) {
  if (!Number.isFinite(createdAtMs)) return 0;
  return Math.max(0, Math.floor((nowMs - (createdAtMs + skewMs)) / 1000));
}

/** How far this device's clock is ahead of the server's, from a set the server has just stamped. Only a
 *  reading taken as the answer arrives is believed (a slow request makes it a little high, never by minutes);
 *  anything else is 0. Capped at a day so a bad timestamp cannot park the timer. */
export function clockSkew(createdAtMs, nowMs) {
  const d = nowMs - createdAtMs;
  return Number.isFinite(d) && Math.abs(d) < 86400000 ? d : 0;
}

/** The gap inside a superset: how long to take getting to the second lift. Shown as a countdown like every
 *  other rest here, and it ends with ONE short beep (`scheduleBeep(…, "gap")`) — never the three that mean
 *  "rest is over", because the rest has not started. */
export const SUPERSET_GAP_SECONDS = 20;

/** Beep only when rest ends WHILE the member is here. A page loaded long after the last
 *  set is not "rest just ended", and a beep on every reload would teach them to mute it. */
export const STALE_AFTER_SECONDS = 15;
export function shouldBeep({ done, over, alreadyAlerted }) {
  return done && !alreadyAlerted && over <= STALE_AFTER_SECONDS;
}
