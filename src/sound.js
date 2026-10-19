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

  // ---- Events added when GameZ shipped and the set was completed. ----
  //
  // The grammar above still holds: gains rise, spends fall, and nothing new
  // borrows a shape that already means something else. Where a new event is a
  // cousin of an old one it stays in that family on purpose — a build failing
  // is `error` with a longer tail, not a fourth unrelated noise to learn.

  // GameZ. Building is the long one, so it gets a start and a finish that
  // bracket it — you can leave the tab and know from the next room whether it
  // worked. Failure deliberately shares the error family.
  build_start: [
    { type: "square", from: 220, dur: 0.07, gain: 0.05 },
    { type: "square", from: 330, to: 440, dur: 0.18, gain: 0.05, at: 0.07 },
  ],
  build_done: [
    { type: "triangle", from: 523, dur: 0.09, gain: 0.07 },
    { type: "triangle", from: 659, dur: 0.09, gain: 0.07, at: 0.08 },
    { type: "triangle", from: 1047, dur: 0.22, gain: 0.07, at: 0.16 },
  ],
  build_fail: [
    { type: "sawtooth", from: 180, to: 90, dur: 0.34, gain: 0.055 },
    { type: "square", from: 120, to: 70, dur: 0.3, gain: 0.03, at: 0.04 },
  ],
  // Pressing play on something you made. Short, because it happens right
  // before the game's own audio starts and must not step on it.
  game_start: [
    { type: "square", from: 392, dur: 0.06, gain: 0.05 },
    { type: "square", from: 659, dur: 0.1, gain: 0.05, at: 0.06 },
  ],
  game_over: [
    { type: "triangle", from: 440, to: 220, dur: 0.3, gain: 0.06 },
  ],

  // CallZ. A ring has to be recognisable as a ring, so it is the one repeating
  // two-tone in the set; connect and hang-up are the pair that brackets it.
  call_ring: [
    { type: "sine", from: 880, dur: 0.16, gain: 0.06 },
    { type: "sine", from: 660, dur: 0.16, gain: 0.06, at: 0.2 },
    { type: "sine", from: 880, dur: 0.16, gain: 0.06, at: 0.5 },
    { type: "sine", from: 660, dur: 0.16, gain: 0.06, at: 0.7 },
  ],
  call_connect: [
    { type: "sine", from: 523, dur: 0.08, gain: 0.06 },
    { type: "sine", from: 784, dur: 0.14, gain: 0.06, at: 0.07 },
  ],
  call_end: [
    { type: "sine", from: 660, dur: 0.09, gain: 0.055 },
    { type: "sine", from: 440, dur: 0.16, gain: 0.055, at: 0.08 },
  ],

  // Social. All quiet — these fire while somebody is reading, and a loud
  // sound on a passive event is the one people switch the whole system off for.
  like: [{ type: "sine", from: 784, to: 1047, dur: 0.09, gain: 0.045 }],
  follow: [
    { type: "sine", from: 659, dur: 0.07, gain: 0.05 },
    { type: "sine", from: 880, dur: 0.12, gain: 0.05, at: 0.06 },
  ],
  comment: [{ type: "sine", from: 700, to: 840, dur: 0.08, gain: 0.045 }],
  rating_given: [
    { type: "triangle", from: 587, dur: 0.07, gain: 0.05 },
    { type: "triangle", from: 880, dur: 0.13, gain: 0.05, at: 0.06 },
  ],

  // Getting somewhere. A badge is the loudest thing in the whole set, and it
  // should be — it is the rarest.
  badge: [
    { type: "triangle", from: 523, dur: 0.08, gain: 0.07 },
    { type: "triangle", from: 659, dur: 0.08, gain: 0.07, at: 0.07 },
    { type: "triangle", from: 784, dur: 0.08, gain: 0.07, at: 0.14 },
    { type: "triangle", from: 1047, dur: 0.3, gain: 0.08, at: 0.21 },
  ],
  level_up: [
    { type: "square", from: 440, dur: 0.07, gain: 0.055 },
    { type: "square", from: 659, dur: 0.07, gain: 0.055, at: 0.07 },
    { type: "square", from: 880, dur: 0.2, gain: 0.06, at: 0.14 },
  ],
  quest_done: [
    { type: "triangle", from: 659, dur: 0.08, gain: 0.06 },
    { type: "triangle", from: 988, dur: 0.16, gain: 0.06, at: 0.07 },
  ],
  // Posting. The thing this whole app is for, so it is warm rather than clicky.
  post: [
    { type: "triangle", from: 440, dur: 0.08, gain: 0.06 },
    { type: "triangle", from: 587, dur: 0.08, gain: 0.06, at: 0.07 },
    { type: "triangle", from: 880, dur: 0.18, gain: 0.06, at: 0.14 },
  ],
  // The score coming back from the coach. Not a fanfare — the number on screen
  // is the news, and a triumphant noise before you have read it prejudges it.
  score_in: [
    { type: "sine", from: 587, dur: 0.09, gain: 0.055 },
    { type: "sine", from: 784, dur: 0.16, gain: 0.055, at: 0.08 },
  ],

  // Housekeeping. The two smallest sounds here, because they confirm rather
  // than announce.
  saved: [{ type: "sine", from: 880, to: 1175, dur: 0.07, gain: 0.04 }],
  deleted: [{ type: "sine", from: 520, to: 260, dur: 0.14, gain: 0.045 }],
  // A door opening onto another app. The cross-pollination sound.
  open_in: [{ type: "sine", from: 587, to: 880, dur: 0.1, gain: 0.045 }],
};


