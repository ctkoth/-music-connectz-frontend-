// MetZ — the click, and the drill it was asked for.
//
// The coach already ends every Boss Take with a drill, and that drill routinely
// names a tempo: "eight steady metronome clicks at 75 BPM ... for ten reps".
// Until now that line was a dead end in the most literal way the
// cross-pollination rule describes — it told you to use a tool the app didn't
// have, so the honest reading of "Next drill" was "go and find a metronome".
// This file is the tool, and `parseDrill` is what lets the drill open it
// already set to the numbers the coach said.
//
// Two things in here are load-bearing and neither is obvious.
//
// ## setInterval cannot run a metronome
//
// The naive build — `setInterval(click, 60000 / bpm)` — drifts, audibly, and
// gets worse the longer you practise. `setInterval` is a request, not a
// promise: it is clamped, it queues behind whatever else the main thread is
// doing, and every late tick is an error that never gets paid back. At 75 BPM
// a 4ms average lateness is a beat and a half of drift across a three-minute
// session, and a metronome that drifts is not a slow metronome, it is a broken
// one — the member practises to it and learns the wrong thing.
//
// The AudioContext clock is a different clock: sample-accurate, driven by the
// audio hardware, and it accepts events scheduled in its own future. So the
// timer here does not play clicks. It WAKES UP OFTEN and books clicks slightly
// ahead onto the audio clock, which then fires them exactly. A late wake-up
// costs nothing as long as it is late by less than the booking window. (This
// is Chris Wilson's "A Tale of Two Clocks" — the standard fix, worth naming
// because the naive version looks like it works until you record it.)
//
// ## The click is not `playSound`
//
// `sound.js` is off until asked for, and rightly: noise at a stranger is
// hostile. But pressing Start on a metronome IS the asking, and a metronome
// silenced by a preference set on a different screen last week is a bug that
// reads as "MetZ is broken". So MetZ owns its own gain, its own mute, and its
// own oscillators, and the screen says so rather than leaving somebody hunting
// the header for why there is no click.
//
// It keeps the other half of the sound.js rule, though — sound is never the
// only signal. The beat dots carry the same information, which is also what
// makes silent practice (headphones off, sleeping house, or a member who can't
// hear the click) a supported way to use this rather than a broken one.

/* ------------------------------------------------------------------ limits */

// The range a metronome is useful over. 30 is slower than anything anyone
// practises to and 300 is faster than a drum roll is counted; outside that the
// number is a typo, not a tempo.
export const BPM_MIN = 30;
export const BPM_MAX = 300;
export const BPM_DEFAULT = 90;

// Two different inputs, deliberately two different answers: a number outside
// the range is pinned TO the range (somebody dragged a slider or typed 400),
// while no number at all falls back to the default. Folding them together —
// `Number(n) || BPM_DEFAULT` — makes a typed 0 jump to 90 instead of the
// minimum, which reads as the field ignoring what was typed.
export const clampBpm = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return BPM_DEFAULT;
  return Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(v)));
};

// Real tempo markings with their conventional bands. This is a musical fact
// somebody can check against any score, not a number this app invented — the
// substance rule cares about the difference. It names the tempo; it does not
// grade it.
const MARKINGS = [
  [40, "Grave"], [60, "Largo"], [66, "Larghetto"], [76, "Adagio"],
  [108, "Andante"], [120, "Moderato"], [156, "Allegro"], [176, "Vivace"],
  [200, "Presto"], [BPM_MAX + 1, "Prestissimo"],
];

/** The Italian marking for a tempo — "Andante", "Allegro". */
export function marking(bpm) {
  const n = clampBpm(bpm);
  for (const [ceiling, name] of MARKINGS) if (n < ceiling) return name;
  return "Prestissimo";
}

// How a beat is divided. The value is how many clicks per beat, so the maths
// downstream is one multiply and there is no table to keep in sync.
export const SUBDIVISIONS = [
  { key: "quarter", per: 1, label: "♩", name: "Quarter notes" },
  { key: "eighth", per: 2, label: "♫", name: "Eighths" },
  { key: "triplet", per: 3, label: "♩³", name: "Triplets" },
  { key: "sixteenth", per: 4, label: "♬", name: "Sixteenths" },
];

