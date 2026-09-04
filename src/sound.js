// SoundZ — the cost/gain paradigm, heard.
//
// The rule in CLAUDE.md is that every action states what it costs and what it
// gains BEFORE you commit to it. This is the other half of that, after: a
// gain and a spend must never sound the same, or the feedback is decoration.
// So the vocabulary is built around the resources themselves — energy, coin,
// money, prompts, XP — and each one moves in two directions with two
// different shapes: gains rise, spends fall. You can tell what happened to
// your wallet without looking at it.
//
// Three deliberate choices:
//
// - **Synthesised, not sampled.** Every sound here is a few oscillators and a
//   gain envelope, so the whole system adds no audio files to the bundle,
//   nothing 404s when a deploy drops an asset, and it works offline. A dozen
//   MP3s would be several hundred KB on a cold load — the exact thing the
//   route-splitting work just went to some trouble to remove.
// - **Off until asked for.** A site that makes noise at a stranger is
//   hostile, and browsers block audio before a gesture anyway. The preference
//   lives in localStorage and starts off; the header toggle turns it on.
// - **Never the only signal.** Every sound here accompanies a number that is
//   already on screen. Nobody who can't hear it loses information — that is
//   what keeps this an enhancement rather than an access problem.

const KEY = "mcz_sound";

/* ------------------------------------------------------------------ prefs */

export function isSoundOn() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    // Private-mode browsers throw on storage. Silence is the safe default.
    return false;
  }
}

export function setSoundOn(on) {
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    /* the toggle still works for this page, it just won't be remembered */
  }
  // Let every mounted toggle re-read, so two of them can't disagree.
  window.dispatchEvent(new CustomEvent("mcz-sound-changed", { detail: !!on }));
}

/* ----------------------------------------------------------------- engine */

let ctx = null;

/** One AudioContext for the tab, made on first use. Browsers refuse to start
 *  one before a user gesture, so this is called from a click, never on load. */
function audio() {
  if (ctx) return ctx;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    return null;
  }
  return ctx;
}

/** One voice: a waveform swept between two frequencies, under an envelope.
 *  Everything in the vocabulary below is one or two of these stacked. */