/* ------------------------------------------------------------------ packs */

// A pack is a TRANSFORM over the vocabulary above, not a second copy of it.
//
// Four hand-written alternatives to 37 sounds would be 148 tuned envelopes,
// which is more than anyone can audition and would rot the moment a new event
// was added — the new sound would exist in the house set and be silently
// missing from the other three. A transform means a sound added tomorrow
// arrives in every pack at once, and the grammar survives: pitch moves are
// applied to `from` AND `to` by the same factor, so gains still rise and
// spends still fall no matter which pack is on. That invariant is the reason
// the set is learnable, and a pack that broke it would be a different app.
export const PACKS = {
  house: {
    name: "House",
    blurb: "The standard set — clean sines, a bright coin, a warm cash chord.",
    free: true,
    voice: (v) => v,
  },
  arcade: {
    name: "Arcade",
    blurb: "8-bit. Square waves, brighter and shorter, like a cabinet.",
    voice: (v) => ({
      ...v,
      type: v.type === "sawtooth" ? "sawtooth" : "square",
      from: v.from * 1.5,
      to: (v.to ?? v.from) * 1.5,
      dur: v.dur * 0.8,
    }),
  },
  soft: {
    name: "Soft",
    blurb: "Sines only, longer and quieter. For working with headphones on.",
    voice: (v) => ({
      ...v,
      type: "sine",
      dur: v.dur * 1.35,
      gain: v.gain * 0.6,
    }),
  },
  deep: {
    name: "Deep",
    blurb: "An octave down, all triangle. Warm, closer to a studio than a game.",
    voice: (v) => ({
      ...v,
      type: v.type === "sawtooth" ? "sawtooth" : "triangle",
      from: v.from * 0.5,
      to: (v.to ?? v.from) * 0.5,
      dur: v.dur * 1.15,
    }),
  },
};

export const PACK_KEYS = Object.keys(PACKS);

// The member's choice, mirrored from the server. It is stored on the ACCOUNT
// (see apps/economy/soundz.py) because it is sold; this is a local cache so a
// click does not wait on a round trip to know what it sounds like.
const PACK_KEY_STORE = "mcz_sound_pack";
const OVERRIDE_STORE = "mcz_sound_overrides";

let pack = "house";
let overrides = {};

try {
  pack = localStorage.getItem(PACK_KEY_STORE) || "house";
  overrides = JSON.parse(localStorage.getItem(OVERRIDE_STORE) || "{}") || {};
} catch {
  /* private mode: the house sound is a fine default */
}

/** Apply what the server says this member chose. An unrecognised pack falls
 *  back to the house set rather than failing — the server validates the SHAPE
 *  of a pack key and deliberately does not know which ones exist, so this is
 *  the half that knows what a name means. */
export function setSoundPack(nextPack, nextOverrides) {
  pack = PACKS[nextPack] ? nextPack : "house";
  overrides = {};
  for (const [sound, p] of Object.entries(nextOverrides || {})) {
    if (PACKS[p]) overrides[sound] = p;
  }
  try {
    localStorage.setItem(PACK_KEY_STORE, pack);
    localStorage.setItem(OVERRIDE_STORE, JSON.stringify(overrides));
  } catch {
    /* it still applies for this page */
  }
  window.dispatchEvent(new CustomEvent("mcz-sound-pack", { detail: pack }));
}

export function currentPack() {
  return { pack, overrides };
}

export const SOUND_KEYS = Object.keys(SOUNDS);

/** Play one sound by key. No-ops when sound is off, unsupported, or the key
 *  is unknown — a tracking-style call that can never break the caller. */
export function playSound(key, forcePack) {
  if (!isSoundOn()) return;
  playSoundNow(key, forcePack);
}

/** The same thing, ignoring the on/off preference. Only the settings panel
 *  uses this — auditioning a pack you are about to choose has to be audible
 *  while you choose it, and making somebody turn sound on first to find out
 *  what they are turning on is a door in front of a door. */
export function playSoundNow(key, forcePack) {
  const spec = SOUNDS[key];
  if (!spec) return;
  const c = audio();
  if (!c) return;
  // forcePack (audition) > this sound's own override > the chosen pack.
  const chosen = forcePack || overrides[key] || pack;
  const shape = (PACKS[chosen] || PACKS.house).voice;
  try {
    // A context made before the first gesture starts suspended; resuming it
    // from inside a click is what lets the very first sound actually play.
    if (c.state === "suspended") c.resume();
    const now = c.currentTime + 0.01;
    spec.forEach((v) => voice(now + (v.at || 0), shape(v)));
  } catch {
    /* audio is a nicety; never let it throw into a click handler */
  }
}

/** The toggle's own feedback — you hear what you just switched on. Called
 *  after the preference flips, so the "on" case is audible and "off" is not. */
export function playSoundPreview() {
  playSound("spinaz_gain");
}