export const subdivisionFor = (key) =>
  SUBDIVISIONS.find((s) => s.key === key) || SUBDIVISIONS[0];

/* -------------------------------------------------------- the last tempo */

// The tempo somebody was last working at, so a drill that names no tempo opens
// on theirs rather than on a number this file made up. One key, read and
// written in one place — two components each keeping their own copy is how the
// tab and the inline strip would come to disagree about "your last tempo".
const LAST_BPM_KEY = "mcz_metz_bpm";

export function readLastBpm() {
  try { return clampBpm(localStorage.getItem(LAST_BPM_KEY)); } catch { return BPM_DEFAULT; }
}

export function writeLastBpm(bpm) {
  try { localStorage.setItem(LAST_BPM_KEY, String(clampBpm(bpm))); } catch { /* private mode */ }
}

/* ------------------------------------------------------- reading the drill */

// Numbers the coach writes as words. It writes prose, not JSON — "eight steady
// metronome clicks", "for ten reps" — so a digits-only parser would read the
// tempo and miss the shape of the exercise around it.
const WORD_NUMBERS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
  fifteen: 15, sixteen: 16, twenty: 20, thirty: 30,
};

const NUM = `\\d{1,3}|${Object.keys(WORD_NUMBERS).join("|")}`;

const numberFrom = (raw) => {
  const s = String(raw || "").toLowerCase();
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  return WORD_NUMBERS[s] ?? null;
};

const inRange = (n, lo, hi) => (n != null && n >= lo && n <= hi ? n : null);

/**
 * Pull the shape of an exercise out of a coach's drill sentence.
 *
 * Returns only what the text ACTUALLY said — every field is null when the
 * drill didn't name it. That absence is the whole point: a metronome that
 * opens at 75 BPM because it guessed is indistinguishable, on screen, from one
 * that opens at 75 BPM because the coach said 75, and the member has no way to
 * tell which they are practising to. So the caller falls back to its own
 * default and SAYS the drill named no tempo, rather than dressing a guess up
 * as an instruction.
 *
 * Runs client-side on purpose. The drill is free text the model already wrote,
 * and coaching is kept on posts (`saved_to_post`) — so a take scored last month
 * still carries its drill, and no amount of changing what the server asks for
 * next time reaches it. Repair on read, the same reason `socialData.js` still
 * recovers a printed persona dict.
 */
export function parseDrill(text) {
  const out = { bpm: null, clicks: null, bars: null, reps: null, subdivision: null };
  let s = String(text || "");
  if (!s.trim()) return out;

  // Tempo first, and its span is then blanked out — "75 beats per minute"
  // otherwise reads as an instruction to count 75 beats.
  const bpm = s.match(/\b(\d{2,3})\s*(?:bpm|beats\s+per\s+min(?:ute)?)\b/i);
  if (bpm) {
    out.bpm = inRange(parseInt(bpm[1], 10), BPM_MIN, BPM_MAX);
    s = s.slice(0, bpm.index) + " ".repeat(bpm[0].length) + s.slice(bpm.index + bpm[0].length);
  }

  // How long one pass is: "across eight steady metronome clicks", "over 4 bars".
  const clicks = s.match(new RegExp(
    `\\b(${NUM})\\s+(?:steady\\s+|slow\\s+|even\\s+)?(?:metronome\\s+)?(clicks?|beats?|counts?|bars?|measures?)\\b`, "i"));
  if (clicks) {
    const n = numberFrom(clicks[1]);
    const bars = /^(bars?|measures?)$/i.test(clicks[2]);
    // A bar is a count of bars, not of clicks — kept apart so the counter can
    // say "8 clicks" or "4 bars" and mean it.
    if (bars) out.bars = inRange(n, 1, 64);
    else out.clicks = inRange(n, 1, 64);
  }

  // How many times through: "for ten reps", "x8".
  const reps = s.match(new RegExp(`\\b(?:for\\s+)?(${NUM})\\s+(reps?|repetitions?|times|rounds?)\\b`, "i"))
    || s.match(/\bx\s?(\d{1,2})\b/i);
  if (reps) out.reps = inRange(numberFrom(reps[1]), 1, 99);

  // What a beat is divided into, when the drill says.
  if (/\bsixteenth/i.test(s)) out.subdivision = "sixteenth";
  else if (/\btriplet/i.test(s)) out.subdivision = "triplet";
  else if (/\beighth|\b8th\b/i.test(s)) out.subdivision = "eighth";
  else if (/\bquarter/i.test(s)) out.subdivision = "quarter";

  return out;
}