function voice(at, { type = "sine", from, to = from, dur = 0.12, gain = 0.09 }) {
  const c = audio();
  if (!c) return;
  const osc = c.createOscillator();
  const amp = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, at);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, at + dur);
  // A hard start or stop on a raw oscillator is an audible click, which reads
  // as a broken sound rather than a designed one. Ramp both ends.
  amp.gain.setValueAtTime(0.0001, at);
  amp.gain.exponentialRampToValueAtTime(gain, at + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(amp).connect(c.destination);
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

/* ------------------------------------------------------------- vocabulary */

// Gains rise, spends fall — that is the whole grammar, and it is what makes
// the set learnable without a legend. Beyond direction, each resource keeps
// its own timbre so a coin can't be mistaken for a prompt: coin is a bright
// two-step square (the sound everyone already knows a coin makes), energy is
// a clean sine blip, money is a fuller triangle chord, prompts are a quiet
// tick, XP sparkles up a chord.
const SOUNDS = {
  // ⚡ Energy — mana. Earned by rating, spent by the AI tools.
  energy_gain: [{ type: "sine", from: 660, to: 990, dur: 0.13, gain: 0.08 }],
  energy_spend: [{ type: "sine", from: 560, to: 330, dur: 0.15, gain: 0.07 }],

  // 🍥 SpinaZ — coin. Two ascending steps, the classic pickup.
  spinaz_gain: [
    { type: "square", from: 988, dur: 0.07, gain: 0.05 },
    { type: "square", from: 1319, dur: 0.13, gain: 0.05, at: 0.07 },
  ],
  spinaz_spend: [
    { type: "square", from: 660, dur: 0.07, gain: 0.045 },
    { type: "square", from: 494, dur: 0.12, gain: 0.045, at: 0.07 },
  ],

  // 💵 Money — real cash. Fuller and lower than coin, so a real charge never
  // sounds like an in-app trinket.
  money_earn: [
    { type: "triangle", from: 523, dur: 0.1, gain: 0.075 },
    { type: "triangle", from: 784, dur: 0.18, gain: 0.075, at: 0.09 },
  ],
  money_spend: [
    { type: "triangle", from: 392, to: 262, dur: 0.24, gain: 0.075 },
  ],

  // 🏷️ PromptZ — prepaid AI credit. Deliberately the quietest thing here: it
  // fires on nearly every AI action, and a loud sound on a frequent event
  // stops being information and becomes an irritation people switch off.
  promptz_spend: [{ type: "sine", from: 440, to: 392, dur: 0.09, gain: 0.045 }],

  // ⭐ XP — SkillZ progression. An arpeggio, because levelling should feel
  // like more than a balance change.
  xp_gain: [
    { type: "triangle", from: 523, dur: 0.08, gain: 0.06 },
    { type: "triangle", from: 659, dur: 0.08, gain: 0.06, at: 0.07 },
    { type: "triangle", from: 988, dur: 0.16, gain: 0.06, at: 0.14 },
  ],

  // Not resources — events. Each is its own shape so it can't be confused
  // with money moving.
  message: [
    { type: "sine", from: 880, dur: 0.08, gain: 0.06 },
    { type: "sine", from: 1175, dur: 0.12, gain: 0.06, at: 0.08 },
  ],
  battle: [
    { type: "sawtooth", from: 196, to: 392, dur: 0.22, gain: 0.06 },
    { type: "square", from: 98, to: 147, dur: 0.26, gain: 0.035 },
  ],
  collab: [
    { type: "sine", from: 440, dur: 0.1, gain: 0.055 },
    { type: "sine", from: 554, dur: 0.1, gain: 0.055, at: 0.06 },
    { type: "sine", from: 659, dur: 0.18, gain: 0.055, at: 0.12 },
  ],
  // A failure gets its own sound rather than borrowing "spend" — a refused
  // action usually costs nothing, and saying otherwise in audio would be the
  // same lie as saying it on screen.
  error: [{ type: "sawtooth", from: 180, to: 120, dur: 0.2, gain: 0.05 }],

  // Making something. These are the ones people hit over and over in a
  // session, so they're the shortest and quietest in the set — the studio
  // sound of a transport button, not a fanfare. Record arms UP and lands
  // DOWN, the same way a tape deck tells you which state you're in without
  // looking; nothing else here is allowed to use that pair.
  record_start: [{ type: "sine", from: 520, to: 780, dur: 0.1, gain: 0.06 }],
  record_stop: [{ type: "sine", from: 700, to: 420, dur: 0.13, gain: 0.06 }],
  // Attaching work. One family, three pitches — audio lowest, video above
  // it, image on top — so which KIND of thing you just attached is audible
  // without three unrelated noises to learn.
  upload_audio: [
    { type: "triangle", from: 392, dur: 0.06, gain: 0.05 },
    { type: "triangle", from: 587, dur: 0.11, gain: 0.05, at: 0.06 },
  ],
  upload_video: [
    { type: "triangle", from: 523, dur: 0.06, gain: 0.05 },
    { type: "triangle", from: 784, dur: 0.11, gain: 0.05, at: 0.06 },
  ],
  upload_image: [
    { type: "triangle", from: 659, dur: 0.06, gain: 0.05 },
    { type: "triangle", from: 988, dur: 0.11, gain: 0.05, at: 0.06 },
  ],
};

export const SOUND_KEYS = Object.keys(SOUNDS);

/** Play one sound by key. No-ops when sound is off, unsupported, or the key
 *  is unknown — a tracking-style call that can never break the caller. */
export function playSound(key) {
  if (!isSoundOn()) return;
  const spec = SOUNDS[key];
  if (!spec) return;
  const c = audio();
  if (!c) return;
  try {
    // A context made before the first gesture starts suspended; resuming it
    // from inside a click is what lets the very first sound actually play.
    if (c.state === "suspended") c.resume();
    const now = c.currentTime + 0.01;
    spec.forEach((v) => voice(now + (v.at || 0), v));
  } catch {
    /* audio is a nicety; never let it throw into a click handler */
  }
}

/** The toggle's own feedback — you hear what you just switched on. Called
 *  after the preference flips, so the "on" case is audible and "off" is not. */
export function playSoundPreview() {
  playSound("spinaz_gain");
}