/** True when a drill named anything MetZ can be set from — the test for
 *  whether to offer the tool beside it at all. An offer to "run this drill"
 *  attached to a line that describes no drill is noise. */
export const drillIsRunnable = (parsed) =>
  !!(parsed && (parsed.bpm || parsed.clicks || parsed.bars || parsed.reps));

/* ----------------------------------------------------------------- tapping */

// Tap tempo. Eight taps is enough to average out a shaky hand and short enough
// that speeding up mid-tap is followed rather than smoothed away.
const TAP_KEEP = 8;
// Longer than this and the member stopped tapping and started again; the gap
// is not a beat, and averaging it in produces a tempo nobody tapped.
const TAP_RESET_MS = 2000;

/** Fold one tap into a running list of tap times. Pure, so the component
 *  keeps the list and this decides what it means. */
export function tap(times, now = Date.now()) {
  const kept = times.length && now - times[times.length - 1] > TAP_RESET_MS ? [] : times;
  const next = [...kept, now].slice(-TAP_KEEP);
  if (next.length < 2) return { times: next, bpm: null };
  const gaps = next.slice(1).map((t, i) => t - next[i]);
  const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  return { times: next, bpm: mean > 0 ? clampBpm(60000 / mean) : null };
}

/* ------------------------------------------------------------------ engine */

// How often the timer wakes to look for clicks to book.
const LOOKAHEAD_MS = 25;
// How far into the audio clock's future clicks are booked. Comfortably longer
// than a wake-up interval so an event-loop stall can't open a gap, and short
// enough that a tempo change is heard within a quarter second — which reads as
// immediate, where a second of the old tempo reads as a stuck control.
const SCHEDULE_AHEAD_S = 0.25;

const ACCENT_HZ = 1600;   // beat one
const BEAT_HZ = 1000;     // the other beats
const SUB_HZ = 800;       // an off-beat subdivision, quieter and lower

/**
 * A running click.
 *
 * `onBeat` is called with `{ beat, bar, click, accent, at }` at the moment each
 * click is BOOKED, not when it sounds — the caller holds the queue and lights
 * the dot when `at` passes, because a visual driven off the same timer that
 * schedules audio is a visual that lags whenever the main thread is busy,
 * which is exactly when you would notice.
 */
export class Metronome {
  constructor() {
    this.ctx = null;
    this.timer = null;
    this.running = false;
    this.nextTime = 0;
    this.click = 0;           // clicks since start, counting subdivisions
    this.scheduled = [];      // live nodes, so stop() is immediate
    this.bpm = BPM_DEFAULT;
    this.beats = 4;
    this.per = 1;             // clicks per beat
    this.volume = 0.5;
    this.muted = false;
    this.onBeat = null;
  }

  /** The tab's AudioContext for MetZ, made on the gesture that starts it —
   *  browsers refuse one before a gesture, which is why this is never made at
   *  import time. */
  _audio() {
    if (this.ctx) return this.ctx;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    try { this.ctx = new Ctor(); } catch { return null; }
    return this.ctx;
  }

  /** Is there an audio path at all? False on a browser with no Web Audio, and
   *  the screen has to say so rather than showing a Start button that does
   *  nothing audible. */
  get audible() {
    return !!(window.AudioContext || window.webkitAudioContext);
  }

  /** The audio clock, for a caller drawing beats. Compared against the `at` on
   *  each booked click, this is what lets the dots light WITH the sound
   *  instead of with the timer that booked it — the two are the same thing
   *  only while the main thread is idle, and a practice tool is used on a
   *  phone that is doing other work. */
  get now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  set({ bpm, beats, per, volume, muted }) {
    if (bpm != null) this.bpm = clampBpm(bpm);
    if (beats != null) this.beats = Math.min(16, Math.max(1, Math.round(beats)));
    if (per != null) this.per = Math.min(8, Math.max(1, Math.round(per)));
    if (volume != null) this.volume = Math.min(1, Math.max(0, volume));
    if (muted != null) this.muted = !!muted;
  }

  /** Seconds between clicks at the current tempo and subdivision. */
  get interval() {
    return 60 / this.bpm / this.per;
  }

  _voice(at, hz, gain) {
    const c = this.ctx;
    if (!c || this.muted || gain <= 0) return;
    const osc = c.createOscillator();
    const amp = c.createGain();
    // A click, not a tone: a short square burst with a fast decay is what a
    // metronome sounds like, and the sharp attack is what makes it possible to
    // hear whether you are on it or beside it.
    osc.type = "square";
    osc.frequency.setValueAtTime(hz, at);
    amp.gain.setValueAtTime(0.0001, at);
    amp.gain.exponentialRampToValueAtTime(gain, at + 0.001);
    amp.gain.exponentialRampToValueAtTime(0.0001, at + 0.035);
    osc.connect(amp).connect(c.destination);
    osc.start(at);
    osc.stop(at + 0.05);
    this.scheduled.push(osc);
    osc.onended = () => {
      const i = this.scheduled.indexOf(osc);
      if (i >= 0) this.scheduled.splice(i, 1);
    };
  }

  _tick = () => {
    const c = this.ctx;
    if (!c || !this.running) return;
    while (this.nextTime < c.currentTime + SCHEDULE_AHEAD_S) {
      const click = this.click;
      const per = this.per;
      const beat = Math.floor(click / per) % this.beats;
      const bar = Math.floor(click / per / this.beats);
      const onBeat = click % per === 0;
      const accent = onBeat && beat === 0;

      const gain = this.volume * (accent ? 0.28 : onBeat ? 0.2 : 0.1);
      this._voice(this.nextTime, accent ? ACCENT_HZ : onBeat ? BEAT_HZ : SUB_HZ, gain);

      // Handed over as data with the time it will sound. The caller decides
      // when to draw it; nothing here touches the DOM.
      this.onBeat?.({ click, beat, bar, accent, onBeat, at: this.nextTime });

      this.click += 1;
      this.nextTime += this.interval;
    }
  };

  /** Start clicking. `startAtClick` resumes a drill mid-count; the default
   *  restarts the bar so a fresh start always lands on beat one. */
  start(startAtClick = 0) {
    if (this.running) return true;
    const c = this._audio();
    if (!c) return false;
    // A context made before the first gesture starts suspended; resuming from
    // inside the click is what makes the very first tick audible.
    if (c.state === "suspended") c.resume();
    this.running = true;
    this.click = startAtClick;
    // A hair of lead-in, so the first click is booked in the future rather
    // than in the past — a click booked at `currentTime` may be dropped.
    this.nextTime = c.currentTime + 0.06;
    this._tick();
    this.timer = setInterval(this._tick, LOOKAHEAD_MS);
    return true;
  }

  /** Stop, and silence anything already booked.
   *
   * Killing the booked nodes is the part that is easy to leave out and
   * impossible to un-notice: without it, Stop is followed by up to a quarter
   * second of clicks that were already on the audio clock, which reads as a
   * button that didn't work. */
  stop() {
    this.running = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    for (const osc of this.scheduled.slice()) {
      try { osc.onended = null; osc.stop(); } catch { /* already finished */ }
    }
    this.scheduled = [];
  }

  /** Release the audio context. Called when the component unmounts — a tab
   *  left holding contexts across a dozen tab switches is a real leak, and
   *  some browsers cap how many a page may make. */
  dispose() {
    this.stop();
    const c = this.ctx;
    this.ctx = null;
    if (c) { try { c.close(); } catch { /* already closed */ } }
  }
}
